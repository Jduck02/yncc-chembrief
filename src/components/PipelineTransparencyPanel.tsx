import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronDown, GitMerge, Newspaper, ShieldCheck } from 'lucide-react';
import type { DailyBriefing } from '../types/news';

interface PipelineTransparencyPanelProps {
  briefing: DailyBriefing | null;
}

const TARGET_OUTLETS = [
  'EBN 산업경제',
  '한국경제',
  '매일경제',
  '서울경제',
  '연합인포맥스',
  '머니투데이',
  '이데일리',
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
}: PipelineTransparencyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dedupeLog = briefing?.pipelineStats.deduplicationLog ?? [];

  return (
    <section id="pipeline-criteria" className="pt-4">
      <div className="rounded-xl border border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-white dark:bg-[#1F1F23] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[#FAF7F2] dark:hover:bg-[#0B0B0D]/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6A00]"
        >
          <div className="space-y-1 min-w-0">
            <h2 className="text-base font-bold tracking-tight text-[#0B0B0D] dark:text-[#F4EFE6]">
              여천NCC 맞춤형 기사 선별 및 2단계 검증 알고리즘
            </h2>
            <p className="text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/60 font-mono tabular-nums truncate">
              4대 선별 기준 · 본문 50%↑ 중복 제거 {dedupeLog.length}그룹 · 팩트체크 통과{' '}
              {briefing?.pipelineStats.factCheckPassed ?? 0}건
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#C84D00] dark:text-[#FFB000] shrink-0 whitespace-nowrap">
            <span>{isExpanded ? '접기' : '상세 보기'}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-[#1F1F23]/10 dark:border-[#F4EFE6]/10 p-6 space-y-6">
                <p className="text-sm text-[#1F1F23]/75 dark:text-[#F4EFE6]/70">
                  자동 수집 기능 없이 사용자가 직접 <strong className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">작업수행</strong> 버튼을 클릭할 때만 실행됩니다. 전일 18:00 이후 ~ 당일 자정 이전 및 당일 보도 기사 중 아래 4대 기준과 중복 제거·팩트체크 검증을 통과한 기사만 게시되며, <strong className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">저장</strong> 버튼을 누르기 전까지는 작업수행을 수차례 반복할 수 있습니다. 저장 확정 시 당일 자정(00:00 KST)까지 조회만 가능하며 익일부터 다시 작업수행 및 저장이 활성화됩니다.
                </p>

                {/* 4 Criteria Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SELECTION_CRITERIA.map((item) => (
                    <div
                      key={item.index}
                      className="rounded-xl border border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-[#FAF7F2] dark:bg-[#0B0B0D]/60 p-4 space-y-2"
                    >
                      <div className="font-mono tabular-nums text-xs font-bold text-[#C84D00] dark:text-[#FFB000]">
                        {item.index}
                      </div>
                      <h3 className="text-sm font-bold text-[#0B0B0D] dark:text-[#F4EFE6]">
                        {item.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-[#1F1F23]/75 dark:text-[#F4EFE6]/70">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Step 1 & Step 2 Verification Audit */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Step 1: Content Deduplication */}
                  <div className="rounded-xl border border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-[#FAF7F2] dark:bg-[#0B0B0D]/60 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#0B0B0D] dark:text-[#F4EFE6]">
                        <GitMerge className="h-4 w-4 text-[#C84D00] dark:text-[#FFB000]" aria-hidden="true" />
                        <span>Step 1. 본문 유사도(50%↑) 기반 중복 제거 로그</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#1F1F23]/60 dark:text-[#F4EFE6]/60">
                        {dedupeLog.length}개 병합 그룹
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-[#1F1F23]/75 dark:text-[#F4EFE6]/70">
                      제목이 달라도 본문 핵심 내용이 50% 이상 겹치는 기사를 단일 그룹으로 묶어{' '}
                      <strong className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
                        최다 조회수 기사 1건(조회수 미확인 시 최신 게시 기사)
                      </strong>
                      만 채택합니다.
                    </p>

                    {dedupeLog.length > 0 ? (
                      <div className="space-y-3 pt-1">
                        {dedupeLog.map((cluster, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-[#1F1F23]/10 dark:border-[#F4EFE6]/10 bg-white dark:bg-[#1F1F23] p-3.5 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2 font-mono tabular-nums text-[#1F1F23]/60 dark:text-[#F4EFE6]/60">
                              <span>채택: {cluster.keptSource}</span>
                              <span>
                                유사도 {cluster.similarityOverlapPercent}% · {cluster.mergedCount}건 제외
                              </span>
                            </div>
                            <div className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
                              {cluster.keptTitle}
                            </div>
                            <div className="text-[#1F1F23]/70 dark:text-[#F4EFE6]/65">
                              선별 기준: {cluster.ruleReason}
                            </div>
                            {cluster.mergedTitles.length > 0 && (
                              <div className="text-[#1F1F23]/50 dark:text-[#F4EFE6]/45 truncate">
                                제외된 유사 기사: {cluster.mergedTitles.join(' / ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#1F1F23]/60 dark:text-[#F4EFE6]/60 py-2">
                        선택된 날짜의 브리핑에는 50% 이상 중복으로 병합된 기사 그룹이 없습니다.
                      </div>
                    )}
                  </div>

                  {/* Step 2: Fact-Checking & Media Coverage */}
                  <div className="rounded-xl border border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-[#FAF7F2] dark:bg-[#0B0B0D]/60 p-5 space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#0B0B0D] dark:text-[#F4EFE6]">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span>Step 2. Google Search 교차 검증 팩트체크</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#1F1F23]/75 dark:text-[#F4EFE6]/70">
                        선별된 기사의 핵심 수치(나프타·에틸렌 가격, 스프레드, 증설 규모, 기업명, 규제 내용)를 Google Search Tool을 통해 복수 출처와 교차 검증한 뒤 통과 기사만 업로드합니다.
                      </p>
                      {briefing && (
                        <div className="flex items-center gap-3 pt-1 text-xs font-mono tabular-nums text-[#1F1F23]/75 dark:text-[#F4EFE6]/75">
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            검증 통과 {briefing.pipelineStats.factCheckPassed}건
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>왜곡/미확인 제외 {briefing.pipelineStats.factCheckRejected}건</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#1F1F23]/10 dark:border-[#F4EFE6]/10 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
                        <Newspaper className="h-3.5 w-3.5 text-[#C84D00] dark:text-[#FFB000]" aria-hidden="true" />
                        <span>주요 모니터링 대상 공신력 매체</span>
                      </div>
                      <div className="text-xs leading-relaxed text-[#1F1F23]/65 dark:text-[#F4EFE6]/60">
                        {TARGET_OUTLETS.join(' · ')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
