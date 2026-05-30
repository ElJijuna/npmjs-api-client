import { NpmClient } from '../src/NpmClient';
import { runBench } from './helpers';

describe('01 — Client Construction', () => {
  beforeAll(() => console.log('\n01 — Client Construction'));

  it('new NpmClient() — defaults', () => {
    runBench('new NpmClient() (defaults)', () => { new NpmClient(); });
  });

  it('new NpmClient({ token }) — with auth token', () => {
    runBench('new NpmClient({ token })', () => {
      new NpmClient({ token: 'npm_test_token_1234567890abcdef' });
    });
  });

  it('new NpmClient({ all options }) — all custom URLs + token', () => {
    runBench('new NpmClient({ all options })', () => {
      new NpmClient({
        registryUrl: 'https://custom.registry.io/',
        downloadsApiUrl: 'https://custom.downloads.io/',
        npmsApiUrl: 'https://custom.npms.io/v2',
        packagephobiaUrl: 'https://custom.phobia.io/',
        jsdelivrUrl: 'https://custom.jsdelivr.io/v1',
        unpkgUrl: 'https://custom.unpkg.io/',
        depsDevUrl: 'https://custom.deps.io/v3',
        token: 'npm_custom_token_abcdef1234567890',
      });
    });
  });
});
