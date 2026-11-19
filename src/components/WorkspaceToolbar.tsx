import { Calendar, Moon, Search, Sun, X } from 'lucide-react';
import type { PipelineStats, ScrapeJobStatus } from '../types/news';

interface WorkspaceToolbarProps {
  selectedDate: string;
  availableDates: string[];
  onSelectDate: (date: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  scheduler: ScrapeJobStatus;
  pipelineStats?: PipelineStats;
  generatedAt?: string;
  triggerType?: 'scheduled_09kst' | 'manual' | 'curated_seed';
}

export function WorkspaceToolbar({
  selectedDate,
  availableDates,
  onSelectDate,
  searchQuery,
  onSearchChange,
  theme,
  onToggleTheme,
  scheduler,
  pipelineStats,
  generatedAt,
  triggerType,
}: WorkspaceToolbarProps) {
  const triggerLabel =
    triggerType === 'scheduled_09kst'
      ? '매일 09:00 KST 정기 수집'
      : triggerType === 'manual'
        ? '실시간 AI 검색 수집'
        : '여천NCC 기본 큐레이션 브리핑';

  return (
    <section
      id="workspace-toolbar"
      className="border-b border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-[#FAF7F2] dark:bg-[#1F1F23]/65"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-6 space-y-4">
        {/* Top Row: Hero Header & Schedule Metadata */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/60 font-mono tabular-nums">
              <span className="font-semibold text-[#C84D00] dark:text-[#FFB000]">
                여천NCC 석유화학 인텔리전스 보드
              </span>
              <span aria-hidden="true">·</span>
              <span>{triggerLabel}</span>
              {generatedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>업데이트: {generatedAt}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0B0D] dark:text-[#F4EFE6] text-balance">
              석유화학산업 뉴스 브리핑
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className="text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/60 font-mono tabular-nums text-right hidden sm:block">
              다음 정기 스크랩: {scheduler.nextScheduledRunKst}
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="inline-flex items-center gap-2 rounded-lg border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 bg-white dark:bg-[#1F1F23] px-3 py-2 text-xs font-medium text-[#0B0B0D] dark:text-[#F4EFE6] hover:border-[#FF6A00]/60 dark:hover:border-[#FFB000]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[#FFB000]" aria-hidden="true" />
                  <span>라이트 모드</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[#1F1F23]" aria-hidden="true" />
                  <span>다크 모드</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Scraper Progress or Error Banner */}
        {(scheduler.isRunning || scheduler.stage === 'error') && (
          <div
            className={`rounded-lg border px-4 py-3 text-xs ${
              scheduler.stage === 'error'
                ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                : 'border-[#FF6A00]/40 bg-[#FF6A00]/10 text-[#0B0B0D] dark:border-[#FFB000]/40 dark:bg-[#FFB000]/10 dark:text-[#F4EFE6]'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium">
                {scheduler.stage === 'error'
                  ? `스크랩 오류: ${scheduler.error}`
                  : scheduler.stageLabel}
              </span>
              {scheduler.isRunning && (
                <span className="font-mono tabular-nums font-bold text-[#C84D00] dark:text-[#FFB000]">
                  {scheduler.progressPercent}%
                </span>
              )}
            </div>
            {scheduler.isRunning && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1F1F23]/15 dark:bg-[#F4EFE6]/15">
                <div
                  className="h-full bg-[#FF6A00] dark:bg-[#FFB000] transition-all duration-300"
                  style={{ width: `${scheduler.progressPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Balanced Controls Row: Pipeline Audit Summary + Date Picker & Search */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-1">
          {pipelineStats ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#1F1F23]/70 dark:text-[#F4EFE6]/65 font-mono tabular-nums">
              <span>
                수집 후보{' '}
                <strong className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
                  {pipelineStats.rawCollected}건
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                본문 50%↑ 중복 그룹 병합{' '}
                <strong className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
                  {pipelineStats.duplicateClustersMerged}그룹
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                팩트체크 교차 검증 통과{' '}
                <strong className="font-semibold text-[#C84D00] dark:text-[#FFB000]">
                  {pipelineStats.finalPublished}건
                </strong>
              </span>
              {pipelineStats.factCheckRejected > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>검증 제외 {pipelineStats.factCheckRejected}건</span>
                </>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center">
              <Calendar
                className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#1F1F23]/50 dark:text-[#F4EFE6]/50"
                aria-hidden="true"
              />
              <select
                aria-label="브리핑 날짜 선택"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="h-9 rounded-lg border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 bg-white dark:bg-[#0B0B0D] pl-8 pr-7 text-xs font-mono tabular-nums text-[#0B0B0D] dark:text-[#F4EFE6] focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d} 브리핑
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#1F1F23]/50 dark:text-[#F4EFE6]/50"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="제목·해시태그·매체 검색..."
                className="h-9 w-52 sm:w-60 rounded-lg border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 bg-white dark:bg-[#0B0B0D] pl-8 pr-7 text-xs text-[#0B0B0D] dark:text-[#F4EFE6] placeholder:text-[#1F1F23]/45 dark:placeholder:text-[#F4EFE6]/40 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="검색어 지우기"
                  className="absolute right-2 text-[#1F1F23]/50 hover:text-[#0B0B0D] dark:text-[#F4EFE6]/50 dark:hover:text-[#F4EFE6] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
