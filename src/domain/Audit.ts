export interface NpmAuditDependency {
  version: string;
  integrity?: string;
  resolved?: string;
  requires?: Record<string, string>;
  dependencies?: Record<string, NpmAuditDependency>;
  dev?: boolean;
  optional?: boolean;
  bundled?: boolean;
}

/**
 * Lock-file-shaped payload sent to the npm audit endpoint.
 * Mirrors the top-level structure of `package-lock.json`.
 */
export interface NpmAuditPayload {
  name: string;
  version: string;
  requires?: Record<string, string>;
  dependencies?: Record<string, NpmAuditDependency>;
}

export type NpmAuditSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';

export interface NpmAuditVulnerabilityCounts {
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
}

export interface NpmAuditFinding {
  version: string;
  paths: string[];
  dev: boolean;
  optional: boolean;
  bundled: boolean;
}

export interface NpmAuditAdvisory {
  id: number;
  module_name: string;
  vulnerable_versions: string;
  patched_versions: string;
  severity: NpmAuditSeverity;
  title: string;
  url: string;
  recommendation: string;
  overview: string;
  references?: string;
  cves: string[];
  cwe?: string;
  findings: NpmAuditFinding[];
  deleted?: boolean;
  created: string;
  updated: string;
}

export interface NpmAuditResolve {
  id: number;
  path: string;
  dev: boolean;
  optional: boolean;
  bundled: boolean;
}

export interface NpmAuditAction {
  action: 'update' | 'install' | 'review';
  module: string;
  target: string;
  isMajor?: boolean;
  depth?: number;
  resolves: NpmAuditResolve[];
}

export interface NpmAuditMetadata {
  vulnerabilities: NpmAuditVulnerabilityCounts;
  dependencies: number;
  devDependencies: number;
  optionalDependencies: number;
  totalDependencies: number;
}

/** Full audit response — includes per-advisory details and recommended actions. */
export interface NpmAuditResult {
  actions: NpmAuditAction[];
  advisories: Record<string, NpmAuditAdvisory>;
  muted: unknown[];
  metadata: NpmAuditMetadata;
}

/** Quick audit response — returns only vulnerability counts by severity. */
export interface NpmAuditQuickResult {
  wheres: Record<string, unknown>;
  metadata: NpmAuditMetadata;
}
