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

/**
 * CellEditor 관련 에러 타입
 */
export class CellEditorError extends Data.TaggedError("CellEditorError")<{
  readonly message: string;
  readonly code: CellEditorErrorCode;
}> {}

export type CellEditorErrorCode =
  | "TRANSLATION_NOT_FOUND"
  | "INVALID_COLUMN_ID"
  | "DUPLICATE_KEY"
  | "EDIT_IN_PROGRESS";

/**
 * FilterManager 관련 에러 타입
 */
export class FilterError extends Data.TaggedError("FilterError")<{
  readonly message: string;
  readonly code: FilterErrorCode;
}> {}

export type FilterErrorCode =
  | "INVALID_FILTER_TYPE"
  | "INVALID_KEYWORD"
  | "FILTER_FAILED";

/**
 * VimCommandTracker 관련 에러 타입
 */
export class VimCommandTrackerError extends Data.TaggedError("VimCommandTrackerError")<{
  readonly message: string;
  readonly code: VimCommandTrackerErrorCode;
}> {}

export type VimCommandTrackerErrorCode =
  | "INVALID_KEY_SEQUENCE"
  | "MAX_SEQUENCE_LENGTH_EXCEEDED";

/**
 * CommandLine 관련 에러 타입
 */
export class CommandLineError extends Data.TaggedError("CommandLineError")<{
  readonly message: string;
  readonly code: CommandLineErrorCode;
}> {}

export type CommandLineErrorCode =
  | "INVALID_COMMAND"
  | "COMMAND_EXECUTION_FAILED"
  | "HISTORY_OVERFLOW";

/**
 * 통합 에러 타입
 */
export type AppError =
  | ChangeTrackerError
  | ValidationError
  | CellEditorError
  | LocaleEditorError
  | FilterError
  | VimCommandTrackerError
  | CommandLineError;

