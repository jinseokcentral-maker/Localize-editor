import { Data } from "effect";

/**
 * ChangeTracker 관련 에러 타입
 */
export class ChangeTrackerError extends Data.TaggedError("ChangeTrackerError")<{
  readonly message: string;
  readonly code: ChangeTrackerErrorCode;
}> {}

export type ChangeTrackerErrorCode =
  | "INVALID_ROW_ID"
  | "INVALID_FIELD"
  | "INVALID_LANG"
  | "ORIGINAL_DATA_NOT_FOUND"
  | "INVALID_CHANGE_DATA";

/**
 * LocaleEditor 관련 에러 타입
 */
export class LocaleEditorError extends Data.TaggedError("LocaleEditorError")<{
  readonly message: string;
  readonly code: LocaleEditorErrorCode;
}> {}

export type LocaleEditorErrorCode =
  | "GRID_API_NOT_AVAILABLE"
  | "ROW_NODE_NOT_FOUND"
  | "INVALID_CELL_EVENT"
  | "COLUMN_NOT_FOUND"
  | "INVALID_FIELD_FORMAT";

/**
 * Validation 에러 타입 (Zod 관련)
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly issues: readonly { path: string[]; message: string }[];
}> {}

