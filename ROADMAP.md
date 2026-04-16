# Roadmap

## Legend
- ✅ Implemented
- ⬜ Pending

---

## NpmClient (entry point)

| Method | Endpoint | Status |
|--------|----------|--------|
| `package(name)` | — chainable | ✅ |
| `maintainer(username)` | — chainable | ✅ |
| `search(params, signal?)` | `GET /-/v1/search` | ✅ |
| `downloads(period, package, signal?)` | `GET /downloads/point/{period}/{package}` | ✅ |
| `downloadRange(period, package, signal?)` | `GET /downloads/range/{period}/{package}` | ✅ |
| AbortSignal support on all methods | — | ✅ |

---

## PackageResource

| Method | Endpoint | Status |
|--------|----------|--------|
| `get(signal?)` | `GET /{name}` | ✅ |
| `version(ver)` | — chainable | ✅ |
| `latest()` | — chainable (shorthand for `version('latest')`) | ✅ |
| `versions(signal?)` | `GET /{name}` (extraído del packument) | ✅ |
| `maintainers(signal?)` | `GET /{name}` (extraído del packument) | ✅ |
| `distTags(signal?)` | `GET /-/package/{name}/dist-tags` | ✅ |
| `downloads(period?, signal?)` | `GET /downloads/point/{period}/{name}` | ✅ |
| `downloadRange(period?, signal?)` | `GET /downloads/range/{period}/{name}` | ✅ |
| `addDistTag(tag, version)` | `PUT /-/package/{name}/dist-tags/{tag}` | ⬜ |
| `removeDistTag(tag)` | `DELETE /-/package/{name}/dist-tags/{tag}` | ⬜ |
| `deprecate(version, message)` | `PUT /{name}` (deprecation) | ⬜ |
| `bulkDownloads(period?)` | `GET /downloads/point/{period}/{name1},{name2},...` | ⬜ |

---

## VersionResource

| Method | Endpoint | Status |
|--------|----------|--------|
| `get(signal?)` | `GET /{name}/{version}` | ✅ |

---

## MaintainerResource

| Method | Endpoint | Status |
|--------|----------|--------|
| `info(signal?)` | `GET /-/user/org.couchdb.user:{username}` | ✅ |
| `packages(params?, signal?)` | `GET /-/v1/search?text=maintainer:{username}` | ✅ |

---

## Planned: UserResource

Requires npm registry authentication.

| Method | Endpoint | Status |
|--------|----------|--------|
| `get(username)` | `GET /-/user/org.couchdb.user:{username}` | ⬜ |
| `packages(username, params?)` | `GET /-/by-user/{username}` | ⬜ |

---

## Planned: OrgResource

Requires npm registry authentication.

| Method | Endpoint | Status |
|--------|----------|--------|
| `packages(org, params?)` | `GET /-/org/{org}/package` | ⬜ |
| `teams(org)` | `GET /-/org/{org}/team` | ⬜ |
| `members(org, team?)` | `GET /-/org/{org}/user` | ⬜ |

---

## Planned: Audit

| Method | Endpoint | Status |
|--------|----------|--------|
| `audit(data)` | `POST /-/npm/v1/security/audits` | ⬜ |
| `auditQuick(data)` | `POST /-/npm/v1/security/audits/quick` | ⬜ |
