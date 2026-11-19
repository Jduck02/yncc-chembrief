import { RefreshCw } from 'lucide-react';

interface TopBarProps {
  isScraping: boolean;
  onTriggerScrape: () => void;
  onNavigateSection: (sectionId: string) => void;
}

function GpicLogoEmblem() {
  return (
    <svg
      viewBox="0 0 216 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-9 w-auto shrink-0"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="210"
        height="90"
        rx="45"
        stroke="currentColor"
        strokeWidth="4.5"
      />
      <text
        x="108"
        y="25"
        textAnchor="middle"
        fill="currentColor"
        fontSize="11.5"
        fontWeight="700"
        letterSpacing="0.4"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        GLOBAL PETCHEM-MARKET
      </text>
      <text
        x="108"
        y="61"
        textAnchor="middle"
        fill="currentColor"
        fontSize="40"
        fontWeight="800"
        letterSpacing="1.5"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        GPIC
      </text>
      <text
        x="108"
        y="80"
        textAnchor="middle"
        fill="currentColor"
        fontSize="12"
        fontWeight="700"
        letterSpacing="0.6"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        INTELLIGENCE CENTER
      </text>
    </svg>
  );
}

export function TopBar({
  isScraping,
  onTriggerScrape,
  onNavigateSection,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#1F1F23]/12 bg-[#F4EFE6]/95 backdrop-blur-sm dark:border-[#F4EFE6]/10 dark:bg-[#0B0B0D]/95">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-6">
        {/* Zone 1: GPIC Emblem Link + Brand Wordmark */}
        <div className="flex items-center gap-3.5 shrink-0">
          <a
            href="https://jduck02.github.io/petro-report/"
            target="_blank"
            rel="noopener noreferrer"
            title="GPIC Global Petchem-Market Intelligence Center 바로가기"
            aria-label="GPIC Global Petchem-Market Intelligence Center 바로가기"
            className="inline-flex items-center text-[#0B0B0D] dark:text-[#F4EFE6] hover:text-[#FF6A00] dark:hover:text-[#FFB000] transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6A00] rounded-full"
          >
            <GpicLogoEmblem />
          </a>

          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('top');
            }}
            className="text-lg font-bold tracking-tight text-[#0B0B0D] dark:text-[#F4EFE6] whitespace-nowrap shrink-0"
          >
            YNCC ChemBrief
          </a>
        </div>

        {/* Zone 2: 3 concise single-line text nav links */}
        <nav
          aria-label="주 메뉴"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#1F1F23]/75 dark:text-[#F4EFE6]/70"
        >
          <a
            href="#briefing-feed"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('briefing-feed');
            }}
            className="hover:text-[#0B0B0D] dark:hover:text-[#FFB000] transition-colors whitespace-nowrap shrink-0"
          >
            오늘의 브리핑
          </a>
          <a
            href="#archive-section"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('archive-section');
            }}
            className="hover:text-[#0B0B0D] dark:hover:text-[#FFB000] transition-colors whitespace-nowrap shrink-0"
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
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF6A00] px-4 py-2 text-xs font-bold text-[#0B0B0D] hover:bg-[#FFB000] disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6A00]"
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
