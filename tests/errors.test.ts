import { describe, expect, it } from 'bun:test';
import { AppError, toErrorResponse } from '../src/lib/errors';

describe('AppError', () => {
  it('encodes envelope', () => {
    const err = new AppError('NOT_FOUND', 'Item missing', 404);
    expect(toErrorResponse(err)).toEqual({
      error: { code: 'NOT_FOUND', message: 'Item missing', status: 404 },
    });
  });

  it('wraps unknown errors as internal', () => {
    const res = toErrorResponse(new Error('boom'));
    expect(res.error.code).toBe('INTERNAL');
    expect(res.error.status).toBe(500);
  });
});
