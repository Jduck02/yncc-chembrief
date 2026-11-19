import { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Factory,
  Link2,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { FallbackImageKey, NewsArticle } from '../types/news';

interface ArticleDetailModalProps {
  article: NewsArticle;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

const CLIENT_FALLBACK_IMAGES: Record<FallbackImageKey, string> = {
  ncc_plant_night: '/src/assets/images/ncc_plant_night_1795047558031.jpg',
  crude_naphtha_terminal: '/src/assets/images/crude_naphtha_terminal_1795047558284.jpg',
  refinery_piping_detail: '/src/assets/images/refinery_piping_detail_1795047558866.jpg',
  global_energy_port: '/src/assets/images/global_energy_port_1795047559804.jpg',
  plant_control_safety: '/src/assets/images/plant_control_safety_1795047559933.jpg',
};

export function ArticleDetailModal({
  article,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: ArticleDetailModalProps) {
  const [imgSrc, setImgSrc] = useState(
    article.thumbnailUrl || CLIENT_FALLBACK_IMAGES[article.fallbackImageKey]
  );
  const [imgFailed, setImgFailed] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setImgSrc(article.thumbnailUrl || CLIENT_FALLBACK_IMAGES[article.fallbackImageKey]);
    setImgFailed(false);
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

  const handleImageError = () => {
    const fallback = CLIENT_FALLBACK_IMAGES[article.fallbackImageKey];
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    } else {
      setImgFailed(true);
    }
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-full sm:h-auto sm:max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Window Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/80 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums min-w-0 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="다음 기사"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0369A1] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#075985] transition-colors whitespace-nowrap shrink-0"
            >
              <span>원문 보기 ↗</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="상세 창 닫기"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Editorial Body */}
        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-10 space-y-7">
          {/* Headline & Metadata */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>관련 실무 부서:</span>
              <span className="font-semibold text-sky-700 dark:text-sky-400">
                {article.departments.map((d) => `${d}팀`).join(' · ')}
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
              className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 text-wrap balance"
            >
              {article.title}
            </h2>
          </div>

          {/* Lead Image */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 aspect-[16/9] max-h-[340px] w-full">
            {!imgFailed ? (
              <img
                src={imgSrc}
                alt={article.title}
                referrerPolicy="no-referrer"
                onError={handleImageError}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300">
                <Factory className="h-8 w-8 text-sky-400" />
                <span className="text-xs">{article.sourceName}</span>
              </div>
            )}
          </div>

          {/* Yeocheon NCC Implication Block */}
          <div className="rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 p-5 space-y-1.5">
            <div className="text-xs font-semibold text-sky-800 dark:text-sky-300">
              여천NCC 실무 시사점 및 대응 포인트
            </div>
            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {article.ynccImplication}
            </p>
          </div>

          {/* Full Text */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
              기사 전문
            </h3>
            <div className="space-y-4 text-[15px] sm:text-base leading-[1.75] text-slate-700 dark:text-slate-300 max-w-[72ch]">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          {/* Fact-Check Verification Badge & Cross-Verified Sources */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/25 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>[팩트체크 완료: 교차 검증된 출처 요약]</span>
              </div>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0369A1] dark:text-sky-400 hover:underline"
              >
                <span>원본 기사 바로가기 (원문 보기) ↗</span>
              </a>
            </div>

            <p className="text-sm leading-relaxed text-emerald-950 dark:text-emerald-100/90">
              {article.factCheckSummary}
            </p>

            {article.verifiedSources.length > 0 && (
              <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
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
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Link2 className="h-4 w-4 text-[#0369A1] dark:text-sky-400 shrink-0" aria-hidden="true" />
                <span>기사 원문 출처 및 정확한 원문 링크</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {article.sourceName} · {article.publishedAt}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-950/60 px-3.5 py-2.5">
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[#0369A1] dark:text-sky-400 hover:underline break-all"
              >
                {article.sourceUrl}
              </a>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
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
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0369A1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#075985] transition-colors whitespace-nowrap shrink-0"
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
