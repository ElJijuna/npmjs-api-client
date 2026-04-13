import type { NpmPerson } from './Packument';

/**
 * Links associated with a package in search results.
 */
export interface NpmPackageLinks {
  npm?: string;
  homepage?: string;
  repository?: string;
  bugs?: string;
}

/**
 * Score breakdown for a package in search results.
 */
export interface NpmScoreDetail {
  quality: number;
  popularity: number;
  maintenance: number;
}

/**
 * Score entry for a package in search results.
 */
export interface NpmScore {
  final: number;
  detail: NpmScoreDetail;
}

/**
 * Package summary within a search result object.
 */
export interface NpmSearchPackage {
  name: string;
  scope: string;
  version: string;
  description?: string;
  keywords?: string[];
  date?: string;
  links?: NpmPackageLinks;
  author?: NpmPerson;
  publisher?: NpmPerson;
  maintainers?: NpmPerson[];
}

/**
 * A single entry in the search results array.
 */
export interface NpmSearchObject {
  package: NpmSearchPackage;
  score: NpmScore;
  searchScore: number;
  /** Present when the package is flagged as insecure */
  flags?: { insecure?: number };
}

/**
 * Full response from `GET /-/v1/search`.
 */
export interface NpmSearchResult {
  objects: NpmSearchObject[];
  total: number;
  time: string;
}

/**
 * Query parameters for the npm search endpoint.
 */
export interface NpmSearchParams {
  /** Full-text search query */
  text: string;
  /** How many results to return (default: 20, max: 250) */
  size?: number;
  /** Offset for pagination */
  from?: number;
  /** Weight for quality in final score (0–1) */
  quality?: number;
  /** Weight for popularity in final score (0–1) */
  popularity?: number;
  /** Weight for maintenance in final score (0–1) */
  maintenance?: number;
}
