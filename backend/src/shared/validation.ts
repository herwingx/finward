/**
 * Validation module - Safe parsing and input sanitization
 *
 * Prevents:
 * - NaN/Infinity from parseFloat/parseInt
 * - Out-of-range numeric values
 * - Oversized strings (DoS, DB overflow)
 * - Invalid date strings
 *
 * @see backend/docs/SECURITY.md - Input validation guidelines
 */

import { AppError } from './errors';

/** Maximum allowed monetary amount (999M) */
export const MAX_AMOUNT = 999_999_999.99;

/** Minimum allowed monetary amount */
export const MIN_AMOUNT = 0.01;

/** Maximum description length (2KB) */
export const MAX_DESCRIPTION_LENGTH = 2000;

/** Maximum name/label length */
export const MAX_NAME_LENGTH = 200;

/** Maximum notes length */
export const MAX_NOTES_LENGTH = 4000;

/** Default pagination limit */
export const DEFAULT_PAGE_TAKE = 100;

/** Maximum pagination limit */
export const MAX_PAGE_TAKE = 500;

/**
 * Safely parse a value to float. Rejects NaN and Infinity.
 * @throws AppError.badRequest if value is invalid
 */
export function parseSafeFloat(value: unknown, field: string): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    throw AppError.badRequest(`${field} must be a valid number`);
  }
  return n;
}

/**
 * Safely parse a value to integer.
 * @throws AppError.badRequest if value is invalid
 */
export function parseSafeInt(value: unknown, field: string): number {
  const n = parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n) || !Number.isInteger(n)) {
    throw AppError.badRequest(`${field} must be a valid integer`);
  }
  return n;
}

/**
 * Validate amount is within allowed range for financial operations (MIN_AMOUNT..MAX_AMOUNT).
 * @throws AppError.badRequest if out of range
 */
export function validateAmount(amount: number, field = 'amount'): void {
  if (amount < MIN_AMOUNT) {
    throw AppError.badRequest(`${field} must be at least ${MIN_AMOUNT}`);
  }
  if (amount > MAX_AMOUNT) {
    throw AppError.badRequest(`${field} cannot exceed ${MAX_AMOUNT.toLocaleString()}`);
  }
}

/**
 * Validate non-negative amount (e.g. monthlyNetIncome can be 0).
 * @throws AppError.badRequest if negative or above MAX_AMOUNT
 */
export function validateNonNegativeAmount(amount: number, field = 'amount'): void {
  if (amount < 0) {
    throw AppError.badRequest(`${field} cannot be negative`);
  }
  if (amount > MAX_AMOUNT) {
    throw AppError.badRequest(`${field} cannot exceed ${MAX_AMOUNT.toLocaleString()}`);
  }
}

/**
 * Parse and validate a monetary amount from request body.
 */
export function parseAndValidateAmount(value: unknown, field = 'amount'): number {
  const n = parseSafeFloat(value, field);
  validateAmount(n, field);
  return n;
}

/**
 * Enforce maximum string length.
 * @throws AppError.badRequest if string exceeds limit
 */
export function validateMaxLength(
  value: string | undefined | null,
  max: number,
  field: string
): void {
  if (!value) return;
  if (typeof value !== 'string') {
    throw AppError.badRequest(`${field} must be a string`);
  }
  if (value.length > max) {
    throw AppError.badRequest(`${field} cannot exceed ${max} characters`);
  }
}

/**
 * Validate description field (common across transactions, loans, etc.)
 */
export function validateDescription(description: string | undefined | null): void {
  validateMaxLength(description, MAX_DESCRIPTION_LENGTH, 'description');
}

/**
 * Validate name field (accounts, categories, goals)
 */
export function validateName(name: string | undefined | null): void {
  validateMaxLength(name, MAX_NAME_LENGTH, 'name');
}

/**
 * Parse and validate a date value. Rejects invalid dates (NaN).
 * @throws AppError.badRequest if value is not a valid date
 */
export function parseAndValidateDate(value: unknown, field = 'date'): Date {
  const d = value instanceof Date ? value : new Date(String(value ?? ''));
  if (Number.isNaN(d.getTime())) {
    throw AppError.badRequest(`${field} must be a valid date`);
  }
  return d;
}

/** UUID v4 regex for validation */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[14][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate string is a valid UUID format.
 * @throws AppError.badRequest if invalid
 */
export function validateUuid(value: string | undefined | null, field = 'id'): asserts value is string {
  if (!value || typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw AppError.badRequest(`${field} must be a valid UUID`);
  }
}

/**
 * Parse pagination params from query string.
 * take: 1..MAX_PAGE_TAKE (default DEFAULT_PAGE_TAKE)
 * skip: >= 0 (default 0)
 */
export function parsePaginationParams(query: { take?: string; skip?: string }): {
  take: number;
  skip: number;
} {
  const takeRaw = query.take !== undefined && query.take !== ''
    ? parseSafeInt(query.take, 'take')
    : DEFAULT_PAGE_TAKE;
  const skipRaw = query.skip !== undefined && query.skip !== ''
    ? parseSafeInt(query.skip, 'skip')
    : 0;
  const take = Math.min(Math.max(takeRaw, 1), MAX_PAGE_TAKE);
  const skip = Math.max(skipRaw, 0);
  return { take, skip };
}
