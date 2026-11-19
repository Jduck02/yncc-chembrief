import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Factory } from 'lucide-react';
import type { FallbackImageKey, NewsArticle } from '../types/news';

interface ArticleCardProps {
  article: NewsArticle;
  index: number;
  onOpenArticle: (article: NewsArticle) => void;
}

const CLIENT_FALLBACK_IMAGES: Record<FallbackImageKey, string> = {
  ncc_plant_night: '/src/assets/images/ncc_plant_night_1795047558031.jpg',
  crude_naphtha_terminal: '/src/assets/images/crude_naphtha_terminal_1795047558284.jpg',
  refinery_piping_detail: '/src/assets/images/refinery_piping_detail_1795047558866.jpg',
  global_energy_port: '/src/assets/images/global_energy_port_1795047559804.jpg',
  plant_control_safety: '/src/assets/images/plant_control_safety_1795047559933.jpg',
};

export function ArticleCard({ article, index, onOpenArticle }: ArticleCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    article.thumbnailUrl || CLIENT_FALLBACK_IMAGES[article.fallbackImageKey]
  );
  const [imgFailed, setImgFailed] = useState(false);

  const handleImageError = () => {
    const domainFallback = CLIENT_FALLBACK_IMAGES[article.fallbackImageKey];
    if (imgSrc !== domainFallback) {
      setImgSrc(domainFallback);
    } else {
      setImgFailed(true);
    }
  };

  const handleOpen = () => {
    onOpenArticle(article);
  };

  return (
    <article
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${article.title} 상세 기사 열기`}
      className="group grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
    >
      {/* 1. Thumbnail Image (Clickable) */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800/80">
        {!imgFailed ? (
          <img
            src={imgSrc}
            alt={article.title}
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-center text-slate-300">
            <Factory className="h-7 w-7 text-sky-400" aria-hidden="true" />
            <span className="text-xs font-medium line-clamp-2">{article.sourceName}</span>
          </div>
        )}
      </div>

      {/* Content Column: Metadata + 2. Title + 3. <=5-sentence Summary */}
      <div className="flex flex-col justify-between gap-3 min-w-0">
        <div className="space-y-2.5">
          {/* Unboxed clean metadata line (zero-pill discipline) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {article.sourceName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{article.publishedAt}</span>
            <span aria-hidden="true">·</span>
            <span>{article.criteriaCategory}</span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-700 dark:text-sky-400 font-medium">
              {article.departments.map((d) => `${d}`).join(' / ')}
            </span>
          </div>

          {/* 2. Article Title (Clickable) */}
          <h2 className="text-lg sm:text-xl font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-[#0369A1] dark:group-hover:text-sky-400 transition-colors text-wrap balance">
            {article.title}
          </h2>

          {/* 3. <=5-sentence Summary with Yeocheon NCC perspective (Clickable) */}
          <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            {article.summary}
          </p>
        </div>

        {/* Bottom Unboxed Action & Verification Line */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>팩트체크 완료</span>
            {article.viewCount !== null && (
              <>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums font-normal">
                  조회수 {article.viewCount.toLocaleString()}
                </span>
              </>
            )}
          </div>

          <span className="inline-flex items-center gap-1 font-semibold text-[#0369A1] dark:text-sky-400 group-hover:underline whitespace-nowrap shrink-0">
            <span>상세 전문 및 교차 검증 보기</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}
