import { Effect, Option } from "effect";
import type { TranslationChange } from "@/types/translation";
import { ChangeTrackerError } from "@/types/errors";
import type { ChangeTrackerConfig } from "./change-tracker-config";
/**
 * 변경사항 추적 클래스
 *
 * 셀 값 변경사항을 추적하고 시각적으로 표시하는 기능을 제공합니다.
 * 내부적으로 Effect를 사용하여 type-safe한 에러 처리를 제공합니다.
 *
 * 성능 최적화: config.enableValidation을 false로 설정하면 검증을 스킵하여
 * 성능을 향상시킬 수 있습니다 (프로덕션 환경 권장).
 */
export declare class ChangeTracker {
    private config;
    private changes;
    private originalData;
    constructor(config?: ChangeTrackerConfig);
    /**
     * 원본 데이터 초기화
     *
     * @throws {ChangeTrackerError} - 원본 데이터 초기화 실패 시 (검증 활성화된 경우만)
     */
    initializeOriginalData(translations: readonly {
        id: string;
        key: string;
        context?: string;
        values: Record<string, string>;
    }[], languages: readonly string[]): void;
    /**
     * 원본 값 가져오기 (Effect 기반)
     *
     * @returns Effect<Option<string>, ChangeTrackerError | ValidationError>
     */
    getOriginalValueEffect(rowId: string, field: string): Effect.Effect<Option.Option<string>, ChangeTrackerError | import("@/types/errors").ValidationError>;
    /**
     * 원본 값 가져오기 (기존 API 호환성 유지)
     *
     * @returns 원본 값 (없으면 빈 문자열)
     */
    getOriginalValue(rowId: string, field: string): string;
    /**
     * 변경사항 추적 (Effect 기반)
     */
    trackChangeEffect(rowId: string, field: string, lang: string, oldValue: string, newValue: string, key: string): Effect.Effect<void, ChangeTrackerError | import("@/types/errors").ValidationError>;
    /**
     * 변경사항 추적 (기존 API 호환성 유지)
     */
    trackChange(rowId: string, field: string, lang: string, oldValue: string, newValue: string, key: string, updateStyleCallback?: (rowId: string, field: string, isDirty: boolean) => void): void;
    /**
     * 변경사항이 있는지 확인 (Effect 기반)
     */
    hasChangeEffect(rowId: string, field: string): Effect.Effect<boolean, ChangeTrackerError | import("@/types/errors").ValidationError>;
    /**
     * 변경사항이 있는지 확인 (기존 API 호환성 유지)
     */
    hasChange(rowId: string, field: string): boolean;
    /**
     * 변경사항 목록 반환
     */
    getChanges(): TranslationChange[];
    /**
     * 변경사항 초기화
     */
    clearChanges(updateStyleCallback?: (rowId: string, field: string, isDirty: boolean) => void): void;
    /**
     * 변경사항 맵 반환 (cellClassRules에서 사용)
     */
    getChangesMap(): ReadonlyMap<string, TranslationChange>;
}
//# sourceMappingURL=change-tracker.d.ts.map