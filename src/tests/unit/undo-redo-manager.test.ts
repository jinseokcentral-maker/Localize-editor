import { describe, it, expect } from "vitest";
import { UndoRedoManager } from "@/components/undo-redo-manager";

describe("UndoRedoManager", () => {
  it("여러 액션을 push한 후 undo를 두 번 하면 두 개의 액션이 모두 취소되어야 함", () => {
    const manager = new UndoRedoManager();

    // 첫 번째 액션
    manager.push({
      type: 'cell-change',
      rowId: '1',
      columnId: 'values.en',
      oldValue: 'Value 1',
      newValue: 'Modified Value 1',
    });

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
    
    const state1 = manager.getHistoryState();
    expect(state1.length).toBe(1);
    expect(state1.currentIndex).toBe(0);

    // 두 번째 액션
    manager.push({
      type: 'cell-change',
      rowId: '2',
      columnId: 'values.en',
      oldValue: 'Value 2',
      newValue: 'Modified Value 2',
    });

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
    
    const state2 = manager.getHistoryState();
    expect(state2.length).toBe(2);
    expect(state2.currentIndex).toBe(1);

    // 첫 번째 Undo
    const undoAction1 = manager.undo();
    expect(undoAction1).toBeTruthy();
    expect(undoAction1?.rowId).toBe('2');
    expect(undoAction1?.oldValue).toBe('Modified Value 2');
    expect(undoAction1?.newValue).toBe('Value 2');
    
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(true);
    
    const state3 = manager.getHistoryState();
    expect(state3.length).toBe(2);
    expect(state3.currentIndex).toBe(0);

    // 두 번째 Undo
    const undoAction2 = manager.undo();
    expect(undoAction2).toBeTruthy();
    expect(undoAction2?.rowId).toBe('1');
    expect(undoAction2?.oldValue).toBe('Modified Value 1');
    expect(undoAction2?.newValue).toBe('Value 1');
    
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
      type: 'cell-change',
      rowId: '1',
      columnId: 'values.en',
      oldValue: 'Value 1',
      newValue: 'Modified Value 1',
    });

    // 같은 셀 두 번째 수정
    manager.push({
      type: 'cell-change',
      rowId: '1',
      columnId: 'values.en',
      oldValue: 'Modified Value 1',
      newValue: 'Modified Value 2',
    });

    expect(manager.getHistoryState().length).toBe(2);
    expect(manager.getHistoryState().currentIndex).toBe(1);

    // 첫 번째 Undo (Modified Value 2 → Modified Value 1)
    const undo1 = manager.undo();
    expect(undo1?.newValue).toBe('Modified Value 1');
    expect(manager.getHistoryState().currentIndex).toBe(0);

    // 두 번째 Undo (Modified Value 1 → Value 1)
    const undo2 = manager.undo();
    expect(undo2?.newValue).toBe('Value 1');
    expect(manager.getHistoryState().currentIndex).toBe(-1);
  });

  it("undo 후 redo를 하면 변경사항이 다시 적용되어야 함", () => {
    const manager = new UndoRedoManager();

    manager.push({
      type: 'cell-change',
      rowId: '1',
      columnId: 'values.en',
      oldValue: 'Value 1',
      newValue: 'Modified Value 1',
    });

    // Undo
    const undoAction = manager.undo();
    expect(undoAction).toBeTruthy();
    expect(undoAction?.newValue).toBe('Value 1');
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);

    // Redo
    const redoAction = manager.redo();
    expect(redoAction).toBeTruthy();
    expect(redoAction?.newValue).toBe('Modified Value 1');
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it("새로운 액션을 push하면 redo 가능한 항목들이 제거되어야 함", () => {
    const manager = new UndoRedoManager();

    manager.push({ type: 'cell-change', rowId: '1', columnId: 'values.en', oldValue: 'V1', newValue: 'V2' });
    manager.push({ type: 'cell-change', rowId: '2', columnId: 'values.en', oldValue: 'V3', newValue: 'V4' });
    
    expect(manager.getHistoryState().length).toBe(2);
    
    // Undo
    manager.undo();
    expect(manager.canRedo()).toBe(true);
    
    // 새로운 액션 push (redo 가능한 항목 제거)
    manager.push({ type: 'cell-change', rowId: '3', columnId: 'values.en', oldValue: 'V5', newValue: 'V6' });
    
    expect(manager.canRedo()).toBe(false);
    expect(manager.getHistoryState().length).toBe(2); // 이전 항목 1개 + 새 항목 1개
    expect(manager.getHistoryState().currentIndex).toBe(1);
  });
});
