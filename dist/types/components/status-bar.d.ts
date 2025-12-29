/**
 * 상태바 (Status Bar) 컴포넌트
 *
 * 화면 하단에 현재 상태 정보를 표시
 * - 현재 모드
 * - 행/컬럼 위치
 * - 변경사항 수
 * - 빈 번역 수
 * - 중복 Key 수
 */
export type FilterType = "none" | "empty" | "changed" | "duplicate" | "search";
export interface StatusBarInfo {
    mode: string;
    rowIndex: number | null;
    totalRows: number;
    columnId: string | null;
    changesCount: number;
    emptyCount: number;
    duplicateCount: number;
    command?: string | null;
    filter?: FilterType;
    searchKeyword?: string;
}
export interface StatusBarCallbacks {
    onStatusUpdate?: (info: StatusBarInfo) => void;
    onClearFilter?: () => void;
}
export declare class StatusBar {
    private statusBarElement;
    private container;
    private callbacks;
    constructor(container: HTMLElement, callbacks?: StatusBarCallbacks);
    /**
     * 상태바 생성 및 표시
     */
    create(): void;
    /**
     * 상태 정보 업데이트
     */
    update(info: StatusBarInfo): void;
    /**
     * 필터 타입을 표시 레이블로 변환
     */
    private getFilterLabel;
    /**
     * 컬럼 ID를 표시 이름으로 변환
     */
    private getColumnDisplayName;
    /**
     * 상태바 제거
     */
    destroy(): void;
    /**
     * 상태바 표시 여부
     */
    isVisible(): boolean;
}
//# sourceMappingURL=status-bar.d.ts.map