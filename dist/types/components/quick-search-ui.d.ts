/**
 * 빠른 검색 UI 컴포넌트
 *
 * 검색 바, 검색어 입력 필드, 검색 결과 수 표시
 */
export interface QuickSearchUICallbacks {
    onSearch?: (query: string) => void;
    onClose?: () => void;
    onNextMatch?: () => void;
    onPrevMatch?: () => void;
}
export declare class QuickSearchUI {
    private overlay;
    private input;
    private statusText;
    private isOpen;
    private callbacks;
    private container;
    constructor(container: HTMLElement, callbacks?: QuickSearchUICallbacks);
    /**
     * 검색 UI 열기
     */
    open(): void;
    /**
     * 검색 UI 닫기
     */
    close(): void;
    /**
     * 검색 결과 수 업데이트
     */
    updateStatus(current: number, total: number): void;
    /**
     * 검색어 가져오기
     */
    getQuery(): string;
    /**
     * 검색어 설정
     */
    setQuery(query: string): void;
    /**
     * UI 생성
     */
    private createUI;
    /**
     * UI 제거
     */
    private destroyUI;
    /**
     * 열림 상태 확인
     */
    isSearchMode(): boolean;
}
//# sourceMappingURL=quick-search-ui.d.ts.map