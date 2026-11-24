import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookmarkCheck, CheckCircle2, Play } from 'lucide-react';
import { ArchiveSection } from './components/ArchiveSection';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { PipelineTransparencyPanel } from './components/PipelineTransparencyPanel';
import { TopBar } from './components/TopBar';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import type {
  BriefingsResponse,
  DailyBriefing,
  DailyWorkflowState,
  NewsArticle,
  ScrapeJobStatus,
} from './types/news';

function getBrowserKstDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const DEFAULT_SCHEDULER: ScrapeJobStatus = {
  isRunning: false,
  stage: 'idle',
  stageLabel: '작업수행 버튼 실행 대기 중 (자동 실행 없음)',
  progressPercent: 0,
  lastRunAt: null,
  error: null,
};

const DEFAULT_WORKFLOW: DailyWorkflowState = {
  todayKst: getBrowserKstDate(),
  hasDraftToday: false,
  isSavedToday: false,
  savedAtToday: null,
  canExecuteScrape: true,
  canSaveDraft: false,
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('yncc-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [todayKst, setTodayKst] = useState<string>(() => getBrowserKstDate());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scheduler, setScheduler] = useState<ScrapeJobStatus>(DEFAULT_SCHEDULER);
  const [workflow, setWorkflow] = useState<DailyWorkflowState>(DEFAULT_WORKFLOW);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('yncc-theme', theme);
  }, [theme]);

  const fetchBriefing = useCallback(async (date?: string) => {
    try {
      setLoadError(null);
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`/api/briefings${query}`);
      if (!res.ok) {
        throw new Error(`브리핑 데이터를 불러오지 못했습니다 (${res.status})`);
      }
      const data = (await res.json()) as BriefingsResponse;
      setBriefing(data.briefing);
      setAvailableDates(data.availableDates);
      setTodayKst(data.todayKst);
      setSelectedDate(data.briefing?.date || data.todayKst);
      setScheduler(data.scheduler);
      if (data.workflow) {
        setWorkflow(data.workflow);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Detect KST midnight rollover so buttons re-enable automatically next day without triggering any scrape
  useEffect(() => {
    const checkDateRollover = () => {
      const currentBrowserKst = getBrowserKstDate();
      if (todayKst && currentBrowserKst !== todayKst) {
        fetchBriefing();
      }
    };

    const timer = setInterval(checkDateRollover, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDateRollover();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [todayKst, fetchBriefing]);

  // Poll /api/scrape/status while manual scrape pipeline is running
  useEffect(() => {
    if (!scheduler.isRunning) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/scrape/status');
        if (!res.ok) return;
        const data = (await res.json()) as {
          scheduler: ScrapeJobStatus;
          todayKst: string;
          workflow?: DailyWorkflowState;
        };
        setScheduler(data.scheduler);
        if (data.workflow) {
          setWorkflow(data.workflow);
        }
        if (!data.scheduler.isRunning) {
          await fetchBriefing(data.todayKst);
        }
      } catch {
        // Ignore transient polling hiccup
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [scheduler.isRunning, fetchBriefing]);

  // Support deep-link URL hash (#article=<id>) for native Back/Forward navigation
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#article=')) {
        setActiveArticle(null);
        return;
      }
      const id = decodeURIComponent(hash.replace('#article=', ''));
      const found = briefing?.articles.find((a) => a.id === id);
      if (found) {
        setActiveArticle(found);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [briefing]);

  const handleOpenArticle = (article: NewsArticle) => {
    setActiveArticle(article);
    window.history.pushState(null, '', `#article=${encodeURIComponent(article.id)}`);
  };

  const handleCloseArticle = () => {
    setActiveArticle(null);
    if (window.location.hash.startsWith('#article=')) {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    fetchBriefing(date);
  };

  const handleTriggerScrape = async () => {
    if (scheduler.isRunning || isSaving || !workflow.canExecuteScrape) return;
    setSaveError(null);
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (data.workflow) {
        setWorkflow(data.workflow);
      }
      if (!res.ok && res.status !== 409) {
        setScheduler((prev) => ({
          ...prev,
          isRunning: false,
          stage: 'error',
          error: data.error || '작업수행 요청에 실패했습니다.',
        }));
        return;
      }
      if (res.status === 409 && data.error) {
        setSaveError(data.error);
      }
      if (data.scheduler) {
        setScheduler(data.scheduler);
      }
    } catch (err) {
      setScheduler((prev) => ({
        ...prev,
        isRunning: false,
        stage: 'error',
        error: err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.',
      }));
    }
  };

  const handleSaveBriefing = async () => {
    if (scheduler.isRunning || isSaving || !workflow.canSaveDraft) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/briefings/save', { method: 'POST' });
      const data = await res.json();
      if (data.workflow) {
        setWorkflow(data.workflow);
      }
      if (!res.ok) {
        setSaveError(data.error || '당일 브리핑 저장에 실패했습니다.');
        return;
      }
      if (data.briefing) {
        setBriefing(data.briefing);
        setSelectedDate(data.briefing.date);
      }
      if (Array.isArray(data.availableDates)) {
        setAvailableDates(data.availableDates);
      }
      if (data.todayKst) {
        setTodayKst(data.todayKst);
      }
      if (data.scheduler) {
        setScheduler(data.scheduler);
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : '저장 요청 중 네트워크 오류가 발생했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigateSection = (sectionId: string) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredArticles = useMemo(() => {
    const list = briefing?.articles ?? [];
    if (!searchQuery.trim()) return list;
    const rawQ = searchQuery.trim().toLowerCase();
    const tagQ = rawQ.replace(/^#+/, '');
    return list.filter((article) => {
      return (
        article.title.toLowerCase().includes(rawQ) ||
        article.summary.toLowerCase().includes(rawQ) ||
        article.sourceName.toLowerCase().includes(rawQ) ||
        article.criteriaCategory.toLowerCase().includes(rawQ) ||
        article.keywords.some(
          (kw) => kw.toLowerCase().includes(tagQ) || `#${kw.toLowerCase()}`.includes(rawQ)
        )
      );
    });
  }, [briefing, searchQuery]);

  const activeIndex = activeArticle
    ? filteredArticles.findIndex((a) => a.id === activeArticle.id)
    : -1;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F4EFE6] dark:bg-[#0B0B0D] text-[#0B0B0D] dark:text-[#F4EFE6]">
      <TopBar
        isScraping={scheduler.isRunning}
        isSaving={isSaving}
        workflow={workflow}
        onTriggerScrape={handleTriggerScrape}
        onSaveBriefing={handleSaveBriefing}
        onNavigateSection={handleNavigateSection}
      />

      <WorkspaceToolbar
        selectedDate={selectedDate}
        availableDates={availableDates}
        onSelectDate={handleSelectDate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        scheduler={scheduler}
        workflow={workflow}
        pipelineStats={briefing?.pipelineStats}
        generatedAt={briefing?.generatedAt}
        isSaved={briefing?.isSaved}
        triggerType={briefing?.triggerType}
      />

      <main className="flex-1 mx-auto w-full max-w-[1280px] px-6 py-8 space-y-12">
        {/* Main Daily News Board */}
        <section id="briefing-feed" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#0B0B0D] dark:text-[#F4EFE6]">
              {selectedDate ? `${selectedDate} 핵심 브리핑` : '오늘의 핵심 브리핑'}{' '}
              <span className="font-mono tabular-nums text-sm font-medium text-[#1F1F23]/60 dark:text-[#F4EFE6]/60">
                ({filteredArticles.length}건)
              </span>
            </h2>
            <p className="text-xs text-[#1F1F23]/60 dark:text-[#F4EFE6]/60">
              제목 또는 요약문을 클릭하면 기사 전문과 정확한 원문 링크가 열립니다.
            </p>
          </div>

          {saveError && (
            <div className="rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-xs text-red-800 dark:text-red-200 flex items-center justify-between gap-3">
              <span>{saveError}</span>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="font-semibold underline cursor-pointer shrink-0"
              >
                닫기
              </button>
            </div>
          )}

          {/* Workflow Status Banner */}
          {!scheduler.isRunning && workflow.hasDraftToday && !workflow.isSavedToday && briefing?.date === workflow.todayKst && (
            <div className="rounded-lg border border-[#FF6A00]/35 dark:border-[#FFB000]/35 bg-[#FAF7F2] dark:bg-[#1F1F23] px-4 py-3 text-xs text-[#1F1F23]/85 dark:text-[#F4EFE6]/85 flex flex-wrap items-center justify-between gap-3">
              <span>
                오늘(<strong className="font-mono tabular-nums">{workflow.todayKst}</strong>) 작업수행으로 수집된 기사(미저장 상태)입니다. <strong className="font-semibold text-[#C84D00] dark:text-[#FFB000]">저장</strong> 버튼을 누르면 당일 날짜로 확정 보관되며, 저장 전까지는 <strong className="font-semibold">작업수행</strong>을 수차례 반복할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={handleSaveBriefing}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0B0B0D] dark:bg-[#FFB000] px-3 py-1.5 text-xs font-bold text-[#F4EFE6] dark:text-[#0B0B0D] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
              >
                <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isSaving ? '저장 중...' : '당일 날짜로 저장'}</span>
              </button>
            </div>
          )}

          {!scheduler.isRunning && workflow.isSavedToday && (
            <div className="rounded-lg border border-emerald-600/25 dark:border-emerald-400/25 bg-emerald-50/70 dark:bg-emerald-950/25 px-4 py-3 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>
                  오늘(<strong className="font-mono tabular-nums">{workflow.todayKst}</strong>) 브리핑 저장이 완료되었습니다{workflow.savedAtToday ? ` (${workflow.savedAtToday})` : ''}. 익일(00:00 KST)까지 조회만 가능하며 작업수행·저장 버튼은 비활성화됩니다.
                </span>
              </span>
            </div>
          )}

          {!scheduler.isRunning &&
            !workflow.hasDraftToday &&
            !workflow.isSavedToday &&
            todayKst &&
            briefing &&
            briefing.date !== todayKst && (
              <div className="rounded-lg border border-[#FF6A00]/30 dark:border-[#FFB000]/30 bg-[#FAF7F2] dark:bg-[#1F1F23] px-4 py-3 text-xs text-[#1F1F23]/85 dark:text-[#F4EFE6]/85 flex flex-wrap items-center justify-between gap-3">
                <span>
                  오늘(<strong className="font-mono tabular-nums">{todayKst}</strong>) 작업수행이 아직 실행되지 않아 기존 보관 브리핑(
                  <strong className="font-mono tabular-nums text-[#C84D00] dark:text-[#FFB000]">
                    {briefing.date}
                  </strong>
                  )을 조회 중입니다.
                </span>
                <button
                  type="button"
                  onClick={handleTriggerScrape}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#FF6A00] px-3 py-1.5 text-xs font-bold text-[#0B0B0D] hover:bg-[#FFB000] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                  <span>{todayKst} 작업수행 시작</span>
                </button>
              </div>
            )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-xl border border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-white dark:bg-[#1F1F23] px-6 py-5 animate-pulse space-y-3"
                >
                  <div className="h-3.5 w-1/3 rounded bg-[#1F1F23]/10 dark:bg-[#F4EFE6]/10" />
                  <div className="h-6 w-4/5 rounded bg-[#1F1F23]/10 dark:bg-[#F4EFE6]/10" />
                  <div className="h-4 w-full rounded bg-[#1F1F23]/10 dark:bg-[#F4EFE6]/10" />
                  <div className="h-4 w-5/6 rounded bg-[#1F1F23]/10 dark:bg-[#F4EFE6]/10" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-red-800 dark:text-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchBriefing(selectedDate)}
                className="rounded-lg bg-red-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                다시 불러오기
              </button>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="rounded-xl border border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-white dark:bg-[#1F1F23] p-10 text-center space-y-3">
              <p className="text-sm font-medium text-[#1F1F23] dark:text-[#F4EFE6]">
                {searchQuery.trim()
                  ? `'${searchQuery}' 검색어에 해당하는 브리핑 기사가 없습니다.`
                  : '해당 날짜의 브리핑 기사가 없습니다.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="rounded-lg border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 px-4 py-2 text-xs font-medium text-[#0B0B0D] dark:text-[#F4EFE6] hover:bg-[#F4EFE6] dark:hover:bg-[#0B0B0D] cursor-pointer"
                  >
                    검색 초기화
                  </button>
                )}
                {workflow.canExecuteScrape && (
                  <button
                    type="button"
                    onClick={handleTriggerScrape}
                    disabled={scheduler.isRunning}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6A00] px-4 py-2 text-xs font-bold text-[#0B0B0D] hover:bg-[#FFB000] disabled:opacity-45 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>작업수행</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article, idx) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={idx}
                  onOpenArticle={handleOpenArticle}
                />
              ))}
            </div>
          )}
        </section>

        {/* Hierarchical Year > Month > Date Archive */}
        <ArchiveSection
          availableDates={availableDates}
          selectedDate={selectedDate}
          todayKst={todayKst}
          onSelectDate={handleSelectDate}
        />

        {/* Collapsed at very bottom: Selection Criteria & 2-Step Verification Algorithm */}
        <PipelineTransparencyPanel briefing={briefing} />
      </main>

      <footer className="border-t border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-[#FAF7F2] dark:bg-[#1F1F23]/65">
        <div className="mx-auto max-w-[1280px] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/60">
          <span>YNCC ChemBrief · 여천NCC 실무자를 위한 석유화학산업 뉴스 브리핑</span>
          <span className="font-mono tabular-nums">
            수동 작업수행 · 팩트체크 선별 · 저장 후 당일 조회 전용
          </span>
        </div>
      </footer>

      {activeArticle && (
        <ArticleDetailModal
          article={activeArticle}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex >= 0 && activeIndex < filteredArticles.length - 1}
          onPrev={() => {
            if (activeIndex > 0) handleOpenArticle(filteredArticles[activeIndex - 1]);
          }}
          onNext={() => {
            if (activeIndex >= 0 && activeIndex < filteredArticles.length - 1) {
              handleOpenArticle(filteredArticles[activeIndex + 1]);
            }
          }}
          onClose={handleCloseArticle}
        />
      )}
    </div>
  );
}
