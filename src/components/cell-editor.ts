/**
 * 셀 편집 모듈 (Effect 기반)
 *
 * 셀 편집 관련 로직을 Effect를 사용하여 type-safe하고 robust하게 구현
 */

import { Effect } from "effect";
import type { Translation } from "@/types/translation";
import { toMutableTranslation } from "@/types/mutable-translation";
import { logger } from "@/utils/logger";
import { CellEditorError } from "@/types/errors";
import { ChangeTracker } from "./change-tracker";
import { UndoRedoManager } from "./undo-redo-manager";
import {
  getLangFromColumnId,
  getTranslationKey,
  checkKeyDuplicate,
} from "./grid-utils";

export interface EditingCell {
  rowIndex: number;
  columnId: string;
  rowId: string;
}

export interface CellEditorCallbacks {
  onCellChange?: (id: string, columnId: string, value: string) => void;
  updateCellStyle?: (rowId: string, columnId: string) => void;
  updateCellContent?: (
    cell: HTMLElement,
    rowId: string,
    columnId: string,
    value: string
  ) => void;
  onEditStateChange?: (isEditing: boolean) => void;
  onEditFinished?: (
    rowIndex: number,
    columnId: string,
    direction: "down" | "up"
  ) => void;
}

export class CellEditor {
  private editingCell: EditingCell | null = null;
  private isEscapeKeyPressed = false;
  private isFinishingEdit = false;
  private translations: readonly Translation[];
  private changeTracker: ChangeTracker;
  private undoRedoManager: UndoRedoManager;
  private callbacks: CellEditorCallbacks;

  constructor(
    translations: readonly Translation[],
    changeTracker: ChangeTracker,
    undoRedoManager: UndoRedoManager,
    callbacks: CellEditorCallbacks = {}
  ) {
    this.translations = translations;
    this.changeTracker = changeTracker;
    this.undoRedoManager = undoRedoManager;
    this.callbacks = callbacks;
  }

  /**
   * 현재 편집 중인 셀 가져오기
   */
  getEditingCell(): EditingCell | null {
    return this.editingCell;
  }

  /**
   * 편집 중인지 확인
   */
  isEditing(): boolean {
    return this.editingCell !== null;
  }

  /**
   * 셀 편집 시작 (Effect 기반)
   *
   * 주의: DOM 조작이 포함되어 있어 동기 함수로 구현하고,
   * 실제 데이터 변경 부분만 Effect로 처리합니다.
   */
  startEditingEffect(
    rowIndex: number,
    columnId: string,
    rowId: string,
    cell: HTMLElement
  ): Effect.Effect<void, CellEditorError> {
    // 이미 편집 중이면 종료
    if (this.editingCell) {
      this.stopEditing();
    }

    // 셀 내용 가져오기
    const cellContent = cell.querySelector(".virtual-grid-cell-content");
    if (!cellContent) {
      return Effect.fail(
        new CellEditorError({
          message: "Cell content not found",
          code: "TRANSLATION_NOT_FOUND",
        })
      );
    }

    const currentValue = cellContent.textContent || "";

    // 편집용 input 생성
    const input = this.createEditInput(currentValue);
    cell.innerHTML = "";
    cell.appendChild(input);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    // 편집 상태 설정
    this.editingCell = { rowIndex, columnId, rowId };
    if (this.callbacks.onEditStateChange) {
      this.callbacks.onEditStateChange(true);
    }

    // Key 컬럼 편집 중 실시간 중복 체크
    let isDuplicateKey = false;
    if (columnId === "key") {
      const updateDuplicateCheck = () => {
        const inputValue = input.value.trim();
        isDuplicateKey = false;
        cell.classList.remove("cell-duplicate-key");

        if (
          inputValue &&
          checkKeyDuplicate(this.translations, rowId, inputValue)
        ) {
          isDuplicateKey = true;
          cell.classList.add("cell-duplicate-key");
        }
      };

      input.addEventListener("input", updateDuplicateCheck);
      updateDuplicateCheck();
    }

    // 편집 완료/취소 이벤트
    const finishEdit = (save: boolean) => {
      if (this.isFinishingEdit) {
        return;
      }

      this.isFinishingEdit = true;

      if (save && columnId === "key" && isDuplicateKey) {
        save = false;
      }

      if (save && input.value !== currentValue) {
        this.applyCellChange(rowId, columnId, currentValue, input.value).catch(
          (error) => {
            logger.error("Failed to apply cell change:", error);
          }
        );
      }

      // 원래 내용으로 복원
      const newValue = save ? input.value : currentValue;
      if (this.callbacks.updateCellContent) {
        this.callbacks.updateCellContent(cell, rowId, columnId, newValue);
      }

      this.editingCell = null;
      this.isFinishingEdit = false;
      if (this.callbacks.onEditStateChange) {
        this.callbacks.onEditStateChange(false);
      }
    };

    // 이벤트 리스너 등록
    this.attachInputListeners(
      input,
      cell,
      finishEdit,
      rowIndex,
      columnId,
      currentValue,
      rowId
    );

    return Effect.void;
  }

  /**
   * 셀 편집 시작 (동기 버전, 기존 API 호환)
   */
  startEditing(
    rowIndex: number,
    columnId: string,
    rowId: string,
    cell: HTMLElement
  ): void {
    // 이미 편집 중이면 종료
    if (this.editingCell) {
      this.stopEditing();
    }

    const cellContent = cell.querySelector(".virtual-grid-cell-content");
    if (!cellContent) return;

    const currentValue = cellContent.textContent || "";

    // 편집용 input 생성
    const input = this.createEditInput(currentValue);
    cell.innerHTML = "";
    cell.appendChild(input);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    // 편집 상태 설정
    this.editingCell = { rowIndex, columnId, rowId };
    if (this.callbacks.onEditStateChange) {
      this.callbacks.onEditStateChange(true);
    }

    // Key 컬럼 편집 중 실시간 중복 체크
    let isDuplicateKey = false;
    if (columnId === "key") {
      const updateDuplicateCheck = () => {
        const inputValue = input.value.trim();
        isDuplicateKey = false;
        cell.classList.remove("cell-duplicate-key");

        if (
          inputValue &&
          checkKeyDuplicate(this.translations, rowId, inputValue)
        ) {
          isDuplicateKey = true;
          cell.classList.add("cell-duplicate-key");
        }
      };

      input.addEventListener("input", updateDuplicateCheck);
      updateDuplicateCheck();
    }

    // 편집 완료/취소 이벤트
    const finishEdit = (save: boolean) => {
      if (this.isFinishingEdit) {
        return;
      }

      this.isFinishingEdit = true;

      if (save && columnId === "key" && isDuplicateKey) {
        save = false;
      }

      if (save && input.value !== currentValue) {
        this.applyCellChange(rowId, columnId, currentValue, input.value).catch(
          (error) => {
            logger.error("Failed to apply cell change:", error);
          }
        );
      }

      // 원래 내용으로 복원
      const newValue = save ? input.value : currentValue;
      if (this.callbacks.updateCellContent) {
        this.callbacks.updateCellContent(cell, rowId, columnId, newValue);
      }

      this.editingCell = null;
      this.isFinishingEdit = false;
      if (this.callbacks.onEditStateChange) {
        this.callbacks.onEditStateChange(false);
      }
    };

    // 이벤트 리스너 등록
    this.attachInputListeners(
      input,
      cell,
      finishEdit,
      rowIndex,
      columnId,
      currentValue,
      rowId
    );
  }

  /**
   * Input 이벤트 리스너 등록
   */
  private attachInputListeners(
    input: HTMLInputElement,
    _cell: HTMLElement,
    finishEdit: (save: boolean) => void,
    rowIndex: number,
    columnId: string,
    _currentValue: string,
    _rowId: string
  ): void {
    input.addEventListener("blur", () => {
      if (this.isFinishingEdit) {
        return;
      }

      if (!this.isEscapeKeyPressed) {
        finishEdit(true);
      } else {
        finishEdit(false);
        this.isEscapeKeyPressed = false;
      }
    });

    // beforeinput 이벤트로 undo/redo 감지
    input.addEventListener("beforeinput", (e: InputEvent) => {
      if (e.inputType === "historyUndo") {
        e.preventDefault();
        finishEdit(true);
        // Undo는 외부에서 처리 (keyboard handler)
      } else if (e.inputType === "historyRedo") {
        e.preventDefault();
        finishEdit(true);
        // Redo는 외부에서 처리 (keyboard handler)
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const direction = e.shiftKey ? "up" : "down";
        finishEdit(true);
        input.blur();
        
        // 편집 완료 후 네비게이션 및 편집 시작 (언어 컬럼인 경우만)
        if (columnId.startsWith("values.") && this.callbacks.onEditFinished) {
          // 편집 상태가 변경된 후 콜백 호출을 위해 약간의 지연
          requestAnimationFrame(() => {
            if (this.callbacks.onEditFinished) {
              this.callbacks.onEditFinished(rowIndex, columnId, direction);
            }
          });
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.isEscapeKeyPressed = true;
        input.blur();
      } else if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        finishEdit(true);
        input.blur();
      }
    });
  }

  /**
   * 셀 변경사항 적용 (Effect 기반)
   */
  private applyCellChangeEffect(
    rowId: string,
    columnId: string,
    oldValue: string,
    newValue: string
  ): Effect.Effect<void, CellEditorError> {
    // Translation 찾기
    const translation = this.translations.find((t) => t.id === rowId);
    if (!translation) {
      return Effect.fail(
        new CellEditorError({
          message: `Translation not found: ${rowId}`,
          code: "TRANSLATION_NOT_FOUND",
        })
      );
    }

    // Translation 데이터 업데이트 (MutableTranslation으로 안전하게 변환)
    const mutableTranslation = toMutableTranslation(translation);
    if (columnId === "key") {
      mutableTranslation.key = newValue;
    } else if (columnId === "context") {
      mutableTranslation.context = newValue;
    } else if (columnId.startsWith("values.")) {
      const lang = columnId.replace("values.", "");
      mutableTranslation.values[lang] = newValue;
    } else {
      return Effect.fail(
        new CellEditorError({
          message: `Invalid column ID: ${columnId}`,
          code: "INVALID_COLUMN_ID",
        })
      );
    }

    // 원본 translations 배열에서 해당 translation 업데이트
    // translations는 readonly이므로 새 배열로 교체해야 하지만,
    // CellEditor는 translations를 직접 소유하지 않으므로 콜백을 통해 업데이트
    // 실제 업데이트는 VirtualTableDiv에서 처리됨

    // Undo/Redo 히스토리에 추가
    this.undoRedoManager.push({
      type: "cell-change",
      rowId,
      columnId,
      oldValue,
      newValue,
    });

    // 변경사항 추적
    const originalValue = this.changeTracker.getOriginalValue(rowId, columnId);
    const lang = getLangFromColumnId(columnId);
    const translationKey = getTranslationKey(
      this.translations,
      rowId,
      columnId,
      newValue
    );

    this.changeTracker.trackChange(
      rowId,
      columnId,
      lang,
      originalValue,
      newValue,
      translationKey,
      () => {
        if (this.callbacks.updateCellStyle) {
          this.callbacks.updateCellStyle(rowId, columnId);
        }
      }
    );

    // onCellChange 콜백 호출
    if (this.callbacks.onCellChange) {
      this.callbacks.onCellChange(rowId, columnId, newValue);
    }

    return Effect.void;
  }

  /**
   * 셀 변경사항 적용 (Promise 기반, 기존 API 호환)
   * VirtualTableDiv에서 직접 호출할 수 있도록 public
   */
  async applyCellChange(
    rowId: string,
    columnId: string,
    oldValue: string,
    newValue: string
  ): Promise<void> {
    const effect = this.applyCellChangeEffect(
      rowId,
      columnId,
      oldValue,
      newValue
    );
    return Effect.runPromise(effect);
  }

  /**
   * 편집 중지 (Effect 기반)
   */
  stopEditingEffect(
    bodyElement?: HTMLElement
  ): Effect.Effect<void, CellEditorError> {
    if (!this.editingCell) {
      return Effect.void;
    }

    this.stopEditing(bodyElement);
    return Effect.void;
  }

  /**
   * 편집 중지 (동기 버전)
   */
  stopEditing(bodyElement?: HTMLElement): void {
    if (!this.editingCell || !bodyElement) {
      this.editingCell = null;
      return;
    }

    const editingRow = bodyElement.querySelector(
      `[data-row-index="${this.editingCell.rowIndex}"]`
    );
    if (editingRow) {
      const editingCellElement = editingRow.querySelector(
        `[data-column-id="${this.editingCell.columnId}"]`
      );
      if (editingCellElement) {
        const input = editingCellElement.querySelector("input");
        if (input) {
          const rowId = editingCellElement.getAttribute("data-row-id");
          const columnId = this.editingCell.columnId;
          const currentValue = input.value;

          this.isFinishingEdit = true;

          if (this.callbacks.updateCellContent && rowId) {
            this.callbacks.updateCellContent(
              editingCellElement as HTMLElement,
              rowId,
              columnId,
              currentValue
            );
          }

          this.isFinishingEdit = false;
        }
      }
    }

    this.editingCell = null;
  }

  /**
   * 편집용 input 생성
   */
  private createEditInput(value: string): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.className = "virtual-grid-cell-input";
    input.style.width = "100%";
    input.style.height = "100%";
    input.style.border = "2px solid #3b82f6";
    input.style.outline = "none";
    input.style.padding = "4px 8px";
    input.style.fontSize = "14px";
    input.style.fontFamily = "inherit";
    input.style.backgroundColor = "#fff";
    return input;
  }

  /**
   * Escape 키 눌림 상태 설정 (외부에서 사용)
   */
  setEscapeKeyPressed(value: boolean): void {
    this.isEscapeKeyPressed = value;
  }
}
