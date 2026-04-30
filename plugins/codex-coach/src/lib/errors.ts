export class CoachError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly exitCode: number;

  constructor(
    code: string,
    message: string,
    details: Record<string, unknown> = {},
    exitCode = 1
  ) {
    super(message);
    this.name = "CoachError";
    this.code = code;
    this.details = details;
    this.exitCode = exitCode;
  }
}

export function toCoachError(error: unknown): CoachError {
  if (error instanceof CoachError) {
    return error;
  }

  if (error instanceof Error) {
    return new CoachError("cli_error", error.message);
  }

  return new CoachError("unknown_error", "An unknown error occurred.");
}
