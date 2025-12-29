/**
 * SelectionManager 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SelectionManager } from "../selection-manager";

describe("SelectionManager", () => {
  const columns = ["key", "context", "values.en", "values.ko"];
  let selectionManager: SelectionManager;
  let onSelectionChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelectionChange = vi.fn();
    selectionManager = new SelectionManager({
      columns,
      onSelectionChange,
    });
  });

  describe("selectCell", () => {
    it("단일 셀을 선택해야 함", () => {
      selectionManager.selectCell(0, "key");

      expect(selectionManager.getSelectionCount()).toBe(1);
      expect(selectionManager.isSelected(0, "key")).toBe(true);
      expect(onSelectionChange).toHaveBeenCalled();
    });

    it("새 셀 선택 시 기존 선택이 해제되어야 함", () => {
      selectionManager.selectCell(0, "key");
      selectionManager.selectCell(1, "context");

      expect(selectionManager.getSelectionCount()).toBe(1);
      expect(selectionManager.isSelected(0, "key")).toBe(false);
      expect(selectionManager.isSelected(1, "context")).toBe(true);
    });

    it("앵커와 포커스가 설정되어야 함", () => {
      selectionManager.selectCell(2, "values.en");

      expect(selectionManager.getAnchorCell()).toEqual({
        rowIndex: 2,
        columnId: "values.en",
      });
      expect(selectionManager.getFocusCell()).toEqual({
        rowIndex: 2,
        columnId: "values.en",
      });
    });
  });

  describe("toggleCell", () => {
    it("선택되지 않은 셀을 추가해야 함", () => {
      selectionManager.selectCell(0, "key");
      selectionManager.toggleCell(1, "context");

      expect(selectionManager.getSelectionCount()).toBe(2);
      expect(selectionManager.isSelected(0, "key")).toBe(true);
      expect(selectionManager.isSelected(1, "context")).toBe(true);
    });

    it("이미 선택된 셀을 제거해야 함", () => {
      selectionManager.selectCell(0, "key");
      selectionManager.toggleCell(1, "context");
      selectionManager.toggleCell(0, "key");

      expect(selectionManager.getSelectionCount()).toBe(1);
      expect(selectionManager.isSelected(0, "key")).toBe(false);
      expect(selectionManager.isSelected(1, "context")).toBe(true);
    });
  });

  describe("selectRange", () => {
    it("앵커가 없으면 단일 셀 선택으로 동작해야 함", () => {
      selectionManager.selectRange(2, "values.en");

      expect(selectionManager.getSelectionCount()).toBe(1);
      expect(selectionManager.isSelected(2, "values.en")).toBe(true);
    });

    it("앵커부터 현재 셀까지 범위를 선택해야 함", () => {
      selectionManager.selectCell(0, "key"); // 앵커 설정
      selectionManager.selectRange(2, "context");

      // 0~2행, key~context 컬럼 선택 (3행 x 2컬럼 = 6셀)
      expect(selectionManager.getSelectionCount()).toBe(6);
      expect(selectionManager.isSelected(0, "key")).toBe(true);
      expect(selectionManager.isSelected(0, "context")).toBe(true);
      expect(selectionManager.isSelected(1, "key")).toBe(true);
      expect(selectionManager.isSelected(1, "context")).toBe(true);
      expect(selectionManager.isSelected(2, "key")).toBe(true);
      expect(selectionManager.isSelected(2, "context")).toBe(true);
    });

    it("역방향 범위 선택도 동작해야 함", () => {
      selectionManager.selectCell(2, "context"); // 앵커 설정
      selectionManager.selectRange(0, "key");

      expect(selectionManager.getSelectionCount()).toBe(6);
      expect(selectionManager.isSelected(0, "key")).toBe(true);
      expect(selectionManager.isSelected(2, "context")).toBe(true);
    });
  });

  describe("extendSelection", () => {
    it("현재 앵커부터 새 위치까지 범위를 확장해야 함", () => {
      selectionManager.selectCell(1, "context"); // 앵커 설정
      selectionManager.extendSelection(3, "values.en");

      // 1~3행, context~values.en 컬럼 선택 (3행 x 2컬럼 = 6셀)
      expect(selectionManager.getSelectionCount()).toBe(6);
      expect(selectionManager.isSelected(1, "context")).toBe(true);
      expect(selectionManager.isSelected(1, "values.en")).toBe(true);
      expect(selectionManager.isSelected(2, "context")).toBe(true);
      expect(selectionManager.isSelected(2, "values.en")).toBe(true);
      expect(selectionManager.isSelected(3, "context")).toBe(true);
      expect(selectionManager.isSelected(3, "values.en")).toBe(true);
    });
  });

  describe("selectRow", () => {
    it("전체 행을 선택해야 함", () => {
      selectionManager.selectRow(1);

      expect(selectionManager.getSelectionCount()).toBe(columns.length);
      columns.forEach((col) => {
        expect(selectionManager.isSelected(1, col)).toBe(true);
      });
    });
  });

  describe("selectRowRange", () => {
    it("행 범위를 선택해야 함", () => {
      selectionManager.selectRowRange(1, 3);

      // 3행 x 4컬럼 = 12셀
      expect(selectionManager.getSelectionCount()).toBe(12);
      for (let r = 1; r <= 3; r++) {
        columns.forEach((col) => {
          expect(selectionManager.isSelected(r, col)).toBe(true);
        });
      }
    });
  });

  describe("selectColumn", () => {
    it("전체 컬럼을 선택해야 함", () => {
      selectionManager.selectColumn("values.en", 4);

      expect(selectionManager.getSelectionCount()).toBe(5); // 0~4행
      for (let r = 0; r <= 4; r++) {
        expect(selectionManager.isSelected(r, "values.en")).toBe(true);
      }
    });
  });

  describe("clearSelection / resetSelection", () => {
    it("clearSelection은 선택만 해제해야 함", () => {
      selectionManager.selectCell(0, "key");
      selectionManager.clearSelection();

      expect(selectionManager.getSelectionCount()).toBe(0);
      expect(selectionManager.getAnchorCell()).not.toBeNull(); // 앵커는 유지
    });

    it("resetSelection은 선택과 앵커 모두 해제해야 함", () => {
      selectionManager.selectCell(0, "key");
      selectionManager.resetSelection();

      expect(selectionManager.getSelectionCount()).toBe(0);
      expect(selectionManager.getAnchorCell()).toBeNull();
      expect(selectionManager.getFocusCell()).toBeNull();
    });
  });

  describe("getSelectionRange", () => {
    it("선택된 범위를 반환해야 함", () => {
      selectionManager.selectCell(1, "context");
      selectionManager.selectRange(3, "values.en");

      const range = selectionManager.getSelectionRange();
      expect(range).toEqual({
        startRow: 1,
        endRow: 3,
        startColumnId: "context",
        endColumnId: "values.en",
      });
    });

    it("선택이 없으면 null을 반환해야 함", () => {
      expect(selectionManager.getSelectionRange()).toBeNull();
    });
  });

  describe("getSelectionAsText", () => {
    it("선택된 셀을 TSV 형식으로 반환해야 함", () => {
      selectionManager.selectCell(0, "key");
      selectionManager.selectRange(1, "context");

      const getValue = (rowIndex: number, columnId: string) => {
        return `R${rowIndex}C${columnId}`;
      };

      const text = selectionManager.getSelectionAsText(getValue);
      const lines = text.split("\n");

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe("R0Ckey\tR0Ccontext");
      expect(lines[1]).toBe("R1Ckey\tR1Ccontext");
    });
  });

  describe("getSelectedCells", () => {
    it("선택된 셀 목록을 반환해야 함", () => {
      selectionManager.selectCell(0, "key");
      selectionManager.toggleCell(1, "context");

      const cells = selectionManager.getSelectedCells();
      expect(cells).toHaveLength(2);
      expect(cells).toContainEqual({ rowIndex: 0, columnId: "key" });
      expect(cells).toContainEqual({ rowIndex: 1, columnId: "context" });
    });
  });

  describe("setColumns", () => {
    it("컬럼 목록을 업데이트해야 함", () => {
      const newColumns = ["key", "values.en"];
      selectionManager.setColumns(newColumns);

      selectionManager.selectCell(0, "key");
      selectionManager.selectRange(0, "values.en");

      // 2컬럼만 선택됨 (context가 없으므로)
      expect(selectionManager.getSelectionCount()).toBe(2);
    });
  });
});
