/**
 * 컬럼 리사이즈 모듈
 *
 * 컬럼 너비 조정 및 리사이즈 핸들 관련 로직을 관리합니다.
 */
export interface ColumnResizerCallbacks {
    onResizeStart?: (columnId: string) => void;
    onResize?: (columnId: string, width: number) => void;
    onResizeEnd?: (columnId: string, width: number) => void;
    getContainerWidth?: () => number;
    getColumnWidth?: (columnId: string, defaultWidth: number) => number;
    updateHeaderCell?: (columnId: string, width: number) => void;
    updateBodyCells?: (columnId: string, width: number) => void;
}
export interface ColumnResizerOptions {
    columnWidths: Map<string, number>;
    columnMinWidths: Map<string, number>;
    languages: readonly string[];
    callbacks: ColumnResizerCallbacks;
}
export declare class ColumnResizer {
    private options;
    private isResizing;
    private resizeStartX;
    private resizeStartWidth;
    private resizeColumnId;
    private resizeHandler;
    private resizeEndHandler;
    constructor(options: ColumnResizerOptions);
    /**
     * 리사이즈 핸들 추가
     */
    addResizeHandle(headerCell: HTMLElement, columnId: string): void;
    /**
     * 컬럼 리사이즈 시작
     */
    startResize(columnId: string, startX: number, headerCell: HTMLElement): void;
    /**
     * 컬럼 리사이즈 중
     */
    private handleResize;
    /**
     * 컬럼 리사이즈 종료
     */
    endResize(): void;
    /**
     * 리사이즈 중인지 확인
     */
    isResizingActive(): boolean;
    /**
     * 리사이즈 상태 초기화 (필요시)
     */
    reset(): void;
}
//# sourceMappingURL=column-resizer.d.ts.map