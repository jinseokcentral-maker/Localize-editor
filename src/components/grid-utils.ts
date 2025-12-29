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
 * Translation에서 키 가져오기 (동기 버전)
 */
export function getTranslationKey(
  translations: readonly { id: string; key: string }[],
  rowId: string,
  columnId: string,
  currentValue: string,
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
 * 키 중복 체크
 */
export function checkKeyDuplicate(
  translations: readonly { id: string; key: string }[],
  currentRowId: string,
  key: string,
): boolean {
  return translations.some(
    (t) => t.id !== currentRowId && t.key.trim() === key.trim(),
  );
}

/**
 * 키 중복 체크 (Effect 기반)
 */
export function checkKeyDuplicateEffect(
  translations: readonly { id: string; key: string }[],
  currentRowId: string,
  key: string,
): Effect.Effect<boolean, Error> {
  return Effect.try({
    try: () => {
      if (!key || typeof key !== "string") {
        throw new Error("Key must be a non-empty string");
      }
      return translations.some(
        (t) => t.id !== currentRowId && t.key.trim() === key.trim(),
      );
    },
    catch: (error) =>
      new Error(`Failed to check key duplicate: ${String(error)}`),
  });
}
