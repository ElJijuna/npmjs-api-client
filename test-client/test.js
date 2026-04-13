import { NpmClient } from '../dist/index.js';

const npm = new NpmClient();

async function test() {
  // Full packument (all versions)
  const pkg = await npm.package('typescript');
  console.log('Package:', pkg.name, '— latest:', pkg['dist-tags'].latest);

  // Specific version manifest
  const version = await npm.package('typescript').version('5.0.2');
  console.log('Version:', version.version, '— license:', version.license);

  const versions = await npm.package('typescript').versions();
  console.log('All versions:', versions.map(v => v.version).join(', '));

  // Maintainers
  const maintainers = await npm.package('typescript').maintainers();
  console.log('Maintainers:', maintainers.map(m => `${m.name} <${m.email}>`).join(', '));

  // Dist-tags
  const tags = await npm.package('typescript').distTags();
  console.log('Dist-tags:', tags);

  // Download stats
  const stats = await npm.package('typescript').downloads('last-week');
  console.log('Downloads last-week:', stats.downloads);

  // Search
  const results = await npm.search({ text: 'typescript client', size: 3 });
  console.log('Search results:');
  results.objects.forEach(o => console.log(' -', o.package.name, o.package.version));

  // Maintainer packages
  const maintained = await npm.maintainer('pilmee').packages({ size: 7 });
  console.log(`Maintainer pilmee — ${maintained.total} packages:`);
  maintained.objects.forEach(o => console.log(' -', o.package.name, o.package.version));
}

test().catch(console.error);
