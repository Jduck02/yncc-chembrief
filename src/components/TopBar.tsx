import { RefreshCw } from 'lucide-react';

interface TopBarProps {
  isScraping: boolean;
  onTriggerScrape: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export function TopBar({
  isScraping,
  onTriggerScrape,
  onNavigateSection,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0B111A]/95">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-6">
        {/* Zone 1: Brand wordmark (single text element) */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('top');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          YNCC ChemBrief
        </a>

        {/* Zone 2: 4 concise single-line text nav links */}
        <nav
          aria-label="주 메뉴"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <a
            href="#briefing-feed"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('briefing-feed');
            }}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            오늘의 브리핑
          </a>
          <a
            href="#department-toolbar"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('department-toolbar');
            }}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            부서별 필터
          </a>
          <a
            href="#pipeline-criteria"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('pipeline-criteria');
            }}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            선별·검증 기준
          </a>
          <a
            href="#archive-section"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('archive-section');
            }}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            아카이브
          </a>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerScrape}
            disabled={isScraping}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0369A1] px-4 py-2 text-xs font-semibold text-white hover:bg-[#075985] disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isScraping ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isScraping ? '뉴스 스크랩 중...' : '지금 뉴스 스크랩 실행'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
