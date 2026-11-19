import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronDown } from 'lucide-react';

interface ArchiveSectionProps {
  availableDates: string[];
  selectedDate: string;
  todayKst: string;
  onSelectDate: (date: string) => void;
}

interface MonthGroup {
  yearMonth: string; // YYYY-MM
  monthNumber: string; // MM
  dates: string[];
}

interface YearGroup {
  year: string; // YYYY
  months: MonthGroup[];
  totalDays: number;
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateButtonLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAYS_KO[dt.getUTCDay()] ?? '';
  return `${dateStr} (${weekday})`;
}

export function ArchiveSection({
  availableDates,
  selectedDate,
  todayKst,
  onSelectDate,
}: ArchiveSectionProps) {
  // Other months start collapsed by default; current month stays always visible
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());

  const currentYearMonth = useMemo(() => {
    if (todayKst && todayKst.length >= 7) {
      return todayKst.slice(0, 7);
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date());
  }, [todayKst]);

  const yearGroups: YearGroup[] = useMemo(() => {
    const sorted = [...availableDates].sort((a, b) => b.localeCompare(a));
    const yearMap = new Map<string, Map<string, string[]>>();

    for (const dateStr of sorted) {
      const year = dateStr.slice(0, 4);
      const yearMonth = dateStr.slice(0, 7);
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(yearMonth)) {
        monthMap.set(yearMonth, []);
      }
      monthMap.get(yearMonth)!.push(dateStr);
    }

    return Array.from(yearMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, monthMap]) => {
        const months = Array.from(monthMap.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([yearMonth, dates]) => ({
            yearMonth,
            monthNumber: yearMonth.slice(5, 7),
            dates,
          }));
        const totalDays = months.reduce((sum, m) => sum + m.dates.length, 0);
        return { year, months, totalDays };
      });
  }, [availableDates]);

  const toggleMonth = (yearMonth: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(yearMonth)) {
        next.delete(yearMonth);
      } else {
        next.add(yearMonth);
      }
      return next;
    });
  };

  const handleDateClick = (dateStr: string) => {
    onSelectDate(dateStr);
    document.getElementById('briefing-feed')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="archive-section"
      className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3.5 w-3.5 text-[#0369A1] dark:text-sky-400" aria-hidden="true" />
            <span>KST 기준 일일 브리핑 아카이브</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            아카이브
          </h2>
        </div>

        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          총 {availableDates.length}일치 보관 · 당월({currentYearMonth}) 상시 노출
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-8">
        {yearGroups.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            저장된 브리핑 아카이브가 없습니다.
          </p>
        ) : (
          yearGroups.map((yearGroup) => (
            <div key={yearGroup.year} className="space-y-4">
              {/* Top-level Year Heading */}
              <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <h3 className="text-lg font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                  {yearGroup.year}년
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {yearGroup.totalDays}개 브리핑
                </span>
              </div>

              {/* Months underneath Year */}
              <div className="space-y-4">
                {yearGroup.months.map((month) => {
                  const isCurrentMonth = month.yearMonth === currentYearMonth;
                  const isExpanded = isCurrentMonth || expandedMonths.has(month.yearMonth);
                  const monthNumInt = Number(month.monthNumber);

                  return (
                    <div
                      key={month.yearMonth}
                      className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
                    >
                      {isCurrentMonth ? (
                        /* Current Month Header (Always visible) */
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/70 dark:border-slate-800/80">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                              {monthNumInt}월
                            </span>
                            <span className="text-xs font-medium text-[#0369A1] dark:text-sky-400">
                              당월 · 상시 표시
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {month.dates.length}일치
                          </span>
                        </div>
                      ) : (
                        /* Past / Other Month Toggle Button */
                        <button
                          type="button"
                          onClick={() => toggleMonth(month.yearMonth)}
                          aria-expanded={isExpanded}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors rounded-lg cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                              {monthNumInt}월
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {isExpanded ? '클릭하여 접기' : '클릭하여 브리핑 보기'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            <span>{month.dates.length}일치</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                              aria-hidden="true"
                            />
                          </div>
                        </button>
                      )}

                      {/* Date Buttons Grid underneath Month */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key={`month-content-${month.yearMonth}`}
                            initial={isCurrentMonth ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={isCurrentMonth ? undefined : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div
                              className={`flex flex-wrap items-center gap-2.5 px-4 py-3.5 ${
                                !isCurrentMonth
                                  ? 'border-t border-slate-200/70 dark:border-slate-800/80'
                                  : ''
                              }`}
                            >
                              {month.dates.map((d) => {
                                const active = selectedDate === d;
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => handleDateClick(d)}
                                    className={`rounded-lg border px-3.5 py-2 text-xs font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                      active
                                        ? 'border-[#0369A1] bg-[#0369A1] text-white font-semibold'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                    }`}
                                  >
                                    {formatDateButtonLabel(d)}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
