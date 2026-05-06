import { NpmClient } from '../dist/index.js';

const npm = new NpmClient();

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
  console.log('Maintainers:', maintainers.map(m => `${m.name} <${m.email}>`).join(', '));

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

  // Quality score — npms.io
  const score = await npm.package('typescript').score();
  console.log('Score final:', score.score.final);
  console.log('Score quality:', score.score.detail.quality);
  console.log('Dependents count:', score.evaluation.popularity.dependentsCount);

  // Install size — packagephobia
  const size = await npm.package('typescript').size();
  console.log('Publish size:', size.publish.pretty);
  console.log('Install size:', size.install.pretty);

  // CDN stats — jsDelivr (by version, last month)
  const cdnStats = await npm.package('typescript').cdnStats();
  console.log('CDN rank:', cdnStats.rank);
  console.log('CDN total hits:', cdnStats.total);

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
  const versionSize = await npm.package('typescript').version('5.0.2').size();
  console.log('Version 5.0.2 install size:', versionSize.install.pretty);

  // File tree — unpkg
  const files = await npm.package('typescript').version('5.0.2').files();
  console.log('File tree root type:', files.type);
  console.log('Top-level entries:', files.files?.map(f => f.path).join(', '));

  // CDN stats at version level (by file)
  const versionCdn = await npm.package('typescript').version('5.0.2').cdnStats();
  console.log('Version CDN total hits:', versionCdn.total);

  // Resolved dependency graph — deps.dev
  const deps = await npm.package('typescript').version('5.0.2').dependencies();
  console.log('Dependency nodes:', deps.nodes.length);
  deps.nodes.forEach(n => console.log(` - [${n.relation}] ${n.versionKey.name}@${n.versionKey.version}`));

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
  results.objects.forEach(o => console.log(' -', o.package.name, o.package.version));

  // --- MaintainerResource ---

  const maintainerInfo = await npm.maintainer('pilmee').info();
  console.log('Maintainer pilmee:', maintainerInfo);

  const maintained = await npm.maintainer('pilmee').packages({ size: 7 });
  console.log(`Maintainer pilmee — ${maintained.total} packages:`);
  maintained.objects.forEach(o => console.log(' -', o.package.name, o.package.version));

  // --- Audit ---

  const auditPayload = {
    name: 'my-app',
    version: '1.0.0',
    requires: { lodash: '^4.17.11' },
    dependencies: {
      lodash: { version: '4.17.11', integrity: 'sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZhrCAtcxWrZhAjYviQ==' },
    },
  };

  const audit = await npm.audit(auditPayload);
  console.log('Audit vulnerabilities:', audit.metadata.vulnerabilities);

  const auditQuick = await npm.auditQuick(auditPayload);
  console.log('Audit quick vulnerabilities:', auditQuick.metadata.vulnerabilities);
}

test().catch(console.error);
