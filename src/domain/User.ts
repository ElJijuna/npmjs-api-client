/**
 * Authenticated npm user profile returned by the registry user endpoint.
 */
export interface NpmAuthenticatedUser {
  /** CouchDB document id, usually `org.couchdb.user:{username}` */
  _id: string;
  /** CouchDB document revision */
  _rev?: string;
  /** npm username */
  name: string;
  /** Account email address */
  email?: string;
  /** Document type, usually `user` */
  type?: string;
  /** npm roles assigned to the account */
  roles?: string[];
  /** Profile display name */
  fullname?: string;
  /** Profile homepage URL */
  homepage?: string;
  /** Profile GitHub username */
  github?: string;
  /** Profile Twitter/X username */
  twitter?: string;
  /** Creation timestamp when returned by the registry */
  created?: string;
  /** Update timestamp when returned by the registry */
  updated?: string;
  /** Additional registry fields not modeled by this client yet */
  [key: string]: unknown;
}

/**
 * Query parameters for the authenticated user packages endpoint.
 */
export interface NpmUserPackagesParams {
  /** How many package names to return */
  size?: number;
  /** Offset for pagination */
  from?: number;
}

/**
 * Package names associated with an authenticated npm user.
 */
export type NpmUserPackages = string[];
