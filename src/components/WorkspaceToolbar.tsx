import { Calendar, Moon, Search, Sun, X } from 'lucide-react';
import type { Department, PipelineStats, ScrapeJobStatus } from '../types/news';

interface WorkspaceToolbarProps {
  selectedDate: string;
  availableDates: string[];
  onSelectDate: (date: string) => void;
  selectedDepartment: Department | '전체';
  onSelectDepartment: (dept: Department | '전체') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  scheduler: ScrapeJobStatus;
  pipelineStats?: PipelineStats;
  generatedAt?: string;
  triggerType?: 'scheduled_09kst' | 'manual' | 'curated_seed';
}

const DEPARTMENTS: Array<Department | '전체'> = [
  '전체',
  '영업',
  '구매',
  '생산',
  '안전',
  '환경',
];

export function WorkspaceToolbar({
  selectedDate,
  availableDates,
  onSelectDate,
  selectedDepartment,
  onSelectDepartment,
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
      id="department-toolbar"
      className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-5 space-y-4">
        {/* Top Row: Hero Header & Schedule Metadata */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>여천NCC 석유화학 인텔리전스 보드</span>
              <span aria-hidden="true">·</span>
              <span>{triggerLabel}</span>
              {generatedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>업데이트: {generatedAt}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              일일 나프타 크래커(NCC) 핵심 산업 브리핑
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums text-right hidden sm:block">
              다음 정기 스크랩: {scheduler.nextScheduledRunKst}
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span>라이트 모드</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
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
                ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium">
                {scheduler.stage === 'error'
                  ? `스크랩 오류: ${scheduler.error}`
                  : scheduler.stageLabel}
              </span>
              {scheduler.isRunning && (
                <span className="font-mono tabular-nums font-semibold">
                  {scheduler.progressPercent}%
                </span>
              )}
            </div>
            {scheduler.isRunning && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sky-200/70 dark:bg-sky-900/60">
                <div
                  className="h-full bg-[#0284C7] transition-all duration-300"
                  style={{ width: `${scheduler.progressPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Controls Row: Department Tabs + Date Picker + Search */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-1">
          {/* Department Segmented Control */}
          <div
            role="tablist"
            aria-label="관련 부서 필터"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1"
          >
            {DEPARTMENTS.map((dept) => {
              const active = selectedDepartment === dept;
              return (
                <button
                  key={dept}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectDepartment(dept)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {dept === '전체' ? '전체 부서' : `${dept}팀`}
                </button>
              );
            })}
          </div>

          {/* Right controls: Date Selector & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center">
              <Calendar
                className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <select
                aria-label="브리핑 날짜 선택"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-7 text-xs font-mono tabular-nums text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
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
                className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="키워드·매체 검색..."
                className="h-9 w-48 sm:w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-7 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="검색어 지우기"
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clean Unboxed Pipeline Audit Summary */}
        {pipelineStats && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span>
              수집 후보{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                {pipelineStats.rawCollected}건
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              본문 50%↑ 중복 그룹 병합{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                {pipelineStats.duplicateClustersMerged}그룹
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              팩트체크 교차 검증 통과{' '}
              <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
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
        )}
      </div>
    </section>
  );
}
