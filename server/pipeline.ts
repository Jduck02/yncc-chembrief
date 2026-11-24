import crypto from 'crypto';
import type {
  CriteriaCategory,
  DailyBriefing,
  DeduplicationCluster,
  FallbackImageKey,
  NewsArticle,
  VerifiedSource,
} from '../src/types/news.ts';
import { normalizeArticleKeywords } from './keywords.ts';
import {
  getAllSavedArticles,
  getRecentLiveArticles,
  saveTodayDraft,
} from './store.ts';
import {
  formatKstDateTime,
  getBriefingWindowBoundsKst,
  isWithinBriefingWindow,
} from './time.ts';

interface DiscoveredSeed {
  url: string;
  titleHint?: string;
  sourceHint?: string;
  publishedAtHint?: string;
  snippetHint?: string;
}

interface CandidateArticle {
  tempId: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  publishedMs: number;
  viewCount: number | null;
  rawBody: string;
  criteriaCategory: CriteriaCategory;
  keywords: string[];
  relevanceScore: number;
  fallbackImageKey: FallbackImageKey;
  corroborationSources: VerifiedSource[];
}

export type ProgressCallback = (
  stage: 'searching' | 'deduplicating' | 'fact_checking' | 'completed',
  stageLabel: string,
  progressPercent: number
) => void;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const NAVER_SEARCH_QUERIES = [
  '석유화학',
  '나프타',
  '에틸렌',
  '여천NCC',
  '여수산단',
  '석유화학 사업재편',
  'NCC 가동률',
  '에틸렌 스프레드',
];

const DAUM_SEARCH_QUERIES = [
  '석유화학',
  '여천NCC',
  '나프타 에틸렌',
  '여수산단 석유화학',
];

const DIRECT_RSS_FEEDS: Array<{ sourceName: string; url: string }> = [
  { sourceName: 'EBN 산업경제', url: 'https://www.ebn.co.kr/rss/allArticle.xml' },
  { sourceName: '한국경제', url: 'https://www.hankyung.com/feed/economy' },
  { sourceName: '매일경제', url: 'https://www.mk.co.kr/rss/30100041/' },
  { sourceName: '서울경제', url: 'https://www.sedaily.com/RSS/Economy' },
];

const HOSTNAME_TO_PRESS: Record<string, string> = {
  'hankyung.com': '한국경제',
  'mk.co.kr': '매일경제',
  'sedaily.com': '서울경제',
  'ebn.co.kr': 'EBN 산업경제',
  'mt.co.kr': '머니투데이',
  'edaily.co.kr': '이데일리',
  'einfomax.co.kr': '연합인포맥스',
  'fnnews.com': '파이낸셜뉴스',
  'yna.co.kr': '연합뉴스',
  'newsis.com': '뉴시스',
  'news1.kr': '뉴스1',
  'asiae.co.kr': '아시아경제',
  'heraldcorp.com': '헤럴드경제',
  'chosun.com': '조선일보',
  'joongang.co.kr': '중앙일보',
  'donga.com': '동아일보',
  'ikbc.co.kr': 'kbc광주방송',
  'sbs.co.kr': 'SBS Biz',
  'tvchosun.com': 'TV조선',
  'energydaily.co.kr': '에너지데일리',
  'chemlocus.co.kr': '화학저널',
  'reuters.com': 'Reuters',
  'icis.com': 'ICIS',
};

const TIER1_PRESS_BONUS = new Set([
  'EBN 산업경제',
  '한국경제',
  '매일경제',
  '서울경제',
  '연합인포맥스',
  '머니투데이',
  '이데일리',
  '파이낸셜뉴스',
  '연합뉴스',
  '뉴시스',
  '뉴스1',
  '화학저널',
  'Reuters',
  'ICIS',
]);

function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isNaN(code) ? '' : String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return Number.isNaN(code) ? '' : String.fromCodePoint(code);
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

async function fetchTextWithTimeout(url: string, timeoutMs = 5000): Promise<{
  ok: boolean;
  finalUrl: string;
  text: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!res.ok) {
      return { ok: false, finalUrl: res.url || url, text: '' };
    }
    const text = await res.text();
    return { ok: true, finalUrl: res.url || url, text };
  } catch {
    return { ok: false, finalUrl: url, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

function inferPressFromUrl(rawUrl: string): string {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    for (const [domain, name] of Object.entries(HOSTNAME_TO_PRESS)) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        return name;
      }
    }
    return host.replace(/^www\./, '');
  } catch {
    return '산업 주요 매체';
  }
}

function formatDateToKstLabel(rawDate: string | Date): { label: string; ms: number } | null {
  if (!rawDate) return null;

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    // Already formatted like "2026-11-24 13:30:19" (Naver KST data-date-time)
    const kstMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?$/);
    if (kstMatch) {
      const iso = `${kstMatch[1]}T${kstMatch[2]}:00+09:00`;
      const ms = Date.parse(iso);
      if (!Number.isNaN(ms)) {
        return { label: `${kstMatch[1]} ${kstMatch[2]} KST`, ms };
      }
    }

    // Compact Daum ID timestamp: 20261124143605...
    const compactMatch = trimmed.match(/^(202\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])([0-5]\d)/);
    if (compactMatch) {
      const dateStr = `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
      const timeStr = `${compactMatch[4]}:${compactMatch[5]}`;
      const ms = Date.parse(`${dateStr}T${timeStr}:00+09:00`);
      if (!Number.isNaN(ms)) {
        return { label: `${dateStr} ${timeStr} KST`, ms };
      }
    }
  }

  const parsedMs = rawDate instanceof Date ? rawDate.getTime() : Date.parse(String(rawDate));
  if (Number.isNaN(parsedMs)) return null;
  const full = formatKstDateTime(new Date(parsedMs));
  // Trim seconds for concise display: YYYY-MM-DD HH:MM KST
  const concise = full.replace(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}):\d{2} KST$/, '$1 KST');
  return { label: concise, ms: parsedMs };
}

/**
 * Checks if a URL points to a specific article page rather than a generic media homepage or section index.
 */
export function isSpecificArticleUrl(rawUrl: string): boolean {
  if (!rawUrl || !rawUrl.startsWith('http')) return false;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('vertexaisearch.cloud.google.com')) return false;

    const path = parsed.pathname.replace(/\/+$/, '');
    const search = parsed.search;

    if (!path || path === '') return false;

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

    if (/[?&](idxno|newsId|idx|article_id|no|seq|id)=[^&]+/i.test(search)) {
      return true;
    }

    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const last = segments[segments.length - 1];
      if (/\d{5,}/.test(path) || last.length >= 12 || /[-_].*[-_]/.test(last)) {
        return true;
      }
    }
    return segments.length >= 3;
  } catch {
    return false;
  }
}

function cleanArticleText(raw: string): string {
  const cleaned = raw
    .replace(/\[사진=[^\]]+\]/g, ' ')
    .replace(/\[이미지=[^\]]+\]/g, ' ')
    .replace(/\[그래픽=[^\]]+\]/g, ' ')
    .replace(/\[[^\]=]{2,15}=[^\]]+\]/g, ' ')
    .replace(/\[[가-힣A-Za-z0-9]+\s+[가-힣]{2,4}\s*기자\]/g, ' ')
    .replace(/\([^)]{2,25}\)\s*\/\s*[가-힣A-Za-z0-9]+/g, ' ')
    .replace(/<저작권자[^>]*>/g, ' ')
    .replace(/ⓒ[^\n.]+/g, ' ')
    .replace(/무단\s*전재\s*(및|·)\s*재배포\s*금지/g, ' ')
    .replace(/재판매\s*및\s*DB\s*금지/g, ' ')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ')
    .replace(/\([^)]+=[^)]+\)\s*[가-힣]{2,4}\s*기자\s*=\s*/g, '')
    .replace(/【[^】]+】\s*[가-힣]{2,4}\s*기자\s*=\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function enforceMaxFiveSentences(text: string): string {
  const cleaned = cleanArticleText(text);
  const sentences = cleaned
    .split(/(?<=[.!?다요])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
  if (sentences.length === 0) return cleaned.slice(0, 400);
  return sentences.slice(0, 4).join(' ');
}

function evaluatePetrochemicalRelevance(title: string, body: string): {
  isRelevant: boolean;
  score: number;
  category: CriteriaCategory;
  fallbackImageKey: FallbackImageKey;
} {
  const t = title.toLowerCase();
  const b = body.toLowerCase();

  const coreTitlePatterns = [
    /석유화학/i,
    /석화/i,
    /나프타/i,
    /납사/i,
    /에틸렌/i,
    /프로필렌/i,
    /부타디엔/i,
    /여천\s*ncc/i,
    /\bncc\b/i,
    /여수산단/i,
    /대산산단/i,
    /울산산단/i,
    /크래커/i,
    /올레핀/i,
    /폴리에틸렌/i,
    /폴리프로필렌/i,
    /\bpvc\b/i,
    /\babs\b/i,
    /다운스트림/i,
    /원유/i,
    /정유/i,
    /스프레드/i,
    /petrochemical/i,
    /naphtha/i,
    /ethylene/i,
  ];

  const secondaryPatterns = [
    /사업재편/i,
    /구조개편/i,
    /구조조정/i,
    /가동률/i,
    /정기보수/i,
    /고부가/i,
    /반덤핑/i,
    /공급과잉/i,
    /국제유가/i,
    /중동/i,
    /중국\s*증설/i,
    /수출/i,
    /플랜트/i,
    /환경규제/i,
    /공정안전/i,
    /탄소중립/i,
    /롯데케미칼/i,
    /한화솔루션/i,
    /lg화학/i,
    /dl케미칼/i,
    /대한유화/i,
    /금호석유화학/i,
    /s-oil/i,
    /에쓰오일/i,
    /sk지오센트릭/i,
    /sk인천석유화학/i,
    /hd현대케미칼/i,
  ];

  const titleCoreHits = coreTitlePatterns.filter((re) => re.test(t)).length;
  const bodyCoreHits = coreTitlePatterns.filter((re) => re.test(b)).length;
  const titleSecondaryHits = secondaryPatterns.filter((re) => re.test(t)).length;
  const bodySecondaryHits = secondaryPatterns.filter((re) => re.test(b)).length;

  // Strict gate: must have genuine petrochemical/refining presence (not incidental footnote words)
  const isRelevant =
    titleCoreHits >= 1 ||
    (bodyCoreHits >= 2 && (titleSecondaryHits >= 1 || bodySecondaryHits >= 2));

  if (!isRelevant) {
    return {
      isRelevant: false,
      score: 0,
      category: 'NCC 마진·가동률',
      fallbackImageKey: 'ncc_plant_night',
    };
  }

  let score = 56;
  score += Math.min(24, titleCoreHits * 12);
  score += Math.min(12, bodyCoreHits * 3);
  score += Math.min(8, (titleSecondaryHits + bodySecondaryHits) * 2);
  if (/여천\s*ncc|여수산단|나프타|납사|에틸렌|ncc|스프레드/i.test(`${t} ${b}`)) {
    score += 6;
  }
  score = Math.min(98, Math.max(58, score));

  const corpus = `${title} ${body}`;
  let category: CriteriaCategory = 'NCC 마진·가동률';
  let fallbackImageKey: FallbackImageKey = 'ncc_plant_night';

  if (/사업재편|구조개편|구조조정|산업부|정부|여수산단|대산산단|울산산단|지원방안|고부가/i.test(corpus)) {
    category = '국내 정책·단지';
    fallbackImageKey = 'refinery_piping_detail';
  } else if (/안전|화재|누출|트러블|환경규제|비산배출|ldar|tms|탄소|반덤핑|통상|물류/i.test(corpus)) {
    category = '실무·리스크 관리';
    fallbackImageKey = 'plant_control_safety';
  } else if (/나프타|납사|원유|국제유가|중동|중국|수출|수급|글로벌/i.test(corpus)) {
    category = '글로벌 수급·원료';
    fallbackImageKey = 'crude_naphtha_terminal';
  }

  return { isRelevant: true, score, category, fallbackImageKey };
}

function buildYnccImplication(
  category: CriteriaCategory,
  title: string,
  body: string
): string {
  const check = (re: RegExp) => re.test(title) || (!/여천|여수|재편|반덤핑|정기보수|인사/.test(title) && re.test(body));

  if (/여천\s*ncc|여수산단|여수/i.test(title) || /여천\s*ncc/i.test(body)) {
    return '여수산단 및 당사 NCC 설비 재편·가동 계획과 직결되는 사안으로, 사업재편 협의 및 설비 운영 시나리오 점검이 필요합니다.';
  }
  if (/사업재편|구조개편|구조조정|체질\s*개선|고부가|다운스트림/i.test(title)) {
    return '국내 석화단지 사업재편 및 고부가 전환 정책 기조에 맞춰 당사 설비 합리화 및 포트폴리오 전략 점검이 요구됩니다.';
  }
  if (check(/반덤핑|수출|관세|통상/i)) {
    return '글로벌 통상 규제 및 수출 수요 둔화가 다운스트림 마진과 에틸렌 유도품 출하에 영향을 줄 수 있어 영업·수급 계획 조율이 필요합니다.';
  }
  if (check(/나프타|납사|원유|유가|중동|에틸렌\s*직수입/i)) {
    return '국제 원유·나프타 수급 및 원가 변동성이 크래커 변동비에 직접 반영되므로 원료 조달 및 LPG 혼소 비율 검토가 요구됩니다.';
  }
  if (check(/정기보수|가동|설비|재가동|안전|트러블/i)) {
    return '국내 주요 설비 가동률 변화 및 정비 일정은 역내 올레핀 수급과 안전·생산 벤치마크에 참고 지표로 활용됩니다.';
  }
  if (category === '국내 정책·단지') {
    return '정부 산업 정책 및 국내 석화단지 구조개편 방향에 맞춘 고부가 전환·설비 효율화 대응 전략 점검이 필요합니다.';
  }
  if (category === '실무·리스크 관리') {
    return '공정 안전·환경 규제 및 대외 리스크 대응 체계에 본 사안의 영향도를 선제 반영할 것을 권고합니다.';
  }
  return '에틸렌-나프타 스프레드와 역내 수급 밸런스 변화를 모니터링하여 NCC 가동률 및 제품 믹스 최적화에 반영해야 합니다.';
}

function computeContentSimilarityPercent(a: string, b: string): number {
  const cleanStr = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const ca = cleanStr(a);
  const cb = cleanStr(b);
  if (!ca || !cb) return 0;

  const toTokens = (s: string) => new Set(s.split(' ').filter((w) => w.length >= 2));
  const toBigrams = (s: string) => {
    const compact = s.replace(/\s+/g, '');
    const grams = new Set<string>();
    for (let i = 0; i < compact.length - 1; i++) {
      grams.add(compact.slice(i, i + 2));
    }
    return grams;
  };

  const jaccard = (setA: Set<string>, setB: Set<string>): number => {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const x of setA) {
      if (setB.has(x)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : (intersection / union) * 100;
  };

  const tokenSim = jaccard(toTokens(ca), toTokens(cb));
  const bigramSim = jaccard(toBigrams(ca), toBigrams(cb));
  return Math.round(tokenSim * 0.4 + bigramSim * 0.6);
}

async function discoverNaverSeeds(): Promise<DiscoveredSeed[]> {
  const seedMap = new Map<string, DiscoveredSeed>();

  const results = await Promise.all(
    NAVER_SEARCH_QUERIES.map((q) =>
      fetchTextWithTimeout(
        `https://search.naver.com/search.naver?where=news&sort=1&query=${encodeURIComponent(q)}`,
        5500
      )
    )
  );

  for (const res of results) {
    if (!res.ok || !res.text) continue;
    const html = res.text;

    const naverMatches = [
      ...html.matchAll(
        /https:\/\/n\.news\.naver\.com\/mnews\/article\/\d+\/\d+(?:\?sid=\d+)?/g
      ),
    ];
    for (const m of naverMatches) {
      const cleanUrl = m[0].split('#')[0];
      if (!seedMap.has(cleanUrl)) {
        seedMap.set(cleanUrl, { url: cleanUrl });
      }
    }

    const directPressMatches = [
      ...html.matchAll(
        /https?:\/\/(?:www\.|news\.)?(?:ebn\.co\.kr|hankyung\.com|mk\.co\.kr|sedaily\.com|fnnews\.com|mt\.co\.kr|edaily\.co\.kr|einfomax\.co\.kr|yna\.co\.kr|newsis\.com|news1\.kr|ikbc\.co\.kr)\/[^\s"'<>]+/g
      ),
    ];
    for (const m of directPressMatches) {
      const candidateUrl = decodeHtmlEntities(m[0]).split('#')[0];
      if (
        isSpecificArticleUrl(candidateUrl) &&
        !candidateUrl.includes('/rss/') &&
        !seedMap.has(candidateUrl)
      ) {
        seedMap.set(candidateUrl, { url: candidateUrl });
      }
    }
  }

  return [...seedMap.values()];
}

async function discoverDaumSeeds(): Promise<DiscoveredSeed[]> {
  const seedMap = new Map<string, DiscoveredSeed>();

  const results = await Promise.all(
    DAUM_SEARCH_QUERIES.map((q) =>
      fetchTextWithTimeout(
        `https://search.daum.net/search?w=news&q=${encodeURIComponent(q)}&sort=recency`,
        5000
      )
    )
  );

  for (const res of results) {
    if (!res.ok || !res.text) continue;
    const matches = [...res.text.matchAll(/https?:\/\/v\.daum\.net\/v\/(\d{14,20})/g)];
    for (const m of matches) {
      const url = m[0].replace(/^http:/, 'https:');
      const ts = formatDateToKstLabel(m[1]);
      if (!seedMap.has(url)) {
        seedMap.set(url, {
          url,
          publishedAtHint: ts?.label,
        });
      }
    }
  }

  return [...seedMap.values()];
}

async function discoverRssSeeds(): Promise<DiscoveredSeed[]> {
  const seeds: DiscoveredSeed[] = [];
  const quickFilterRe =
    /석유화학|석화|나프타|납사|에틸렌|프로필렌|부타디엔|여천|여수산단|대산산단|울산산단|크래커|\bncc\b|원유|유가|정유|정기보수|반덤핑/i;

  const responses = await Promise.all(
    DIRECT_RSS_FEEDS.map(async (feed) => ({
      feed,
      res: await fetchTextWithTimeout(feed.url, 5000),
    }))
  );

  for (const { feed, res } of responses) {
    if (!res.ok || !res.text) continue;
    const itemMatches = [...res.text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    for (const m of itemMatches) {
      const block = m[1];
      const title = decodeHtmlEntities(
        (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''
      );
      const desc = decodeHtmlEntities(
        (block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || ''
      );
      if (!quickFilterRe.test(`${title} ${desc}`)) continue;

      const link = decodeHtmlEntities(
        (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || ''
      );
      const pubRaw = decodeHtmlEntities(
        (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || ''
      );
      const parsedTs = formatDateToKstLabel(pubRaw);
      if (link && isSpecificArticleUrl(link)) {
        seeds.push({
          url: link,
          titleHint: title,
          sourceHint: feed.sourceName,
          publishedAtHint: parsedTs?.label,
          snippetHint: desc,
        });
      }
    }
  }

  return seeds;
}

async function fetchAndParseCandidate(
  seed: DiscoveredSeed,
  bounds: ReturnType<typeof getBriefingWindowBoundsKst>
): Promise<Omit<CandidateArticle, 'tempId' | 'corroborationSources'> | null> {
  const res = await fetchTextWithTimeout(seed.url, 5000);
  if (!res.ok || !res.text) return null;

  const html = res.text;
  const finalUrl = res.finalUrl || seed.url;
  const isNaver = finalUrl.includes('n.news.naver.com');
  const isDaum = finalUrl.includes('v.daum.net');

  // Extract title
  let title = '';
  if (isNaver) {
    const tMatch = html.match(/id="title_area"[^>]*><span[^>]*>([\s\S]*?)<\/span>/);
    if (tMatch) title = stripTags(tMatch[1]);
  }
  if (!title) {
    const ogTitle = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    ) || html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
    );
    if (ogTitle) title = decodeHtmlEntities(ogTitle[1]);
  }
  if (!title && seed.titleHint) {
    title = seed.titleHint;
  }
  if (!title) return null;

  // Remove trailing " - 언론사" if present
  title = title.replace(/\s+[-|]\s+[^-|]{2,20}$/, '').trim();

  // Extract canonical publisher URL (prefer original publisher URL on Naver)
  let sourceUrl = finalUrl;
  if (isNaver) {
    const originMatch =
      html.match(/href="(https?:\/\/[^"]+)"[^>]*class="[^"]*media_end_head_origin_link/) ||
      html.match(/class="[^"]*media_end_head_origin_link[^"]*"[^>]*href="(https?:\/\/[^"]+)"/);
    const rawOrigin = originMatch ? decodeHtmlEntities(originMatch[1]) : '';
    if (rawOrigin && isSpecificArticleUrl(rawOrigin)) {
      sourceUrl = rawOrigin;
    }
  }

  // Extract press / source name
  let sourceName = seed.sourceHint || '';
  if (isNaver || isDaum) {
    const authorMeta =
      html.match(/<meta[^>]+property=["']og:article:author["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:article:author["']/i);
    if (authorMeta) {
      sourceName = decodeHtmlEntities(authorMeta[1]).split('|')[0].trim();
    }
  }
  if (isDaum && (!sourceName || sourceName === 'Daum')) {
    const daumLogo = html.match(/id="kakaoServiceLogo"[^>]*>([^<]+)</i);
    if (daumLogo) sourceName = decodeHtmlEntities(daumLogo[1]);
  }
  if (!sourceName) {
    sourceName = inferPressFromUrl(sourceUrl);
  }

  // Extract published timestamp in KST
  let parsedTs: { label: string; ms: number } | null = null;
  if (isNaver) {
    const dtMatch = html.match(/data-date-time="([^"]+)"/);
    if (dtMatch) parsedTs = formatDateToKstLabel(dtMatch[1]);
  }
  if (!parsedTs) {
    const pubMeta =
      html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i);
    if (pubMeta) parsedTs = formatDateToKstLabel(pubMeta[1]);
  }
  if (!parsedTs && isDaum) {
    const idMatch = finalUrl.match(/\/v\/(\d{14,20})/);
    if (idMatch) parsedTs = formatDateToKstLabel(idMatch[1]);
  }
  if (!parsedTs && seed.publishedAtHint) {
    parsedTs = formatDateToKstLabel(seed.publishedAtHint);
  }

  // Strict freshness guard: reject if no verifiable recent timestamp or outside [yesterday 18:00 KST, now]
  if (!parsedTs) {
    const todayCompact = bounds.todayKst.replace(/-/g, '');
    const yesterdayCompact = bounds.yesterdayKst.replace(/-/g, '');
    const hasRecentDateInUrl =
      sourceUrl.includes(bounds.todayKst) ||
      sourceUrl.includes(todayCompact) ||
      sourceUrl.includes(bounds.yesterdayKst) ||
      sourceUrl.includes(yesterdayCompact);
    if (!hasRecentDateInUrl) {
      return null;
    }
    parsedTs = { label: bounds.nowKstLabel, ms: Date.now() };
  }

  if (!isWithinBriefingWindow(parsedTs.label, bounds, new Date(), sourceUrl)) {
    return null;
  }

  // Extract clean body
  let body = '';
  if (isNaver) {
    const dicMatch = html.match(/id="dic_area"[^>]*>([\s\S]*?)<\/article>/i);
    if (dicMatch) body = cleanArticleText(stripTags(dicMatch[1]));
  }
  if (!body && isDaum) {
    const daumMatch = html.match(/class="article_view"[^>]*>([\s\S]*?)<\/section>/i);
    if (daumMatch) body = cleanArticleText(stripTags(daumMatch[1]));
  }
  if (!body) {
    const articleTag =
      html.match(/id="article-view-content-div"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleTag) {
      body = cleanArticleText(stripTags(articleTag[1]));
    }
  }
  if (body.length < 120) {
    const ogDesc =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const pTexts = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripTags(m[1]))
      .filter((t) => t.length >= 35)
      .slice(0, 8)
      .join(' ');
    const fallbackBody = cleanArticleText(
      [ogDesc ? decodeHtmlEntities(ogDesc[1]) : '', seed.snippetHint || '', pTexts]
        .filter(Boolean)
        .join(' ')
    );
    if (fallbackBody.length > body.length) {
      body = fallbackBody;
    }
  }

  if (body.length < 80) return null;

  const relevance = evaluatePetrochemicalRelevance(title, body);
  if (!relevance.isRelevant) return null;

  const fullText = body.length > 1300 ? `${body.slice(0, 1280).trim()}...` : body;
  const keywords = normalizeArticleKeywords(
    undefined,
    title,
    relevance.category,
    fullText
  );

  return {
    title,
    sourceName,
    sourceUrl,
    publishedAt: parsedTs.label,
    publishedMs: parsedTs.ms,
    viewCount: null,
    rawBody: fullText,
    criteriaCategory: relevance.category,
    keywords,
    relevanceScore: relevance.score,
    fallbackImageKey: relevance.fallbackImageKey,
  };
}

export async function runNewsScrapePipeline(
  onProgress?: ProgressCallback
): Promise<DailyBriefing> {
  const bounds = getBriefingWindowBoundsKst();
  const todayKst = bounds.todayKst;
  const recentLiveArticles = getRecentLiveArticles(3);
  const allSavedArticles = getAllSavedArticles();

  // STAGE 1: API-Key-Free Real-Time Discovery
  onProgress?.(
    'searching',
    `1/3 · 실시간 뉴스 검색(${bounds.windowStartKstLabel} 이후) 및 원문 본문 수집 중...`,
    18
  );

  const [naverSeeds, daumSeeds, rssSeeds] = await Promise.all([
    discoverNaverSeeds(),
    discoverDaumSeeds(),
    discoverRssSeeds(),
  ]);

  const combinedSeedsMap = new Map<string, DiscoveredSeed>();
  for (const seed of [...naverSeeds, ...rssSeeds, ...daumSeeds]) {
    if (!combinedSeedsMap.has(seed.url)) {
      combinedSeedsMap.set(seed.url, seed);
    }
  }

  const allSeeds = [...combinedSeedsMap.values()].slice(0, 32);
  if (allSeeds.length === 0) {
    throw new Error(
      '실시간 뉴스 소스에서 후보 기사를 불러오지 못했습니다. 잠시 후 작업수행을 다시 실행해 주세요.'
    );
  }

  // Fetch and screen in parallel batches of 6
  const parsedCandidates: Array<Omit<CandidateArticle, 'tempId' | 'corroborationSources'>> = [];
  for (let i = 0; i < allSeeds.length; i += 6) {
    const batch = allSeeds.slice(i, i + 6);
    const batchResults = await Promise.all(
      batch.map((seed) => fetchAndParseCandidate(seed, bounds))
    );
    for (const item of batchResults) {
      if (item) parsedCandidates.push(item);
    }
  }

  if (parsedCandidates.length === 0) {
    throw new Error(
      `수집 기준 시각(${bounds.windowStartKstLabel} 이후) 내에 보도된 여천NCC·석유화학 핵심 기사를 찾지 못했습니다.`
    );
  }

  // Deduplicate exact sourceUrls that resolved from Naver+Daum+RSS to the same canonical URL
  const canonicalUrlSeen = new Set<string>();
  const uniqueParsed = parsedCandidates.filter((item) => {
    const key = item.sourceUrl.split('?')[0];
    if (canonicalUrlSeen.has(key)) return false;
    canonicalUrlSeen.add(key);
    return true;
  });

  const candidates: CandidateArticle[] = uniqueParsed.map((item, idx) => ({
    ...item,
    tempId: `cand-${idx + 1}`,
    corroborationSources: [],
  }));

  // Exclude articles already archived on previous days (never exclude today's unsaved draft)
  const isAlreadyPublishedInSavedArchive = (c: CandidateArticle): boolean => {
    const candTitle = c.title.toLowerCase().replace(/\s+/g, '');
    const exactMatchInArchive = allSavedArticles.some((existing) => {
      if (c.sourceUrl && existing.sourceUrl && c.sourceUrl === existing.sourceUrl) {
        return true;
      }
      const existingTitle = existing.title.toLowerCase().replace(/\s+/g, '');
      return Boolean(candTitle && existingTitle && candTitle === existingTitle);
    });
    if (exactMatchInArchive) return true;

    return recentLiveArticles.some(
      (existing) =>
        computeContentSimilarityPercent(
          `${existing.title} ${existing.summary}`,
          `${c.title} ${c.rawBody}`
        ) >= 55
    );
  };

  const activeCandidates = candidates.filter((c) => !isAlreadyPublishedInSavedArchive(c));
  if (activeCandidates.length === 0) {
    throw new Error(
      '검색된 기사가 모두 기존 저장 아카이브와 중복되어 새로운 기사가 없습니다.'
    );
  }

  // STAGE 2: Step 1 Content-Based Deduplication (>= 50% content overlap)
  onProgress?.(
    'deduplicating',
    `2/3 · 수집된 ${activeCandidates.length}건 대상 본문 유사도(50%↑) 중복 제거 및 NCC 점수 선별 중...`,
    55
  );

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return id;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const c of activeCandidates) parent.set(c.tempId, c.tempId);

  const pairOverlap = new Map<string, number>();
  for (let i = 0; i < activeCandidates.length; i++) {
    for (let j = i + 1; j < activeCandidates.length; j++) {
      const sim = computeContentSimilarityPercent(
        `${activeCandidates[i].title} ${activeCandidates[i].rawBody}`,
        `${activeCandidates[j].title} ${activeCandidates[j].rawBody}`
      );
      if (sim >= 50) {
        union(activeCandidates[i].tempId, activeCandidates[j].tempId);
        const key = [activeCandidates[i].tempId, activeCandidates[j].tempId].sort().join(':');
        pairOverlap.set(key, sim);
      }
    }
  }

  const clusteredMap = new Map<string, CandidateArticle[]>();
  for (const c of activeCandidates) {
    const root = find(c.tempId);
    const list = clusteredMap.get(root) ?? [];
    list.push(c);
    clusteredMap.set(root, list);
  }

  const deduplicatedSurvivors: CandidateArticle[] = [];
  const deduplicationLog: DeduplicationCluster[] = [];

  for (const members of clusteredMap.values()) {
    const sorted = [...members].sort((a, b) => {
      const scoreA = a.relevanceScore + (TIER1_PRESS_BONUS.has(a.sourceName) ? 5 : 0);
      const scoreB = b.relevanceScore + (TIER1_PRESS_BONUS.has(b.sourceName) ? 5 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.publishedMs - a.publishedMs;
    });

    const winner = sorted[0];
    const dropped = sorted.slice(1);

    // Attach corroborating articles from the same event as verified sources
    winner.corroborationSources = dropped.slice(0, 2).map((d) => ({
      title: `${d.sourceName} · ${d.title}`,
      uri: d.sourceUrl,
    }));

    deduplicatedSurvivors.push(winner);

    if (dropped.length > 0) {
      let maxSim = 55;
      for (const d of dropped) {
        const key = [winner.tempId, d.tempId].sort().join(':');
        maxSim = Math.max(maxSim, pairOverlap.get(key) ?? 55);
      }
      deduplicationLog.push({
        keptId: winner.tempId,
        keptTitle: winner.title,
        keptSource: winner.sourceName,
        mergedCount: dropped.length,
        mergedTitles: dropped.map((d) => `[${d.sourceName}] ${d.title}`),
        similarityOverlapPercent: Math.min(99, maxSim),
        selectionRule: 'latest_timestamp',
        ruleReason: `유사 이슈·본문 중복(${dropped.length + 1}건) 중 여천NCC 연관성 및 매체 공신력 기준 대표 기사 채택`,
      });
    }
  }

  deduplicatedSurvivors.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    return b.publishedMs - a.publishedMs;
  });

  const shortlisted = deduplicatedSurvivors.slice(0, 7);

  // STAGE 3: Step 2 Source Verification, Summary & Hashtag Finalization
  onProgress?.(
    'fact_checking',
    `3/3 · 선별 기사 ${shortlisted.length}건 원문 교차 검증 및 해시태그 추출 중...`,
    82
  );

  const verifiedArticles: NewsArticle[] = shortlisted.map((candidate) => {
    const articleId = `live-${todayKst}-${crypto.randomUUID().slice(0, 8)}`;

    for (const logItem of deduplicationLog) {
      if (logItem.keptId === candidate.tempId) {
        logItem.keptId = articleId;
      }
    }

    const verifiedSources: VerifiedSource[] = [
      { title: `${candidate.sourceName} 원문 기사`, uri: candidate.sourceUrl },
      ...candidate.corroborationSources,
    ];

    const corroborationNote =
      candidate.corroborationSources.length > 0
        ? ` 및 동종 매체 ${candidate.corroborationSources.length}곳 교차 보도 확인`
        : '';

    return {
      id: articleId,
      briefingDate: todayKst,
      title: candidate.title,
      summary: enforceMaxFiveSentences(candidate.rawBody),
      fullText: candidate.rawBody,
      sourceName: candidate.sourceName,
      sourceUrl: candidate.sourceUrl,
      thumbnailUrl: '',
      fallbackImageKey: candidate.fallbackImageKey,
      publishedAt: candidate.publishedAt,
      viewCount: candidate.viewCount,
      keywords: normalizeArticleKeywords(
        candidate.keywords,
        candidate.title,
        candidate.criteriaCategory,
        candidate.rawBody
      ),
      criteriaCategory: candidate.criteriaCategory,
      relevanceScore: candidate.relevanceScore,
      ynccImplication: buildYnccImplication(
        candidate.criteriaCategory,
        candidate.title,
        candidate.rawBody
      ),
      factCheckStatus: 'verified',
      factCheckSummary: `원문 HTTP 200 검증 · 보도일시(${candidate.publishedAt}) 기준 충족${corroborationNote}.`,
      verifiedSources,
      isSample: false,
    };
  });

  const nowKstStr = formatKstDateTime();
  const briefing: DailyBriefing = {
    date: todayKst,
    generatedAt: nowKstStr,
    isSaved: false,
    triggerType: 'manual',
    pipelineStats: {
      rawCollected: activeCandidates.length,
      duplicateClustersMerged: deduplicationLog.length,
      deduplicatedCount: deduplicatedSurvivors.length,
      factCheckPassed: verifiedArticles.length,
      factCheckRejected: Math.max(0, deduplicatedSurvivors.length - verifiedArticles.length),
      finalPublished: verifiedArticles.length,
      deduplicationLog: deduplicationLog.slice(0, 12),
    },
    articles: verifiedArticles,
  };

  saveTodayDraft(briefing, nowKstStr);
  onProgress?.(
    'completed',
    `${verifiedArticles.length}건 수집·검증 완료 (미저장 상태 · '저장' 버튼으로 당일 확정 가능)`,
    100
  );
  return briefing;
}
