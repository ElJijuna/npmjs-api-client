# Roadmap

## Legend

- ✅ Implemented
- 🔄 In progress
- ⬜ Pending

---

## Active data sources

| Source           | Base URL                | Data provided                                              |
| ---------------- | ----------------------- | ---------------------------------------------------------- |
| npm Registry     | `registry.npmjs.org`    | Metadata, versions, dist-tags, search, maintainers         |
| npm Downloads API | `api.npmjs.org`        | Historical download counts by period and by version        |

---

## NpmClient (entry point)

| Method                                   | Endpoint                                          | Status |
| ---------------------------------------- | ------------------------------------------------- | ------ |
| `package(name)`                          | — chainable                                       | ✅     |
| `maintainer(username)`                   | — chainable                                       | ✅     |
| `search(params, signal?)`                | `GET /-/v1/search`                                | ✅     |
| `downloads(period, package, signal?)`    | `GET /downloads/point/{period}/{package}`         | ✅     |
| `downloadRange(period, package, signal?)` | `GET /downloads/range/{period}/{package}`        | ✅     |
| AbortSignal support on all methods       | —                                                 | ✅     |

---

## PackageResource

| Method                            | Endpoint                                                              | Status |
| --------------------------------- | --------------------------------------------------------------------- | ------ |
| `get(signal?)`                    | `GET /{name}`                                                         | ✅     |
| `version(ver)`                    | — chainable                                                           | ✅     |
| `latest()`                        | — chainable (shorthand for `version('latest')`)                       | ✅     |
| `versions(signal?)`               | `GET /{name}` (extracted from packument)                              | ✅     |
| `maintainers(signal?)`            | `GET /{name}` (extracted from packument)                              | ✅     |
| `distTags(signal?)`               | `GET /-/package/{name}/dist-tags`                                     | ✅     |
| `downloads(period?, signal?)`     | `GET /downloads/point/{period}/{name}`                                | ✅     |
| `downloadRange(period?, signal?)` | `GET /downloads/range/{period}/{name}`                                | ✅     |
| `score(signal?)`                  | `GET /package/{name}` via api.npms.io                                 | ⬜     |
| `size(signal?)`                   | `GET /v2/api.json?p={name}` via packagephobia.com                     | ⬜     |
| `cdnStats(groupBy?, period?, signal?)` | `GET /package/npm/{name}/stats/{groupBy}/{period}` via data.jsdelivr.com | ⬜ |
| `addDistTag(tag, version)`        | `PUT /-/package/{name}/dist-tags/{tag}`                               | ⬜     |
| `removeDistTag(tag)`              | `DELETE /-/package/{name}/dist-tags/{tag}`                            | ⬜     |
| `deprecate(version, message)`     | `PUT /{name}` (deprecation)                                           | ⬜     |
| `bulkDownloads(period?)`          | `GET /downloads/point/{period}/{name1},{name2},...`                   | ⬜     |

---

## VersionResource

| Method                                    | Endpoint                                                                         | Status |
| ----------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| `get(signal?)`                            | `GET /{name}/{version}`                                                          | ✅     |
| `downloads(period?, signal?)`             | `GET /versions/{name}/last-week` via api.npmjs.org                               | ✅     |
| `size(signal?)`                           | `GET /v2/api.json?p={name}@{version}` via packagephobia.com                      | ⬜     |
| `files(signal?)`                          | `GET /{name}@{version}/?meta` via unpkg.com                                      | ⬜     |
| `cdnStats(groupBy?, period?, signal?)`    | `GET /package/npm/{name}@{version}/stats/{groupBy}/{period}` via data.jsdelivr.com | ⬜   |
| `dependencies(signal?)`                   | `GET /systems/npm/packages/{name}/versions/{version}:dependencies` via api.deps.dev | ⬜  |

---

## MaintainerResource

| Method                          | Endpoint                                          | Status |
| ------------------------------- | ------------------------------------------------- | ------ |
| `info(signal?)`                 | `GET /-/user/org.couchdb.user:{username}`         | ✅     |
| `packages(params?, signal?)`    | `GET /-/v1/search?text=maintainer:{username}`     | ✅     |

---

## Planned: UserResource

Requires npm registry authentication.

| Method                       | Endpoint                                    | Status |
| ---------------------------- | ------------------------------------------- | ------ |
| `get(username)`              | `GET /-/user/org.couchdb.user:{username}`   | ⬜     |
| `packages(username, params?)` | `GET /-/by-user/{username}`                | ⬜     |

---

## Planned: OrgResource

Requires npm registry authentication.

| Method                  | Endpoint                    | Status |
| ----------------------- | --------------------------- | ------ |
| `packages(org, params?)` | `GET /-/org/{org}/package` | ⬜     |
| `teams(org)`            | `GET /-/org/{org}/team`     | ⬜     |
| `members(org, team?)`   | `GET /-/org/{org}/user`     | ⬜     |

---

## Planned: Audit

| Method               | Endpoint                                     | Status |
| -------------------- | -------------------------------------------- | ------ |
| `audit(data)`        | `POST /-/npm/v1/security/audits`             | ⬜     |
| `auditQuick(data)`   | `POST /-/npm/v1/security/audits/quick`       | ⬜     |

---
---

# New data source integrations

The following APIs complement the existing data without duplicating it. Each section explains what unique data it contributes, why we don't already have it, and the concrete improvement it brings.

---

## 1. api.npms.io/v2 — Detailed quality, maintenance & popularity scores

**Why add it:** The registry search (`/-/v1/search`) already returns three aggregated scores (`quality`, `popularity`, `maintenance`) as numbers between 0 and 1, but only when performing a search. It does not expose the detailed breakdown of each component: we can't tell whether a low quality score is due to missing tests, outdated dependencies, or no README. The npms.io API provides exactly that breakdown, for any package on demand.

**Unique data contributed:**

| Field                                      | Description                                                       | Already have? |
| ------------------------------------------ | ----------------------------------------------------------------- | ------------- |
| `score.final`                              | Weighted composite score (0–1)                                    | Partial (search only) |
| `score.detail.quality`                     | Quality sub-score (0–1)                                           | Partial (search only) |
| `score.detail.popularity`                  | Popularity sub-score (0–1)                                        | Partial (search only) |
| `score.detail.maintenance`                 | Maintenance sub-score (0–1)                                       | Partial (search only) |
| `evaluation.quality.carefulness`           | Presence of `.gitignore`, lockfile, `.editorconfig`, stable semver | ❌ No        |
| `evaluation.quality.tests`                 | Has a test suite and reported coverage                            | ❌ No         |
| `evaluation.quality.health`                | No known vulnerabilities or outdated dependencies                 | ❌ No         |
| `evaluation.quality.branding`              | Has README, changelog, homepage                                   | ❌ No         |
| `evaluation.maintenance.releasesFrequency` | How frequently new versions are published                         | ❌ No         |
| `evaluation.maintenance.commitsFrequency`  | Commit activity in the repository                                 | ❌ No         |
| `evaluation.maintenance.openIssues`        | Ratio of open vs closed issues                                    | ❌ No         |
| `evaluation.maintenance.issuesDistribution` | Distribution of issue response times                             | ❌ No         |
| `evaluation.popularity.communityInterest`  | GitHub stars and watchers                                         | ❌ No         |
| `evaluation.popularity.downloadsAcceleration` | Download growth trend (not just total count)                   | ❌ No         |
| `evaluation.popularity.dependentsCount`    | Number of packages that depend on this one                        | ❌ No         |
| `analyzedAt`                               | Timestamp of the last analysis run                                | ❌ No         |

**What improves:**

- Allows diagnosing *why* a package has a low score, not just knowing it's low
- `dependentsCount` is the only ecosystem-level popularity signal we'd have — no other source tells us how many packages depend on a given package
- `downloadsAcceleration` reveals whether a package is growing or declining, which raw download totals don't tell us
- Quality components allow assessing whether a package is safe to use in production (no vulnerabilities, has tests, active maintenance)
- Scores are available for any package, not only search results

**Endpoint:** `GET https://api.npms.io/v2/package/{name}`\
**Client method:** `npm.package('react').score()`\
**Return type:** `NpmsScore`

---

## 2. packagephobia.com/v2 — Publish size & full install size

**Why add it:** The registry returns `dist.unpackedSize` and `dist.fileCount` for each version — that's the raw unpacked tarball size. It says nothing about the total installation footprint once all transitive dependencies are resolved and installed. Packagephobia calculates that by running an actual install in a clean environment.

**Unique data contributed:**

| Field            | Description                                                         | Already have? |
| ---------------- | ------------------------------------------------------------------- | ------------- |
| `publish.bytes`  | Size of the published tarball in bytes                              | Partial (`dist.unpackedSize` exists but is often absent) |
| `publish.files`  | File count in the published tarball                                 | Partial (`dist.fileCount` exists but is often absent) |
| `publish.pretty` | Human-readable publish size (e.g. `"12.4 kB"`)                     | ❌ No         |
| `publish.color`  | Size indicator: `"green"` / `"yellow"` / `"red"`                   | ❌ No         |
| `install.bytes`  | Total installed size **including all transitive dependencies**       | ❌ No         |
| `install.files`  | Total file count including all dependencies                         | ❌ No         |
| `install.pretty` | Human-readable install size (e.g. `"4.2 MB"`)                      | ❌ No         |
| `install.color`  | Visual indicator of the install impact                              | ❌ No         |

**What improves:**

- The most valuable field is `install.bytes`: a package can be 5 KB itself but pull in 50 MB of dependencies — the registry has no knowledge of that
- Enables informed decisions about `node_modules` footprint before adding a dependency
- `color` is a normalized reference indicator (green < 1 MB, yellow < 10 MB, red > 10 MB) suitable for dashboards
- Available at both package level (latest version) and specific version level

**Endpoint:** `GET https://packagephobia.com/v2/api.json?p={name}[@{version}]`\
**Client methods:**
- `npm.package('react').size()` → size for the `latest` version
- `npm.package('react').version('18.2.0').size()` → size for a specific version

**Return type:** `PackagephobiaSize`

---

## 3. data.jsdelivr.com/v1 — Real production usage via CDN

**Why add it:** Downloads from `api.npmjs.org` count `npm install` invocations — mostly in CI/CD pipelines, build tools, and developer machines. jsDelivr measures actual HTTP requests from browsers in production. These are two entirely different audiences: npm counts Node.js/toolchain usage; jsDelivr counts frontend/browser usage.

**Unique data contributed:**

| Field                    | Description                                                        | Already have? |
| ------------------------ | ------------------------------------------------------------------ | ------------- |
| `total`                  | Total CDN requests in the period                                   | ❌ No (npm downloads measure something different) |
| `rank`                   | Usage ranking on jsDelivr across all packages                      | ❌ No         |
| `versions[v].total`      | Requests broken down by version                                    | ❌ No         |
| `versions[v].dates`      | Per-day request counts per version                                 | ❌ No         |
| `files[f].total`         | Requests per individual file within a version                      | ❌ No         |
| `dates`                  | Time-series of total CDN requests                                  | ❌ No         |

**What improves:**

- Distinguishes between a package used primarily as a dev tool (high npm downloads, low CDN) vs one used in production frontends (high CDN)
- Reveals which older versions are still actively used in production — many sites don't update quickly
- File-level stats at version level show which specific files are actually loaded in browsers (useful for identifying the real production entry point)
- `rank` is the only relative position indicator we would have — it places a package in context of the entire ecosystem

**Endpoints:**
- `GET https://data.jsdelivr.com/v1/package/npm/{name}/stats/{groupBy}/{period}` (package level)
- `GET https://data.jsdelivr.com/v1/package/npm/{name}@{version}/stats/{groupBy}/{period}` (version level)

**`groupBy` options:**
- Package level: `'version'` (default) | `'date'`
- Version level: `'file'` (default) | `'date'`

**`period` options:** `'day'` | `'week'` | `'month'` (default) | `'year'`

**Client methods:**
- `npm.package('react').cdnStats()` → stats by version, last month
- `npm.package('react').version('18.2.0').cdnStats()` → stats by file, last month

**Return type:** `JsdelivrStats`

---

## 4. unpkg.com — Package file tree and internal structure

**Why add it:** The registry knows only the aggregate file count (`dist.fileCount`) and total unpacked size. It does not list files individually, their sizes, or their paths. unpkg serves package files and exposes a metadata endpoint (`?meta`) that returns the complete file tree with sizes, types, and timestamps.

**Unique data contributed:**

| Field    | Description                                        | Already have? |
| -------- | -------------------------------------------------- | ------------- |
| `type`   | Whether the entry is a `'file'` or `'directory'`   | ❌ No         |
| `path`   | Full path of each file within the package          | ❌ No         |
| `size`   | Size in bytes of each individual file              | ❌ No         |
| `mode`   | Unix file permission bits                          | ❌ No         |
| `mtime`  | Last modification timestamp of the file            | ❌ No         |
| `files`  | Recursive array of nested files/directories        | ❌ No         |

**What improves:**

- Allows verifying what files were included in a published version — useful for catching missing `.d.ts` type declarations, checking that `main`/`exports` point to something that exists, or confirming sourcemaps were bundled
- Enables auditing a package's contents before adopting it (no unexpected scripts, no sensitive files accidentally published)
- Combined with packagephobia's install size, gives a complete picture: total footprint (packagephobia) + internal layout (unpkg)

**Endpoint:** `GET https://unpkg.com/{name}@{version}/?meta`\
**Client method:** `npm.package('react').version('18.2.0').files()`\
**Return type:** `UnpkgFile` (recursive tree structure)

---

## 5. api.deps.dev/v3 — Resolved dependency graph & security advisories

**Why add it:** The registry returns `dependencies`, `devDependencies`, and `peerDependencies` as semver ranges (e.g. `"^18.0.0"`). That tells us the constraints, not what version actually resolves in practice, and gives no visibility into transitive dependencies. deps.dev (maintained by Google) resolves the full dependency graph to concrete versions and cross-references known security advisories.

**Unique data contributed:**

| Field                  | Description                                                                      | Already have? |
| ---------------------- | -------------------------------------------------------------------------------- | ------------- |
| `nodes[].versionKey`   | Each dependency with its exact resolved version                                  | ❌ No (only semver ranges) |
| `nodes[].relation`     | Whether it is `'DIRECT'`, `'INDIRECT'`, or `'SELF'`                             | ❌ No         |
| `nodes[].bundled`      | Whether the dependency is bundled inside the tarball                             | ❌ No         |
| `nodes[].errors`       | Resolution errors (non-existent version, conflict, etc.)                         | ❌ No         |
| `edges[].fromNode` → `edges[].toNode` | Directed graph showing who depends on whom                      | ❌ No         |
| `edges[].requirement`  | The exact semver range that produced this edge                                   | ❌ No         |
| `error`                | Top-level message if the full graph could not be resolved                        | ❌ No         |

**What improves:**

- The most valuable field is the resolved version graph: knowing that `react@18.2.0` resolves `scheduler@0.23.0` specifically, not just `^0.23.0`
- Indirect dependencies expose the full tree, not just the first level — critical for supply-chain audits
- `errors` surface packages with broken or irresolvable dependencies before they cause install failures
- The `bundled` flag identifies dependencies embedded inside the tarball (they don't appear as separate installs)
- Provides the infrastructure to check whether any dependency in the full tree has known security advisories

**Endpoint:** `GET https://api.deps.dev/v3/systems/npm/packages/{name}/versions/{version}:dependencies`\
**Client method:** `npm.package('react').version('18.2.0').dependencies()`\
**Return type:** `DepsDevDependencies`

---

## Summary — What improves by area

| Area                  | Before                                               | After                                                                                      |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Package quality**   | Aggregate score only in search results               | Detailed score breakdown per component (tests, health, maintenance, branding) for any package |
| **Size**              | Unpacked tarball size (often absent)                 | Publish size + full install size including all transitive dependencies                      |
| **Popularity**        | npm download counts (install-time)                   | + CDN browser usage, ecosystem ranking, growth trend, dependent package count               |
| **Dependencies**      | Semver ranges from package.json                      | Exact resolved versions, full tree (direct + transitive), resolution errors                 |
| **Package contents**  | Total file count and aggregate size                  | Full file tree with individual file sizes, types, and paths                                 |

---

## Technical changes required

### `NpmClientOptions` — new configurable URLs (all with public defaults)

```typescript
npmsApiUrl?: string;          // default: 'https://api.npms.io/v2'
packagephobiaUrl?: string;    // default: 'https://packagephobia.com'
jsdelivrUrl?: string;         // default: 'https://data.jsdelivr.com/v1'
unpkgUrl?: string;            // default: 'https://unpkg.com'
depsDevUrl?: string;          // default: 'https://api.deps.dev/v3'
```

### `NpmClient.request()` — internal refactor

Replace the binary `if/else` (`registry` vs `downloads`) with a map lookup supporting all base URL keys. The `Authorization` header (token) will only be sent to `registry` and `downloads` — never to third-party APIs.

### New domain type files

```
src/domain/Npms.ts
src/domain/Packagephobia.ts
src/domain/Jsdelivr.ts
src/domain/Unpkg.ts
src/domain/DepsDev.ts
```

### Compatibility

All changes are **additive and fully backwards-compatible**. No existing method changes its signature or behaviour.
