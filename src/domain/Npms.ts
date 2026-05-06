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
  analyzedAt: string;
  score: {
    final: number;
    detail: NpmsScoreDetail;
  };
  evaluation: NpmsEvaluation;
}
