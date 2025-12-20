import { z } from "zod";
import { Effect } from "effect";
import { ValidationError } from "@/types/errors";

/**
 * Row ID 검증 스키마
 */
export const RowIdSchema = z.string().min(1, "Row ID must not be empty");

/**
 * Field 검증 스키마
 * - "key" | "context" | "values.{lang}"
 */
export const FieldSchema = z.string().refine(
  (field) => field === "key" || field === "context" || field.startsWith("values."),
  { message: "Field must be 'key', 'context', or start with 'values.'" }
);

/**
 * Language 코드 검증 스키마
 */
export const LangSchema = z.string().min(1, "Language code must not be empty");

/**
 * ChangeKey 검증 스키마 (rowId-field 형식)
 */
export const ChangeKeySchema = z.string().regex(
  /^.+-.+$/,
  "Change key must be in format 'rowId-field'"
);

/**
 * Zod 스키마를 Effect로 변환하는 헬퍼
 */
export function validateWithEffect<T>(
  schema: z.ZodSchema<T>,
  value: unknown,
  errorMessage?: string
): Effect.Effect<T, ValidationError> {
  return Effect.try({
    try: () => schema.parse(value),
    catch: (error) => {
      if (error instanceof z.ZodError) {
        return new ValidationError({
          message: errorMessage || "Validation failed",
          issues: error.issues.map((issue) => ({
            path: issue.path.map(String),
            message: issue.message,
          })),
        });
      }
      return new ValidationError({
        message: errorMessage || "Validation failed",
        issues: [{ path: [], message: String(error) }],
      });
    },
  });
}

