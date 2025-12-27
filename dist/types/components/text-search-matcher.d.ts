/**
 * 텍스트 검색 매처 (Text Search Matcher)
 *
 * Translation 데이터에서 텍스트를 검색하고 매칭하는 로직
 */
import type { Translation } from "@/types/translation";
export interface SearchMatch {
    rowIndex: number;
    translation: Translation;
    score: number;
    matchedFields: Array<{
        field: string;
        matchedText: string;
        matchType: "exact" | "contains" | "fuzzy";
    }>;
}
export interface TextSearchMatcherOptions {
    translations: readonly Translation[];
    languages: readonly string[];
}
/**
 * 텍스트 검색 매처 클래스
 */
export declare class TextSearchMatcher {
    private options;
    constructor(options: TextSearchMatcherOptions);
    /**
     * 텍스트로 매치 찾기 (fuzzy find)
     * @param keyword 검색 키워드
     * @returns 매치 결과 배열 (점수 순으로 정렬)
     */
    findMatches(keyword: string): SearchMatch[];
    /**
     * 간단한 fuzzy match (부분 일치)
     * @param text 검색 대상 텍스트
     * @param pattern 검색 패턴
     * @returns 매치 여부
     */
    private fuzzyMatch;
}
//# sourceMappingURL=text-search-matcher.d.ts.map