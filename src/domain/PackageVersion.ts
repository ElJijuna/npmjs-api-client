import type { NpmPerson, NpmRepository } from './Packument';

/**
 * Distribution info attached to a published version.
 */
export interface NpmDist {
  /** URL to the tarball */
  tarball: string;
  /** SHA-1 checksum */
  shasum: string;
  /** Subresource Integrity hash */
  integrity?: string;
  /** Number of files in the tarball */
  fileCount?: number;
  /** Unpacked size in bytes */
  unpackedSize?: number;
}

/**
 * Version manifest returned by `GET /:package/:version`.
 *
 * Represents the metadata for a single published version of a package.
 */
export interface NpmPackageVersion {
  /** Package name */
  name: string;
  /** Version string (semver) */
  version: string;
  /** Short description */
  description?: string;
  /** Entry point for CommonJS consumers */
  main?: string;
  /** Scripts defined in the package */
  scripts?: Record<string, string>;
  /** Runtime dependencies */
  dependencies?: Record<string, string>;
  /** Development dependencies */
  devDependencies?: Record<string, string>;
  /** Peer dependencies */
  peerDependencies?: Record<string, string>;
  /** Optional dependencies */
  optionalDependencies?: Record<string, string>;
  /** Bundled dependencies */
  bundledDependencies?: string[];
  /** Distribution tarball info */
  dist: NpmDist;
  /** npm CLI version used to publish */
  _npmVersion?: string;
  /** Node.js version used to publish */
  _nodeVersion?: string;
  /** npm internal document ID (`name@version`) */
  _id?: string;
  /** Current maintainers */
  maintainers?: NpmPerson[];
  /** Keywords for search */
  keywords?: string[];
  /** Source repository */
  repository?: NpmRepository;
  /** SPDX license identifier or expression */
  license?: string;
  /** Homepage URL */
  homepage?: string;
  /** Bug tracker */
  bugs?: { url?: string; email?: string };
  /** Deprecated notice (if version is deprecated) */
  deprecated?: string;
  /** Engines field (e.g. `{ node: '>=14' }`) */
  engines?: Record<string, string>;
}
