/**
 * VirtualTableDiv 행 관리 기능 단위 테스트
 *
 * 새 행 추가, 삭제, 추적 관련 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VirtualTableDiv } from "../virtual-table-div";
import type { Translation } from "@/types/translation";

describe("VirtualTableDiv Row Management", () => {
  let container: HTMLElement;
  let virtualTable: VirtualTableDiv;
  let mockTranslations: Translation[];

  beforeEach(() => {
    // DOM 컨테이너 생성
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);

    // 테스트용 translations 데이터
    mockTranslations = [
      {
        id: "trans-1",
        key: "common.hello",
        values: { en: "Hello", ko: "안녕하세요" },
        context: "Greeting message",
      },
      {
        id: "trans-2",
        key: "common.goodbye",
        values: { en: "Goodbye", ko: "안녕히 가세요" },
        context: "Farewell message",
      },
      {
        id: "trans-3",
        key: "common.yes",
        values: { en: "Yes", ko: "예" },
        context: "Affirmation",
      },
    ];

    virtualTable = new VirtualTableDiv({
      container,
      translations: mockTranslations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: false,
    });

    virtualTable.render();
  });

  afterEach(() => {
    virtualTable.destroy();
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  describe("addRow", () => {
    it("새 행을 맨 아래에 추가해야 함", () => {
      const initialNewRows = virtualTable.getNewRows();
      expect(initialNewRows.length).toBe(0);

      virtualTable.addRow();

      const newRows = virtualTable.getNewRows();
      expect(newRows.length).toBe(1);
      expect(newRows[0].isNew).toBe(true);
      expect(newRows[0].key).toBe(""); // NewTranslation은 빈 key를 가짐
      expect(newRows[0].values.en).toBe("");
      expect(newRows[0].values.ko).toBe("");
    });

    it("여러 행을 추가할 수 있어야 함", () => {
      virtualTable.addRow();
      virtualTable.addRow();
      virtualTable.addRow();

      const newRows = virtualTable.getNewRows();
      expect(newRows.length).toBe(3);

      // 각 행이 고유한 tempId를 가져야 함
      const tempIds = new Set(newRows.map((r) => r.tempId));
      expect(tempIds.size).toBe(3);
    });

    it("읽기 전용 모드에서는 행을 추가할 수 없어야 함", () => {
      virtualTable.setReadOnly(true);

      virtualTable.addRow();

      const newRows = virtualTable.getNewRows();
      expect(newRows.length).toBe(0);
    });
  });

  describe("addRowAbove", () => {
    it("현재 선택된 행 위에 새 행을 추가해야 함", () => {
      // 셀에 포커스 (addRowAbove는 포커스된 셀의 위치를 사용)
      // FocusManager에 직접 접근할 수 없으므로 addRowAbove 호출 시
      // 포커스가 없으면 인덱스 0에 추가됨

      virtualTable.addRowAbove();

      const newRows = virtualTable.getNewRows();
      expect(newRows.length).toBe(1);
    });
  });

  describe("addRowBelow", () => {
    it("현재 선택된 행 아래에 새 행을 추가해야 함", () => {
      virtualTable.addRowBelow();

      const newRows = virtualTable.getNewRows();
      expect(newRows.length).toBe(1);
    });
  });

  describe("deleteRow", () => {
    it("새로 추가된 행을 삭제하면 newRows에서 제거되어야 함", () => {
      virtualTable.addRow();
      const newRows = virtualTable.getNewRows();
      expect(newRows.length).toBe(1);

      const tempId = newRows[0].tempId;
      virtualTable.deleteRow(tempId);

      expect(virtualTable.getNewRows().length).toBe(0);
      expect(virtualTable.getDeletedRows().length).toBe(0); // 새 행은 deletedRows에 추가되지 않음
    });

    it("기존 행을 삭제하면 deletedRows에 추가되어야 함", () => {
      const existingRowId = "trans-1";

      virtualTable.deleteRow(existingRowId);

      const deletedRows = virtualTable.getDeletedRows();
      expect(deletedRows.length).toBe(1);
      expect(deletedRows[0].id).toBe(existingRowId);
      expect(deletedRows[0].deleted).toBe(true);
    });

    it("읽기 전용 모드에서는 행을 삭제할 수 없어야 함", () => {
      virtualTable.setReadOnly(true);

      virtualTable.deleteRow("trans-1");

      expect(virtualTable.getDeletedRows().length).toBe(0);
    });
  });

  describe("isNewRow", () => {
    it("새로 추가된 행은 true를 반환해야 함", () => {
      virtualTable.addRow();
      const newRows = virtualTable.getNewRows();
      const tempId = newRows[0].tempId;

      expect(virtualTable.isNewRow(tempId)).toBe(true);
    });

    it("기존 행은 false를 반환해야 함", () => {
      expect(virtualTable.isNewRow("trans-1")).toBe(false);
      expect(virtualTable.isNewRow("trans-2")).toBe(false);
    });
  });

  describe("clearRowTracking", () => {
    it("새 행과 삭제된 행 추적을 초기화해야 함", () => {
      virtualTable.addRow();
      virtualTable.addRow();
      virtualTable.deleteRow("trans-1");

      expect(virtualTable.getNewRows().length).toBe(2);
      expect(virtualTable.getDeletedRows().length).toBe(1);

      virtualTable.clearRowTracking();

      expect(virtualTable.getNewRows().length).toBe(0);
      expect(virtualTable.getDeletedRows().length).toBe(0);
    });
  });

  describe("clearAllChanges", () => {
    it("모든 변경사항(변경, 새 행, 삭제된 행)을 초기화해야 함", () => {
      virtualTable.addRow();
      virtualTable.deleteRow("trans-2");

      virtualTable.clearAllChanges();

      expect(virtualTable.getNewRows().length).toBe(0);
      expect(virtualTable.getDeletedRows().length).toBe(0);
      expect(virtualTable.getChanges().length).toBe(0);
    });
  });

  describe("getNewRows", () => {
    it("빈 배열을 반환해야 함 (새 행이 없을 때)", () => {
      const newRows = virtualTable.getNewRows();
      expect(newRows).toEqual([]);
    });

    it("새 행 목록을 반환해야 함", () => {
      virtualTable.addRow();
      virtualTable.addRow();

      const newRows = virtualTable.getNewRows();
      expect(newRows.length).toBe(2);
      expect(newRows.every((r) => r.isNew === true)).toBe(true);
    });
  });

  describe("getDeletedRows", () => {
    it("빈 배열을 반환해야 함 (삭제된 행이 없을 때)", () => {
      const deletedRows = virtualTable.getDeletedRows();
      expect(deletedRows).toEqual([]);
    });

    it("삭제된 행 목록을 반환해야 함", () => {
      virtualTable.deleteRow("trans-1");
      virtualTable.deleteRow("trans-2");

      const deletedRows = virtualTable.getDeletedRows();
      expect(deletedRows.length).toBe(2);
      expect(deletedRows.every((r) => r.deleted === true)).toBe(true);
    });
  });
});

describe("VirtualTableDiv Row Management - Edge Cases", () => {
  let container: HTMLElement;
  let virtualTable: VirtualTableDiv;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (virtualTable) {
      virtualTable.destroy();
    }
    document.body.removeChild(container);
  });

  it("빈 translations 배열에서 행 추가가 작동해야 함", () => {
    virtualTable = new VirtualTableDiv({
      container,
      translations: [],
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: false,
    });
    virtualTable.render();

    virtualTable.addRow();

    const newRows = virtualTable.getNewRows();
    expect(newRows.length).toBe(1);
  });

  it("존재하지 않는 행 ID로 삭제 시도해도 에러가 발생하지 않아야 함", () => {
    virtualTable = new VirtualTableDiv({
      container,
      translations: [{ id: "trans-1", key: "test", values: { en: "Test" } }],
      languages: ["en"],
      defaultLanguage: "en",
      readOnly: false,
    });
    virtualTable.render();

    // 존재하지 않는 ID로 삭제 시도
    expect(() => {
      virtualTable.deleteRow("non-existent-id");
    }).not.toThrow();
  });

  it("새 행 추가 후 다시 삭제하면 데이터가 일관되어야 함", () => {
    virtualTable = new VirtualTableDiv({
      container,
      translations: [{ id: "trans-1", key: "test", values: { en: "Test" } }],
      languages: ["en"],
      defaultLanguage: "en",
      readOnly: false,
    });
    virtualTable.render();

    // 새 행 추가
    virtualTable.addRow();
    const newRows = virtualTable.getNewRows();
    const tempId = newRows[0].tempId;

    // 삭제
    virtualTable.deleteRow(tempId);

    // 새 행도 삭제된 행도 없어야 함
    expect(virtualTable.getNewRows().length).toBe(0);
    expect(virtualTable.getDeletedRows().length).toBe(0);
  });
});
