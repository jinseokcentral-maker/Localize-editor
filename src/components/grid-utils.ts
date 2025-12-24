/**
 * VirtualTableDiv 유틸리티 함수들
 */

import { Effect } from "effect";

/**
 * 컬럼 ID에서 언어 코드 추출
 */
export function getLangFromColumnId(columnId: string): string {
  if (columnId === "key") return "key";
  if (columnId === "context") return "context";
  if (columnId.startsWith("values.")) {
    return columnId.replace("values.", "");
  }
  return columnId;
}

/**
 * Translation에서 키 가져오기 (Effect 기반)
 */
export function getTranslationKeyEffect(
  translations: readonly { id: string; key: string }[],
  rowId: string,
  columnId: string,
  currentValue: string
): Effect.Effect<string, Error> {
  return Effect.try({
    try: () => {
      const translation = translations.find((t) => t.id === rowId);
      if (!translation) {
        throw new Error(`Translation not found for rowId: ${rowId}`);
      }
      return translation.key;
    },
    catch: (error) => new Error(`Failed to get translation key: ${String(error)}`),
  });
}

/**
 * Translation에서 키 가져오기 (동기 버전, 기존 API 호환)
 */
export function getTranslationKey(
  translations: readonly { id: string; key: string }[],
  rowId: string,
  columnId: string,
  currentValue: string
): string {
  // key 컬럼이면 새로운 값 반환
  if (columnId === "key") {
    return currentValue;
  }
  // 그 외에는 translation의 key 반환
  const translation = translations.find((t) => t.id === rowId);
  return translation?.key || "";
}

/**
 * 컬럼 너비 계산
 */
export interface ColumnWidthCalculation {
  key: number;
  context: number;
  languageColumns: Map<string, number>;
  totalWidth: number;
}

export function calculateColumnWidths(
  containerWidth: number,
  languageCount: number,
  keyColumnMinWidth: number = 200,
  contextColumnMinWidth: number = 200,
  languageColumnMinWidth: number = 150
): ColumnWidthCalculation {
  const fixedColumnsWidth = keyColumnMinWidth + contextColumnMinWidth;
  const availableWidth = containerWidth - fixedColumnsWidth;
  const languageColumnWidth = Math.max(
    languageColumnMinWidth,
    Math.floor(availableWidth / languageCount)
  );

  const languageColumns = new Map<string, number>();
  for (let i = 0; i < languageCount; i++) {
    languageColumns.set(`lang-${i}`, languageColumnWidth);
  }

  const totalWidth = fixedColumnsWidth + languageColumnWidth * languageCount;
  const lastColumnExtraWidth = containerWidth - totalWidth;

  // 마지막 언어 컬럼에 남은 공간 추가
  if (languageColumns.size > 0) {
    const lastKey = Array.from(languageColumns.keys())[languageColumns.size - 1];
    languageColumns.set(lastKey, languageColumnWidth + lastColumnExtraWidth);
  }

  return {
    key: keyColumnMinWidth,
    context: contextColumnMinWidth,
    languageColumns,
    totalWidth: containerWidth,
  };
}

/**
 * 키 중복 체크
 */
export function checkKeyDuplicate(
  translations: readonly { id: string; key: string }[],
  currentRowId: string,
  key: string
): boolean {
  return translations.some(
    (t) => t.id !== currentRowId && t.key.trim() === key.trim()
  );
}

/**
 * 키 중복 체크 (Effect 기반)
 */
export function checkKeyDuplicateEffect(
  translations: readonly { id: string; key: string }[],
  currentRowId: string,
  key: string
): Effect.Effect<boolean, Error> {
  return Effect.try({
    try: () => {
      if (!key || typeof key !== "string") {
        throw new Error("Key must be a non-empty string");
      }
      return translations.some(
        (t) => t.id !== currentRowId && t.key.trim() === key.trim()
      );
    },
    catch: (error) => new Error(`Failed to check key duplicate: ${String(error)}`),
  });
}

