/**
 * 키보드 핸들러 모듈
 * 
 * VirtualTableDiv의 키보드 이벤트를 처리합니다.
 * - Undo/Redo (Cmd+Z, Cmd+Y, Cmd+Shift+Z)
 * - 키보드 네비게이션 (Arrow keys, Tab, Enter)
 */

import { ModifierKeyTracker } from "./modifier-key-tracker";
import { FocusManager } from "./focus-manager";
import type { UndoRedoAction } from "./undo-redo-manager";

export interface KeyboardHandlerCallbacks {
  onUndo?: () => void;
  onRedo?: () => void;
  onNavigate?: (
    rowIndex: number,
    columnId: string
  ) => void;
  getAllColumns?: () => string[];
  getMaxRowIndex?: () => number;
  focusCell?: (rowIndex: number, columnId: string) => void;
}

export class KeyboardHandler {
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private modifierKeyTracker: ModifierKeyTracker;
  private focusManager: FocusManager;

  constructor(
    modifierKeyTracker: ModifierKeyTracker,
    focusManager: FocusManager,
    private callbacks: KeyboardHandlerCallbacks = {}
  ) {
    this.modifierKeyTracker = modifierKeyTracker;
    this.focusManager = focusManager;
  }

  /**
   * 키보드 이벤트 리스너 등록
   */
  attach(): void {
    if (this.keyboardHandler) {
      // 이미 등록된 경우 중복 등록 방지
      return;
    }

    this.keyboardHandler = (e: KeyboardEvent) => {
      const ctrlOrCmd = this.modifierKeyTracker.isModifierPressed(e);

      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Undo/Redo
      // input 필드에서도 작동하도록 수정 (브라우저 기본 동작 방지)
      const isUndoKey =
        (e.key === "z" || e.key === "Z" || e.code === "KeyZ") && !e.shiftKey;
      if (ctrlOrCmd && isUndoKey) {
        // 모든 필드에서 Undo 처리 (편집 input에서도 동작하도록)
        e.preventDefault();
        e.stopPropagation();
        if (this.callbacks.onUndo) {
          this.callbacks.onUndo();
        }
        return;
      }

      const isRedoKey =
        e.key === "y" ||
        e.key === "Y" ||
        e.code === "KeyY" ||
        ((e.key === "z" || e.key === "Z" || e.code === "KeyZ") && e.shiftKey);
      if (ctrlOrCmd && isRedoKey) {
        // 모든 필드에서 Redo 처리 (편집 input에서도 동작하도록)
        e.preventDefault();
        e.stopPropagation();
        if (this.callbacks.onRedo) {
          this.callbacks.onRedo();
        }
        return;
      }

      // 키보드 네비게이션 (셀 포커스가 있을 때만, input 필드가 아닌 경우)
      if (this.focusManager.hasFocus() && !isInputField) {
        this.handleKeyboardNavigation(e);
      }
    };

    // capture 단계에서도 리스너 등록 (브라우저 기본 동작보다 먼저 처리)
    document.addEventListener("keydown", this.keyboardHandler, true);
  }

  /**
   * 키보드 이벤트 리스너 해제
   */
  detach(): void {
    if (this.keyboardHandler) {
      document.removeEventListener("keydown", this.keyboardHandler, true);
      this.keyboardHandler = null;
    }
  }

  /**
   * 키보드 네비게이션 처리
   */
  private handleKeyboardNavigation(e: KeyboardEvent): void {
    const focusedCell = this.focusManager.getFocusedCell();
    if (!focusedCell || !this.callbacks.getAllColumns || !this.callbacks.focusCell) {
      return;
    }

    const { rowIndex, columnId } = focusedCell;
    const allColumns = this.callbacks.getAllColumns();
    const maxRowIndex = this.callbacks.getMaxRowIndex ? this.callbacks.getMaxRowIndex() : Infinity;

    const currentColIndex = allColumns.indexOf(columnId);
    if (currentColIndex < 0) {
      return;
    }

    let nextRowIndex = rowIndex;
    let nextColIndex = currentColIndex;

    // Tab / Shift+Tab
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();

      if (e.shiftKey) {
        // Shift+Tab: 이전 편집 가능한 컬럼
        if (currentColIndex > 0) {
          nextColIndex = currentColIndex - 1;
        } else {
          if (rowIndex > 0) {
            nextRowIndex = rowIndex - 1;
            nextColIndex = allColumns.length - 1;
          } else {
            nextRowIndex = maxRowIndex;
            nextColIndex = allColumns.length - 1;
          }
        }
      } else {
        // Tab: 다음 편집 가능한 컬럼
        if (currentColIndex < allColumns.length - 1) {
          nextColIndex = currentColIndex + 1;
        } else {
          if (rowIndex < maxRowIndex) {
            nextRowIndex = rowIndex + 1;
            nextColIndex = 0;
          } else {
            nextRowIndex = 0;
            nextColIndex = 0;
          }
        }
      }
    }

    // Enter / Shift+Enter
    if (e.key === "Enter" && columnId.startsWith("values.")) {
      e.preventDefault();
      e.stopPropagation();

      if (e.shiftKey) {
        // Shift+Enter: 위 행
        if (rowIndex > 0) {
          nextRowIndex = rowIndex - 1;
        }
      } else {
        // Enter: 아래 행
        if (rowIndex < maxRowIndex) {
          nextRowIndex = rowIndex + 1;
        }
      }
    }

    // Arrow keys
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "ArrowRight" && currentColIndex < allColumns.length - 1) {
        nextColIndex = currentColIndex + 1;
      } else if (e.key === "ArrowLeft" && currentColIndex > 0) {
        nextColIndex = currentColIndex - 1;
      } else if (e.key === "ArrowDown" && rowIndex < maxRowIndex) {
        nextRowIndex = rowIndex + 1;
      } else if (e.key === "ArrowUp" && rowIndex > 0) {
        nextRowIndex = rowIndex - 1;
      }
    }

    const nextColumnId = allColumns[nextColIndex];
    if (nextColumnId) {
      this.focusManager.focusCell(nextRowIndex, nextColumnId);
      this.callbacks.focusCell(nextRowIndex, nextColumnId);
      
      if (this.callbacks.onNavigate) {
        this.callbacks.onNavigate(nextRowIndex, nextColumnId);
      }
    }
  }

  /**
   * 콜백 업데이트
   */
  updateCallbacks(callbacks: Partial<KeyboardHandlerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

