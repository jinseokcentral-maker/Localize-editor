/**
 * Undo/Redo Manager
 *
 * 변경사항 히스토리를 관리하고 Undo/Redo 기능을 제공합니다.
 */
export interface UndoRedoAction {
    type: 'cell-change';
    rowId: string;
    columnId: string;
    oldValue: string;
    newValue: string;
}
export declare class UndoRedoManager {
    private history;
    private currentIndex;
    private maxHistorySize;
    /**
     * 변경사항을 히스토리에 추가
     */
    push(action: UndoRedoAction): void;
    /**
     * Undo 가능한지 확인
     */
    canUndo(): boolean;
    /**
     * Redo 가능한지 확인
     */
    canRedo(): boolean;
    /**
     * Undo: 이전 상태로 되돌리기
     */
    undo(): UndoRedoAction | null;
    /**
     * Redo: 다음 상태로 되돌리기
     */
    redo(): UndoRedoAction | null;
    /**
     * 히스토리 초기화
     */
    clear(): void;
    /**
     * 현재 히스토리 상태 가져오기 (디버깅용)
     */
    getHistoryState(): {
        length: number;
        currentIndex: number;
        canUndo: boolean;
        canRedo: boolean;
    };
}
//# sourceMappingURL=undo-redo-manager.d.ts.map