import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const root = process.cwd();
const temporary = mkdtempSync(join(tmpdir(), 'npmjs-client-'));
const run = (command, args, cwd = temporary) =>
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, npm_config_cache: join(temporary, 'npm-cache') },
  });
try {
  const [, , supplied] = process.argv;
  if (!supplied) run('npm', ['pack', '--ignore-scripts', '--pack-destination', temporary], root);
  const tarball = supplied
    ? resolve(supplied)
    : join(
        temporary,
        readdirSync(temporary).find((name) => name.endsWith('.tgz')),
      );
  const consumer = join(temporary, 'consumer');
  mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true }));
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', tarball],
    consumer,
  );
  const smoke = `
const assert = require('node:assert/strict');
(async () => {
  const { NpmClient, NpmApiError } = CLIENT;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ name: 'react' }) };
  };
  const client = new NpmClient({ token: 'test-token' });
  const events = [];
  client.on('request', () => { throw new Error('observer'); });
  client.on('request', async () => { throw new Error('async observer'); });
  client.on('request', event => events.push(event));
  assert.equal((await client.package('react')).name, 'react');
  await client.audit({ name: 'test', version: '1.0.0', requires: {}, dependencies: {} });
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token');
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(calls[1].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(events.map(event => event.method), ['GET', 'POST']);
  globalThis.fetch = async () => ({ ok: false, status: 404, statusText: 'Not Found' });
  await assert.rejects(client.package('missing').get(), NpmApiError);
  await new Promise(resolve => setTimeout(resolve, 0));
})().catch(error => { console.error(error); process.exitCode = 1; });
`;
  for (const format of ['cjs', 'mjs']) {
    const file = join(consumer, `smoke.${format}`);
    const source =
      format === 'cjs'
        ? smoke.replace('CLIENT', "require('npmjs-api-client')")
        : smoke
            .replace(
              "const assert = require('node:assert/strict');",
              "import assert from 'node:assert/strict';",
            )
            .replace('CLIENT', "await import('npmjs-api-client')");
    writeFileSync(file, source);
    run(process.execPath, ['--unhandled-rejections=strict', file], consumer);
  }
  if (!supplied) {
    for (const extension of ['mts', 'cts']) {
      writeFileSync(
        join(consumer, `consumer.${extension}`),
        `
import { NpmClient, NpmApiError, type NpmPackument } from 'npmjs-api-client';
const client = new NpmClient();
const result: Promise<NpmPackument> = client.package('react').get();
const error: Error = new NpmApiError(404, 'Not Found');
void result; void error;
`,
      );
    }
    run(
      process.execPath,
      [
        join(root, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        '--target',
        'ES2022',
        'consumer.mts',
        'consumer.cts',
      ],
      consumer,
    );
  }
  console.log('Package consumption checks passed.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
