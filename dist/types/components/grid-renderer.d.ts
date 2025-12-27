/**
 * 그리드 렌더링 모듈
 *
 * 헤더, 행, 셀 렌더링 관련 로직을 담당합니다.
 */
import type { Translation } from "@/types/translation";
export interface ColumnWidths {
    rowNumber: number;
    key: number;
    context: number;
    languages: number[];
}
export interface GridRendererCallbacks {
    onCellDblClick?: (rowIndex: number, columnId: string, cell: HTMLElement) => void;
    onCellFocus?: (rowIndex: number, columnId: string) => void;
    updateCellStyle?: (rowId: string, columnId: string, cell?: HTMLElement) => void;
}
export interface GridRendererOptions {
    languages: readonly string[];
    readOnly?: boolean;
    editableColumns: Set<string>;
    callbacks: GridRendererCallbacks;
}
export declare class GridRenderer {
    private options;
    constructor(options: GridRendererOptions);
    /**
     * 헤더 셀 생성
     */
    createHeaderCell(text: string, width: number, left: number, zIndex: number, columnId?: string): HTMLElement;
    /**
     * 행 생성
     */
    createRow(translation: Translation, rowIndex: number, columnWidths: ColumnWidths): HTMLElement;
    /**
     * 셀 생성
     */
    createCell(rowId: string, columnId: string, value: string, rowIndex: number, editable: boolean, width: number, left: number, zIndex: number): HTMLElement;
    /**
     * 셀 내용 업데이트
     */
    updateCellContent(cell: HTMLElement, rowId: string, columnId: string, value: string, rowIndex: number): void;
}
//# sourceMappingURL=grid-renderer.d.ts.map