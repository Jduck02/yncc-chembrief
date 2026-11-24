import type { DailyBriefing, ScrapeJobStatus } from '../src/types/news.ts';
import { runNewsScrapePipeline } from './pipeline.ts';
import { getLastRunAt, getWorkflowState } from './store.ts';

class ManualScrapeRunner {
  private status: ScrapeJobStatus = {
    isRunning: false,
    stage: 'idle',
    stageLabel: '작업수행 버튼 실행 대기 중 (자동 실행 없음)',
    progressPercent: 0,
    lastRunAt: getLastRunAt(),
    error: null,
  };

  public getStatus(): ScrapeJobStatus {
    return { ...this.status };
  }

  public async triggerManualScrape(): Promise<DailyBriefing> {
    if (this.status.isRunning) {
      throw new Error('현재 작업수행(뉴스 스크랩 및 검열)이 이미 실행 중입니다.');
    }

    const workflow = getWorkflowState();
    if (workflow.isSavedToday) {
      throw new Error(
        `오늘(${workflow.todayKst}) 브리핑은 이미 저장이 완료되어 익일(00:00 KST)까지 작업수행을 실행할 수 없습니다.`
      );
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
        stageLabel: `${briefing.articles.length}건 수집·검증 완료 (미저장 상태)`,
        progressPercent: 100,
        lastRunAt: briefing.generatedAt,
        error: null,
      };

      return briefing;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '작업수행 중 알 수 없는 오류가 발생했습니다.';

      this.status = {
        ...this.status,
        isRunning: false,
        stage: 'error',
        stageLabel: '작업수행 오류 발생',
        progressPercent: 0,
        error: message,
      };
      throw err;
    }
  }
}

export const dailyScheduler = new ManualScrapeRunner();
