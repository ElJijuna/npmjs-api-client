# Roadmap

## Legend
- ✅ Implemented
- ⬜ Pending

---

## NpmClient (entry point)

| Method | Endpoint | Status |
|--------|----------|--------|
| `package(name)` | — chainable | ✅ |
| `search(params)` | `GET /-/v1/search` | ✅ |
| `downloads(period, package)` | `GET /downloads/point/{period}/{package}` | ✅ |
| `downloadRange(period, package)` | `GET /downloads/range/{period}/{package}` | ✅ |

---

## PackageResource

| Method | Endpoint | Status |
|--------|----------|--------|
| `get()` | `GET /{name}` | ✅ |
| `version(ver)` | — chainable | ✅ |
| `latest()` | — chainable (shorthand for `version('latest')`) | ✅ |
| `versions()` | `GET /{name}` (extraído del packument) | ✅ |
| `maintainers()` | `GET /{name}` (extraído del packument) | ✅ |
| `distTags()` | `GET /-/package/{name}/dist-tags` | ✅ |
| `downloads(period?)` | `GET /downloads/point/{period}/{name}` | ✅ |
| `downloadRange(period?)` | `GET /downloads/range/{period}/{name}` | ✅ |
| `addDistTag(tag, version)` | `PUT /-/package/{name}/dist-tags/{tag}` | ⬜ |
| `removeDistTag(tag)` | `DELETE /-/package/{name}/dist-tags/{tag}` | ⬜ |
| `deprecate(version, message)` | `PUT /{name}` (deprecation) | ⬜ |
| `bulkDownloads(period?)` | `GET /downloads/point/{period}/{name1},{name2},...` | ⬜ |

---

## VersionResource

| Method | Endpoint | Status |
|--------|----------|--------|
| `get()` | `GET /{name}/{version}` | ✅ |

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
