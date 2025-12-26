/**
 * Mutable Translation 타입 정의
 *
 * 내부적으로 Translation을 수정할 때 사용하는 타입
 */

import type { Translation } from "./translation";

/**
 * Mutable Translation 타입
 * readonly 속성을 제거하여 내부 수정 가능
 */
export interface MutableTranslation {
  id: string;
  key: string;
  context?: string;
  values: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Translation을 MutableTranslation으로 안전하게 변환
 */
export function toMutableTranslation(
  translation: Translation
): MutableTranslation {
  return {
    id: translation.id,
    key: translation.key,
    context: translation.context,
    values: { ...translation.values },
    createdAt: translation.createdAt,
    updatedAt: translation.updatedAt,
    updatedBy: translation.updatedBy,
  };
}

/**
 * MutableTranslation을 Translation으로 변환
 */
export function toTranslation(mutable: MutableTranslation): Translation {
  return {
    id: mutable.id,
    key: mutable.key,
    context: mutable.context,
    values: { ...mutable.values },
    createdAt: mutable.createdAt,
    updatedAt: mutable.updatedAt,
    updatedBy: mutable.updatedBy,
  };
}
