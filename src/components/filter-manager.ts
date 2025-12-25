/**
 * 필터 관리자 (Filter Manager)
 * 
 * Translation 데이터를 필터링하는 로직을 관리합니다.
 * Effect 기반으로 타입 안전한 필터링을 제공합니다.
 */

import { Effect } from "effect";
import type { Translation } from "@/types/translation";
import type { ChangeTracker } from "./change-tracker";
import { FilterError } from "@/types/errors";
import { logger } from "@/utils/logger";

export type FilterType = "none" | "empty" | "changed" | "duplicate" | "search";

export interface FilterOptions {
  type: FilterType;
  keyword?: string;
}

export interface FilterManagerOptions {
  translations: readonly Translation[];
  languages: readonly string[];
  changeTracker: ChangeTracker;
}

/**
 * 필터 관리자 클래스
 */
export class FilterManager {
  constructor(private options: FilterManagerOptions) {}

  /**
   * 필터 적용 (Effect 기반)
   */
  filterEffect(
    translations: readonly Translation[],
    filterOptions: FilterOptions
  ): Effect.Effect<Translation[], FilterError> {
    return Effect.gen(function* (_) {
      switch (filterOptions.type) {
        case "search":
          return yield* _(
            this.applySearchFilterEffect(translations, filterOptions.keyword || "")
          );
        case "empty":
          return yield* _(
            this.applyEmptyFilterEffect(translations)
          );
        case "changed":
          return yield* _(
            this.applyChangedFilterEffect(translations)
          );
        case "duplicate":
          return yield* _(
            this.applyDuplicateFilterEffect(translations)
          );
        default:
          return yield* _(Effect.succeed([...translations]));
      }
    }.bind(this));
  }

  /**
   * 필터 적용 (기존 API 호환)
   */
  filter(translations: readonly Translation[], filterOptions: FilterOptions): Translation[] {
    const effect = this.filterEffect(translations, filterOptions);
    return Effect.runSync(
      Effect.match(effect, {
        onFailure: (error) => {
          // 에러 발생 시 원본 배열 반환
          logger.warn("Filter failed, returning original translations", error);
          return [...translations];
        },
        onSuccess: (filtered) => filtered,
      })
    );
  }

  /**
   * 검색 필터 적용 (Effect 기반)
   */
  private applySearchFilterEffect(
    translations: readonly Translation[],
    keyword: string
  ): Effect.Effect<Translation[], FilterError> {
    return Effect.gen(function* (_) {
      const lowerKeyword = keyword.toLowerCase().trim();
      if (!lowerKeyword) {
        return yield* _(Effect.succeed([...translations]));
      }

      const filtered = translations.filter((translation) => {
        // Key 검색
        if (translation.key.toLowerCase().includes(lowerKeyword)) {
          return true;
        }

        // Context 검색
        if (translation.context?.toLowerCase().includes(lowerKeyword)) {
          return true;
        }

        // Language values 검색
        return this.options.languages.some((lang) => {
          const value = translation.values[lang] || "";
          return value.toLowerCase().includes(lowerKeyword);
        });
      });

      return yield* _(Effect.succeed(filtered));
    }.bind(this));
  }

  /**
   * 검색 필터 적용 (기존 API 호환)
   */
  private applySearchFilter(translations: Translation[], keyword: string): Translation[] {
    const effect = this.applySearchFilterEffect(translations, keyword);
    return Effect.runSync(
      Effect.match(effect, {
        onFailure: () => [...translations],
        onSuccess: (filtered) => filtered,
      })
    );
  }

  /**
   * 빈 번역 필터 적용 (Effect 기반)
   */
  private applyEmptyFilterEffect(
    translations: readonly Translation[]
  ): Effect.Effect<Translation[], FilterError> {
    return Effect.gen(function* (_) {
      const filtered = translations.filter((translation) => {
        return this.options.languages.some((lang) => {
          const value = translation.values[lang] || "";
          return value.trim() === "";
        });
      });
      return yield* _(Effect.succeed(filtered));
    }.bind(this));
  }

  /**
   * 빈 번역 필터 적용 (기존 API 호환)
   */
  private applyEmptyFilter(translations: Translation[]): Translation[] {
    const effect = this.applyEmptyFilterEffect(translations);
    return Effect.runSync(
      Effect.match(effect, {
        onFailure: () => [...translations],
        onSuccess: (filtered) => filtered,
      })
    );
  }

  /**
   * 변경된 셀 필터 적용 (Effect 기반)
   */
  private applyChangedFilterEffect(
    translations: readonly Translation[]
  ): Effect.Effect<Translation[], FilterError> {
    return Effect.gen(function* (_) {
      const filtered: Translation[] = [];

      for (const translation of translations) {
        // Key 변경 체크
        const hasKeyChange = this.options.changeTracker.hasChange(translation.id, "key");
        if (hasKeyChange) {
          filtered.push(translation);
          continue;
        }

        // Context 변경 체크
        const hasContextChange = this.options.changeTracker.hasChange(
          translation.id,
          "context"
        );
        if (hasContextChange) {
          filtered.push(translation);
          continue;
        }

        // Language values 변경 체크
        let hasValueChange = false;
        for (const lang of this.options.languages) {
          if (this.options.changeTracker.hasChange(translation.id, `values.${lang}`)) {
            hasValueChange = true;
            break;
          }
        }
        if (hasValueChange) {
          filtered.push(translation);
        }
      }

      return yield* _(Effect.succeed(filtered));
    }.bind(this));
  }

  /**
   * 변경된 셀 필터 적용 (기존 API 호환)
   */
  private applyChangedFilter(translations: Translation[]): Translation[] {
    const effect = this.applyChangedFilterEffect(translations);
    return Effect.runSync(
      Effect.match(effect, {
        onFailure: () => [...translations],
        onSuccess: (filtered) => filtered,
      })
    );
  }

  /**
   * 중복 Key 필터 적용 (Effect 기반)
   */
  private applyDuplicateFilterEffect(
    translations: readonly Translation[]
  ): Effect.Effect<Translation[], FilterError> {
    return Effect.gen(function* (_) {
      const keyCounts = new Map<string, number>();
      translations.forEach((t) => {
        const count = keyCounts.get(t.key) || 0;
        keyCounts.set(t.key, count + 1);
      });

      const filtered = translations.filter((translation) => {
        return (keyCounts.get(translation.key) || 0) > 1;
      });

      return yield* _(Effect.succeed(filtered));
    }.bind(this));
  }

  /**
   * 중복 Key 필터 적용 (기존 API 호환)
   */
  private applyDuplicateFilter(translations: Translation[]): Translation[] {
    const effect = this.applyDuplicateFilterEffect(translations);
    return Effect.runSync(
      Effect.match(effect, {
        onFailure: () => [...translations],
        onSuccess: (filtered) => filtered,
      })
    );
  }
}

