/**
 * GridRenderer 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GridRenderer } from "../grid-renderer";
import type { Translation } from "@/types/translation";

describe("GridRenderer", () => {
  let renderer: GridRenderer;
  let callbacks: {
    onCellDblClick?: (rowIndex: number, columnId: string, cell: HTMLElement) => void;
    onCellFocus?: (rowIndex: number, columnId: string) => void;
    updateCellStyle?: (rowId: string, columnId: string, cell?: HTMLElement) => void;
  };

  beforeEach(() => {
    callbacks = {
      onCellDblClick: vi.fn(),
      onCellFocus: vi.fn(),
      updateCellStyle: vi.fn(),
    };

    renderer = new GridRenderer({
      languages: ["en", "ko"],
      readOnly: false,
      editableColumns: new Set(["key", "context", "values.en", "values.ko"]),
      callbacks,
    });
  });

  describe("createHeaderCell", () => {
    it("should create header cell with correct attributes", () => {
      const header = renderer.createHeaderCell("Key", 200, 0, 10, "key");

      expect(header.className).toBe("virtual-grid-header-cell");
      expect(header.getAttribute("role")).toBe("columnheader");
      expect(header.textContent).toBe("Key");
      expect(header.getAttribute("data-column-id")).toBe("key");
      expect(header.style.width).toBe("200px");
    });

    it("should apply sticky positioning when left or zIndex > 0", () => {
      const header = renderer.createHeaderCell("Key", 200, 100, 10, "key");

      expect(header.style.position).toBe("sticky");
      expect(header.style.left).toBe("100px");
      expect(header.style.zIndex).toBe("10");
    });

    it("should not apply sticky positioning when left and zIndex are 0", () => {
      const header = renderer.createHeaderCell("EN", 150, 0, 0, "values.en");

      expect(header.style.position).not.toBe("sticky");
    });
  });

  describe("createRow", () => {
    const mockTranslation: Translation = {
      id: "1",
      key: "common.submit",
      context: "Submit button",
      values: {
        en: "Submit",
        ko: "제출",
      },
    };

    it("should create row with correct structure", () => {
      const row = renderer.createRow(mockTranslation, 0, {
        rowNumber: 50,
        key: 200,
        context: 200,
        languages: [150, 150],
      });

      expect(row.className).toBe("virtual-grid-row");
      expect(row.getAttribute("role")).toBe("row");
      expect(row.getAttribute("data-row-index")).toBe("0");
      expect(row.getAttribute("data-row-id")).toBe("1");
    });

    it("should create all cells for a row", () => {
      const row = renderer.createRow(mockTranslation, 0, {
        rowNumber: 50,
        key: 200,
        context: 200,
        languages: [150, 150],
      });

      const cells = row.querySelectorAll(".virtual-grid-cell");
      expect(cells.length).toBe(5); // row-number, key, context, en, ko
    });

    it("should set correct cell values", () => {
      const row = renderer.createRow(mockTranslation, 0, {
        rowNumber: 50,
        key: 200,
        context: 200,
        languages: [150, 150],
      });

      const rowNumberCell = row.querySelector('[data-column-id="row-number"]');
      const keyCell = row.querySelector('[data-column-id="key"]');
      const contextCell = row.querySelector('[data-column-id="context"]');
      const enCell = row.querySelector('[data-column-id="values.en"]');
      const koCell = row.querySelector('[data-column-id="values.ko"]');

      expect(rowNumberCell?.textContent).toBe("1"); // rowIndex + 1
      expect(keyCell?.textContent).toBe("common.submit");
      expect(contextCell?.textContent).toBe("Submit button");
      expect(enCell?.textContent).toBe("Submit");
      expect(koCell?.textContent).toBe("제출");
    });

    it("should call updateCellStyle for each cell", () => {
      renderer.createRow(mockTranslation, 0, {
        rowNumber: 50,
        key: 200,
        context: 200,
        languages: [150, 150],
      });

      expect(callbacks.updateCellStyle).toHaveBeenCalledTimes(5); // row-number, key, context, en, ko
    });
  });

  describe("createCell", () => {
    it("should create cell with correct attributes", () => {
      const cell = renderer.createCell(
        "1",
        "key",
        "common.submit",
        0,
        true,
        200,
        0,
        10
      );

      expect(cell.className).toBe("virtual-grid-cell");
      expect(cell.getAttribute("role")).toBe("gridcell");
      expect(cell.getAttribute("data-row-id")).toBe("1");
      expect(cell.getAttribute("data-column-id")).toBe("key");
      expect(cell.getAttribute("data-row-index")).toBe("0");
      expect(cell.getAttribute("tabindex")).toBe("0");
    });

    it("should set tabindex to -1 for non-editable cells", () => {
      const cell = renderer.createCell(
        "1",
        "key",
        "common.submit",
        0,
        false,
        200,
        0,
        10
      );

      expect(cell.getAttribute("tabindex")).toBe("-1");
    });

    it("should apply sticky positioning when needed", () => {
      const cell = renderer.createCell(
        "1",
        "key",
        "common.submit",
        0,
        true,
        200,
        100,
        10
      );

      expect(cell.style.position).toBe("sticky");
      expect(cell.style.left).toBe("100px");
      expect(cell.style.zIndex).toBe("10");
    });

    it("should trigger dblclick callback on double click", () => {
      const cell = renderer.createCell(
        "1",
        "key",
        "common.submit",
        0,
        true,
        200,
        0,
        0
      );

      const dblclickEvent = new MouseEvent("dblclick", { bubbles: true });
      cell.dispatchEvent(dblclickEvent);

      expect(callbacks.onCellDblClick).toHaveBeenCalledWith(0, "key", cell);
    });

    it("should trigger focus callback on focus", () => {
      const cell = renderer.createCell(
        "1",
        "key",
        "common.submit",
        0,
        true,
        200,
        0,
        0
      );

      cell.focus();
      const focusEvent = new FocusEvent("focus", { bubbles: true });
      cell.dispatchEvent(focusEvent);

      expect(callbacks.onCellFocus).toHaveBeenCalledWith(0, "key");
    });

    it("should not add event listeners in read-only mode", () => {
      const readOnlyRenderer = new GridRenderer({
        languages: ["en"],
        readOnly: true,
        editableColumns: new Set(["key", "values.en"]),
        callbacks,
      });

      // 읽기 전용 모드에서는 모든 셀 편집 불가
      const keyCell = readOnlyRenderer.createCell(
        "1",
        "key",
        "common.submit",
        0,
        false, // editable = false (readOnly 모드에서 모든 셀은 편집 불가)
        200,
        0,
        0
      );

      const dblclickEvent = new MouseEvent("dblclick", { bubbles: true });
      keyCell.dispatchEvent(dblclickEvent);

      expect(callbacks.onCellDblClick).not.toHaveBeenCalled();
    });
  });

  describe("updateCellContent", () => {
    it("should update cell content", () => {
      const cell = document.createElement("div");
      cell.setAttribute("data-row-index", "0");
      cell.setAttribute("data-column-id", "key");

      renderer.updateCellContent(cell, "1", "key", "new.value", 0);

      const content = cell.querySelector(".virtual-grid-cell-content");
      expect(content?.textContent).toBe("new.value");
    });

    it("should call updateCellStyle after updating content", () => {
      const cell = document.createElement("div");
      cell.setAttribute("data-row-index", "0");
      cell.setAttribute("data-column-id", "key");

      renderer.updateCellContent(cell, "1", "key", "new.value", 0);

      expect(callbacks.updateCellStyle).toHaveBeenCalledWith("1", "key", cell);
    });

    it("should re-add dblclick listener for editable cells", () => {
      const cell = document.createElement("div");
      cell.setAttribute("data-row-index", "0");
      cell.setAttribute("data-column-id", "key");

      renderer.updateCellContent(cell, "1", "key", "new.value", 0);

      const dblclickEvent = new MouseEvent("dblclick", { bubbles: true });
      cell.dispatchEvent(dblclickEvent);

      expect(callbacks.onCellDblClick).toHaveBeenCalled();
    });
  });
});

