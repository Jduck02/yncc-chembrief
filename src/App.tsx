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
        onTriggerScrape={handleTriggerScrape}
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
        pipelineStats={briefing?.pipelineStats}
        generatedAt={briefing?.generatedAt}
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
                <button
                  type="button"
                  onClick={handleTriggerScrape}
                  disabled={scheduler.isRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6A00] px-4 py-2 text-xs font-bold text-[#0B0B0D] hover:bg-[#FFB000] cursor-pointer"
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

      <footer className="border-t border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-[#FAF7F2] dark:bg-[#1F1F23]/65">
        <div className="mx-auto max-w-[1280px] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/60">
          <span>YNCC ChemBrief · 여천NCC 실무자를 위한 석유화학산업 뉴스 브리핑</span>
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
