/**
 * Virtual Table (Div-based Grid) - @tanstack/virtual-core를 사용한 가상화 그리드
 *
 * 테이블 구조 대신 div 기반 그리드로 구현하여 가상 스크롤링과 완벽하게 호환
 */
import type { Translation, TranslationChange } from "@/types/translation";
import "@/styles/virtual-table-div.css";
export interface VirtualTableDivOptions {
    container: HTMLElement;
    translations: readonly Translation[];
    languages: readonly string[];
    defaultLanguage: string;
    readOnly?: boolean;
    onCellChange?: (id: string, lang: string, value: string) => void;
    rowHeight?: number;
    headerHeight?: number;
    columnWidths?: Map<string, number>;
}
export declare class VirtualTableDiv {
    private container;
    private scrollElement;
    private gridElement;
    private headerElement;
    private bodyElement;
    private options;
    private rowVirtualizer;
    private virtualizerCleanup;
    private renderScheduled;
    private resizeObserver;
    private columnWidths;
    private editableColumns;
    private rowHeight;
    private headerHeight;
    private changeTracker;
    private undoRedoManager;
    private modifierKeyTracker;
    private focusManager;
    private cellEditor;
    private keyboardHandlerModule;
    private columnResizer;
    private columnWidthCalculator;
    private gridRenderer;
    private columnMinWidths;
    constructor(options: VirtualTableDivOptions);
    /**
     * 그리드 렌더링
     */
    render(): void;
    /**
     * 컨테이너 크기 변경 감지
     */
    private observeContainerResize;
    /**
     * 가상 스크롤링 초기화
     */
    private initVirtualScrolling;
    /**
     * 가상 행 렌더링
     */
    private renderVirtualRows;
    /**
     * 헤더 렌더링
     */
    private renderHeader;
    /**
     * 특정 컬럼의 너비를 모든 셀에 적용
     * 마지막 컬럼은 항상 끝까지 채워지도록 함
     */
    private applyColumnWidth;
    /**
     * 헤더에서 실제 컬럼 너비 가져오기
     */
    private getColumnWidthsFromHeader;
    /**
     * 편집 시작
     */
    private startEditing;
    /**
     * 편집 중지
     */
    private stopEditing;
    /**
     * 셀 스타일 업데이트
     */
    private updateCellStyle;
    /**
     * 키보드 이벤트 리스너 추가
     */
    private attachKeyboardListeners;
    /**
     * 셀에 포커스 설정
     */
    private focusCell;
    /**
     * Undo 처리
     */
    private handleUndo;
    /**
     * Redo 처리
     */
    private handleRedo;
    /**
     * Undo/Redo 액션 적용
     */
    private applyUndoRedoAction;
    /**
     * 컨테이너 너비 가져오기
     */
    private getContainerWidth;
    /**
     * 읽기 전용 모드 설정
     */
    setReadOnly(readOnly: boolean): void;
    /**
     * 변경사항 목록 반환
     */
    getChanges(): TranslationChange[];
    /**
     * 변경사항 초기화
     */
    clearChanges(): void;
    /**
     * 그리드 정리
     */
    destroy(): void;
}
//# sourceMappingURL=virtual-table-div.d.ts.map