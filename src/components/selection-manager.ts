/**
 * 셀 선택 관리 모듈
 *
 * 다중 셀 선택을 지원하는 선택 관리자
 * - 단일 셀 선택
 * - Shift+Click으로 범위 선택
 * - Ctrl/Cmd+Click으로 개별 셀 추가/제거
 * - Shift+Arrow로 범위 확장
 */

export interface SelectedCell {
  rowIndex: number;
  columnId: string;
}

export interface SelectionRange {
  startRow: number;
  endRow: number;
  startColumnId: string;
  endColumnId: string;
}

export interface SelectionManagerOptions {
  columns: string[];
  onSelectionChange?: (selection: SelectedCell[]) => void;
}

export class SelectionManager {
  private selectedCells: Map<string, SelectedCell> = new Map();
  private anchorCell: SelectedCell | null = null; // 범위 선택 시작점
  private focusCell: SelectedCell | null = null; // 현재 포커스된 셀
  private columns: string[];
  private onSelectionChange?: (selection: SelectedCell[]) => void;

  constructor(options: SelectionManagerOptions) {
    this.columns = options.columns;
    this.onSelectionChange = options.onSelectionChange;
  }

  /**
   * 컬럼 목록 업데이트
   */
  setColumns(columns: string[]): void {
    this.columns = columns;
  }

  /**
   * 셀 키 생성
   */
  private getCellKey(rowIndex: number, columnId: string): string {
    return `${rowIndex}:${columnId}`;
  }

  /**
   * 단일 셀 선택 (기존 선택 해제)
   */
  selectCell(rowIndex: number, columnId: string): void {
    this.clearSelection();
    this.addCell(rowIndex, columnId);
    this.anchorCell = { rowIndex, columnId };
    this.focusCell = { rowIndex, columnId };
    this.notifyChange();
  }

  /**
   * 셀 추가 (Ctrl/Cmd+Click)
   */
  toggleCell(rowIndex: number, columnId: string): void {
    const key = this.getCellKey(rowIndex, columnId);
    if (this.selectedCells.has(key)) {
      this.selectedCells.delete(key);
    } else {
      this.addCell(rowIndex, columnId);
    }
    this.anchorCell = { rowIndex, columnId };
    this.focusCell = { rowIndex, columnId };
    this.notifyChange();
  }

  /**
   * 범위 선택 (Shift+Click)
   */
  selectRange(rowIndex: number, columnId: string): void {
    if (!this.anchorCell) {
      this.selectCell(rowIndex, columnId);
      return;
    }

    this.clearSelection();

    const startRow = Math.min(this.anchorCell.rowIndex, rowIndex);
    const endRow = Math.max(this.anchorCell.rowIndex, rowIndex);
    const startColIndex = this.getColumnIndex(this.anchorCell.columnId);
    const endColIndex = this.getColumnIndex(columnId);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const colId = this.columns[c];
        if (colId) {
          this.addCell(r, colId);
        }
      }
    }

    this.focusCell = { rowIndex, columnId };
    this.notifyChange();
  }

  /**
   * 화살표 키로 범위 확장 (Shift+Arrow)
   */
  extendSelection(rowIndex: number, columnId: string): void {
    if (!this.anchorCell) {
      this.selectCell(rowIndex, columnId);
      return;
    }

    this.clearSelection();

    const startRow = Math.min(this.anchorCell.rowIndex, rowIndex);
    const endRow = Math.max(this.anchorCell.rowIndex, rowIndex);
    const startColIndex = this.getColumnIndex(this.anchorCell.columnId);
    const endColIndex = this.getColumnIndex(columnId);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const colId = this.columns[c];
        if (colId) {
          this.addCell(r, colId);
        }
      }
    }

    this.focusCell = { rowIndex, columnId };
    this.notifyChange();
  }

  /**
   * 전체 행 선택
   */
  selectRow(rowIndex: number): void {
    this.clearSelection();
    for (const colId of this.columns) {
      this.addCell(rowIndex, colId);
    }
    this.anchorCell = { rowIndex, columnId: this.columns[0] || "" };
    this.focusCell = { rowIndex, columnId: this.columns[this.columns.length - 1] || "" };
    this.notifyChange();
  }

  /**
   * 행 범위 선택 (Shift+Click on row number)
   */
  selectRowRange(fromRow: number, toRow: number): void {
    this.clearSelection();
    const startRow = Math.min(fromRow, toRow);
    const endRow = Math.max(fromRow, toRow);

    for (let r = startRow; r <= endRow; r++) {
      for (const colId of this.columns) {
        this.addCell(r, colId);
      }
    }

    this.anchorCell = { rowIndex: fromRow, columnId: this.columns[0] || "" };
    this.focusCell = { rowIndex: toRow, columnId: this.columns[this.columns.length - 1] || "" };
    this.notifyChange();
  }

  /**
   * 전체 컬럼 선택
   */
  selectColumn(columnId: string, maxRow: number): void {
    this.clearSelection();
    for (let r = 0; r <= maxRow; r++) {
      this.addCell(r, columnId);
    }
    this.anchorCell = { rowIndex: 0, columnId };
    this.focusCell = { rowIndex: maxRow, columnId };
    this.notifyChange();
  }

  /**
   * 선택 해제
   */
  clearSelection(): void {
    this.selectedCells.clear();
  }

  /**
   * 모든 선택 해제 및 앵커 리셋
   */
  resetSelection(): void {
    this.clearSelection();
    this.anchorCell = null;
    this.focusCell = null;
    this.notifyChange();
  }

  /**
   * 셀 추가 (내부 헬퍼)
   */
  private addCell(rowIndex: number, columnId: string): void {
    const key = this.getCellKey(rowIndex, columnId);
    this.selectedCells.set(key, { rowIndex, columnId });
  }

  /**
   * 셀이 선택되었는지 확인
   */
  isSelected(rowIndex: number, columnId: string): boolean {
    const key = this.getCellKey(rowIndex, columnId);
    return this.selectedCells.has(key);
  }

  /**
   * 선택된 셀 목록 가져오기
   */
  getSelectedCells(): SelectedCell[] {
    return Array.from(this.selectedCells.values());
  }

  /**
   * 선택된 셀 수 가져오기
   */
  getSelectionCount(): number {
    return this.selectedCells.size;
  }

  /**
   * 앵커 셀 가져오기
   */
  getAnchorCell(): SelectedCell | null {
    return this.anchorCell;
  }

  /**
   * 포커스 셀 가져오기
   */
  getFocusCell(): SelectedCell | null {
    return this.focusCell;
  }

  /**
   * 선택 범위 가져오기 (사각형 범위일 때만)
   */
  getSelectionRange(): SelectionRange | null {
    if (this.selectedCells.size === 0) return null;

    const cells = this.getSelectedCells();
    const rows = cells.map(c => c.rowIndex);
    const colIndices = cells.map(c => this.getColumnIndex(c.columnId));

    const startRow = Math.min(...rows);
    const endRow = Math.max(...rows);
    const startCol = Math.min(...colIndices);
    const endCol = Math.max(...colIndices);

    return {
      startRow,
      endRow,
      startColumnId: this.columns[startCol] || "",
      endColumnId: this.columns[endCol] || "",
    };
  }

  /**
   * 컬럼 인덱스 가져오기
   */
  private getColumnIndex(columnId: string): number {
    const index = this.columns.indexOf(columnId);
    return index >= 0 ? index : 0;
  }

  /**
   * 선택 변경 알림
   */
  private notifyChange(): void {
    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectedCells());
    }
  }

  /**
   * 선택된 셀들의 값 복사용 텍스트 생성 (TSV 형식)
   */
  getSelectionAsText(
    getValue: (rowIndex: number, columnId: string) => string
  ): string {
    const range = this.getSelectionRange();
    if (!range) return "";

    const lines: string[] = [];
    for (let r = range.startRow; r <= range.endRow; r++) {
      const rowValues: string[] = [];
      const startColIndex = this.getColumnIndex(range.startColumnId);
      const endColIndex = this.getColumnIndex(range.endColumnId);

      for (let c = startColIndex; c <= endColIndex; c++) {
        const colId = this.columns[c];
        if (colId && this.isSelected(r, colId)) {
          rowValues.push(getValue(r, colId));
        }
      }
      lines.push(rowValues.join("\t"));
    }
    return lines.join("\n");
  }
}
