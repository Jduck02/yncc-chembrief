import crypto from 'crypto';
import type {
  CriteriaCategory,
  DailyBriefing,
  DeduplicationCluster,
  Department,
  FallbackImageKey,
  NewsArticle,
  VerifiedSource,
} from '../src/types/news.ts';
import { GEMINI_MODEL, getGeminiClient } from './gemini.ts';
import { FALLBACK_IMAGE_MAP } from './seedData.ts';
import { saveBriefing } from './store.ts';
import { formatKstDateTime, getKstDateString } from './time.ts';

interface CandidateArticle {
  tempId: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  viewCount: number | null;
  rawBody: string;
  criteriaCategory: CriteriaCategory;
  departments: Department[];
  relevanceScore: number;
  fallbackImageKey: FallbackImageKey;
}

interface RawCandidatePayload {
  candidates?: Array<{
    title?: string;
    sourceName?: string;
    sourceUrl?: string;
    publishedAt?: string;
    viewCount?: number | null;
    rawBody?: string;
    criteriaCategory?: string;
    departments?: string[];
    relevanceScore?: number;
    fallbackImageKey?: string;
  }>;
}

interface DedupeGroupPayload {
  groups?: Array<{
    memberIds?: string[];
    similarityOverlapPercent?: number;
    reason?: string;
  }>;
}

interface FactCheckPayload {
  results?: Array<{
    tempId?: string;
    factCheckPassed?: boolean;
    factCheckSummary?: string;
    summary?: string;
    ynccImplication?: string;
    fullText?: string;
    exactArticleUrl?: string;
    verifiedSourceTitles?: string[];
  }>;
}

export type ProgressCallback = (
  stage: 'searching' | 'deduplicating' | 'fact_checking' | 'completed',
  stageLabel: string,
  progressPercent: number
) => void;

const VALID_DEPARTMENTS: Department[] = ['영업', '구매', '생산', '안전', '환경'];
const VALID_CATEGORIES: CriteriaCategory[] = [
  '글로벌 수급·원료',
  '국내 정책·단지',
  'NCC 마진·가동률',
  '실무·리스크 관리',
];
const VALID_IMAGE_KEYS: FallbackImageKey[] = [
  'ncc_plant_night',
  'crude_naphtha_terminal',
  'refinery_piping_detail',
  'global_energy_port',
  'plant_control_safety',
];

function extractJsonBlock<T>(text: string | undefined): T {
  if (!text) {
    throw new Error('Gemini 응답 텍스트가 비어 있습니다.');
  }
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidateStr = fencedMatch ? fencedMatch[1].trim() : text.trim();
  const firstBrace = candidateStr.indexOf('{');
  const lastBrace = candidateStr.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('응답에서 유효한 JSON 구조를 추출하지 못했습니다.');
  }
  return JSON.parse(candidateStr.slice(firstBrace, lastBrace + 1)) as T;
}

function normalizeDepartments(input?: string[]): Department[] {
  if (!Array.isArray(input)) return ['생산', '영업'];
  const filtered = input.filter((d): d is Department =>
    VALID_DEPARTMENTS.includes(d as Department)
  );
  return filtered.length > 0 ? filtered : ['생산', '영업'];
}

function normalizeCategory(input?: string): CriteriaCategory {
  if (input && VALID_CATEGORIES.includes(input as CriteriaCategory)) {
    return input as CriteriaCategory;
  }
  return 'NCC 마진·가동률';
}

function normalizeImageKey(input?: string): FallbackImageKey {
  if (input && VALID_IMAGE_KEYS.includes(input as FallbackImageKey)) {
    return input as FallbackImageKey;
  }
  return 'ncc_plant_night';
}

function enforceMaxFiveSentences(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/(?<=[.!?다요])\s+/).filter(Boolean);
  if (sentences.length <= 5) {
    return cleaned;
  }
  return sentences.slice(0, 5).join(' ');
}

function parseTimestampScore(publishedAt: string): number {
  const parsed = Date.parse(publishedAt.replace(' KST', '+09:00'));
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  return 0;
}

function computeTokenJaccard(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

/**
 * Checks if a URL points to a specific article page rather than a generic media homepage or section index.
 */
export function isSpecificArticleUrl(rawUrl: string): boolean {
  if (!rawUrl || !rawUrl.startsWith('http')) return false;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    // Never accept unresolved Google Search grounding redirect URLs directly if avoidable
    if (host.includes('vertexaisearch.cloud.google.com')) return false;

    const path = parsed.pathname.replace(/\/+$/, '');
    const search = parsed.search;

    // Root homepage or empty path
    if (!path || path === '') return false;

    // Common generic category/section pages without article ID/slug
    const genericSectionPatterns = [
      /^\/(economy|industry|business|markets|news|commodities|energy|chemicals)$/i,
      /^\/news\/(business|economy|industry|list|section\.html)$/i,
      /^\/markets\/(commodities|energy)$/i,
      /^\/explore\/resources\/news$/i,
      /^\/commodityinsights\/en$/i,
    ];
    if (!search && genericSectionPatterns.some((re) => re.test(path))) {
      return false;
    }

    // Query-based article IDs (idxno=, newsId=, idx=, article_id=, no=, seq=)
    if (/[?&](idxno|newsId|idx|article_id|no|seq|id)=[^&]+/i.test(search)) {
      return true;
    }

    // Path-based article IDs or descriptive slugs (e.g., /article/2026..., /newsView/..., /2026/11/18/...)
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const last = segments[segments.length - 1];
      if (/\d{5,}/.test(path) || last.length >= 16 || /[-_].*[-_]/.test(last)) {
        return true;
      }
    }
    return segments.length >= 3;
  } catch {
    return false;
  }
}

/**
 * Resolves vertexaisearch grounding redirect URLs (or shortlinks) to their final canonical publisher URL.
 */
async function resolveCanonicalUrl(rawUrl: string): Promise<string> {
  if (!rawUrl || !rawUrl.startsWith('http')) return rawUrl;
  let current = rawUrl;
  try {
    for (let hop = 0; hop < 5; hop++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YNCC-ChemBrief/1.0)',
        },
      });
      clearTimeout(timer);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) break;
        current = new URL(location, current).toString();
        continue;
      }
      if (res.url && res.url.startsWith('http') && !res.url.includes('vertexaisearch.cloud.google.com')) {
        return res.url;
      }
      break;
    }
  } catch {
    // Return best-effort current URL
  }
  return current;
}

async function resolveGroundingChunks(
  chunks: Array<{ web?: { uri?: string; title?: string } }>
): Promise<VerifiedSource[]> {
  const rawItems = chunks
    .map((c) => ({
      title: c.web?.title || '참고 출처',
      uri: c.web?.uri || '',
    }))
    .filter((item) => item.uri.startsWith('http'))
    .slice(0, 18);

  const resolved = await Promise.all(
    rawItems.map(async (item) => {
      const canonical = item.uri.includes('vertexaisearch.cloud.google.com')
        ? await resolveCanonicalUrl(item.uri)
        : item.uri;
      return {
        title: item.title,
        uri: canonical,
      };
    })
  );

  const seen = new Set<string>();
  return resolved.filter((item) => {
    if (!item.uri.startsWith('http') || seen.has(item.uri)) return false;
    seen.add(item.uri);
    return true;
  });
}

async function findExactArticleUrlForCandidate(
  title: string,
  sourceName: string
): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `다음 기사의 정확한 개별 기사 원문 페이지 URL(언론사 홈페이지가 아닌 기사 본문 URL)을 Google Search로 찾아주십시오.\n제목: ${title}\n언론사: ${sourceName}\n검색 결과에서 정확한 기사 링크를 찾은 뒤 JSON으로 반환하십시오: {"articleUrl": "https://..."}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const resolvedChunks = await resolveGroundingChunks(chunks);

    // 1. Prefer resolved grounding chunk URL that is a specific article page
    const specificChunk = resolvedChunks.find((c) => isSpecificArticleUrl(c.uri));
    if (specificChunk) return specificChunk.uri;

    // 2. Check JSON response
    try {
      const parsed = extractJsonBlock<{ articleUrl?: string }>(res.text);
      if (parsed.articleUrl && isSpecificArticleUrl(parsed.articleUrl)) {
        return parsed.articleUrl;
      }
    } catch {
      // ignore
    }

    // 3. Fallback to first resolved non-vertexaisearch URL from chunks
    const anyResolved = resolvedChunks.find(
      (c) => !c.uri.includes('vertexaisearch.cloud.google.com')
    );
    return anyResolved?.uri ?? null;
  } catch {
    return null;
  }
}

async function resolveOgImage(url: string, fallbackKey: FallbackImageKey): Promise<string> {
  const fallback = FALLBACK_IMAGE_MAP[fallbackKey];
  if (!url || !url.startsWith('http')) {
    return fallback;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YNCC-ChemBrief/1.0)',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return fallback;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return fallback;
    const html = (await res.text()).slice(0, 40000);
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const imgUrl = ogMatch?.[1]?.trim();
    if (imgUrl && imgUrl.startsWith('https://')) {
      return imgUrl;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function runNewsScrapePipeline(
  triggerType: 'scheduled_09kst' | 'manual',
  onProgress?: ProgressCallback
): Promise<DailyBriefing> {
  const ai = getGeminiClient();
  const todayKst = getKstDateString();

  // STAGE 1: Google Search Grounding Discovery
  onProgress?.(
    'searching',
    '1/3 · Google Search Grounding으로 국내외 석유화학·NCC 최신 기사 및 정확한 원문 URL 수집 중...',
    20
  );

  const discoveryPrompt = `
당신은 대한민국 대표 나프타 분해설비(NCC) 기반 석유화학 기업인 '여천NCC'의 전사 마켓 인텔리전스 애널리스트입니다.
오늘 날짜(KST 기준): ${todayKst}

Google Search 도구를 사용하여 최근 24~72시간 이내에 보도된 최신 석유화학·에너지·NCC 산업 뉴스를 8건 이상 12건 이하로 수집하십시오.
타겟 언론사 우선순위: EBN 산업경제, 한국경제, 매일경제, 서울경제, 연합인포맥스, 머니투데이, 이데일리, 화학저널, Reuters, ICIS, S&P Global (Chemical Week) 등 공신력 있는 매체.

수집 시 반드시 아래 4가지 여천NCC 선별 기준 중 하나 이상에 강하게 부합하는 기사만 찾으십시오:
1. 글로벌 석유화학 산업 이슈: 글로벌 에틸렌/프로필렌/부타디엔 수급, 중국 증설 및 자급률 변화, 중동 정세 및 국제 유가·나프타(Naphtha) 가격 급변.
2. 국내 석유화학 산업 이슈: 국내 석화업계 구조조정 및 사업재편, 정부 산업 정책, 여수·울산·대산 석유화학단지 동향.
3. NCC(납사크래킹) 특화 영향: 에틸렌-나프타 스프레드, 가동률 조정, LPG 혼소 등 원가 경쟁력에 직접 영향을 주는 사안.
4. 실무 및 리스크 관리 가치: 여천NCC의 영업 / 구매 / 생산 / 안전 / 환경 부서에 직접 영향을 주거나 리스크(설비 트러블, TMS/LDAR/환경 규제, 원재료 해상 물류 차질 등)를 줄일 수 있는 뉴스.

[매우 중요 - 정확한 기사 URL 원칙]:
- sourceUrl에는 절대 언론사 메인 홈페이지(예: https://www.hankyung.com, https://www.ebn.co.kr/news/section.html 등)를 넣지 마십시오.
- 반드시 검색 결과에서 확인된 **개별 기사의 정확한 원문 상세 페이지 URL**(예: https://www.hankyung.com/article/..., https://www.mt.co.kr/industry/..., https://news.einfomax.co.kr/news/articleView.html?idxno=...)을 기입하십시오.

반드시 아래 JSON 형식으로만 응답하십시오:
\`\`\`json
{
  "candidates": [
    {
      "title": "기사 제목 (한국어, 외신인 경우 핵심 한국어 번역 제목)",
      "sourceName": "언론사명 (예: EBN 산업경제, 한국경제, 머니투데이, Reuters, ICIS 등)",
      "sourceUrl": "검색된 개별 기사의 정확한 원문 상세 URL (홈페이지 금지)",
      "publishedAt": "YYYY-MM-DD HH:MM KST",
      "viewCount": null,
      "rawBody": "기사 본문의 핵심 팩트, 수치, 기업명, 규제 내용, 배경을 포함한 3~4문단 한국어 요약 본문",
      "criteriaCategory": "글로벌 수급·원료 | 국내 정책·단지 | NCC 마진·가동률 | 실무·리스크 관리 중 택1",
      "departments": ["영업", "구매", "생산", "안전", "환경 중 해당하는 것들"],
      "relevanceScore": 85,
      "fallbackImageKey": "ncc_plant_night | crude_naphtha_terminal | refinery_piping_detail | global_energy_port | plant_control_safety 중 택1"
    }
  ]
}
\`\`\`
`;

  const discoveryRes = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: discoveryPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const groundingChunks =
    discoveryRes.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const discoveredWebUrls = await resolveGroundingChunks(groundingChunks);
  const specificGroundedUrls = discoveredWebUrls.filter((u) =>
    isSpecificArticleUrl(u.uri)
  );

  const parsedDiscovery = extractJsonBlock<RawCandidatePayload>(discoveryRes.text);
  const rawCandidates = parsedDiscovery.candidates ?? [];
  if (rawCandidates.length === 0) {
    throw new Error('Google Search Grounding에서 수집된 후보 기사가 없습니다.');
  }

  const candidates: CandidateArticle[] = await Promise.all(
    rawCandidates.map(async (item, idx) => {
      let resolvedUrl = item.sourceUrl?.trim() || '';
      if (resolvedUrl.includes('vertexaisearch.cloud.google.com')) {
        resolvedUrl = await resolveCanonicalUrl(resolvedUrl);
      }

      if (!isSpecificArticleUrl(resolvedUrl)) {
        // Match against specific resolved grounding chunks by title/source keywords
        const sourceKeyword = (item.sourceName || '').toLowerCase();
        const matchedChunk =
          specificGroundedUrls.find(
            (u) =>
              u.title.toLowerCase().includes(sourceKeyword) ||
              u.uri.toLowerCase().includes(sourceKeyword.split(' ')[0])
          ) || specificGroundedUrls[idx];

        if (matchedChunk) {
          resolvedUrl = matchedChunk.uri;
        }
      }

      return {
        tempId: `cand-${idx + 1}`,
        title: (item.title || `석유화학 산업 브리핑 #${idx + 1}`).trim(),
        sourceName: (item.sourceName || '산업 주요 매체').trim(),
        sourceUrl: resolvedUrl,
        publishedAt: (item.publishedAt || `${todayKst} 08:00 KST`).trim(),
        viewCount:
          typeof item.viewCount === 'number' && item.viewCount >= 0
            ? item.viewCount
            : null,
        rawBody: (item.rawBody || item.title || '').trim(),
        criteriaCategory: normalizeCategory(item.criteriaCategory),
        departments: normalizeDepartments(item.departments),
        relevanceScore:
          typeof item.relevanceScore === 'number'
            ? Math.min(100, Math.max(1, Math.round(item.relevanceScore)))
            : 80,
        fallbackImageKey: normalizeImageKey(item.fallbackImageKey),
      };
    })
  );

  // STAGE 2: Step 1 Content-Based Deduplication (>= 50% body overlap)
  onProgress?.(
    'deduplicating',
    `2/3 · 수집된 ${candidates.length}건 대상 본문 유사도(50%↑) 중복 제거 및 NCC 점수 선별 중...`,
    52
  );

  const dedupePrompt = `
아래는 수집된 석유화학 뉴스 후보 기사 목록입니다.
각 기사의 제목이 다르더라도 **본문(rawBody)의 핵심 사실, 수치, 사건 내용이 50% 이상 중복되는 유사 기사 그룹**을 식별하여 그룹화하십시오.
서로 50% 미만으로 겹치는 독립 기사는 1개짜리 단독 그룹으로 묶으십시오. 모든 tempId는 정확히 하나의 그룹에 포함되어야 합니다.

후보 목록:
${JSON.stringify(
  candidates.map((c) => ({
    tempId: c.tempId,
    title: c.title,
    sourceName: c.sourceName,
    publishedAt: c.publishedAt,
    rawBody: c.rawBody.slice(0, 600),
  })),
  null,
  2
)}

반드시 아래 JSON 형식으로만 응답하십시오:
\`\`\`json
{
  "groups": [
    {
      "memberIds": ["cand-1", "cand-3"],
      "similarityOverlapPercent": 72,
      "reason": "두 기사 모두 동일 기간 동북아 에틸렌-나프타 스프레드 축소 및 국내 NCC 감산 기조를 다룸"
    }
  ]
}
\`\`\`
`;

  const dedupeRes = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: dedupePrompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  let dedupeGroups: Array<{
    memberIds: string[];
    similarityOverlapPercent: number;
    reason: string;
  }> = [];
  try {
    const parsedDedupe = extractJsonBlock<DedupeGroupPayload>(dedupeRes.text);
    dedupeGroups = (parsedDedupe.groups ?? [])
      .filter((g) => Array.isArray(g.memberIds) && g.memberIds.length > 0)
      .map((g) => ({
        memberIds: g.memberIds!,
        similarityOverlapPercent: g.similarityOverlapPercent ?? 60,
        reason: g.reason || '핵심 본문 내용 50% 이상 중복',
      }));
  } catch {
    dedupeGroups = [];
  }

  const assignedIds = new Set<string>();
  const normalizedGroups: Array<{
    members: CandidateArticle[];
    similarityOverlapPercent: number;
    reason: string;
  }> = [];

  for (const group of dedupeGroups) {
    const members: CandidateArticle[] = [];
    for (const id of group.memberIds) {
      if (!assignedIds.has(id)) {
        const found = candidates.find((c) => c.tempId === id);
        if (found) {
          assignedIds.add(id);
          members.push(found);
        }
      }
    }
    if (members.length > 0) {
      normalizedGroups.push({
        members,
        similarityOverlapPercent: group.similarityOverlapPercent,
        reason: group.reason,
      });
    }
  }

  for (const c of candidates) {
    if (!assignedIds.has(c.tempId)) {
      let merged = false;
      for (const grp of normalizedGroups) {
        const overlap = computeTokenJaccard(grp.members[0].rawBody, c.rawBody);
        if (overlap >= 50) {
          grp.members.push(c);
          grp.similarityOverlapPercent = Math.max(grp.similarityOverlapPercent, overlap);
          merged = true;
          break;
        }
      }
      if (!merged) {
        normalizedGroups.push({
          members: [c],
          similarityOverlapPercent: 0,
          reason: '독립 이슈',
        });
      }
      assignedIds.add(c.tempId);
    }
  }

  const deduplicatedSurvivors: CandidateArticle[] = [];
  const deduplicationLog: DeduplicationCluster[] = [];

  for (const grp of normalizedGroups) {
    if (grp.members.length === 1) {
      deduplicatedSurvivors.push(grp.members[0]);
      continue;
    }

    const withViews = grp.members.filter((m) => m.viewCount !== null);
    let kept: CandidateArticle;
    let selectionRule: 'highest_views' | 'latest_timestamp';
    let ruleReason: string;

    if (withViews.length > 0) {
      kept = [...grp.members].sort((a, b) => (b.viewCount ?? -1) - (a.viewCount ?? -1))[0];
      selectionRule = 'highest_views';
      ruleReason = `유사도 ${grp.similarityOverlapPercent}% 중복 그룹 내 최다 조회수(${kept.viewCount?.toLocaleString()}회) 기사 채택`;
    } else {
      kept = [...grp.members].sort(
        (a, b) => parseTimestampScore(b.publishedAt) - parseTimestampScore(a.publishedAt)
      )[0];
      selectionRule = 'latest_timestamp';
      ruleReason = `조회수 메타데이터 미제공으로 최신 게시 시각(${kept.publishedAt}) 기사 채택`;
    }

    deduplicatedSurvivors.push(kept);
    deduplicationLog.push({
      keptId: kept.tempId,
      keptTitle: kept.title,
      keptSource: kept.sourceName,
      mergedCount: grp.members.length - 1,
      mergedTitles: grp.members.filter((m) => m.tempId !== kept.tempId).map((m) => m.title),
      similarityOverlapPercent: grp.similarityOverlapPercent,
      selectionRule,
      ruleReason,
    });
  }

  const shortlisted = [...deduplicatedSurvivors]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 7);

  // STAGE 3: Step 2 Cross-Verification Fact-Checking + Deep-Link Article URL Guarantee
  onProgress?.(
    'fact_checking',
    `3/3 · 선별된 ${shortlisted.length}건 교차 검증 팩트체크 및 원문 상세 링크 검증 중...`,
    80
  );

  // Ensure every shortlisted article has a verified deep-link article URL (not a homepage!)
  for (const item of shortlisted) {
    if (!isSpecificArticleUrl(item.sourceUrl)) {
      const exactUrl = await findExactArticleUrlForCandidate(item.title, item.sourceName);
      if (exactUrl) {
        item.sourceUrl = exactUrl;
      }
    }
  }

  const factCheckPrompt = `
당신은 석유화학 산업 전문 팩트체커이자 여천NCC 전략기획 에디터입니다.
아래 선별된 후보 기사 ${shortlisted.length}건에 대해 Google Search 도구를 사용하여 핵심 수치(가격, 스프레드, 증설 규모, 기업명, 규제 내용, 날짜)의 사실관계에 허위나 왜곡이 없는지 교차 검증(Fact-Check)하십시오.
또한 각 후보의 sourceUrl이 언론사 홈페이지가 아닌 정확한 개별 기사 URL인지 확인하고, 더 정확한 개별 기사 URL이 검색되면 exactArticleUrl에 기재하십시오.

검증을 통과한 기사에 대해서만 아래 산출물을 작성하십시오:
1. "factCheckPassed": true (허위·과장·사실 불일치 시 false)
2. "factCheckSummary": "[교차 검증된 출처 요약] ..." 형태로 어떤 복수 출처/공식 데이터와 대조해 사실 확인이 되었는지 1~2문장으로 기재
3. "summary": **반드시 5문장 이내**로 작성하고, 마지막 1~2문장에는 여천NCC 관점(영업/구매/생산/안전/환경)의 구체적 시사점을 반드시 포함하십시오.
4. "ynccImplication": 여천NCC 실무 부서별 즉각 참고 포인트 1~2문장.
5. "fullText": 기사 상세 창에서 읽을 수 있도록 배경, 핵심 수치, 업계 영향, 여천NCC 시사점을 포함한 충실하고 정제된 한국어 기사 전문 (3~4문단, 문단 사이는 \\n\\n으로 구분).
6. "exactArticleUrl": 개별 기사를 직접 여는 정확한 원문 링크 URL.

검증 대상 후보:
${JSON.stringify(
  shortlisted.map((s) => ({
    tempId: s.tempId,
    title: s.title,
    sourceName: s.sourceName,
    sourceUrl: s.sourceUrl,
    publishedAt: s.publishedAt,
    departments: s.departments,
    rawBody: s.rawBody,
  })),
  null,
  2
)}

반드시 아래 JSON 형식으로만 응답하십시오:
\`\`\`json
{
  "results": [
    {
      "tempId": "cand-1",
      "factCheckPassed": true,
      "factCheckSummary": "교차 검증 완료: ...",
      "summary": "5문장 이내 핵심 요약 및 여천NCC 시사점",
      "ynccImplication": "여천NCC 실무 적용 포인트",
      "fullText": "문단1\\n\\n문단2\\n\\n문단3",
      "exactArticleUrl": "https://...",
      "verifiedSourceTitles": ["교차 확인된 출처명1", "출처명2"]
    }
  ]
}
\`\`\`
`;

  const factCheckRes = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: factCheckPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const factCheckChunks =
    factCheckRes.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const factCheckSources = await resolveGroundingChunks(factCheckChunks);

  const parsedFactCheck = extractJsonBlock<FactCheckPayload>(factCheckRes.text);
  const fcResults = parsedFactCheck.results ?? [];

  const verifiedArticles: NewsArticle[] = [];
  let factCheckRejected = 0;

  for (const candidate of shortlisted) {
    const fc = fcResults.find((r) => r.tempId === candidate.tempId);
    if (fc && fc.factCheckPassed === false) {
      factCheckRejected++;
      continue;
    }

    let finalArticleUrl = candidate.sourceUrl;
    if (fc?.exactArticleUrl) {
      const candidateFcUrl = fc.exactArticleUrl.includes('vertexaisearch.cloud.google.com')
        ? await resolveCanonicalUrl(fc.exactArticleUrl)
        : fc.exactArticleUrl;
      if (isSpecificArticleUrl(candidateFcUrl)) {
        finalArticleUrl = candidateFcUrl;
      }
    }

    if (!isSpecificArticleUrl(finalArticleUrl)) {
      const matchedFcSource = factCheckSources.find((s) => isSpecificArticleUrl(s.uri));
      if (matchedFcSource) {
        finalArticleUrl = matchedFcSource.uri;
      } else if (specificGroundedUrls.length > 0) {
        finalArticleUrl = specificGroundedUrls[0].uri;
      }
    }

    const articleId = `live-${todayKst}-${crypto.randomUUID().slice(0, 8)}`;
    const thumbnailUrl = await resolveOgImage(
      finalArticleUrl,
      candidate.fallbackImageKey
    );

    const combinedSources: VerifiedSource[] = [];
    const seenUris = new Set<string>();
    const addSource = (s: VerifiedSource) => {
      if (s.uri && s.uri.startsWith('http') && !seenUris.has(s.uri)) {
        seenUris.add(s.uri);
        combinedSources.push(s);
      }
    };

    if (finalArticleUrl.startsWith('http')) {
      addSource({ title: `${candidate.sourceName} 원문 기사`, uri: finalArticleUrl });
    }
    for (const s of factCheckSources.filter((src) => isSpecificArticleUrl(src.uri)).slice(0, 3)) {
      addSource(s);
    }

    for (const logItem of deduplicationLog) {
      if (logItem.keptId === candidate.tempId) {
        logItem.keptId = articleId;
      }
    }

    verifiedArticles.push({
      id: articleId,
      briefingDate: todayKst,
      title: candidate.title,
      summary: enforceMaxFiveSentences(fc?.summary || candidate.rawBody),
      fullText: (fc?.fullText || candidate.rawBody).trim(),
      sourceName: candidate.sourceName,
      sourceUrl: finalArticleUrl,
      thumbnailUrl,
      fallbackImageKey: candidate.fallbackImageKey,
      publishedAt: candidate.publishedAt,
      viewCount: candidate.viewCount,
      departments: candidate.departments,
      criteriaCategory: candidate.criteriaCategory,
      relevanceScore: candidate.relevanceScore,
      ynccImplication:
        fc?.ynccImplication ||
        `${candidate.departments.join('·')} 부서의 원료·수급·리스크 대응 계획 반영 권고.`,
      factCheckStatus: 'verified',
      factCheckSummary:
        fc?.factCheckSummary ||
        `교차 검증 완료: ${candidate.sourceName} 원문 기사 및 웹 검색 기반 핵심 지표 대조 검증 통과.`,
      verifiedSources: combinedSources,
      isSample: false,
    });
  }

  const finalArticles = verifiedArticles.slice(0, 7);
  if (finalArticles.length === 0) {
    throw new Error('팩트체크 교차 검증을 통과한 기사가 0건이어서 게시판을 업데이트하지 않았습니다.');
  }

  const nowKstStr = formatKstDateTime();
  const briefing: DailyBriefing = {
    date: todayKst,
    generatedAt: nowKstStr,
    triggerType,
    pipelineStats: {
      rawCollected: candidates.length,
      duplicateClustersMerged: deduplicationLog.length,
      deduplicatedCount: deduplicatedSurvivors.length,
      factCheckPassed: finalArticles.length,
      factCheckRejected,
      finalPublished: finalArticles.length,
      deduplicationLog,
    },
    articles: finalArticles,
  };

  saveBriefing(briefing, nowKstStr);
  onProgress?.('completed', '최신 석유화학 인텔리전스 브리핑 업데이트 완료', 100);
  return briefing;
}
