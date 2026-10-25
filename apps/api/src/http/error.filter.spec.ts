import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../domain/domain-error.js';
import { ApiError } from './api-error.js';
import { toErrorResponse } from './error.filter.js';

describe('toErrorResponse', () => {
  it('passes ApiError through, including details', () => {
    const details = [{ path: 'name', message: 'Required' }];
    expect(toErrorResponse(new ApiError(400, 'VALIDATION_FAILED', 'Invalid', details))).toEqual({
      status: 400,
      body: { code: 'VALIDATION_FAILED', message: 'Invalid', details },
    });
  });

  it('maps known domain errors to their status', () => {
    expect(toErrorResponse(new DomainError('INVALID_STATE_TRANSITION', 'nope')).status).toBe(409);
  });

  it('maps unknown domain errors to 422', () => {
    expect(toErrorResponse(new DomainError('SOMETHING_NEW', 'x')).status).toBe(422);
  });

  it('maps Nest HTTP exceptions by status', () => {
    expect(toErrorResponse(new NotFoundException('gone'))).toEqual({
      status: 404,
      body: { code: 'NOT_FOUND', message: 'gone' },
    });
  });

  it('never leaks details of unexpected errors', () => {
    const result = toErrorResponse(new Error('password=hunter2 at db.internal:5432'));
    expect(result).toEqual({
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
  });

  it('does not trust a status on errors that are not marked safe to expose', () => {
    const err = Object.assign(new Error('secret'), { status: 400 });
    expect(toErrorResponse(err).status).toBe(500);
  });

  it('hides messages of 5xx HTTP exceptions', () => {
    const err = Object.assign(new Error('upstream secret'), { status: 502, expose: true });
    expect(toErrorResponse(err).body.message).toBe('An unexpected error occurred.');
  });
});
