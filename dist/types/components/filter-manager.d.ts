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
export declare class FilterManager {
    private options;
    constructor(options: FilterManagerOptions);
    /**
     * 필터 적용 (Effect 기반)
     */
    filterEffect(translations: readonly Translation[], filterOptions: FilterOptions): Effect.Effect<Translation[], FilterError>;
    /**
     * 필터 적용 (기존 API 호환)
     */
    filter(translations: readonly Translation[], filterOptions: FilterOptions): Translation[];
    /**
     * 검색 필터 적용 (Effect 기반)
     */
    private applySearchFilterEffect;
    /**
     * 검색 필터 적용 (기존 API 호환)
     */
    private applySearchFilter;
    /**
     * 빈 번역 필터 적용 (Effect 기반)
     */
    private applyEmptyFilterEffect;
    /**
     * 빈 번역 필터 적용 (기존 API 호환)
     */
    private applyEmptyFilter;
    /**
     * 변경된 셀 필터 적용 (Effect 기반)
     */
    private applyChangedFilterEffect;
    /**
     * 변경된 셀 필터 적용 (기존 API 호환)
     */
    private applyChangedFilter;
    /**
     * 중복 Key 필터 적용 (Effect 기반)
     */
    private applyDuplicateFilterEffect;
    /**
     * 중복 Key 필터 적용 (기존 API 호환)
     */
    private applyDuplicateFilter;
}
//# sourceMappingURL=filter-manager.d.ts.map