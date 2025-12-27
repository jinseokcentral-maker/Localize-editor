/**
 * 빠른 검색 (Quick Search) 모듈
 *
 * `/` 키로 검색 모드 진입
 * 실시간 하이라이트
 * 컬럼별 검색 지원 (/key:keyword, /en:keyword 등)
 */
import type { Translation } from "@/types/translation";
export interface SearchQuery {
    keyword: string;
    column?: string;
}
export interface QuickSearchMatch {
    rowIndex: number;
    columnId: string;
    matchedText: string;
    matchIndices: number[];
}
export interface QuickSearchOptions {
    translations: readonly Translation[];
    languages: readonly string[];
}
/**
 * 검색어 파싱
 *
 * @param query 검색어 (예: "keyword", "key:keyword", "en:keyword")
 * @returns 파싱된 검색 쿼리 또는 null
 */
export declare function parseSearchQuery(query: string): SearchQuery | null;
/**
 * 텍스트에서 검색어 매칭 인덱스 찾기
 *
 * @param text 검색 대상 텍스트
 * @param keyword 검색 키워드
 * @returns 매칭된 문자 인덱스 배열
 */
export declare function findMatchIndices(text: string, keyword: string): number[];
/**
 * 빠른 검색 클래스
 */
export declare class QuickSearch {
    private options;
    constructor(options: QuickSearchOptions);
    /**
     * 검색 실행
     *
     * @param query 검색 쿼리
     * @returns 검색 결과 매칭 배열
     */
    findMatches(query: SearchQuery): QuickSearchMatch[];
    /**
     * 검색 컬럼 이름을 컬럼 ID로 변환
     *
     * @param column 검색 컬럼 이름 ('key', 'context', 'en', 'ko' 등)
     * @returns 컬럼 ID 또는 null
     */
    private getColumnIdForSearch;
    /**
     * 셀 값 가져오기
     *
     * @param translation 번역 객체
     * @param columnId 컬럼 ID
     * @returns 셀 값 또는 null
     */
    private getCellValue;
    /**
     * 텍스트에 하이라이트 적용
     *
     * @param text 원본 텍스트
     * @param indices 하이라이트할 문자 인덱스 배열
     * @returns HTML 문자열
     */
    static highlightText(text: string, indices: number[]): string;
}
//# sourceMappingURL=quick-search.d.ts.map