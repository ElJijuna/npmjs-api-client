/**
 * Named download periods accepted by the npm Downloads API.
 *
 * @see https://github.com/npm/registry/blob/main/docs/download-counts.md
 */
export type NpmDownloadPeriod =
  | 'last-day'
  | 'last-week'
  | 'last-month'
  | 'last-year'
  | `${string}:${string}`; // custom range: "YYYY-MM-DD:YYYY-MM-DD"

/**
 * Period accepted by the npm per-version downloads API.
 *
 * npm currently exposes version-level download counts only for the previous 7 days.
 */
export type NpmVersionDownloadPeriod = 'last-week';

/**
 * Download count for a specific package over a period.
 *
 * Returned by `GET /downloads/point/{period}/{package}`.
 */
export interface NpmDownloadPoint {
  /** Total download count for the period */
  downloads: number;
  /** Start date of the period (YYYY-MM-DD) */
  start: string;
  /** End date of the period (YYYY-MM-DD) */
  end: string;
  /** Package name */
  package: string;
}

/**
 * Per-day download entry within a range response.
 */
export interface NpmDownloadDay {
  /** Download count for this day */
  downloads: number;
  /** Date (YYYY-MM-DD) */
  day: string;
}

/**
 * Download counts broken down per day over a period.
 *
 * Returned by `GET /downloads/range/{period}/{package}`.
 */
export interface NpmDownloadRange {
  /** Per-day breakdown */
  downloads: NpmDownloadDay[];
  /** Start date of the period (YYYY-MM-DD) */
  start: string;
  /** End date of the period (YYYY-MM-DD) */
  end: string;
  /** Package name */
  package: string;
}

/**
 * Download counts for all versions of a package over the previous 7 days.
 *
 * Returned by `GET /versions/{package}/last-week`.
 */
export interface NpmVersionDownloads {
  /** Package name */
  package: string;
  /** Map of version strings to their download counts */
  downloads: Record<string, number>;
}

/**
 * Download count for a specific package version over the previous 7 days.
 */
export interface NpmVersionDownloadPoint {
  /** Download count for this version */
  downloads: number;
  /** Package name */
  package: string;
  /** Version string */
  version: string;
  /** Period used for the request */
  period: NpmVersionDownloadPeriod;
}
