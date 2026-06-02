import { NpmClient } from '../src/NpmClient';
import { runBench } from './helpers';

describe('02 — Resource Creation', () => {
  beforeAll(() => console.log('\n02 — Resource Creation'));

  const client = new NpmClient();

  it('package() — unscoped package name', () => {
    runBench('client.package("react")', () => {
      client.package('react');
    });
  });

  it('package() — scoped package name', () => {
    runBench('client.package("@babel/core")', () => {
      client.package('@babel/core');
    });
  });

  it('package().version() — chaining to VersionResource', () => {
    runBench('client.package("react").version("18.2.0")', () => {
      client.package('react').version('18.2.0');
    });
  });

  it('package().latest() — shorthand for latest version', () => {
    runBench('client.package("react").latest()', () => {
      client.package('react').latest();
    });
  });

  it('maintainer() — MaintainerResource creation', () => {
    runBench('client.maintainer("sindresorhus")', () => {
      client.maintainer('sindresorhus');
    });
  });

  it('user() — UserResource creation', () => {
    runBench('client.user("pilmee")', () => {
      client.user('pilmee');
    });
  });

  it('org() — OrgResource creation', () => {
    runBench('client.org("npmcli")', () => {
      client.org('npmcli');
    });
  });
});
