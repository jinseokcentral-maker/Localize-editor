import { z } from "zod";
import { Effect } from "effect";
import { ValidationError } from "@/types/errors";
/**
 * Row ID 검증 스키마
 */
export declare const RowIdSchema: z.ZodString;
/**
 * Field 검증 스키마
 * - "key" | "context" | "values.{lang}"
 */
export declare const FieldSchema: z.ZodString;
/**
 * Language 코드 검증 스키마
 */
export declare const LangSchema: z.ZodString;
/**
 * ChangeKey 검증 스키마 (rowId-field 형식)
 */
export declare const ChangeKeySchema: z.ZodString;
/**
 * Zod 스키마를 Effect로 변환하는 헬퍼
 */
export declare function validateWithEffect<T>(schema: z.ZodSchema<T>, value: unknown, errorMessage?: string): Effect.Effect<T, ValidationError>;
//# sourceMappingURL=validation.d.ts.map