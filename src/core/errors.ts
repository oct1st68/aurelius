/**
 * Typed application errors. Services throw these; route handlers/actions map
 * them to HTTP-ish outcomes in one place (never inline `if (err.message === ...)`).
 */

export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYMENT_FAILED"
  | "STATE_TRANSITION"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Extra machine-readable context for the UI/tests (never secrets). */
  readonly details?: Record<string, string>;

  constructor(code: AppErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string>) {
    super("VALIDATION", message, details);
  }
}
export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHENTICATED", message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that") {
    super("FORBIDDEN", message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message);
  }
}
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, string>) {
    super("CONFLICT", message, details);
  }
}
export class RateLimitedError extends AppError {
  constructor(message = "Too many requests. Try again shortly.") {
    super("RATE_LIMITED", message);
  }
}
export class PaymentFailedError extends AppError {
  constructor(message: string) {
    super("PAYMENT_FAILED", message);
  }
}
export class StateTransitionError extends AppError {
  constructor(message: string) {
    super("STATE_TRANSITION", message);
  }
}

/** Messages that are safe to show to end users (never leak internals). */
export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return "Something went wrong. Please try again.";
}
