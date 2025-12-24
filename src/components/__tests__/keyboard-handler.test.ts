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
      mockCallbacks
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
        (columnId: string) => columnId !== "row-number"
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
});

