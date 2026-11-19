import { CheckCircle2, GitMerge, Newspaper, ShieldCheck } from 'lucide-react';
import type { DailyBriefing } from '../types/news';

interface PipelineTransparencyPanelProps {
  briefing: DailyBriefing | null;
  availableDates: string[];
  onSelectDate: (date: string) => void;
}

const TARGET_OUTLETS = [
  'EBN 산업경제',
  '한국경제',
  '매일경제',
  '서울경제',
  '연합인포맥스',
  '화학저널',
  'Reuters',
  'ICIS',
  'S&P Global (Chemical Week)',
];

const SELECTION_CRITERIA = [
  {
    index: '01',
    title: '글로벌 석유화학 산업 이슈',
    desc: '글로벌 에틸렌·프로필렌 수급, 중국 증설 및 자급률 변화, 중동 정세 및 국제 유가·나프타(Naphtha) 가격 급변 사안.',
  },
  {
    index: '02',
    title: '국내 석유화학 산업 이슈',
    desc: '국내 석화업계 사업재편·구조조정, 정부 산업 경쟁력 정책, 여수·울산·대산 석유화학단지 동향.',
  },
  {
    index: '03',
    title: 'NCC(납사크래킹) 특화 영향',
    desc: '에틸렌-나프타 스프레드, 크래커 가동률 조정, LPG 혼소 등 순수 NCC 기반 원가 경쟁력 직결 이슈.',
  },
  {
    index: '04',
    title: '실무 및 리스크 관리 가치',
    desc: '여천NCC 영업·구매·생산·안전·환경 부서 계획 수립 지원 및 설비 트러블·환경규제·원료 차질 사전 대비 정보.',
  },
];

export function PipelineTransparencyPanel({
  briefing,
  availableDates,
  onSelectDate,
}: PipelineTransparencyPanelProps) {
  const dedupeLog = briefing?.pipelineStats.deduplicationLog ?? [];

  return (
    <div className="space-y-12 pt-8 border-t border-slate-200 dark:border-slate-800">
      {/* Section 1: NCC Criteria & Target Outlets */}
      <section id="pipeline-criteria" className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            여천NCC 맞춤형 기사 선별 및 2단계 검증 알고리즘
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            매일 오전 09:00 KST(또는 수동 스크랩 실행 시) 아래 4대 기준과 중복 제거·팩트체크 검증을 통과한 하루 3~7건의 핵심 기사만 게시됩니다.
          </p>
        </div>

        {/* 4 Criteria Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SELECTION_CRITERIA.map((item) => (
            <div
              key={item.index}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-2"
            >
              <div className="font-mono tabular-nums text-xs font-semibold text-[#0369A1] dark:text-sky-400">
                {item.index}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Step 1 & Step 2 Verification Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Step 1: Content Deduplication */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <GitMerge className="h-4 w-4 text-[#0369A1] dark:text-sky-400" aria-hidden="true" />
                <span>Step 1. 본문 유사도(50%↑) 기반 중복 제거 로그</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {dedupeLog.length}개 병합 그룹
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              제목이 달라도 본문 핵심 내용이 50% 이상 겹치는 기사를 단일 그룹으로 묶어{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                최다 조회수 기사 1건(조회수 미확인 시 최신 게시 기사)
              </strong>
              만 채택합니다.
            </p>

            {dedupeLog.length > 0 ? (
              <div className="space-y-3 pt-1">
                {dedupeLog.map((cluster, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span>채택: {cluster.keptSource}</span>
                      <span>
                        유사도 {cluster.similarityOverlapPercent}% · {cluster.mergedCount}건 제외
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {cluster.keptTitle}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      선별 기준: {cluster.ruleReason}
                    </div>
                    {cluster.mergedTitles.length > 0 && (
                      <div className="text-slate-400 dark:text-slate-500 truncate">
                        제외된 유사 기사: {cluster.mergedTitles.join(' / ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 py-3">
                선택된 날짜의 브리핑에는 50% 이상 중복으로 병합된 기사 그룹이 없습니다.
              </div>
            )}
          </div>

          {/* Step 2: Fact-Checking & Media Coverage */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Step 2. Google Search 교차 검증 팩트체크</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                선별된 기사의 핵심 수치(나프타·에틸렌 가격, 스프레드, 증설 규모, 기업명, 규제 내용)를 Google Search Tool을 통해 복수 출처와 교차 검증한 뒤 통과 기사만 업로드합니다.
              </p>
              {briefing && (
                <div className="flex items-center gap-3 pt-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    검증 통과 {briefing.pipelineStats.factCheckPassed}건
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>왜곡/미확인 제외 {briefing.pipelineStats.factCheckRejected}건</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Newspaper className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>주요 모니터링 대상 공신력 매체</span>
              </div>
              <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {TARGET_OUTLETS.join(' · ')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Briefing Archive */}
      <section id="archive-section" className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          일일 브리핑 아카이브
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {availableDates.map((d) => {
            const active = briefing?.date === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onSelectDate(d);
                  document
                    .getElementById('briefing-feed')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`rounded-lg border px-3.5 py-2 text-xs font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#0369A1] bg-[#0369A1] text-white font-semibold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
