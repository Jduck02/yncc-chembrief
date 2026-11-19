import type { DailyBriefing, ScrapeJobStatus } from '../src/types/news.ts';
import { runNewsScrapePipeline } from './pipeline.ts';
import { getLastRunAt } from './store.ts';
import { formatKstDateTime, getNext0900KstDate } from './time.ts';

class DailyBriefingScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private status: ScrapeJobStatus = {
    isRunning: false,
    stage: 'idle',
    stageLabel: '매일 오전 09:00 KST 자동 스크랩 대기 중',
    progressPercent: 0,
    lastRunAt: getLastRunAt(),
    nextScheduledRunKst: formatKstDateTime(getNext0900KstDate()),
    error: null,
  };

  public start(): void {
    this.scheduleNextRun();
  }

  private scheduleNextRun(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const nextRun = getNext0900KstDate();
    this.status.nextScheduledRunKst = formatKstDateTime(nextRun);
    const delayMs = Math.max(1000, nextRun.getTime() - Date.now());

    // Cap setTimeout to 24h max safe window and re-check
    const safeDelay = Math.min(delayMs, 24 * 60 * 60 * 1000);
    this.timer = setTimeout(async () => {
      const remaining = nextRun.getTime() - Date.now();
      if (remaining <= 2000) {
        try {
          await this.triggerScrape('scheduled_09kst');
        } catch (err) {
          console.error('[Scheduler 09:00 KST] Scrape failed:', err);
        }
      }
      this.scheduleNextRun();
    }, safeDelay);
  }

  public getStatus(): ScrapeJobStatus {
    return {
      ...this.status,
      nextScheduledRunKst: formatKstDateTime(getNext0900KstDate()),
    };
  }

  public async triggerScrape(
    triggerType: 'scheduled_09kst' | 'manual'
  ): Promise<DailyBriefing> {
    if (this.status.isRunning) {
      throw new Error('현재 뉴스 스크랩 및 팩트체크 파이프라인이 이미 실행 중입니다.');
    }

    this.status = {
      ...this.status,
      isRunning: true,
      stage: 'searching',
      stageLabel: '1/3 · 타겟 매체 최신 석유화학 뉴스 검색 시작...',
      progressPercent: 10,
      error: null,
    };

    try {
      const briefing = await runNewsScrapePipeline(
        triggerType,
        (stage, stageLabel, progressPercent) => {
          this.status = {
            ...this.status,
            isRunning: stage !== 'completed',
            stage,
            stageLabel,
            progressPercent,
            error: null,
          };
        }
      );

      this.status = {
        ...this.status,
        isRunning: false,
        stage: 'completed',
        stageLabel: `${briefing.articles.length}건 선별·팩트체크 완료`,
        progressPercent: 100,
        lastRunAt: briefing.generatedAt,
        nextScheduledRunKst: formatKstDateTime(getNext0900KstDate()),
        error: null,
      };

      return briefing;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '뉴스 스크랩 파이프라인 실행 중 알 수 없는 오류가 발생했습니다.';
      this.status = {
        ...this.status,
        isRunning: false,
        stage: 'error',
        stageLabel: '스크랩 파이프라인 오류 발생',
        progressPercent: 0,
        error: message,
      };
      throw err;
    }
  }
}

export const dailyScheduler = new DailyBriefingScheduler();
