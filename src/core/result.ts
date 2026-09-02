/**
 * Lightweight Result type for service APIs where failure is a normal outcome
 * (validation, authz) and we do not want exceptions crossing every boundary.
 * Domain-critical failures (state machines, payments) still throw AppError.
 */

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
