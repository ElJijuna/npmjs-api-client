# npmjs-api-client

[![CI](https://github.com/ElJijuna/npmjs-api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/npmjs-api-client/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/npmjs-api-client)](https://www.npmjs.com/package/npmjs-api-client)
[![npm downloads/week](https://img.shields.io/npm/dw/npmjs-api-client)](https://www.npmjs.com/package/npmjs-api-client)
[![npm downloads/month](https://img.shields.io/npm/dm/npmjs-api-client)](https://www.npmjs.com/package/npmjs-api-client)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/npmjs-api-client)](https://bundlephobia.com/package/npmjs-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/npmjs-api-client)](https://nodejs.org/)

TypeScript client for the npm ecosystem. Aggregates data from multiple sources into a single, chainable API — package metadata, download stats, quality scores, install size, CDN usage, file contents, and resolved dependency graphs. Works in **Node.js** and the **browser** (isomorphic). Fully typed, zero runtime dependencies.

**Data sources integrated:**

| Source | What it provides |
| --- | --- |
| [registry.npmjs.org](https://registry.npmjs.org) | Package metadata, versions, dist-tags, search, maintainers |
| [api.npmjs.org](https://api.npmjs.org) | Download counts by period, per-day breakdown, version-level stats |
| [api.npms.io/v2](https://api.npms.io) | Quality, maintenance & popularity scores with detailed evaluation |
| [packagephobia.com](https://packagephobia.com) | Publish size and full install size including all transitive dependencies |
| [data.jsdelivr.com/v1](https://data.jsdelivr.com) | CDN browser usage — hits by version and file |
| [unpkg.com](https://unpkg.com) | Full file tree with individual file sizes and paths |
| [api.deps.dev/v3](https://deps.dev) | Fully resolved dependency graph with exact versions |

---

## Installation

```bash
npm install npmjs-api-client
```

---

## Quick start

```typescript
import { NpmClient } from 'npmjs-api-client';

// Public APIs — no auth required
const npm = new NpmClient();

// Private registry with auth token
const npm = new NpmClient({
  registryUrl: 'https://my-registry.example.com',
  token:       'my-auth-token',
});

// Custom base URLs per data source
const npm = new NpmClient({
  npmsApiUrl:       'https://api.npms.io/v2',
  packagephobiaUrl: 'https://packagephobia.com',
  jsdelivrUrl:      'https://data.jsdelivr.com/v1',
  unpkgUrl:         'https://unpkg.com',
  depsDevUrl:       'https://api.deps.dev/v3',
});
```

> The `token` is sent only to the registry and downloads API — never to third-party sources.

---

## API reference

### Package metadata

```typescript
// Full packument — all versions, dist-tags, maintainers, readme, etc.
const pkg = await npm.package('typescript');
const pkg = await npm.package('typescript').get(); // same

// All published versions as an ordered array
const versions = await npm.package('typescript').versions();
console.log(versions.map(v => v.version).join(', '));

// Current maintainers
const maintainers = await npm.package('typescript').maintainers();
maintainers.forEach(m => console.log(m.name, m.email));

// Dist-tags
const tags = await npm.package('typescript').distTags();
// { latest: '6.0.2', beta: '6.0.0-beta', rc: '6.0.1-rc', ... }
```

### Version manifest

```typescript
// Specific version
const manifest = await npm.package('typescript').version('5.4.5');
const manifest = await npm.package('typescript').version('5.4.5').get(); // same

// Latest version (shorthand for .version('latest'))
const latest = await npm.package('typescript').latest();

console.log(manifest.version);        // '5.4.5'
console.log(manifest.license);        // 'Apache-2.0'
console.log(manifest.dist.tarball);   // tarball URL
console.log(manifest.dependencies);   // semver ranges from package.json
```

### Download stats

```typescript
// Total downloads over a period
const stats = await npm.package('typescript').downloads();             // last-month (default)
const stats = await npm.package('typescript').downloads('last-day');
const stats = await npm.package('typescript').downloads('last-week');
const stats = await npm.package('typescript').downloads('last-year');
const stats = await npm.package('typescript').downloads('2024-01-01:2024-03-31');

console.log(stats.downloads); // 163781296
console.log(stats.start);     // '2024-01-01'
console.log(stats.end);       // '2024-01-31'

// Per-day breakdown
const range = await npm.package('typescript').downloadRange('last-month');
range.downloads.forEach(d => console.log(d.day, d.downloads));

// Version-level downloads (last-week only)
const versionStats = await npm.package('typescript').version('5.4.5').downloads('last-week');
console.log(versionStats.downloads);

// Convenience methods on the client directly
const stats = await npm.downloads('last-week', 'typescript');
const range = await npm.downloadRange('last-month', 'typescript');

// Bulk downloads — multiple packages in a single request
const bulk = await npm.bulkDownloads(['react', 'vue', 'angular']);
const bulk = await npm.bulkDownloads(['react', 'vue'], 'last-week');

console.log(bulk['react'].downloads);   // 18591460
console.log(bulk['vue'].downloads);     // 4200000
console.log(bulk['angular'].downloads); // 1800000
```

### Quality score — npms.io

Returns a detailed quality, maintenance, and popularity breakdown — not just the aggregate score available in search results, but every individual component that makes it up.

```typescript
const score = await npm.package('react').score();

// Composite score (0–1)
console.log(score.score.final);                 // 0.97
console.log(score.score.detail.quality);        // 0.95
console.log(score.score.detail.popularity);     // 0.99
console.log(score.score.detail.maintenance);    // 0.98

// Quality components
console.log(score.evaluation.quality.tests);       // 0.8  — has test suite & coverage
console.log(score.evaluation.quality.health);      // 1.0  — no vulnerable/outdated deps
console.log(score.evaluation.quality.carefulness); // 0.9  — has lockfile, .gitignore, stable semver

// Popularity components
console.log(score.evaluation.popularity.dependentsCount);        // 15000 — packages that depend on this
console.log(score.evaluation.popularity.downloadsAcceleration);  // 0.1   — growth trend

// Maintenance components
console.log(score.evaluation.maintenance.releasesFrequency); // 0.9
console.log(score.evaluation.maintenance.openIssues);        // 0.8

// Timestamp of the last analysis
console.log(score.analyzedAt); // '2024-01-01T00:00:00.000Z'
```

### Install size — Packagephobia

Returns the published tarball size and the full installation footprint including all transitive dependencies.

```typescript
// Latest version
const size = await npm.package('react').size();

// Specific version
const size = await npm.package('react').version('18.2.0').size();

// Publish size (the tarball itself)
console.log(size.publish.bytes);  // 12400
console.log(size.publish.files);  // 10
console.log(size.publish.pretty); // '12.4 kB'
console.log(size.publish.color);  // 'green'

// Install size (package + all transitive dependencies)
console.log(size.install.bytes);  // 307200
console.log(size.install.files);  // 35
console.log(size.install.pretty); // '307 kB'
console.log(size.install.color);  // 'green'  ('yellow' > 1 MB, 'red' > 10 MB)
```

### CDN usage stats — jsDelivr

Measures actual browser requests from production apps — complementary to npm download counts, which reflect install-time usage.

```typescript
// Package-level stats (grouped by version by default, last month)
const stats = await npm.package('react').cdnStats();

console.log(stats.rank);   // 1
console.log(stats.total);  // 1234567890

// Grouped by date instead
const byDate = await npm.package('react').cdnStats('date', 'week');

// Per-version breakdown
Object.entries(stats.versions ?? {}).forEach(([ver, data]) => {
  console.log(`${ver}: ${data.total} hits`);
});

// Version-level stats (grouped by file by default)
const versionStats = await npm.package('react').version('18.2.0').cdnStats();

console.log(versionStats.total);
Object.entries(versionStats.files ?? {}).forEach(([file, data]) => {
  console.log(`${file}: ${data.total} hits`);
});
```

Available periods: `'day'` | `'week'` | `'month'` (default) | `'year'`\
Available groupBy at package level: `'version'` (default) | `'date'`\
Available groupBy at version level: `'file'` (default) | `'date'`

### File tree — unpkg

Lists every file included in a published version with individual sizes, types, and paths.

```typescript
const tree = await npm.package('react').version('18.2.0').files();

console.log(tree.type); // 'directory'

// Recursively list all files
function listFiles(node: UnpkgFile, indent = 0) {
  const pad = ' '.repeat(indent);
  if (node.type === 'file') {
    console.log(`${pad}${node.path} (${node.size} bytes)`);
  } else {
    console.log(`${pad}${node.path}/`);
    node.files?.forEach(f => listFiles(f, indent + 2));
  }
}
listFiles(tree);

// Check if types are included
const hasTypes = tree.files?.some(f => f.path.endsWith('.d.ts'));
```

### Resolved dependency graph — deps.dev

Returns exact resolved versions for every dependency in the tree — not the semver ranges from `package.json`, but what actually installs.

```typescript
const deps = await npm.package('react').version('18.2.0').dependencies();

// All nodes in the graph
deps.nodes.forEach(n => {
  console.log(`${n.relation}: ${n.versionKey.name}@${n.versionKey.version}`);
  // 'SELF':     react@18.2.0
  // 'DIRECT':   loose-envify@1.4.0
  // 'INDIRECT': js-tokens@4.0.0
});

// Direct dependencies only
const direct = deps.nodes.filter(n => n.relation === 'DIRECT');

// Bundled dependencies (embedded in the tarball, not installed separately)
const bundled = deps.nodes.filter(n => n.bundled);

// Resolution errors (broken or unresolvable dependencies)
const broken = deps.nodes.filter(n => n.errors.length > 0);

// Dependency edges (who requires whom, and with which constraint)
deps.edges.forEach(e => {
  const from = deps.nodes[e.fromNode].versionKey.name;
  const to   = deps.nodes[e.toNode].versionKey.name;
  console.log(`${from} → ${to} (${e.requirement})`);
});
```

### Security audit

Runs a security audit against the npm registry. The payload mirrors the top-level structure of `package-lock.json`.

```typescript
const payload = {
  name: 'my-app',
  version: '1.0.0',
  requires: { lodash: '^4.17.11' },
  dependencies: {
    lodash: { version: '4.17.11', integrity: 'sha512-...' },
  },
};

// Full audit — advisory details + recommended actions
const result = await npm.audit(payload);

console.log(result.metadata.vulnerabilities);
// { info: 0, low: 0, moderate: 0, high: 1, critical: 0 }

Object.values(result.advisories).forEach(a => {
  console.log(`[${a.severity}] ${a.title}`);
  console.log(`  module: ${a.module_name}@${a.vulnerable_versions}`);
  console.log(`  fix:    upgrade to ${a.patched_versions}`);
  console.log(`  url:    ${a.url}`);
});

result.actions.forEach(action => {
  console.log(`${action.action}: ${action.module} → ${action.target}`);
});

// Quick audit — counts only, no advisory details (faster)
const quick = await npm.auditQuick(payload);

const { high, critical } = quick.metadata.vulnerabilities;
if (high + critical > 0) {
  console.error(`${high} high and ${critical} critical vulnerabilities found`);
}
```

Both methods support `AbortSignal` and emit a `request` event with `method: 'POST'`.

### Search

```typescript
const results = await npm.search({ text: 'typescript client' });
const results = await npm.search({ text: 'react hooks', size: 10, from: 0 });

// Weighted search — tune quality/popularity/maintenance influence (0–1)
const results = await npm.search({
  text:        'logger',
  size:        5,
  quality:     0.5,
  popularity:  0.8,
  maintenance: 0.7,
});

results.objects.forEach(o => {
  console.log(o.package.name, o.package.version, o.score.final);
});
console.log(results.total); // total matches

// Top package shortcuts
const top = await npm.topPackages(10);
const popular = await npm.topByPopularity(10);
const quality = await npm.topByQuality(10);
const maintained = await npm.topByMaintenance(10);
const types = await npm.topByKeyword('typescript', 10);
const scoped = await npm.topByScope('@types', 10);
```

### Maintainer

```typescript
// Public profile
const user = await npm.maintainer('sindresorhus').info();
console.log(user.name, user.email);

// Avatar URL derived from the maintainer's public email
const avatarUrl = await npm.maintainer('sindresorhus').avatar();
// 'https://www.gravatar.com/avatar/...'

// All packages maintained (paginated)
const result = await npm.maintainer('sindresorhus').packages();
console.log(`${result.total} packages`);
result.objects.forEach(o => console.log(o.package.name, o.package.version));

// Second page
const page2 = await npm.maintainer('sindresorhus').packages({ size: 25, from: 25 });
```

### Organization

```typescript
const npm = new NpmClient({ token: 'npm_...' });

// Packages the org can access
const packages = await npm.org('npmcli').packages();
console.log(packages['@npmcli/arborist']); // 'read-write'

// Teams in the org
const teams = await npm.org('npmcli').teams();
teams.forEach(team => console.log(team)); // 'npmcli:developers'

// Org members and roles
const members = await npm.org('npmcli').members();
console.log(members.isaacs); // 'owner'

// Members in a specific team
const developers = await npm.org('npmcli').teamMembers('developers');
developers.forEach(username => console.log(username));
```

---

## Chainable resource pattern

Every resource implements `PromiseLike`, so you can **await it directly** or **chain methods**:

```typescript
// Await directly → fetches the packument
const pkg = await npm.package('typescript');

// Chain → fetches the version manifest
const manifest = await npm.package('typescript').version('5.4.5');

// Chain → latest version
const latest = await npm.package('typescript').latest();
```

---

## Cancelling requests

Pass an `AbortSignal` to any method to cancel the in-flight request:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 3000);

await npm.package('react').get(controller.signal);
await npm.package('react').score(controller.signal);
await npm.package('react').size(controller.signal);
await npm.package('react').cdnStats('version', 'month', controller.signal);
await npm.package('react').version('18.2.0').files(controller.signal);
await npm.package('react').version('18.2.0').dependencies(controller.signal);
await npm.package('react').downloads('last-week', controller.signal);
await npm.search({ text: 'react' }, controller.signal);
await npm.maintainer('sindresorhus').packages({}, controller.signal);
await npm.bulkDownloads(['react', 'vue'], 'last-week', controller.signal);
await npm.audit(payload, controller.signal);
await npm.auditQuick(payload, controller.signal);
```

When aborted, `fetch` throws a `DOMException` with `name === 'AbortError'`. The `request` event is still emitted with the error attached.

---

## Request events

Subscribe to every HTTP request for logging, monitoring, or debugging:

```typescript
npm.on('request', (event) => {
  console.log(`[${event.method}] ${event.url} → ${event.statusCode} (${event.durationMs}ms)`);
  if (event.error) {
    console.error('Request failed:', event.error.message);
  }
});
```

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Full URL that was requested |
| `method` | `'GET'` | HTTP method used |
| `startedAt` | `Date` | When the request started |
| `finishedAt` | `Date` | When the request finished |
| `durationMs` | `number` | Duration in milliseconds |
| `statusCode` | `number \| undefined` | HTTP status code, if a response was received |
| `error` | `Error \| undefined` | Present only if the request failed |

Multiple listeners can be registered. The event is always emitted after the request completes, whether it succeeded or failed. Events are emitted for all data sources — registry, downloads, npms.io, packagephobia, jsDelivr, unpkg, and deps.dev.

---

## Error handling

Non-2xx responses throw an `NpmApiError` with the HTTP status code and status text:

```typescript
import { NpmApiError } from 'npmjs-api-client';

try {
  await npm.package('nonexistent-xyz').get();
} catch (err) {
  if (err instanceof NpmApiError) {
    console.log(err.status);     // 404
    console.log(err.statusText); // 'Not Found'
    console.log(err.message);    // 'npm API error: 404 Not Found'
  }
}
```

---

## TypeScript types

All domain types are exported:

```typescript
import type {
  // Client
  NpmClientOptions, RequestEvent, NpmClientEvents,

  // Package
  NpmPackument, NpmPerson, NpmRepository,
  NpmPackageVersion, NpmDist,
  NpmDistTags,

  // Search
  NpmSearchResult, NpmSearchObject, NpmSearchPackage,
  NpmSearchParams, NpmScore, NpmScoreDetail, NpmPackageLinks,

  // Downloads
  NpmDownloadPoint, NpmDownloadRange, NpmDownloadDay, NpmDownloadPeriod,
  NpmVersionDownloadPeriod, NpmVersionDownloadPoint, NpmBulkDownloads,

  // npms.io
  NpmsScore, NpmsScoreDetail, NpmsEvaluation,
  NpmsQualityEvaluation, NpmsPopularityEvaluation, NpmsMaintenanceEvaluation,

  // Packagephobia
  PackagephobiaSize, PackagephobiaSizeInfo,

  // jsDelivr
  JsdelivrStats, JsdelivrVersionEntry, JsdelivrPeriod, JsdelivrGroupBy,

  // unpkg
  UnpkgFile,

  // deps.dev
  DepsDevDependencies, DepsDevDependencyNode, DepsDevDependencyEdge, DepsDevVersionKey,

  // Audit
  NpmAuditPayload, NpmAuditDependency,
  NpmAuditResult, NpmAuditQuickResult,
  NpmAuditAdvisory, NpmAuditAction, NpmAuditFinding,
  NpmAuditMetadata, NpmAuditVulnerabilityCounts, NpmAuditSeverity,
} from 'npmjs-api-client';
```

---

## Documentation

Full API documentation is published at:
**[https://eljijuna.github.io/npmjs-api-client](https://eljijuna.github.io/npmjs-api-client)**

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
