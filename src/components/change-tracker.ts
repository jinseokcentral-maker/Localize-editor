import { Effect, Option } from "effect";
import type { TranslationChange } from "@/types/translation";
import { ChangeTrackerError } from "@/types/errors";
import {
  RowIdSchema,
  FieldSchema,
  LangSchema,
  validateWithEffect,
} from "@/utils/validation";
import type { ChangeTrackerConfig } from "./change-tracker-config";
import { defaultConfig } from "./change-tracker-config";
import { logger } from "@/utils/logger";

/**
 * 변경사항 추적 클래스
 * 
 * 셀 값 변경사항을 추적하고 시각적으로 표시하는 기능을 제공합니다.
 * 내부적으로 Effect를 사용하여 type-safe한 에러 처리를 제공합니다.
 * 
 * 성능 최적화: config.enableValidation을 false로 설정하면 검증을 스킵하여
 * 성능을 향상시킬 수 있습니다 (프로덕션 환경 권장).
 */
export class ChangeTracker {
  private config: ChangeTrackerConfig;
  // 변경사항 추적: Map<`${rowId}-${field}`, TranslationChange>
  private changes = new Map<string, TranslationChange>();
  // 원본 데이터 저장 (초기값 비교용)
  private originalData = new Map<string, Map<string, string>>();

  constructor(config: ChangeTrackerConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 원본 데이터 초기화
   * 
   * @throws {ChangeTrackerError} - 원본 데이터 초기화 실패 시 (검증 활성화된 경우만)
   */
  initializeOriginalData(
    translations: readonly { id: string; key: string; context?: string; values: Record<string, string> }[],
    languages: readonly string[]
  ): void {
    // 검증 활성화 시에만 검증 수행
    if (this.config.enableValidation) {
      // languages 검증
      for (const lang of languages) {
        const langEffect = validateWithEffect(LangSchema, lang, `Invalid language code: ${lang}`);
        Effect.runSync(
          Effect.match(langEffect, {
            onFailure: (error) => {
              logger.error("ChangeTracker: Invalid language code", error);
              throw error;
            },
            onSuccess: () => {},
          })
        );
      }

      // translations 검증
      for (const t of translations) {
        const idEffect = validateWithEffect(RowIdSchema, t.id, `Invalid row ID: ${t.id}`);
        Effect.runSync(
          Effect.match(idEffect, {
            onFailure: (error) => {
              logger.error("ChangeTracker: Invalid row ID", error);
              throw error;
            },
            onSuccess: () => {},
          })
        );
        
        if (typeof t.key !== "string" || t.key.length === 0) {
          const keyError = new ChangeTrackerError({
            message: `Invalid key for translation ${t.id}`,
            code: "INVALID_CHANGE_DATA",
          });
          Effect.runSync(
            Effect.match(Effect.fail(keyError), {
              onFailure: (error) => {
                logger.error("ChangeTracker: Invalid translation key", error);
                throw error;
              },
              onSuccess: () => {},
            })
          );
        }
      }
    }

    // 실제 초기화 (검증 여부와 관계없이 실행)
    this.originalData.clear();
    this.changes.clear();
    
    translations.forEach((t) => {
      const rowData = new Map<string, string>();
      rowData.set("key", t.key);
      rowData.set("context", t.context || "");
      languages.forEach((lang) => {
        rowData.set(`values.${lang}`, t.values[lang] || "");
      });
      this.originalData.set(t.id, rowData);
    });
  }

  /**
   * 원본 값 가져오기 (Effect 기반)
   * 
   * @returns Effect<Option<string>, ChangeTrackerError | ValidationError>
   */
  getOriginalValueEffect(
    rowId: string,
    field: string
  ): Effect.Effect<Option.Option<string>, ChangeTrackerError | import("@/types/errors").ValidationError> {
    return Effect.flatMap(
      validateWithEffect(RowIdSchema, rowId, "Invalid row ID"),
      (validRowId) =>
        Effect.flatMap(
          validateWithEffect(FieldSchema, field, "Invalid field"),
          (validField) => {
            const originalRowData = this.originalData.get(validRowId);
            if (!originalRowData) {
              return Effect.fail(
                new ChangeTrackerError({
                  message: `Original data not found for row ID: ${validRowId}`,
                  code: "ORIGINAL_DATA_NOT_FOUND",
                })
              );
            }

            const value = originalRowData.get(validField);
            return Effect.succeed(Option.fromNullable(value));
          }
        )
    );
  }

  /**
   * 원본 값 가져오기 (기존 API 호환성 유지)
   * 
   * @returns 원본 값 (없으면 빈 문자열)
   */
  getOriginalValue(rowId: string, field: string): string {
    // 검증 비활성화 시 빠른 경로
    if (!this.config.enableValidation) {
      const originalRowData = this.originalData.get(rowId);
      return originalRowData?.get(field) ?? "";
    }

    // 검증 활성화 시 Effect 사용
    const effect = this.getOriginalValueEffect(rowId, field);
    return Effect.runSync(
      Effect.match(effect, {
        onFailure: () => "", // 에러 발생 시 빈 문자열 반환
        onSuccess: (option) => Option.getOrElse(option, () => ""),
      })
    );
  }

  /**
   * 변경사항 추적 (Effect 기반)
   */
  trackChangeEffect(
    rowId: string,
    field: string,
    lang: string,
    oldValue: string,
    newValue: string,
    key: string
  ): Effect.Effect<void, ChangeTrackerError | import("@/types/errors").ValidationError> {
    return Effect.flatMap(
      validateWithEffect(RowIdSchema, rowId, "Invalid row ID"),
      (validRowId) =>
        Effect.flatMap(
          validateWithEffect(FieldSchema, field, "Invalid field"),
          (validField) =>
            Effect.flatMap(
              validateWithEffect(LangSchema, lang, "Invalid language code"),
              (validLang) => {
                if (typeof key !== "string" || key.length === 0) {
                  return Effect.fail(
                    new ChangeTrackerError({
                      message: "Key must be a non-empty string",
                      code: "INVALID_CHANGE_DATA",
                    })
                  );
                }

                const changeKey = `${validRowId}-${validField}`;
                
                // 값이 원본과 같으면 변경사항에서 제거
                if (oldValue === newValue) {
                  this.changes.delete(changeKey);
                  return Effect.void;
                }

                // 변경사항 저장
                const change: TranslationChange = {
                  id: validRowId,
                  key,
                  lang: validLang,
                  oldValue,
                  newValue,
                };
                this.changes.set(changeKey, change);
                return Effect.void;
              }
            )
        )
    );
  }

  /**
   * 변경사항 추적 (기존 API 호환성 유지)
   */
  trackChange(
    rowId: string,
    field: string,
    lang: string,
    oldValue: string,
    newValue: string,
    key: string,
    updateStyleCallback?: (rowId: string, field: string, isDirty: boolean) => void
  ): void {
    // 검증 비활성화 시 빠른 경로
    if (!this.config.enableValidation) {
      const changeKey = `${rowId}-${field}`;
      
      if (oldValue === newValue) {
        this.changes.delete(changeKey);
        if (updateStyleCallback) {
          updateStyleCallback(rowId, field, false);
        }
        return;
      }

      const change: TranslationChange = {
        id: rowId,
        key,
        lang,
        oldValue,
        newValue,
      };
      this.changes.set(changeKey, change);
      
      if (updateStyleCallback) {
        updateStyleCallback(rowId, field, true);
      }
      return;
    }

    // 검증 활성화 시 Effect 사용
    const effect = this.trackChangeEffect(rowId, field, lang, oldValue, newValue, key);
    Effect.runSync(
      Effect.match(effect, {
        onFailure: (error) => {
          logger.warn("ChangeTracker: Failed to track change", error);
          // 에러가 발생해도 스타일 업데이트는 수행하지 않음
        },
        onSuccess: () => {
          // 성공 시에만 스타일 업데이트 콜백 호출
          if (updateStyleCallback) {
            const isDirty = oldValue !== newValue;
            updateStyleCallback(rowId, field, isDirty);
          }
        },
      })
    );
  }

  /**
   * 변경사항이 있는지 확인 (Effect 기반)
   */
  hasChangeEffect(
    rowId: string,
    field: string
  ): Effect.Effect<boolean, ChangeTrackerError | import("@/types/errors").ValidationError> {
    return Effect.flatMap(
      validateWithEffect(RowIdSchema, rowId, "Invalid row ID"),
      (validRowId) =>
        Effect.flatMap(
          validateWithEffect(FieldSchema, field, "Invalid field"),
          (validField) => {
            const changeKey = `${validRowId}-${validField}`;
            return Effect.succeed(this.changes.has(changeKey));
          }
        )
    );
  }

  /**
   * 변경사항이 있는지 확인 (기존 API 호환성 유지)
   */
  hasChange(rowId: string, field: string): boolean {
    // 검증 비활성화 시 빠른 경로
    if (!this.config.enableValidation) {
      const changeKey = `${rowId}-${field}`;
      return this.changes.has(changeKey);
    }

    // 검증 활성화 시 Effect 사용
    const effect = this.hasChangeEffect(rowId, field);
    return Effect.runSync(
      Effect.match(effect, {
        onFailure: () => false, // 에러 발생 시 false 반환
        onSuccess: (hasChange) => hasChange,
      })
    );
  }

  /**
   * 변경사항 목록 반환
   */
  getChanges(): TranslationChange[] {
    return Array.from(this.changes.values());
  }

  /**
   * 변경사항 초기화
   */
  clearChanges(updateStyleCallback?: (rowId: string, field: string, isDirty: boolean) => void): void {
    // 모든 변경된 셀의 스타일 제거
    if (updateStyleCallback) {
      this.changes.forEach((_change, changeKey) => {
        const [rowId, field] = changeKey.split("-", 2);
        updateStyleCallback(rowId, field, false);
      });
    }
    
    this.changes.clear();
  }

  /**
   * 변경사항 맵 반환 (cellClassRules에서 사용)
   */
  getChangesMap(): ReadonlyMap<string, TranslationChange> {
    return this.changes;
  }
}
