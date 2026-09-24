import assert from 'node:assert/strict';
import { NpmApiError, NpmClient } from '../dist/index.js';

const npm = new NpmClient();

async function checkExternal(name, operation) {
  try {
    await operation();
  } catch (error) {
    // A failed assertion is a regression, not an unavailable service.
    if (error instanceof assert.AssertionError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[SKIP] ${name}: ${detail}`);
  }
}

async function test() {
  // --- PackageResource ---

  // Full packument (all versions)
  const pkg = await npm.package('typescript');
  console.log('Package:', pkg.name, '— latest:', pkg['dist-tags'].latest);

  // All published versions as array
  const versions = await npm.package('typescript').versions();
  console.log('All versions count:', versions.length);

  // Current maintainers
  const maintainers = await npm.package('typescript').maintainers();
  console.log('Maintainers:', maintainers.map((m) => `${m.name} <${m.email}>`).join(', '));

  // Dist-tags
  const tags = await npm.package('typescript').distTags();
  console.log('Dist-tags:', tags);

  // Download point
  const downloads = await npm.package('typescript').downloads('last-week');
  console.log('Downloads last-week:', downloads.downloads);

  // Download range (per-day breakdown)
  const range = await npm.package('typescript').downloadRange('last-week');
  console.log('Download range days:', range.downloads.length);
  console.log('First day:', range.downloads[0].day, range.downloads[0].downloads);

  // Quality score — npm registry search index
  const score = await npm.package('typescript').score();
  console.log('Score final:', score.score.final);
  console.log('Score quality:', score.score.detail.quality);
  console.log('Score popularity:', score.score.detail.popularity);
  console.log('Score maintenance:', score.score.detail.maintenance);

  // Install size — packagephobia
  await checkExternal('Packagephobia package size', async () => {
    const size = await npm.package('typescript').size();
    console.log('Publish size:', size.publish.pretty);
    console.log('Install size:', size.install.pretty);
  });

  // CDN stats — jsDelivr (by version, last month)
  await checkExternal('jsDelivr package stats', async () => {
    const cdnStats = await npm.package('typescript').cdnStats();
    console.log('CDN rank:', cdnStats.rank);
    console.log('CDN total hits:', cdnStats.total);
  });

  // --- VersionResource ---

  // Specific version manifest
  const manifest = await npm.package('typescript').version('5.0.2');
  console.log('Version:', manifest.version, '— license:', manifest.license);

  // Latest version shorthand
  const latest = await npm.package('typescript').latest();
  console.log('Latest version:', latest.version);

  // Version-level downloads (last-week only)
  const versionDownloads = await npm.package('typescript').version('5.0.2').downloads();
  console.log('Version 5.0.2 downloads last-week:', versionDownloads.downloads);

  // Version install size
  await checkExternal('Packagephobia version size', async () => {
    const versionSize = await npm.package('typescript').version('5.0.2').size();
    console.log('Version 5.0.2 install size:', versionSize.install.pretty);
  });

  // File tree — unpkg
  await checkExternal('unpkg file tree', async () => {
    const files = await npm.package('typescript').version('5.0.2').files();
    console.log('File tree root type:', files.type);
    console.log('Top-level entries:', files.files?.map((f) => f.path).join(', '));
  });

  // CDN stats at version level (by file)
  await checkExternal('jsDelivr version stats', async () => {
    const versionCdn = await npm.package('typescript').version('5.0.2').cdnStats();
    console.log('Version CDN total hits:', versionCdn.total);
  });

  // Resolved dependency graph — deps.dev
  await checkExternal('deps.dev dependency graph', async () => {
    const deps = await npm.package('typescript').version('5.0.2').dependencies();
    console.log('Dependency nodes:', deps.nodes.length);
    deps.nodes.forEach((n) =>
      console.log(` - [${n.relation}] ${n.versionKey.name}@${n.versionKey.version}`),
    );
  });

  // --- NpmClient convenience methods ---

  // downloads() and downloadRange() directly on client
  const clientDownloads = await npm.downloads('last-week', 'typescript');
  console.log('Client downloads:', clientDownloads.downloads);

  const clientRange = await npm.downloadRange('last-week', 'typescript');
  console.log('Client range days:', clientRange.downloads.length);

  // Bulk downloads — multiple packages in one request
  const bulk = await npm.bulkDownloads(['react', 'vue', 'typescript'], 'last-week');
  console.log('Bulk downloads last-week:');
  Object.entries(bulk).forEach(([name, data]) => console.log(` - ${name}: ${data.downloads}`));

  // --- Search ---

  const results = await npm.search({ text: 'typescript client', size: 3 });
  console.log('Search results:');
  results.objects.forEach((o) => console.log(' -', o.package.name, o.package.version));

  // --- User (requires token) ---

  // const authedNpm = new NpmClient({ token: 'npm_...' });
  // const { username } = await authedNpm.whoami();
  // console.log('whoami:', username);

  // --- MaintainerResource ---

  const maintainerInfo = await npm.maintainer('pilmee').info();
  console.log('Maintainer pilmee:', maintainerInfo);

  const maintained = await npm.maintainer('pilmee').packages({ size: 7 });
  console.log(`Maintainer pilmee — ${maintained.total} packages:`);
  maintained.objects.forEach((o) => console.log(' -', o.package.name, o.package.version));

  // --- Audit ---

  const auditPayload = {
    name: 'my-app',
    version: '1.0.0',
    requires: { lodash: '^4.17.11' },
    dependencies: {
      lodash: {
        version: '4.17.11',
        integrity:
          'sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZhrCAtcxWrZhAjYviQ==',
      },
    },
  };

  const audit = await npm.audit(auditPayload);
  console.log('Audit vulnerabilities:', audit.metadata.vulnerabilities);

  const auditQuick = await npm.auditQuick(auditPayload);
  console.log('Audit quick vulnerabilities:', auditQuick.metadata.vulnerabilities);

  await regressions();
}

/** Live checks for bugs fixed after the project review. */
async function regressions() {
  console.log('\n--- Regression checks ---');

  // 1. maintainer().info()/avatar() return the requested user, not the package publisher.
  // isaacs' top search result is published by a co-maintainer.
  const [top] = (await npm.maintainer('isaacs').packages({ size: 1 })).objects;
  const isaacs = top.package.maintainers.find((m) => m.username === 'isaacs');
  const isaacsInfo = await npm.maintainer('isaacs').info();
  assert.deepEqual(isaacsInfo, { name: 'isaacs', email: isaacs.email });
  const avatar = await npm.maintainer('isaacs').avatar();
  assert.equal(avatar === undefined, isaacs.email === undefined);
  console.log('[OK] maintainer info/avatar use the maintainer, not the publisher:', isaacsInfo);

  // 2. score() throws 404 instead of returning a fuzzy match's score.
  // lodash.get is deprecated and excluded from search, which returns @types/lodash.get.
  for (const name of ['lodash.get', 'zzq-nonexistent-package-for-npmjs-api-client']) {
    await assert.rejects(npm.package(name).score(), (error) => {
      assert.ok(error instanceof NpmApiError);
      assert.equal(error.status, 404);
      return true;
    });
  }
  console.log('[OK] score() rejects with 404 when there is no exact match');

  // 3. A private registry token is never sent to api.npmjs.org.
  const realFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = (url, init) => {
    sent.push({ host: new URL(url).host, authorization: init?.headers?.Authorization });
    return realFetch(url, init);
  };
  try {
    const privateNpm = new NpmClient({
      registryUrl: 'https://my-registry.example.com',
      token: 'private-registry-token',
    });
    await privateNpm.downloads('last-week', 'typescript');
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(sent, [{ host: 'api.npmjs.org', authorization: undefined }]);
  console.log('[OK] private registry token not sent to api.npmjs.org');

  // 4. Dist-tags are resolved before calling APIs that only accept exact versions.
  const { latest: latestVersion } = await npm.package('typescript').distTags();
  const latestDownloads = await npm.package('typescript').latest().downloads();
  assert.equal(latestDownloads.version, latestVersion);
  assert.ok(latestDownloads.downloads > 0, 'latest().downloads() should not be 0');
  console.log('[OK] latest().downloads():', latestDownloads.version, latestDownloads.downloads);

  await checkExternal('deps.dev latest() dependencies', async () => {
    const deps = await npm.package('react').latest().dependencies();
    assert.ok(deps.nodes.length > 0, 'latest().dependencies() should include the package itself');
    console.log('[OK] latest().dependencies() nodes:', deps.nodes.length);
  });

  await checkExternal('jsDelivr latest() stats', async () => {
    const stats = await npm.package('react').latest().cdnStats();
    assert.ok(stats.total > 0, 'latest().cdnStats() should not be empty');
    console.log('[OK] latest().cdnStats() total hits:', stats.total);
  });

  // 5. bulkDownloads() handles scoped packages, single packages, missing packages,
  // and more than 128 names — npm's bulk endpoint rejects or reshapes all of these.
  const mixed = await npm.bulkDownloads(
    ['react', '@types/node', 'zzq-nonexistent-package-for-npmjs-api-client'],
    'last-week',
  );
  assert.ok(mixed['react'].downloads > 0);
  assert.ok(mixed['@types/node'].downloads > 0);
  assert.equal(mixed['zzq-nonexistent-package-for-npmjs-api-client'], null);
  console.log('[OK] bulkDownloads() mixes scoped/unscoped:', mixed['@types/node'].downloads);

  const single = await npm.bulkDownloads(['react'], 'last-week');
  assert.deepEqual(Object.keys(single), ['react']);
  assert.ok(single['react'].downloads > 0);
  console.log('[OK] bulkDownloads() with a single package returns a map');

  const many = ['react', ...Array.from({ length: 129 }, (_, i) => `zzq-bulk-missing-${i}`)];
  const batched = await npm.bulkDownloads(many, 'last-week');
  assert.equal(Object.keys(batched).length, many.length);
  assert.ok(batched['react'].downloads > 0);
  console.log('[OK] bulkDownloads() splits', many.length, 'names into batches of 128');

  // versions() is sorted by publication time. express publishes 4.x backports after 5.x.
  const expressPackument = await npm.package('express');
  const expressVersions = await npm.package('express').versions();
  const publishTimes = expressVersions.map((v) => Date.parse(expressPackument.time[v.version]));
  assert.ok(publishTimes.every((t, i) => i === 0 || publishTimes[i - 1] <= t));
  console.log('[OK] versions() in publication order, last:', expressVersions.at(-1).version);

  // off() removes a listener registered with on().
  const seenUrls = [];
  const listener = (event) => seenUrls.push(event.url);
  const observed = new NpmClient().on('request', listener);
  await observed.package('typescript').distTags();
  observed.off('request', listener);
  await observed.package('typescript').distTags();
  assert.equal(seenUrls.length, 1);
  console.log('[OK] off() stops request events:', seenUrls[0]);
}

try {
  await test();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
