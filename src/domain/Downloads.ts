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
