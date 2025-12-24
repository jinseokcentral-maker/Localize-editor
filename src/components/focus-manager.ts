/**
 * 포커스 관리 모듈
 */

export interface FocusedCell {
  rowIndex: number;
  columnId: string;
}

export class FocusManager {
  private focusedCell: FocusedCell | null = null;

  /**
   * 현재 포커스된 셀 가져오기
   */
  getFocusedCell(): FocusedCell | null {
    return this.focusedCell;
  }

  /**
   * 셀에 포커스 설정
   */
  focusCell(rowIndex: number, columnId: string): void {
    this.focusedCell = { rowIndex, columnId };
  }

  /**
   * 포커스 해제
   */
  blur(): void {
    this.focusedCell = null;
  }

  /**
   * 포커스가 있는지 확인
   */
  hasFocus(): boolean {
    return this.focusedCell !== null;
  }
}

