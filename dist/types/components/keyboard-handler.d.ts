/**
 * 키보드 핸들러 모듈
 *
 * VirtualTableDiv의 키보드 이벤트를 처리합니다.
 * - Undo/Redo (Cmd+Z, Cmd+Y, Cmd+Shift+Z)
 * - 키보드 네비게이션 (Arrow keys, Tab, Enter)
 */
import { ModifierKeyTracker } from "./modifier-key-tracker";
import { FocusManager } from "./focus-manager";
export interface KeyboardHandlerCallbacks {
    onUndo?: () => void;
    onRedo?: () => void;
    onNavigate?: (rowIndex: number, columnId: string) => void;
    onStartEditing?: (rowIndex: number, columnId: string) => void;
    getAllColumns?: () => string[];
    getMaxRowIndex?: () => number;
    focusCell?: (rowIndex: number, columnId: string) => void;
    onOpenCommandPalette?: (mode: string) => void;
    onOpenQuickSearch?: () => void;
    onQuickSearchNext?: () => void;
    onQuickSearchPrev?: () => void;
    isQuickSearchMode?: () => boolean;
    isEditableColumn?: (columnId: string) => boolean;
    isReadOnly?: () => boolean;
    onOpenFind?: () => void;
    onOpenReplace?: () => void;
}
export declare class KeyboardHandler {
    private keyboardHandler;
    private modifierKeyTracker;
    private focusManager;
    private callbacks;
    constructor(modifierKeyTracker: ModifierKeyTracker, focusManager: FocusManager, callbacks?: KeyboardHandlerCallbacks);
    /**
     * 키보드 이벤트 리스너 등록
     */
    attach(): void;
    /**
     * 키보드 이벤트 리스너 해제
     */
    detach(): void;
    /**
     * 키보드 네비게이션 처리
     */
    private handleKeyboardNavigation;
    /**
     * 콜백 업데이트
     */
    updateCallbacks(callbacks: Partial<KeyboardHandlerCallbacks>): void;
}
//# sourceMappingURL=keyboard-handler.d.ts.map