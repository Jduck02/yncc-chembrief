import type { CriteriaCategory } from '../src/types/news.ts';

const EXCLUDED_DEPT_TAGS = new Set([
  '영업',
  '구매',
  '생산',
  '안전',
  '환경',
  '영업팀',
  '구매팀',
  '생산팀',
  '안전팀',
  '환경팀',
  '부서',
]);

const DOMAIN_KEYWORD_LEXICON: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: '여천NCC', patterns: [/여천\s*ncc/i, /yncc/i] },
  { tag: 'NCC스프레드', patterns: [/스프레드/i, /마진/i, /손익분기/i, /bep/i] },
  { tag: '에틸렌', patterns: [/에틸렌/i, /ethylene/i] },
  { tag: '나프타', patterns: [/나프타/i, /납사/i, /naphtha/i] },
  { tag: '프로필렌', patterns: [/프로필렌/i, /propylene/i] },
  { tag: '부타디엔', patterns: [/부타디엔/i, /butadiene/i, /c4/i] },
  { tag: '여수산단', patterns: [/여수산단/i, /여수\s*국가/i, /여수/i] },
  { tag: '대산산단', patterns: [/대산산단/i, /대산/i] },
  { tag: '울산산단', patterns: [/울산산단/i, /울산\s*석유화학/i] },
  { tag: '사업재편', patterns: [/사업재편/i, /구조개편/i, /통합법인/i, /합병/i, /물적분할/i] },
  { tag: '구조조정', patterns: [/구조조정/i, /감축/i, /감산/i, /폐쇄/i, /통폐합/i] },
  { tag: '고부가전환', patterns: [/고부가/i, /스페셜티/i, /친환경\s*소재/i] },
  { tag: '가동률', patterns: [/가동률/i, /가동\s*조정/i, /가동\s*중단/i, /재가동/i, /utilization/i] },
  { tag: '공급과잉', patterns: [/공급\s*과잉/i, /과잉\s*공급/i, /supply\s*strain/i, /자급률/i] },
  { tag: '중국증설', patterns: [/중국/i, /cotc/i, /china/i] },
  { tag: '반덤핑통상', patterns: [/반덤핑/i, /관세/i, /무관세/i, /통상/i, /세제/i] },
  { tag: '수출전망', patterns: [/수출/i, /물동량/i, /수요\s*부진/i] },
  { tag: '에탄크래커', patterns: [/에탄/i, /ecc/i] },
  { tag: 'LPG혼소', patterns: [/lpg/i, /혼소/i, /원료\s*다변화/i] },
  { tag: '다운스트림', patterns: [/다운스트림/i, /downstream/i, /폴리올레핀/i, /폴리에틸렌/i, /pvc/i, /abs/i] },
  { tag: '정기보수', patterns: [/정기보수/i, /대정비/i, /turnaround/i, /정비계획/i] },
  { tag: '플레어스택', patterns: [/플레어/i, /flare/i] },
  { tag: '공정안전', patterns: [/공정안전/i, /psm/i, /파이프랙/i, /안전망/i, /화재/i, /누출/i] },
  { tag: '비산배출', patterns: [/비산배출/i, /ldar/i, /ogc/i, /vocs/i, /탄소중립/i, /cbam/i, /환경규제/i] },
  { tag: '국제유가', patterns: [/유가/i, /중동/i, /원유/i, /crude/i, /두바이유/i, /브렌트유/i] },
  { tag: '석유화학', patterns: [/석유화학/i, /석화/i, /petrochemical/i] },
];

const CATEGORY_DEFAULT_TAGS: Record<CriteriaCategory, string[]> = {
  '글로벌 수급·원료': ['글로벌수급', '나프타', '에틸렌', '석유화학'],
  '국내 정책·단지': ['국내석화', '사업재편', '산업정책', '여수산단'],
  'NCC 마진·가동률': ['NCC마진', '에틸렌스프레드', '나프타', '가동률'],
  '실무·리스크 관리': ['공정안전', '환경규제', '설비관리', '리스크대응'],
};

/**
 * Normalizes and validates article hashtag keywords so every article displays
 * 3 to 6 concise, domain-relevant keywords (excluding department labels).
 */
export function normalizeArticleKeywords(
  rawKeywords: string[] | undefined,
  title: string,
  criteriaCategory: CriteriaCategory,
  bodyText = ''
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const pushTag = (raw: string) => {
    const cleaned = raw
      .replace(/^#+/, '')
      .replace(/[^\p{L}\p{N}_·-]/gu, '')
      .trim();
    if (!cleaned || cleaned.length < 2 || cleaned.length > 16) return;
    const key = cleaned.toLowerCase();
    if (EXCLUDED_DEPT_TAGS.has(key) || seen.has(key)) return;
    seen.add(key);
    result.push(cleaned);
  };

  if (Array.isArray(rawKeywords)) {
    for (const kw of rawKeywords) {
      if (typeof kw === 'string') {
        pushTag(kw);
      }
      if (result.length >= 6) break;
    }
  }

  if (result.length < 3) {
    const corpus = `${title} ${bodyText}`;
    for (const entry of DOMAIN_KEYWORD_LEXICON) {
      if (entry.patterns.some((re) => re.test(corpus))) {
        pushTag(entry.tag);
      }
      if (result.length >= 5) break;
    }
  }

  if (result.length < 3) {
    const defaults = CATEGORY_DEFAULT_TAGS[criteriaCategory] ?? ['석유화학', 'NCC', '산업동향'];
    for (const d of defaults) {
      pushTag(d);
      if (result.length >= 3) break;
    }
  }

  return result.slice(0, 6);
}
