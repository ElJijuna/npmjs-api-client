import type { NpmPackageVersion } from './PackageVersion';

/**
 * A person entry as represented in npm package metadata.
 */
export interface NpmPerson {
  name?: string;
  email?: string;
  url?: string;
  username?: string;
}

/**
 * Repository field in npm package metadata.
 */
export interface NpmRepository {
  type: string;
  url: string;
  directory?: string;
}

/**
 * Full package document (packument) returned by `GET /:package`.
 *
 * Contains metadata for all published versions of a package.
 */
export interface NpmPackument {
  /** Package name */
  name: string;
  /** Short description */
  description?: string;
  /** Map of dist-tags (e.g. `{ latest: '1.2.3' }`) */
  'dist-tags': Record<string, string>;
  /** Map of version strings to their full version manifests */
  versions: Record<string, NpmPackageVersion>;
  /** Timestamps: `created`, `modified`, and one entry per version */
  time: Record<string, string>;
  /** Current maintainers */
  maintainers?: NpmPerson[];
  /** Keywords for search */
  keywords?: string[];
  /** Source repository */
  repository?: NpmRepository;
  /** SPDX license identifier or expression */
  license?: string;
  /** README content */
  readme?: string;
  /** Filename of the README */
  readmeFilename?: string;
  /** Homepage URL */
  homepage?: string;
  /** Bug tracker */
  bugs?: { url?: string; email?: string };
}
