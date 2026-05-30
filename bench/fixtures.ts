import type { NpmPackument } from '../src/domain/Packument';
import type { NpmPackageVersion } from '../src/domain/PackageVersion';

function makeVersion(name: string, version: string): NpmPackageVersion {
  return {
    name,
    version,
    description: `Benchmark fixture package - version ${version}`,
    main: 'index.js',
    scripts: { test: 'jest', build: 'tsup' },
    dependencies: { lodash: '^4.17.21', 'is-plain-obj': '^4.1.0' },
    devDependencies: { typescript: '^5.0.0', jest: '^29.0.0' },
    dist: {
      tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
      shasum: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      integrity: 'sha512-abc123def456abc123def456abc123def456abc123def456abc123def456abc123def456==',
      fileCount: 8,
      unpackedSize: 20_480,
    },
    maintainers: [{ name: 'testuser', email: 'test@example.com' }],
    keywords: ['benchmark', 'test', 'fixture'],
    license: 'MIT',
    homepage: `https://github.com/testuser/${name}`,
    bugs: { url: `https://github.com/testuser/${name}/issues` },
    engines: { node: '>=16' },
  };
}

function makePackument(name: string, versionCount: number): NpmPackument {
  const versions: Record<string, NpmPackageVersion> = {};
  const time: Record<string, string> = {
    created: '2020-01-01T00:00:00.000Z',
    modified: '2023-06-01T00:00:00.000Z',
  };

  for (let i = 0; i < versionCount; i++) {
    const major = Math.floor(i / 10);
    const minor = i % 10;
    const ver = `${major}.${minor}.0`;
    versions[ver] = makeVersion(name, ver);
    const year = 2020 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, '0');
    time[ver] = `${year}-${month}-01T00:00:00.000Z`;
  }

  const keys = Object.keys(versions);
  const latestVer = keys[keys.length - 1]!;

  return {
    name,
    description: `Benchmark fixture package with ${versionCount} versions`,
    'dist-tags': { latest: latestVer, beta: `${Math.floor((versionCount - 1) / 10)}.${(versionCount - 1) % 10}.0` },
    versions,
    time,
    maintainers: [
      { name: 'testuser', email: 'test@example.com' },
      { name: 'contributor', email: 'contrib@example.com' },
    ],
    keywords: ['benchmark', 'test', 'fixture'],
    license: 'MIT',
    homepage: `https://github.com/testuser/${name}`,
    bugs: { url: `https://github.com/testuser/${name}/issues` },
    repository: { type: 'git', url: `https://github.com/testuser/${name}.git` },
  };
}

export const smallPackument = makePackument('bench-pkg-small', 5);
export const largePackument = makePackument('bench-pkg-large', 100);

export function makeMockResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
