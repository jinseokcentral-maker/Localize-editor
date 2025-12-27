declare const ChangeTrackerError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ChangeTrackerError";
} & Readonly<A>;
/**
 * ChangeTracker 관련 에러 타입
 */
export declare class ChangeTrackerError extends ChangeTrackerError_base<{
    readonly message: string;
    readonly code: ChangeTrackerErrorCode;
}> {
}
export type ChangeTrackerErrorCode = "INVALID_ROW_ID" | "INVALID_FIELD" | "INVALID_LANG" | "ORIGINAL_DATA_NOT_FOUND" | "INVALID_CHANGE_DATA";
declare const LocaleEditorError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "LocaleEditorError";
} & Readonly<A>;
/**
 * LocaleEditor 관련 에러 타입
 */
export declare class LocaleEditorError extends LocaleEditorError_base<{
    readonly message: string;
    readonly code: LocaleEditorErrorCode;
}> {
}
export type LocaleEditorErrorCode = "GRID_API_NOT_AVAILABLE" | "ROW_NODE_NOT_FOUND" | "INVALID_CELL_EVENT" | "COLUMN_NOT_FOUND" | "INVALID_FIELD_FORMAT";
declare const ValidationError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "ValidationError";
} & Readonly<A>;
/**
 * Validation 에러 타입 (Zod 관련)
 */
export declare class ValidationError extends ValidationError_base<{
    readonly message: string;
    readonly issues: readonly {
        path: string[];
        message: string;
    }[];
}> {
}
declare const CellEditorError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "CellEditorError";
} & Readonly<A>;
/**
 * CellEditor 관련 에러 타입
 */
export declare class CellEditorError extends CellEditorError_base<{
    readonly message: string;
    readonly code: CellEditorErrorCode;
}> {
}
export type CellEditorErrorCode = "TRANSLATION_NOT_FOUND" | "INVALID_COLUMN_ID" | "DUPLICATE_KEY" | "EDIT_IN_PROGRESS";
declare const FilterError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "FilterError";
} & Readonly<A>;
/**
 * FilterManager 관련 에러 타입
 */
export declare class FilterError extends FilterError_base<{
    readonly message: string;
    readonly code: FilterErrorCode;
}> {
}
export type FilterErrorCode = "INVALID_FILTER_TYPE" | "INVALID_KEYWORD" | "FILTER_FAILED";
declare const VimCommandTrackerError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "VimCommandTrackerError";
} & Readonly<A>;
/**
 * VimCommandTracker 관련 에러 타입
 */
export declare class VimCommandTrackerError extends VimCommandTrackerError_base<{
    readonly message: string;
    readonly code: VimCommandTrackerErrorCode;
}> {
}
export type VimCommandTrackerErrorCode = "INVALID_KEY_SEQUENCE" | "MAX_SEQUENCE_LENGTH_EXCEEDED";
declare const CommandLineError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "CommandLineError";
} & Readonly<A>;
/**
 * CommandLine 관련 에러 타입
 */
export declare class CommandLineError extends CommandLineError_base<{
    readonly message: string;
    readonly code: CommandLineErrorCode;
}> {
}
export type CommandLineErrorCode = "INVALID_COMMAND" | "COMMAND_EXECUTION_FAILED" | "HISTORY_OVERFLOW";
/**
 * 통합 에러 타입
 */
export type AppError = ChangeTrackerError | ValidationError | CellEditorError | LocaleEditorError | FilterError | VimCommandTrackerError | CommandLineError;
export {};
//# sourceMappingURL=errors.d.ts.map