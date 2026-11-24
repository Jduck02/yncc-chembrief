export type Department = '영업' | '구매' | '생산' | '안전' | '환경';

export type CriteriaCategory =
  | '글로벌 수급·원료'
  | '국내 정책·단지'
  | 'NCC 마진·가동률'
  | '실무·리스크 관리';

export type FallbackImageKey =
  | 'ncc_plant_night'
  | 'crude_naphtha_terminal'
  | 'refinery_piping_detail'
  | 'global_energy_port'
  | 'plant_control_safety';

export interface VerifiedSource {
  title: string;
  uri: string;
}

export interface DeduplicationCluster {
  keptId: string;
  keptTitle: string;
  keptSource: string;
  mergedCount: number;
  mergedTitles: string[];
  similarityOverlapPercent: number;
  selectionRule: 'highest_views' | 'latest_timestamp' | 'unique';
  ruleReason: string;
}

export interface PipelineStats {
  rawCollected: number;
  duplicateClustersMerged: number;
  deduplicatedCount: number;
  factCheckPassed: number;
  factCheckRejected: number;
  finalPublished: number;
  deduplicationLog: DeduplicationCluster[];
}

export interface NewsArticle {
  id: string;
  briefingDate: string;
  title: string;
  summary: string;
  fullText: string;
  sourceName: string;
  sourceUrl: string;
  thumbnailUrl: string;
  fallbackImageKey: FallbackImageKey;
  publishedAt: string;
  viewCount: number | null;
  keywords: string[];
  departments?: Department[];
  criteriaCategory: CriteriaCategory;
  relevanceScore: number;
  ynccImplication: string;
  factCheckStatus: 'verified';
  factCheckSummary: string;
  verifiedSources: VerifiedSource[];
  isSample?: boolean;
}

export interface DailyBriefing {
  date: string;
  generatedAt: string;
  savedAt?: string;
  isSaved?: boolean;
  triggerType: 'manual' | 'curated_seed' | 'scheduled_auto' | 'scheduled_09kst';
  pipelineStats: PipelineStats;
  articles: NewsArticle[];
}

export interface ScrapeJobStatus {
  isRunning: boolean;
  stage: 'idle' | 'searching' | 'deduplicating' | 'fact_checking' | 'completed' | 'error';
  stageLabel: string;
  progressPercent: number;
  lastRunAt: string | null;
  error: string | null;
}

export interface DailyWorkflowState {
  todayKst: string;
  hasDraftToday: boolean;
  isSavedToday: boolean;
  savedAtToday: string | null;
  canExecuteScrape: boolean;
  canSaveDraft: boolean;
}

export interface BriefingsResponse {
  todayKst: string;
  availableDates: string[];
  briefing: DailyBriefing | null;
  scheduler: ScrapeJobStatus;
  workflow: DailyWorkflowState;
}
