import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { NewsArticle } from '../types/news';

interface ArticleCardProps {
  article: NewsArticle;
  index: number;
  onOpenArticle: (article: NewsArticle) => void;
}

export function ArticleCard({ article, index, onOpenArticle }: ArticleCardProps) {
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
      className="group rounded-xl border border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 bg-white dark:bg-[#1F1F23] px-6 py-5 hover:border-[#FF6A00]/60 dark:hover:border-[#FFB000]/50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6A00]"
    >
      <div className="flex flex-col gap-3 min-w-0">
        {/* Unboxed clean metadata line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/60">
          <span className="font-mono tabular-nums font-bold text-[#C84D00] dark:text-[#FFB000]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
            {article.sourceName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{article.publishedAt}</span>
          <span aria-hidden="true">·</span>
          <span>{article.criteriaCategory}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold text-[#C84D00] dark:text-[#FFB000]">
            {article.keywords.slice(0, 6).map((keyword) => (
              <span key={keyword}>#{keyword}</span>
            ))}
          </span>
        </div>

        {/* Article Title */}
        <h2 className="text-lg sm:text-xl font-bold leading-snug tracking-tight text-[#0B0B0D] dark:text-[#F4EFE6] group-hover:text-[#C84D00] dark:group-hover:text-[#FFB000] transition-colors text-balance">
          {article.title}
        </h2>

        {/* <=5-sentence Summary with Yeocheon NCC perspective */}
        <p className="text-sm sm:text-[15px] leading-relaxed text-[#1F1F23]/85 dark:text-[#F4EFE6]/80">
          {article.summary}
        </p>

        {/* Bottom Unboxed Action & Verification Line */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-[#1F1F23]/10 dark:border-[#F4EFE6]/10 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>팩트체크 완료</span>
            {article.viewCount !== null && (
              <>
                <span className="text-[#1F1F23]/25 dark:text-[#F4EFE6]/25" aria-hidden="true">
                  ·
                </span>
                <span className="text-[#1F1F23]/60 dark:text-[#F4EFE6]/60 font-mono tabular-nums font-normal">
                  조회수 {article.viewCount.toLocaleString()}
                </span>
              </>
            )}
          </div>

          <span className="inline-flex items-center gap-1 font-semibold text-[#C84D00] dark:text-[#FFB000] group-hover:underline whitespace-nowrap shrink-0">
            <span>상세 전문 및 교차 검증 보기</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}
