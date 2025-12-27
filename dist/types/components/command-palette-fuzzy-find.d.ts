/**
 * Command Palette Fuzzy Find 모듈
 *
 * Command Palette의 fuzzy find 관련 로직 (입력 파싱, 스타일링, 결과 렌더링)
 */
export interface FuzzyFindMatch {
    rowIndex: number;
    translation: any;
    score: number;
    matchedFields: Array<{
        field: string;
        matchedText: string;
        matchType: "exact" | "contains" | "fuzzy";
    }>;
}
export interface FuzzyFindInputParserResult {
    isFuzzyFindMode: boolean;
    fuzzyFindQuery: string;
    quoteChar: '"' | "'" | null;
}
/**
 * 입력 파싱 (fuzzy find 모드 감지)
 * " 또는 ' 이후 텍스트는 검색 키워드로 처리
 * 닫는 따옴표가 있으면 제거 (검색 키워드에는 포함하지 않음)
 */
export declare function parseFuzzyFindInput(query: string): FuzzyFindInputParserResult;
/**
 * 입력 필드 스타일링 업데이트 (따옴표 이후 텍스트를 bold/italic로 표시)
 */
export declare function updateInputStyling(input: HTMLInputElement, query: string, parsed: FuzzyFindInputParserResult): HTMLElement | null;
/**
 * Fuzzy find 결과 리스트 UI 생성
 */
export declare function createFuzzyFindList(listContainer: HTMLElement, fuzzyFindQuery: string, fuzzyFindResults: FuzzyFindMatch[], selectedIndex: number, onItemClick: (index: number) => void): void;
//# sourceMappingURL=command-palette-fuzzy-find.d.ts.map