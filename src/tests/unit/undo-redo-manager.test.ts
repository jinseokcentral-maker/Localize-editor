import { describe, it, expect, beforeEach } from "vitest";
import { UndoRedoManager } from "@/components/undo-redo-manager";

describe("UndoRedoManager", () => {
  let manager: UndoRedoManager;

  beforeEach(() => {
    manager = new UndoRedoManager();
  });

  describe("초기 상태", () => {
    it("초기 상태에서 undo 불가능해야 함", () => {
      expect(manager.canUndo()).toBe(false);
    });

    it("초기 상태에서 redo 불가능해야 함", () => {
      expect(manager.canRedo()).toBe(false);
    });

    it("초기 상태에서 undo 호출 시 null 반환", () => {
      expect(manager.undo()).toBeNull();
    });

    it("초기 상태에서 redo 호출 시 null 반환", () => {
      expect(manager.redo()).toBeNull();
    });

    it("초기 히스토리 상태가 올바라야 함", () => {
      const state = manager.getHistoryState();
      expect(state.length).toBe(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });
  });

  describe("push", () => {
    it("단일 액션 추가 후 상태가 올바라야 함", () => {
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "old",
        newValue: "new",
      });

      const state = manager.getHistoryState();
      expect(state.length).toBe(1);
      expect(state.currentIndex).toBe(0);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it("최대 히스토리 크기(100)를 초과하면 오래된 항목 제거", () => {
      // 101개 액션 추가
      for (let i = 0; i < 101; i++) {
        manager.push({
          type: "cell-change",
          rowId: `${i}`,
          columnId: "values.en",
          oldValue: `old-${i}`,
          newValue: `new-${i}`,
        });
      }

      const state = manager.getHistoryState();
      expect(state.length).toBe(100); // 최대 100개
      expect(state.currentIndex).toBe(99);

      // 가장 오래된 항목(i=0)은 제거되고 i=1이 첫 번째가 됨
      // undo를 99번 하면 i=1의 액션에 도달
      for (let i = 0; i < 99; i++) {
        manager.undo();
      }
      const lastUndo = manager.undo();
      expect(lastUndo?.rowId).toBe("1"); // i=0은 제거됨
    });
  });

  describe("clear", () => {
    it("히스토리를 초기화해야 함", () => {
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "old",
        newValue: "new",
      });
      manager.push({
        type: "cell-change",
        rowId: "2",
        columnId: "values.ko",
        oldValue: "이전",
        newValue: "이후",
      });

      manager.clear();

      const state = manager.getHistoryState();
      expect(state.length).toBe(0);
      expect(state.currentIndex).toBe(-1);
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe("경계 조건", () => {
    it("undo를 모두 소진한 후 undo 호출 시 null 반환", () => {
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "old",
        newValue: "new",
      });

      manager.undo();
      expect(manager.canUndo()).toBe(false);
      expect(manager.undo()).toBeNull();
    });

    it("redo를 모두 소진한 후 redo 호출 시 null 반환", () => {
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "old",
        newValue: "new",
      });

      manager.undo();
      manager.redo();
      expect(manager.canRedo()).toBe(false);
      expect(manager.redo()).toBeNull();
    });

    it("undo 후 새 액션 push 시 redo 히스토리 제거", () => {
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "v1",
        newValue: "v2",
      });
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "v2",
        newValue: "v3",
      });

      manager.undo(); // v3 -> v2
      expect(manager.canRedo()).toBe(true);

      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "v2",
        newValue: "v4",
      });

      expect(manager.canRedo()).toBe(false);
      expect(manager.getHistoryState().length).toBe(2);
    });

    it("연속 undo/redo가 올바르게 동작해야 함", () => {
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "a",
        oldValue: "0",
        newValue: "1",
      });
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "a",
        oldValue: "1",
        newValue: "2",
      });
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "a",
        oldValue: "2",
        newValue: "3",
      });

      // 현재: [0->1, 1->2, 2->3], index=2

      let action = manager.undo(); // 3 -> 2
      expect(action?.newValue).toBe("2");

      action = manager.undo(); // 2 -> 1
      expect(action?.newValue).toBe("1");

      action = manager.redo(); // 1 -> 2
      expect(action?.newValue).toBe("2");

      action = manager.undo(); // 2 -> 1
      expect(action?.newValue).toBe("1");

      action = manager.undo(); // 1 -> 0
      expect(action?.newValue).toBe("0");

      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);

      action = manager.redo(); // 0 -> 1
      expect(action?.newValue).toBe("1");

      action = manager.redo(); // 1 -> 2
      expect(action?.newValue).toBe("2");

      action = manager.redo(); // 2 -> 3
      expect(action?.newValue).toBe("3");

      expect(manager.canRedo()).toBe(false);
    });

    it("빈 문자열 값도 처리해야 함", () => {
      manager.push({
        type: "cell-change",
        rowId: "1",
        columnId: "values.en",
        oldValue: "",
        newValue: "hello",
      });

      const undoAction = manager.undo();
      expect(undoAction?.newValue).toBe("");
      expect(undoAction?.oldValue).toBe("hello");
    });

    it("특수문자가 포함된 값도 처리해야 함", () => {
      manager.push({
        type: "cell-change",
        rowId: "row-1",
        columnId: "values.en",
        oldValue: "Hello\nWorld",
        newValue: "안녕하세요 👋",
      });

      const undoAction = manager.undo();
      expect(undoAction?.newValue).toBe("Hello\nWorld");
      expect(undoAction?.oldValue).toBe("안녕하세요 👋");
    });
  });

  it("여러 액션을 push한 후 undo를 두 번 하면 두 개의 액션이 모두 취소되어야 함", () => {
    const manager = new UndoRedoManager();

    // 첫 번째 액션
    manager.push({
      type: "cell-change",
      rowId: "1",
      columnId: "values.en",
      oldValue: "Value 1",
      newValue: "Modified Value 1",
    });

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);

    const state1 = manager.getHistoryState();
    expect(state1.length).toBe(1);
    expect(state1.currentIndex).toBe(0);

    // 두 번째 액션
    manager.push({
      type: "cell-change",
      rowId: "2",
      columnId: "values.en",
      oldValue: "Value 2",
      newValue: "Modified Value 2",
    });

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);

    const state2 = manager.getHistoryState();
    expect(state2.length).toBe(2);
    expect(state2.currentIndex).toBe(1);

    // 첫 번째 Undo
    const undoAction1 = manager.undo();
    expect(undoAction1).toBeTruthy();
    expect(undoAction1?.rowId).toBe("2");
    expect(undoAction1?.oldValue).toBe("Modified Value 2");
    expect(undoAction1?.newValue).toBe("Value 2");

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(true);

    const state3 = manager.getHistoryState();
    expect(state3.length).toBe(2);
    expect(state3.currentIndex).toBe(0);

    // 두 번째 Undo
    const undoAction2 = manager.undo();
    expect(undoAction2).toBeTruthy();
    expect(undoAction2?.rowId).toBe("1");
    expect(undoAction2?.oldValue).toBe("Modified Value 1");
    expect(undoAction2?.newValue).toBe("Value 1");

    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);

    const state4 = manager.getHistoryState();
    expect(state4.length).toBe(2);
    expect(state4.currentIndex).toBe(-1);
  });

  it("같은 셀을 여러 번 수정하면 각각 히스토리에 추가되어야 함", () => {
    const manager = new UndoRedoManager();

    // 첫 번째 수정
    manager.push({
      type: "cell-change",
      rowId: "1",
      columnId: "values.en",
      oldValue: "Value 1",
      newValue: "Modified Value 1",
    });

    // 같은 셀 두 번째 수정
    manager.push({
      type: "cell-change",
      rowId: "1",
      columnId: "values.en",
      oldValue: "Modified Value 1",
      newValue: "Modified Value 2",
    });

    expect(manager.getHistoryState().length).toBe(2);
    expect(manager.getHistoryState().currentIndex).toBe(1);

    // 첫 번째 Undo (Modified Value 2 → Modified Value 1)
    const undo1 = manager.undo();
    expect(undo1?.newValue).toBe("Modified Value 1");
    expect(manager.getHistoryState().currentIndex).toBe(0);

    // 두 번째 Undo (Modified Value 1 → Value 1)
    const undo2 = manager.undo();
    expect(undo2?.newValue).toBe("Value 1");
    expect(manager.getHistoryState().currentIndex).toBe(-1);
  });

  it("undo 후 redo를 하면 변경사항이 다시 적용되어야 함", () => {
    const manager = new UndoRedoManager();

    manager.push({
      type: "cell-change",
      rowId: "1",
      columnId: "values.en",
      oldValue: "Value 1",
      newValue: "Modified Value 1",
    });

    // Undo
    const undoAction = manager.undo();
    expect(undoAction).toBeTruthy();
    expect(undoAction?.newValue).toBe("Value 1");
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);

    // Redo
    const redoAction = manager.redo();
    expect(redoAction).toBeTruthy();
    expect(redoAction?.newValue).toBe("Modified Value 1");
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it("새로운 액션을 push하면 redo 가능한 항목들이 제거되어야 함", () => {
    const manager = new UndoRedoManager();

    manager.push({
      type: "cell-change",
      rowId: "1",
      columnId: "values.en",
      oldValue: "V1",
      newValue: "V2",
    });
    manager.push({
      type: "cell-change",
      rowId: "2",
      columnId: "values.en",
      oldValue: "V3",
      newValue: "V4",
    });

    expect(manager.getHistoryState().length).toBe(2);

    // Undo
    manager.undo();
    expect(manager.canRedo()).toBe(true);

    // 새로운 액션 push (redo 가능한 항목 제거)
    manager.push({
      type: "cell-change",
      rowId: "3",
      columnId: "values.en",
      oldValue: "V5",
      newValue: "V6",
    });

    expect(manager.canRedo()).toBe(false);
    expect(manager.getHistoryState().length).toBe(2); // 이전 항목 1개 + 새 항목 1개
    expect(manager.getHistoryState().currentIndex).toBe(1);
  });
});
