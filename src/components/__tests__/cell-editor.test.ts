/**
 * CellEditor 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CellEditor } from "../cell-editor";
import { ChangeTracker } from "../change-tracker";
import { UndoRedoManager } from "../undo-redo-manager";
import type { Translation } from "@/types/translation";

describe("CellEditor", () => {
  let cellEditor: CellEditor;
  let changeTracker: ChangeTracker;
  let undoRedoManager: UndoRedoManager;
  let translations: readonly Translation[];

  beforeEach(() => {
    changeTracker = new ChangeTracker();
    undoRedoManager = new UndoRedoManager();
    translations = [
      {
        id: "1",
        key: "common.submit",
        values: { en: "Submit", ko: "제출" },
      },
      {
        id: "2",
        key: "common.cancel",
        values: { en: "Cancel", ko: "취소" },
      },
    ] as const;

    changeTracker.initializeOriginalData(translations, ["en", "ko"]);

    cellEditor = new CellEditor(translations, changeTracker, undoRedoManager, {
      onCellChange: vi.fn(),
      updateCellStyle: vi.fn(),
      updateCellContent: vi.fn(),
    });
  });

  it("should initialize with no editing cell", () => {
    expect(cellEditor.isEditing()).toBe(false);
    expect(cellEditor.getEditingCell()).toBe(null);
  });

  it("should start editing a cell", () => {
    const cell = document.createElement("div");
    const cellContent = document.createElement("div");
    cellContent.className = "virtual-grid-cell-content";
    cellContent.textContent = "Original Value";
    cell.appendChild(cellContent);

    cellEditor.startEditing(0, "values.en", "1", cell);

    expect(cellEditor.isEditing()).toBe(true);
    const editingCell = cellEditor.getEditingCell();
    expect(editingCell).not.toBe(null);
    expect(editingCell?.rowIndex).toBe(0);
    expect(editingCell?.columnId).toBe("values.en");
    expect(editingCell?.rowId).toBe("1");
  });

  it("should stop editing", () => {
    const cell = document.createElement("div");
    const cellContent = document.createElement("div");
    cellContent.className = "virtual-grid-cell-content";
    cellContent.textContent = "Value";
    cell.appendChild(cellContent);

    cellEditor.startEditing(0, "values.en", "1", cell);
    expect(cellEditor.isEditing()).toBe(true);

    cellEditor.stopEditing();
    expect(cellEditor.isEditing()).toBe(false);
  });

  it("should handle duplicate key detection for key column", () => {
    const cell = document.createElement("div");
    const cellContent = document.createElement("div");
    cellContent.className = "virtual-grid-cell-content";
    cellContent.textContent = "common.submit";
    cell.appendChild(cellContent);

    cellEditor.startEditing(0, "key", "1", cell);

    expect(cellEditor.isEditing()).toBe(true);

    // Get the input element
    const input = cell.querySelector("input") as HTMLInputElement;
    expect(input).not.toBe(null);

    // Simulate typing duplicate key
    input.value = "common.cancel";
    input.dispatchEvent(new Event("input"));

    // Check if duplicate class is added
    expect(cell.classList.contains("cell-duplicate-key")).toBe(true);
  });
});

