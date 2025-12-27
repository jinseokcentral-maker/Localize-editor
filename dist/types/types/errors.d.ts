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
export {};
//# sourceMappingURL=errors.d.ts.map