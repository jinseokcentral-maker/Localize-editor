/**
 * VirtualTableDiv 유틸리티 함수들
 */
import { Effect } from "effect";
/**
 * 컬럼 ID에서 언어 코드 추출
 */
export declare function getLangFromColumnId(columnId: string): string;
/**
 * Translation에서 키 가져오기 (동기 버전)
 */
export declare function getTranslationKey(translations: readonly {
    id: string;
    key: string;
}[], rowId: string, columnId: string, currentValue: string): string;
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