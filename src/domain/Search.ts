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
 *
 * npm no longer computes these metrics: every field is always `1`. Use
 * {@link NpmSearchObject.downloads} and {@link NpmSearchObject.dependents} instead.
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
  /**
   * Search relevance of the package for the query — the same value as
   * {@link NpmSearchObject.searchScore}. Unbounded (e.g. `2467.3`), not a 0–1
   * quality score, and only comparable between results of the same search.
   */
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
  /** Search relevance of the package for the query */
  searchScore: number;
  /** Download counts for the package. Not returned by every registry. */
  downloads?: {
    /** Downloads over the last 30 days */
    monthly: number;
    /** Downloads over the last 7 days */
    weekly: number;
  };
  /**
   * Number of packages that depend on this one, as a numeric string
   * (e.g. `'216179'`). Not returned by every registry.
   */
  dependents?: string;
  /** When the search index entry was last updated (ISO 8601). Not returned by every registry. */
  updated?: string;
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
  /** @deprecated npm's search API no longer applies ranking weights; results are ordered by text relevance only. Still sent, for registries that honor it. */
  quality?: number;
  /** @deprecated npm's search API no longer applies ranking weights; results are ordered by text relevance only. Still sent, for registries that honor it. */
  popularity?: number;
  /** @deprecated npm's search API no longer applies ranking weights; results are ordered by text relevance only. Still sent, for registries that honor it. */
  maintenance?: number;
}
