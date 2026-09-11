export interface NpmsScoreDetail {
  quality: number;
  popularity: number;
  maintenance: number;
}

export interface NpmsQualityEvaluation {
  carefulness: number;
  tests: number;
  health: number;
  branding: number;
}

export interface NpmsPopularityEvaluation {
  communityInterest: number;
  downloadsCount: number;
  downloadsAcceleration: number;
  dependentsCount: number;
}

export interface NpmsMaintenanceEvaluation {
  releasesFrequency: number;
  commitsFrequency: number;
  openIssues: number;
  issuesDistribution: number;
}

export interface NpmsEvaluation {
  quality: NpmsQualityEvaluation;
  popularity: NpmsPopularityEvaluation;
  maintenance: NpmsMaintenanceEvaluation;
}

export interface NpmsScore {
  /**
   * Timestamp of the underlying registry search index entry this score was read from.
   * May be absent if the matched package has no recorded date.
   */
  analyzedAt?: string;
  score: {
    final: number;
    detail: NpmsScoreDetail;
  };
  /**
   * @deprecated npms.io, the only source for this granular breakdown, has been
   * discontinued. This field is never populated — only the aggregate `score` is available.
   */
  evaluation?: NpmsEvaluation;
}
