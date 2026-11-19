import { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { NewsArticle } from '../types/news';

interface ArticleDetailModalProps {
  article: NewsArticle;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function ArticleDetailModal({
  article,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: ArticleDetailModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setCopiedUrl(false);
  }, [article]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(article.sourceUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const paragraphs = article.fullText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0D]/75 backdrop-blur-xs p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-full sm:h-auto sm:max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden sm:rounded-xl border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 bg-[#FAF7F2] dark:bg-[#1F1F23] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Window Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#1F1F23]/12 dark:border-[#F4EFE6]/10 px-6 py-4 bg-[#F4EFE6] dark:bg-[#0B0B0D]">
          <div className="flex items-center gap-2 text-xs text-[#1F1F23]/70 dark:text-[#F4EFE6]/65 font-mono tabular-nums min-w-0 truncate">
            <span className="font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
              {article.sourceName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{article.publishedAt}</span>
            <span aria-hidden="true">·</span>
            <span>{article.criteriaCategory}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="이전 기사"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 text-[#0B0B0D] dark:text-[#F4EFE6] hover:bg-[#1F1F23]/5 dark:hover:bg-[#F4EFE6]/10 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="다음 기사"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 text-[#0B0B0D] dark:text-[#F4EFE6] hover:bg-[#1F1F23]/5 dark:hover:bg-[#F4EFE6]/10 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6A00] px-3.5 py-2 text-xs font-bold text-[#0B0B0D] hover:bg-[#FFB000] transition-colors whitespace-nowrap shrink-0"
            >
              <span>원문 보기 ↗</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="상세 창 닫기"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#1F1F23]/65 hover:bg-[#1F1F23]/10 hover:text-[#0B0B0D] dark:text-[#F4EFE6]/65 dark:hover:bg-[#F4EFE6]/10 dark:hover:text-[#F4EFE6] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Editorial Body (Text-Only) */}
        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-10 space-y-7 bg-white dark:bg-[#1F1F23]">
          {/* Headline & Metadata */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/65">
              <span>주요 키워드:</span>
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold text-[#C84D00] dark:text-[#FFB000]">
                {article.keywords.slice(0, 6).map((keyword) => (
                  <span key={keyword}>#{keyword}</span>
                ))}
              </span>
              {article.viewCount !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    원문 조회수 {article.viewCount.toLocaleString()}회
                  </span>
                </>
              )}
            </div>

            <h2
              id="article-detail-title"
              className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-[#0B0B0D] dark:text-[#F4EFE6] text-balance"
            >
              {article.title}
            </h2>
          </div>

          {/* Yeocheon NCC Implication Block */}
          <div className="rounded-xl border border-[#FF6A00]/30 dark:border-[#FFB000]/30 bg-[#F4EFE6]/70 dark:bg-[#0B0B0D]/60 p-5 space-y-1.5">
            <div className="text-xs font-bold text-[#C84D00] dark:text-[#FFB000]">
              여천NCC 실무 시사점 및 대응 포인트
            </div>
            <p className="text-sm leading-relaxed text-[#0B0B0D] dark:text-[#F4EFE6]/90">
              {article.ynccImplication}
            </p>
          </div>

          {/* Full Text */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#0B0B0D] dark:text-[#F4EFE6] border-b border-[#1F1F23]/12 dark:border-[#F4EFE6]/12 pb-2">
              기사 전문
            </h3>
            <div className="space-y-4 text-[15px] sm:text-base leading-[1.8] text-[#1F1F23] dark:text-[#F4EFE6]/85 max-w-[72ch]">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          {/* Fact-Check Verification Badge & Cross-Verified Sources */}
          <div className="rounded-xl border border-emerald-600/25 dark:border-emerald-400/25 bg-emerald-500/8 dark:bg-emerald-950/25 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>[팩트체크 완료: 교차 검증된 출처 요약]</span>
              </div>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#C84D00] dark:text-[#FFB000] hover:underline"
              >
                <span>원본 기사 바로가기 (원문 보기) ↗</span>
              </a>
            </div>

            <p className="text-sm leading-relaxed text-emerald-950 dark:text-emerald-100/90">
              {article.factCheckSummary}
            </p>

            {article.verifiedSources.length > 0 && (
              <div className="pt-2 border-t border-emerald-600/20 dark:border-emerald-400/15 space-y-2">
                <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80">
                  교차 검증 참조 출처
                </div>
                <ul className="space-y-1.5 text-xs">
                  {article.verifiedSources.map((src, idx) => (
                    <li key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <a
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-emerald-800 dark:text-emerald-300 hover:underline shrink-0"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                      <span className="font-mono text-[11px] text-emerald-700/75 dark:text-emerald-400/75 break-all">
                        ({src.uri})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Bottom-most Explicit Original Article Source & Exact Deep-Link Box */}
          <div className="rounded-xl border border-[#1F1F23]/15 dark:border-[#F4EFE6]/12 bg-[#F4EFE6]/80 dark:bg-[#0B0B0D]/80 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0B0B0D] dark:text-[#F4EFE6]">
                <Link2 className="h-4 w-4 text-[#C84D00] dark:text-[#FFB000] shrink-0" aria-hidden="true" />
                <span>기사 원문 출처 및 정확한 원문 링크</span>
              </div>
              <div className="text-xs text-[#1F1F23]/65 dark:text-[#F4EFE6]/60 font-mono tabular-nums">
                {article.sourceName} · {article.publishedAt}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#1F1F23]/12 dark:border-[#F4EFE6]/12 bg-white dark:bg-[#1F1F23] px-3.5 py-2.5">
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[#C84D00] dark:text-[#FFB000] hover:underline break-all"
              >
                {article.sourceUrl}
              </a>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#1F1F23]/15 dark:border-[#F4EFE6]/15 px-2.5 py-1.5 text-xs font-medium text-[#0B0B0D] dark:text-[#F4EFE6] hover:bg-[#F4EFE6] dark:hover:bg-[#0B0B0D] cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>링크 복사</span>
                    </>
                  )}
                </button>

                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#FF6A00] px-3 py-1.5 text-xs font-bold text-[#0B0B0D] hover:bg-[#FFB000] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>원본 기사 바로가기 (원문 보기) ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
