/**
 * 셀 편집 모듈 (Effect 기반)
 *
 * 셀 편집 관련 로직을 Effect를 사용하여 type-safe하고 robust하게 구현
 */
import { Effect } from "effect";
import type { Translation } from "@/types/translation";
import { ChangeTracker } from "./change-tracker";
import { UndoRedoManager } from "./undo-redo-manager";
/**
 * 셀 편집 에러 타입
 */
export declare class CellEditorError extends Error {
    readonly code: "TRANSLATION_NOT_FOUND" | "INVALID_COLUMN_ID" | "DUPLICATE_KEY" | "EDIT_IN_PROGRESS";
    constructor(message: string, code: "TRANSLATION_NOT_FOUND" | "INVALID_COLUMN_ID" | "DUPLICATE_KEY" | "EDIT_IN_PROGRESS");
}
export interface EditingCell {
    rowIndex: number;
    columnId: string;
    rowId: string;
}
export interface CellEditorCallbacks {
    onCellChange?: (id: string, columnId: string, value: string) => void;
    updateCellStyle?: (rowId: string, columnId: string) => void;
    updateCellContent?: (cell: HTMLElement, rowId: string, columnId: string, value: string) => void;
}
export declare class CellEditor {
    private translations;
    private changeTracker;
    private undoRedoManager;
    private callbacks;
    private editingCell;
    private isEscapeKeyPressed;
    private isFinishingEdit;
    constructor(translations: readonly Translation[], changeTracker: ChangeTracker, undoRedoManager: UndoRedoManager, callbacks?: CellEditorCallbacks);
    /**
     * 현재 편집 중인 셀 가져오기
     */
    getEditingCell(): EditingCell | null;
    /**
     * 편집 중인지 확인
     */
    isEditing(): boolean;
    /**
     * 셀 편집 시작 (Effect 기반)
     *
     * 주의: DOM 조작이 포함되어 있어 동기 함수로 구현하고,
     * 실제 데이터 변경 부분만 Effect로 처리합니다.
     */
    startEditingEffect(rowIndex: number, columnId: string, rowId: string, cell: HTMLElement): Effect.Effect<void, CellEditorError>;
    /**
     * 셀 편집 시작 (동기 버전, 기존 API 호환)
     */
    startEditing(rowIndex: number, columnId: string, rowId: string, cell: HTMLElement): void;
    /**
     * Input 이벤트 리스너 등록
     */
    private attachInputListeners;
    /**
     * 셀 변경사항 적용 (Effect 기반)
     */
    private applyCellChangeEffect;
    /**
     * 셀 변경사항 적용 (Promise 기반, 기존 API 호환)
     */
    private applyCellChange;
    /**
     * 편집 중지 (Effect 기반)
     */
    stopEditingEffect(bodyElement?: HTMLElement): Effect.Effect<void, CellEditorError>;
    /**
     * 편집 중지 (동기 버전)
     */
    stopEditing(bodyElement?: HTMLElement): void;
    /**
     * 편집용 input 생성
     */
    private createEditInput;
    /**
     * Escape 키 눌림 상태 설정 (외부에서 사용)
     */
    setEscapeKeyPressed(value: boolean): void;
}
//# sourceMappingURL=cell-editor.d.ts.map