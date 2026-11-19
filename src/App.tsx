import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ArchiveSection } from './components/ArchiveSection';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { PipelineTransparencyPanel } from './components/PipelineTransparencyPanel';
import { TopBar } from './components/TopBar';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import type {
  BriefingsResponse,
  DailyBriefing,
  Department,
  NewsArticle,
  ScrapeJobStatus,
} from './types/news';

const DEFAULT_SCHEDULER: ScrapeJobStatus = {
  isRunning: false,
  stage: 'idle',
  stageLabel: '매일 오전 09:00 KST 자동 스크랩 대기 중',
  progressPercent: 0,
  lastRunAt: null,
  nextScheduledRunKst: '매일 09:00 KST',
  error: null,
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
  const [todayKst, setTodayKst] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scheduler, setScheduler] = useState<ScrapeJobStatus>(DEFAULT_SCHEDULER);
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

  // Poll /api/scrape/status while a scraping pipeline is running
  useEffect(() => {
    if (!scheduler.isRunning) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/scrape/status');
        if (!res.ok) return;
        const data = (await res.json()) as {
          scheduler: ScrapeJobStatus;
          todayKst: string;
        };
        setScheduler(data.scheduler);
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
    setSelectedDepartment('전체');
    fetchBriefing(date);
  };

  const handleTriggerScrape = async () => {
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        setScheduler((prev) => ({
          ...prev,
          isRunning: false,
          stage: 'error',
          error: data.error || '스크랩 요청에 실패했습니다.',
        }));
        return;
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

  const handleNavigateSection = (sectionId: string) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredArticles = useMemo(() => {
    const list = briefing?.articles ?? [];
    return list.filter((article) => {
      const deptMatch =
        selectedDepartment === '전체' ||
        article.departments.includes(selectedDepartment);
      if (!deptMatch) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.sourceName.toLowerCase().includes(q) ||
        article.criteriaCategory.toLowerCase().includes(q)
      );
    });
  }, [briefing, selectedDepartment, searchQuery]);

  const activeIndex = activeArticle
    ? filteredArticles.findIndex((a) => a.id === activeArticle.id)
    : -1;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B111A] text-slate-900 dark:text-slate-100">
      <TopBar
        isScraping={scheduler.isRunning}
        onTriggerScrape={handleTriggerScrape}
        onNavigateSection={handleNavigateSection}
      />

      <WorkspaceToolbar
        selectedDate={selectedDate}
        availableDates={availableDates}
        onSelectDate={handleSelectDate}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        scheduler={scheduler}
        pipelineStats={briefing?.pipelineStats}
        generatedAt={briefing?.generatedAt}
        triggerType={briefing?.triggerType}
      />

      <main className="flex-1 mx-auto w-full max-w-[1280px] px-6 py-8 space-y-12">
        {/* Main Daily News Board */}
        <section id="briefing-feed" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {selectedDate ? `${selectedDate} 핵심 브리핑` : '오늘의 핵심 브리핑'}{' '}
              <span className="font-mono tabular-nums text-sm font-medium text-slate-500 dark:text-slate-400">
                ({filteredArticles.length}건)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              썸네일, 제목 또는 요약문을 클릭하면 기사 전문과 원문 링크가 열립니다.
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 animate-pulse"
                >
                  <div className="aspect-[4/3] rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-3 py-1">
                    <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-6 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6 flex items-center justify-between gap-4">
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
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                선택하신 조건({selectedDepartment} · 검색어)에 해당하는 브리핑 기사가 없습니다.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartment('전체');
                    setSearchQuery('');
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  필터 초기화
                </button>
                <button
                  type="button"
                  onClick={handleTriggerScrape}
                  disabled={scheduler.isRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0369A1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#075985] cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>지금 뉴스 스크랩 실행</span>
                </button>
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

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        <div className="mx-auto max-w-[1280px] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>YNCC ChemBrief · 여천NCC 실무자를 위한 석유화학 산업 뉴스 인텔리전스</span>
          <span className="font-mono tabular-nums">
            정기 스크랩 기준: 매일 09:00 KST · 1일 3~7건 팩트체크 선별
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
