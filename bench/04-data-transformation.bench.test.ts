import { buildUrl } from '../src/NpmClient';
import { runBench } from './helpers';
import { smallPackument, largePackument } from './fixtures';

describe('04 — Data Transformation', () => {
  beforeAll(() => console.log('\n04 — Data Transformation'));

  it('Object.values(versions) — small packument (5 versions)', () => {
    runBench('Object.values(smallPackument.versions)', () => {
      Object.values(smallPackument.versions);
    });
  });

  it('Object.values(versions) — large packument (100 versions)', () => {
    runBench('Object.values(largePackument.versions)', () => {
      Object.values(largePackument.versions);
    });
  });

  it('packument.maintainers ?? [] — nullish coalesce', () => {
    runBench('packument.maintainers ?? []', () => {
      void (largePackument.maintainers ?? []);
    });
  });

  it('buildUrl() — with query params', () => {
    runBench('buildUrl(base, { text, size, quality, popularity })', () => {
      buildUrl('https://registry.npmjs.org/-/v1/search', {
        text: 'react state management',
        size: 20,
        quality: 0.5,
        popularity: 1,
        maintenance: 0,
      });
    });
  });

  it('buildUrl() — no params (fast path)', () => {
    runBench('buildUrl(base, undefined)', () => {
      buildUrl('https://registry.npmjs.org/react');
    });
  });

  it('buildUrl() — single param', () => {
    runBench('buildUrl(base, { p: name })', () => {
      buildUrl('https://packagephobia.com/v2/api.json', { p: 'react' });
    });
  });

  it('encodeURIComponent — plain package name', () => {
    runBench('encodeURIComponent("react")', () => {
      encodeURIComponent('react');
    });
  });

  it('encodeURIComponent — scoped package name', () => {
    runBench('encodeURIComponent("@babel/core")', () => {
      encodeURIComponent('@babel/core');
    });
  });

  it('Object.entries().filter() — param filtering in buildUrl', () => {
    const params = { text: 'react', size: 20, quality: undefined, popularity: 1 } as Record<string, string | number | undefined>;
    runBench('Object.entries(params).filter(v !== undefined)', () => {
      Object.entries(params).filter(([, v]) => v !== undefined);
    });
  });
});
