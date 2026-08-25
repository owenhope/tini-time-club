export interface AdminDataErrorLike {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

export class AdminDataError extends Error {
  readonly operation: string;
  readonly code: string | null;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(error: AdminDataErrorLike, operation: string) {
    super(error.message || `${operation} failed`);
    this.name = "AdminDataError";
    this.operation = operation;
    this.code = error.code ?? null;
    this.details = error.details ?? null;
    this.hint = error.hint ?? null;
    Object.setPrototypeOf(this, AdminDataError.prototype);
  }
}

export const toAdminDataError = (
  error: AdminDataErrorLike,
  operation = "Supabase request"
): AdminDataError =>
  error instanceof AdminDataError
    ? error
    : new AdminDataError(error, operation);
