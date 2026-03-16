export interface CustomPageConfig {
  id: string;
  name: string;
  urlPattern: string;
  selectors: {
    company: string;
    title: string;
    datePosted?: string;
    postingContainer?: string;
    jobCard?: string;
    cardCompany?: string;
    cardUrl?: string;
    cardDate?: string;
  };
}

export interface JobPosting {
  company: string;
  title: string;
  url: string;
  datePosted?: string;
  validThrough?: string;
  hasStructuredData: boolean;
}

export type SignalLevel = "green" | "yellow" | "red" | "neutral";

export interface Signal {
  id: string;
  label: string;
  description: string;
  level: SignalLevel;
  points: number;
  source: string;
  available: boolean;
  url?: string;
}

export type ScoreRange = "green" | "yellow" | "red";

export interface GhostScore {
  score: number;
  range: ScoreRange;
  signals: Signal[];
}

export interface JobCardData {
  company: string;
  datePosted?: string;
  url: string;
  element: Element;
}

export type MessageType =
  | "SCORE_JOB"
  | "SCORE_JOB_RESULT"
  | "SCORE_BATCH"
  | "SCORE_BATCH_RESULT";

export interface ScoreJobMessage {
  type: "SCORE_JOB";
  payload: Omit<JobPosting, "hasStructuredData"> & {
    hasStructuredData: boolean;
  };
}

export interface ScoreJobResultMessage {
  type: "SCORE_JOB_RESULT";
  payload: GhostScore;
}

export interface ScoreBatchMessage {
  type: "SCORE_BATCH";
  payload: Array<{
    company: string;
    datePosted?: string;
    url: string;
  }>;
}

export interface ScoreBatchResultMessage {
  type: "SCORE_BATCH_RESULT";
  payload: Array<{
    url: string;
    score: GhostScore;
  }>;
}

export interface RefetchScoreMessage {
  type: "REFETCH_SCORE";
  tabId: number;
}

export interface NoPostingMessage {
  type: "NO_POSTING";
}

export interface GetTabScoreMessage {
  type: "GET_TAB_SCORE";
  tabId: number;
}

export interface ClearAllCacheMessage {
  type: "CLEAR_ALL_CACHE";
}

export type ExtensionMessage =
  | ScoreJobMessage
  | ScoreJobResultMessage
  | ScoreBatchMessage
  | ScoreBatchResultMessage
  | RefetchScoreMessage
  | NoPostingMessage
  | GetTabScoreMessage
  | ClearAllCacheMessage;
