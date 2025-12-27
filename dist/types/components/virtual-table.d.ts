/**
 * Virtual Table - @tanstack/virtual-core를 사용한 가상화 테이블
 *
 * AG Grid 대신 사용할 headless 테이블 구현
 */
import type { Translation, TranslationChange } from "@/types/translation";
import "@/styles/virtual-table.css";
export interface VirtualTableOptions {
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
export declare class VirtualTable {
    private container;
    private scrollElement;
    private tableElement;
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
    private changeTracker;
    private undoRedoManager;
    private keyboardHandler;
    private editingCell;
    private isEscapeKeyPressed;
    private isFinishingEdit;
    private columnMinWidths;
    private isResizing;
    private resizeStartX;
    private resizeStartWidth;
    private resizeColumnId;
    private resizeHandler;
    private resizeEndHandler;
    constructor(options: VirtualTableOptions);
    /**
     * 테이블 렌더링
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
     * 헤더 셀 생성
     */
    private createHeaderCell;
    /**
     * 컬럼 리사이즈 핸들 추가 (언어 컬럼만)
     * @param headerCell 헤더 셀
     * @param columnId 컬럼 ID (리사이즈할 컬럼)
     */
    private addResizeHandle;
    /**
     * 컬럼 리사이즈 시작
     * Excel 스타일: 초기 마우스 위치와 컬럼 너비를 저장하고 전역 이벤트 리스너 등록
     */
    private startResize;
    /**
     * 컬럼 리사이즈 중 (실시간 업데이트)
     * Excel 공식: newWidth = initialWidth + (currentMouseX - initialMouseX)
     */
    private handleResize;
    /**
     * 특정 컬럼의 너비를 모든 셀에 적용 (Excel 스타일)
     * min-width를 사용하여 브라우저가 컬럼을 재분배하지 않도록 모든 컬럼의 너비를 명시적으로 설정
     */
    private applyColumnWidth;
    /**
     * 컬럼 리사이즈 종료
     * Excel 스타일: 전역 이벤트 리스너 제거 및 상태 정리
     */
    private endResize;
    /**
     * 테이블 전체 너비 계산 (모든 컬럼 너비의 합)
     */
    private calculateTotalTableWidth;
    /**
     * sticky 컬럼인지 확인
     */
    private isStickyColumn;
    /**
     * columnId에서 lang 값 추출
     */
    private getLangFromColumnId;
    /**
     * translation key 값 결정
     */
    private getTranslationKey;
    /**
     * 셀에 너비 및 스타일 적용
     */
    private applyCellWidthAndStyle;
    /**
     * 컬럼 너비 계산 (컨테이너 너비에 맞춤)
     * 사용자가 리사이즈한 컬럼은 저장된 너비를 사용하고, 나머지는 기본값 사용
     */
    private calculateColumnWidths;
    /**
     * 행 생성
     */
    private createRow;
    /**
     * 셀 생성
     */
    private createCell;
    /**
     * 편집 시작
     */
    private startEditing;
    /**
     * 편집 중지
     */
    private stopEditing;
    /**
     * 키보드 이벤트 리스너 추가
     */
    private attachKeyboardListeners;
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
     * 컬럼 너비 가져오기 (숫자 값 반환)
     */
    private getColumnWidthValue;
    /**
     * 컨테이너 너비 가져오기 (또는 window 너비)
     */
    private getContainerWidth;
    /**
     * 테이블 전체 너비 계산 (컨테이너 너비에 맞춤)
     */
    private getTotalTableWidth;
    /**
     * Key 중복 체크 (현재 편집 중인 값 포함)
     */
    private checkKeyDuplicate;
    /**
     * 셀 스타일 업데이트 (dirty/empty/duplicate-key 상태)
     */
    private updateCellStyle;
    /**
     * 편집용 input 요소 생성
     */
    private createEditInput;
    /**
     * 편집 모드를 위해 셀 스타일 준비 (sticky 셀 처리 포함)
     */
    private prepareCellForEditing;
    /**
     * 셀 내용 업데이트
     */
    private updateCellContent;
    /**
     * 변경사항 가져오기
     */
    getChanges(): TranslationChange[];
    /**
     * 변경사항 초기화
     */
    clearChanges(): void;
    /**
     * Undo 가능 여부
     */
    canUndo(): boolean;
    /**
     * Redo 가능 여부
     */
    canRedo(): boolean;
    /**
     * 히스토리 상태 가져오기 (디버깅용)
     */
    getUndoRedoState(): {
        length: number;
        currentIndex: number;
        canUndo: boolean;
        canRedo: boolean;
    };
    /**
     * readOnly 모드 업데이트 및 테이블 재렌더링
     */
    setReadOnly(readOnly: boolean): void;
    /**
     * 현재 readOnly 상태 반환
     */
    isReadOnly(): boolean;
    /**
     * 셀의 편집 가능 여부 업데이트
     */
    private updateCellEditability;
    /**
     * read-only 모드일 때 tooltip 표시/제거
     */
    private updateReadOnlyTooltips;
    /**
     * translations 업데이트 (정렬 후 사용)
     */
    updateTranslations(translations: readonly Translation[]): void;
    /**
     * 테이블 제거
     */
    destroy(): void;
}
//# sourceMappingURL=virtual-table.d.ts.map