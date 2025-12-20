/**
 * Undo/Redo Manager
 * 
 * 변경사항 히스토리를 관리하고 Undo/Redo 기능을 제공합니다.
 */

export interface UndoRedoAction {
  type: 'cell-change';
  rowId: string;
  columnId: string;
  oldValue: string;
  newValue: string;
}

export class UndoRedoManager {
  private history: UndoRedoAction[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 100; // 최대 히스토리 크기

  /**
   * 변경사항을 히스토리에 추가
   */
  push(action: UndoRedoAction): void {
    // 현재 인덱스 이후의 히스토리 제거 (새로운 변경사항이 있으면 redo 불가)
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // 히스토리에 추가
    this.history.push(action);
    this.currentIndex++;
    
    // 최대 히스토리 크기 제한 (currentIndex 증가 후 체크)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift(); // 가장 오래된 항목 제거
      this.currentIndex--; // 배열이 줄었으므로 인덱스도 조정
    }
  }

  /**
   * Undo 가능한지 확인
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Redo 가능한지 확인
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Undo: 이전 상태로 되돌리기
   */
  undo(): UndoRedoAction | null {
    if (!this.canUndo()) {
      return null;
    }

    const action = this.history[this.currentIndex];
    this.currentIndex--;
    
    // Undo를 위한 반대 액션 생성
    return {
      type: action.type,
      rowId: action.rowId,
      columnId: action.columnId,
      oldValue: action.newValue,
      newValue: action.oldValue,
    };
  }

  /**
   * Redo: 다음 상태로 되돌리기
   */
  redo(): UndoRedoAction | null {
    if (!this.canRedo()) {
      return null;
    }

    this.currentIndex++;
    return this.history[this.currentIndex];
  }

  /**
   * 히스토리 초기화
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * 현재 히스토리 상태 가져오기 (디버깅용)
   */
  getHistoryState(): { length: number; currentIndex: number; canUndo: boolean; canRedo: boolean } {
    return {
      length: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }
}

