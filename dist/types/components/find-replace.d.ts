/**
 * 찾기/바꾸기 모듈
 *
 * Cmd/Ctrl+F로 찾기, Cmd/Ctrl+H로 바꾸기 기능 제공
 */
import type { Translation } from "@/types/translation";
export interface FindReplaceOptions {
    translations: readonly Translation[];
    languages: readonly string[];
    onFind?: (matches: FindMatch[]) => void;
    onReplace?: (match: FindMatch, replacement: string) => void;
    onReplaceAll?: (matches: FindMatch[], replacement: string) => void;
    onClose?: () => void;
}
export interface FindMatch {
    rowIndex: number;
    columnId: string;
    matchedText: string;
    matchIndex: number;
    matchLength: number;
}
export interface FindReplaceState {
    searchQuery: string;
    replaceQuery: string;
    isCaseSensitive: boolean;
    isWholeWord: boolean;
    isRegex: boolean;
    matches: FindMatch[];
    currentMatchIndex: number;
    scope: "all" | "current-row" | "selection";
}
export declare class FindReplace {
    private overlay;
    private container;
    private state;
    private translations;
    private languages;
    private callbacks;
    constructor(options: FindReplaceOptions);
    /**
     * 찾기/바꾸기 UI 열기
     */
    open(mode?: "find" | "replace"): void;
    /**
     * 찾기/바꾸기 UI 닫기
     */
    close(): void;
    /**
     * 모드 설정 (찾기/바꾸기)
     */
    private setMode;
    /**
     * UI 생성
     */
    private createUI;
    /**
     * 버튼 생성
     */
    private createButton;
    /**
     * 체크박스 생성
     */
    private createCheckbox;
    /**
     * 검색 수행
     */
    private performSearch;
    /**
     * 검색 패턴 빌드
     */
    private buildSearchPattern;
    /**
     * 정규식 특수 문자 이스케이프
     */
    private escapeRegex;
    /**
     * 텍스트에서 매칭 찾기
     */
    private findMatchesInText;
    /**
     * 셀 값 가져오기
     */
    private getCellValue;
    /**
     * 결과 업데이트
     */
    private updateResult;
    /**
     * 다음 매칭으로 이동
     */
    private goToNextMatch;
    /**
     * 이전 매칭으로 이동
     */
    private goToPrevMatch;
    /**
     * 매칭 위치로 이동
     */
    private navigateToMatch;
    /**
     * 현재 매칭 바꾸기
     */
    private replaceCurrent;
    /**
     * 모든 매칭 바꾸기
     */
    private replaceAll;
    /**
     * 이벤트 리스너 등록
     */
    private attach;
    /**
     * 이벤트 리스너 해제
     */
    private detach;
    /**
     * 열려있는지 확인
     */
    isOpen(): boolean;
}
//# sourceMappingURL=find-replace.d.ts.map