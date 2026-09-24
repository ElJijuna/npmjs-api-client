import { NpmApiError } from '../index';

describe('NpmApiError', () => {
  it('constructs with status and statusText', () => {
    const err = new NpmApiError(404, 'Not Found');
    expect(err.status).toBe(404);
    expect(err.statusText).toBe('Not Found');
    expect(err.message).toBe('npm API error: 404 Not Found');
    expect(err.name).toBe('NpmApiError');
  });

  it('is an instance of Error', () => {
    const err = new NpmApiError(401, 'Unauthorized');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NpmApiError);
  });

  it('can be caught with instanceof check', () => {
    try {
      throw new NpmApiError(403, 'Forbidden');
    } catch (err) {
      expect(err).toBeInstanceOf(NpmApiError);
      if (err instanceof NpmApiError) {
        expect(err.status).toBe(403);
      }
    }
  });

  it('has no body or detail when constructed without a body', () => {
    const err = new NpmApiError(404, 'Not Found');
    expect(err.body).toBeUndefined();
    expect(err.detail).toBeUndefined();
  });

  // Shapes observed from the registry, downloads API, packagephobia, deps.dev, and unpkg.
  it.each([
    [{ error: 'package @zzq/nope not found' }, 'package @zzq/nope not found'],
    [{ error: { code: 'challenge', message: 'Challenge required.' } }, 'Challenge required.'],
    [{ message: 'Rate limit exceeded' }, 'Rate limit exceeded'],
    // RFC 9457 problem details, as sent by Cloudflare's rate limiter.
    [
      { title: 'Error 1015: You are being rate limited', detail: 'You are being rate-limited.' },
      'You are being rate-limited.',
    ],
    [{ title: 'Error 1015: You are being rate limited' }, 'Error 1015: You are being rate limited'],
    ['version not found: 99.99.99', 'version not found: 99.99.99'],
    ['  dependencies not found\n', 'dependencies not found'],
  ])('extracts the detail from %j', (body, detail) => {
    const err = new NpmApiError(404, 'Not Found', body);
    expect(err.body).toEqual(body);
    expect(err.detail).toBe(detail);
    expect(err.message).toBe(`npm API error: 404 Not Found — ${detail}`);
  });

  it.each([
    ['an HTML page', '<!DOCTYPE html><html><body>Too many requests</body></html>'],
    ['an empty string', '   '],
    ['an object without a message', { code: 'E_UNKNOWN' }],
    ['a non-string error', { error: 42 }],
    ['null', null],
    ['a number', 500],
  ])('keeps the body but has no detail for %s', (_, body) => {
    const err = new NpmApiError(503, 'Service Unavailable', body);
    expect(err.body).toEqual(body);
    expect(err.detail).toBeUndefined();
    expect(err.message).toBe('npm API error: 503 Service Unavailable');
  });

  it('does not repeat a detail equal to the status text', () => {
    const err = new NpmApiError(401, 'Unauthorized', { error: 'Unauthorized' });
    expect(err.detail).toBe('Unauthorized');
    expect(err.message).toBe('npm API error: 401 Unauthorized');
  });

  it('truncates long plain-text details', () => {
    const err = new NpmApiError(500, 'Internal Server Error', 'x'.repeat(1000));
    expect(err.detail).toBe(`${'x'.repeat(300)}…`);
    expect(err.body).toBe('x'.repeat(1000));
  });

  it('omits an empty status text from the message', () => {
    expect(new NpmApiError(404, '').message).toBe('npm API error: 404');
    expect(new NpmApiError(400, '', { error: 'bad input' }).message).toBe(
      'npm API error: 400 — bad input',
    );
  });
});
