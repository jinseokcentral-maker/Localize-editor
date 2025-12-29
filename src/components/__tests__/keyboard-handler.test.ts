/**
 * KeyboardHandler 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeyboardHandler } from "../keyboard-handler";
import { ModifierKeyTracker } from "../modifier-key-tracker";
import { FocusManager } from "../focus-manager";

describe("KeyboardHandler", () => {
  let keyboardHandler: KeyboardHandler;
  let modifierKeyTracker: ModifierKeyTracker;
  let focusManager: FocusManager;
  let mockCallbacks: {
    onUndo?: () => void;
    onRedo?: () => void;
    onNavigate?: (rowIndex: number, columnId: string) => void;
    onStartEditing?: (rowIndex: number, columnId: string) => void;
    getAllColumns?: () => string[];
    getMaxRowIndex?: () => number;
    focusCell?: (rowIndex: number, columnId: string) => void;
    onOpenCommandPalette?: (mode: string) => void;
    isEditableColumn?: (columnId: string) => boolean;
    isReadOnly?: () => boolean;
  };

  beforeEach(() => {
    modifierKeyTracker = new ModifierKeyTracker();
    focusManager = new FocusManager();
    mockCallbacks = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onNavigate: vi.fn(),
      onStartEditing: vi.fn(),
      getAllColumns: vi.fn(() => ["key", "context", "values.en", "values.ko"]),
      getMaxRowIndex: vi.fn(() => 10),
      focusCell: vi.fn(),
      onOpenCommandPalette: vi.fn(),
      isEditableColumn: vi.fn((columnId: string) => columnId !== "row-number"),
      isReadOnly: vi.fn(() => false),
    };

    keyboardHandler = new KeyboardHandler(
      modifierKeyTracker,
      focusManager,
      mockCallbacks,
    );
    modifierKeyTracker.attach();
    keyboardHandler.attach();
  });

  afterEach(() => {
    keyboardHandler.detach();
    modifierKeyTracker.detach();
    focusManager.blur();
    vi.clearAllMocks();
  });

  describe("attach/detach", () => {
    it("attach 중복 호출 시 리스너가 중복 등록되지 않아야 함", () => {
      // 이미 beforeEach에서 attach 호출됨
      keyboardHandler.attach(); // 두 번째 호출
      keyboardHandler.attach(); // 세 번째 호출

      focusManager.focusCell(0, "key");

      const f2Event = new KeyboardEvent("keydown", {
        key: "F2",
        code: "F2",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(f2Event);

      // 콜백이 한 번만 호출되어야 함
      expect(mockCallbacks.onStartEditing).toHaveBeenCalledTimes(1);
    });

    it("detach 후 키보드 이벤트가 처리되지 않아야 함", () => {
      keyboardHandler.detach();

      focusManager.focusCell(0, "key");

      const f2Event = new KeyboardEvent("keydown", {
        key: "F2",
        code: "F2",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(f2Event);

      expect(mockCallbacks.onStartEditing).not.toHaveBeenCalled();
    });
  });

  describe("Undo/Redo", () => {
    it("Cmd+Z (Mac) / Ctrl+Z (Windows)로 Undo가 호출되어야 함", () => {
      const undoEvent = new KeyboardEvent("keydown", {
        key: "z",
        code: "KeyZ",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(undoEvent);

      expect(mockCallbacks.onUndo).toHaveBeenCalled();
    });

    it("Cmd+Y (Mac) / Ctrl+Y (Windows)로 Redo가 호출되어야 함", () => {
      const redoEvent = new KeyboardEvent("keydown", {
        key: "y",
        code: "KeyY",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(redoEvent);

      expect(mockCallbacks.onRedo).toHaveBeenCalled();
    });

    it("Cmd+Shift+Z로 Redo가 호출되어야 함", () => {
      const redoEvent = new KeyboardEvent("keydown", {
        key: "z",
        code: "KeyZ",
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(redoEvent);

      expect(mockCallbacks.onRedo).toHaveBeenCalled();
    });
  });

  describe("Command Palette", () => {
    it("Cmd+K로 커맨드 팔레트가 열려야 함", () => {
      const cmdKEvent = new KeyboardEvent("keydown", {
        key: "k",
        code: "KeyK",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(cmdKEvent);

      expect(mockCallbacks.onOpenCommandPalette).toHaveBeenCalledWith("excel");
    });
  });

  describe("Arrow 키 네비게이션", () => {
    beforeEach(() => {
      focusManager.focusCell(5, "values.en");
    });

    it("ArrowRight로 오른쪽 셀로 이동", () => {
      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(5, "values.ko");
    });

    it("ArrowLeft로 왼쪽 셀로 이동", () => {
      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(5, "context");
    });

    it("ArrowDown으로 아래 셀로 이동", () => {
      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(6, "values.en");
    });

    it("ArrowUp으로 위 셀로 이동", () => {
      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(4, "values.en");
    });

    it("첫 번째 행에서 ArrowUp은 이동하지 않음", () => {
      focusManager.focusCell(0, "values.en");

      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      // 첫 번째 행이므로 위로 이동 불가, 하지만 focusCell은 호출됨 (같은 위치)
      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(0, "values.en");
    });

    it("첫 번째 컬럼에서 ArrowLeft는 이동하지 않음", () => {
      focusManager.focusCell(5, "key");

      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(5, "key");
    });

    it("마지막 행에서 ArrowDown은 이동하지 않음", () => {
      focusManager.focusCell(10, "values.en");

      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(10, "values.en");
    });

    it("마지막 컬럼에서 ArrowRight는 이동하지 않음", () => {
      focusManager.focusCell(5, "values.ko");

      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(5, "values.ko");
    });
  });

  describe("Tab 네비게이션", () => {
    it("Tab으로 다음 컬럼으로 이동", () => {
      focusManager.focusCell(0, "key");

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(0, "context");
    });

    it("Shift+Tab으로 이전 컬럼으로 이동", () => {
      focusManager.focusCell(0, "context");

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(0, "key");
    });

    it("마지막 컬럼에서 Tab으로 다음 행 첫 번째 컬럼으로 이동", () => {
      focusManager.focusCell(0, "values.ko");

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(1, "key");
    });

    it("첫 번째 컬럼에서 Shift+Tab으로 이전 행 마지막 컬럼으로 이동", () => {
      focusManager.focusCell(1, "key");

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(0, "values.ko");
    });
  });

  describe("updateCallbacks", () => {
    it("콜백을 업데이트할 수 있어야 함", () => {
      const newOnUndo = vi.fn();
      keyboardHandler.updateCallbacks({ onUndo: newOnUndo });

      const undoEvent = new KeyboardEvent("keydown", {
        key: "z",
        code: "KeyZ",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(undoEvent);

      expect(newOnUndo).toHaveBeenCalled();
      expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
    });
  });

  describe("포커스가 없을 때", () => {
    it("포커스가 없으면 네비게이션 키가 동작하지 않아야 함", () => {
      // 포커스 해제
      focusManager.blur();

      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(arrowEvent);

      expect(mockCallbacks.focusCell).not.toHaveBeenCalled();
    });
  });

  describe("F2 키로 편집 시작", () => {
    it("포커스된 셀에서 F2를 누르면 편집이 시작되어야 함", () => {
      focusManager.focusCell(0, "key");

      const f2Event = new KeyboardEvent("keydown", {
        key: "F2",
        code: "F2",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(f2Event);

      expect(mockCallbacks.onStartEditing).toHaveBeenCalledWith(0, "key");
    });

    it("읽기 전용 모드에서는 F2로 편집이 시작되지 않아야 함", () => {
      focusManager.focusCell(0, "key");
      mockCallbacks.isReadOnly = vi.fn(() => true);

      const f2Event = new KeyboardEvent("keydown", {
        key: "F2",
        code: "F2",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(f2Event);

      expect(mockCallbacks.onStartEditing).not.toHaveBeenCalled();
    });

    it("편집 불가능한 컬럼에서는 F2로 편집이 시작되지 않아야 함", () => {
      focusManager.focusCell(0, "row-number");
      mockCallbacks.isEditableColumn = vi.fn(
        (columnId: string) => columnId !== "row-number",
      );

      const f2Event = new KeyboardEvent("keydown", {
        key: "F2",
        code: "F2",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(f2Event);

      expect(mockCallbacks.onStartEditing).not.toHaveBeenCalled();
    });
  });

  describe("Enter 키로 편집 시작", () => {
    it("Key 컬럼에서 Enter를 누르면 편집이 시작되어야 함", () => {
      focusManager.focusCell(0, "key");

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(enterEvent);

      expect(mockCallbacks.onStartEditing).toHaveBeenCalledWith(0, "key");
    });

    it("Context 컬럼에서 Enter를 누르면 편집이 시작되어야 함", () => {
      focusManager.focusCell(0, "context");

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(enterEvent);

      expect(mockCallbacks.onStartEditing).toHaveBeenCalledWith(0, "context");
    });

    it("언어 컬럼에서 Enter를 누르면 편집이 시작되지 않고 네비게이션만 작동해야 함", () => {
      focusManager.focusCell(0, "values.en");

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(enterEvent);

      // 편집이 시작되지 않아야 함
      expect(mockCallbacks.onStartEditing).not.toHaveBeenCalled();
      // 네비게이션이 작동해야 함 (아래 행으로 이동)
      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(1, "values.en");
    });
  });

  describe("Shift+Enter 키로 위 행으로 이동", () => {
    it("언어 컬럼에서 Shift+Enter를 누르면 위 행의 같은 언어 컬럼으로 이동해야 함", () => {
      focusManager.focusCell(2, "values.en");

      const shiftEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftEnterEvent);

      // 위 행으로 이동해야 함
      expect(mockCallbacks.focusCell).toHaveBeenCalledWith(1, "values.en");
    });

    it("언어 컬럼에서 Shift+Enter를 누르면 편집이 시작되지 않아야 함 (편집 모드가 아닐 때)", () => {
      focusManager.focusCell(2, "values.en");

      const shiftEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftEnterEvent);

      // 편집이 시작되지 않아야 함 (편집 모드가 아닐 때는 네비게이션만)
      expect(mockCallbacks.onStartEditing).not.toHaveBeenCalled();
    });

    it("첫 번째 행의 언어 컬럼에서 Shift+Enter를 누르면 이동하지 않아야 함", () => {
      focusManager.focusCell(0, "values.en");

      const shiftEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftEnterEvent);

      // 이동하지 않아야 함 (첫 번째 행이므로)
      expect(mockCallbacks.focusCell).not.toHaveBeenCalled();
    });

    it("언어 컬럼이 아닌 컬럼에서 Shift+Enter를 누르면 동작하지 않아야 함", () => {
      focusManager.focusCell(1, "key");

      const shiftEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftEnterEvent);

      // Shift+Enter는 언어 컬럼에서만 동작해야 함
      expect(mockCallbacks.focusCell).not.toHaveBeenCalled();
      expect(mockCallbacks.onStartEditing).not.toHaveBeenCalled();
    });
  });
});
