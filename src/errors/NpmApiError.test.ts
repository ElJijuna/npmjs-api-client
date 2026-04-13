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
});
