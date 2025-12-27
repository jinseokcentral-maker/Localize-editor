/**
 * VirtualTableDiv 유틸리티 함수들
 */
import { Effect } from "effect";
/**
 * 컬럼 ID에서 언어 코드 추출
 */
export declare function getLangFromColumnId(columnId: string): string;
/**
 * Translation에서 키 가져오기 (Effect 기반)
 */
export declare function getTranslationKeyEffect(translations: readonly {
    id: string;
    key: string;
}[], rowId: string, columnId: string, currentValue: string): Effect.Effect<string, Error>;
/**
 * Translation에서 키 가져오기 (동기 버전, 기존 API 호환)
 */
export declare function getTranslationKey(translations: readonly {
    id: string;
    key: string;
}[], rowId: string, columnId: string, currentValue: string): string;
/**
 * 컬럼 너비 계산
 */
export interface ColumnWidthCalculation {
    key: number;
    context: number;
    languageColumns: Map<string, number>;
    totalWidth: number;
}
export declare function calculateColumnWidths(containerWidth: number, languageCount: number, keyColumnMinWidth?: number, contextColumnMinWidth?: number, languageColumnMinWidth?: number): ColumnWidthCalculation;
/**
 * 키 중복 체크
 */
export declare function checkKeyDuplicate(translations: readonly {
    id: string;
    key: string;
}[], currentRowId: string, key: string): boolean;
/**
 * 키 중복 체크 (Effect 기반)
 */
export declare function checkKeyDuplicateEffect(translations: readonly {
    id: string;
    key: string;
}[], currentRowId: string, key: string): Effect.Effect<boolean, Error>;
//# sourceMappingURL=grid-utils.d.ts.map