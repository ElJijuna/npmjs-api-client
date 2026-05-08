/** Package access level granted to an npm org. */
export type NpmOrgPackageAccess = 'read-only' | 'read-write';

/** Map of package name to org package access level. */
export type NpmOrgPackages = Record<string, NpmOrgPackageAccess>;

/** Org-level role for an npm user. */
export type NpmOrgMemberRole = 'developer' | 'admin' | 'owner';

/** Map of username to org role. */
export type NpmOrgMembers = Record<string, NpmOrgMemberRole>;

