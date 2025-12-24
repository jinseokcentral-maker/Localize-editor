/**
 * 컬럼 리사이즈 모듈
 * 
 * 컬럼 너비 조정 및 리사이즈 핸들 관련 로직을 관리합니다.
 */

export interface ColumnResizerCallbacks {
  onResizeStart?: (columnId: string) => void;
  onResize?: (columnId: string, width: number) => void;
  onResizeEnd?: (columnId: string, width: number) => void;
  getContainerWidth?: () => number;
  getColumnWidth?: (columnId: string, defaultWidth: number) => number;
  updateHeaderCell?: (columnId: string, width: number) => void;
  updateBodyCells?: (columnId: string, width: number) => void;
}

export interface ColumnResizerOptions {
  columnWidths: Map<string, number>;
  columnMinWidths: Map<string, number>;
  languages: readonly string[];
  callbacks: ColumnResizerCallbacks;
}

export class ColumnResizer {
  private isResizing: boolean = false;
  private resizeStartX: number = 0;
  private resizeStartWidth: number = 0;
  private resizeColumnId: string | null = null;
  private resizeHandler: ((e: MouseEvent) => void) | null = null;
  private resizeEndHandler: ((e: MouseEvent) => void) | null = null;

  constructor(private options: ColumnResizerOptions) {}

  /**
   * 리사이즈 핸들 추가
   */
  addResizeHandle(headerCell: HTMLElement, columnId: string): void {
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "column-resize-handle";
    resizeHandle.setAttribute("data-column-id", columnId);
    resizeHandle.style.position = "absolute";
    resizeHandle.style.right = "-2px";
    resizeHandle.style.top = "0";
    resizeHandle.style.bottom = "0";
    resizeHandle.style.width = "4px";
    resizeHandle.style.cursor = "col-resize";
    resizeHandle.style.zIndex = "25";
    resizeHandle.style.backgroundColor = "transparent";

    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startResize(columnId, e.clientX, headerCell);
    });

    headerCell.appendChild(resizeHandle);
  }

  /**
   * 컬럼 리사이즈 시작
   */
  startResize(
    columnId: string,
    startX: number,
    headerCell: HTMLElement
  ): void {
    this.isResizing = true;
    this.resizeStartX = startX;
    this.resizeStartWidth =
      headerCell.offsetWidth || headerCell.getBoundingClientRect().width;
    this.resizeColumnId = columnId;

    if (this.options.callbacks.onResizeStart) {
      this.options.callbacks.onResizeStart(columnId);
    }

    this.resizeHandler = (e: MouseEvent) => {
      if (!this.isResizing || !this.resizeColumnId) return;
      e.preventDefault();
      this.handleResize(e.clientX);
    };

    this.resizeEndHandler = (e: MouseEvent) => {
      if (this.isResizing) {
        e.preventDefault();
        this.endResize();
      }
    };

    document.addEventListener("mousemove", this.resizeHandler, true);
    document.addEventListener("mouseup", this.resizeEndHandler, true);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  /**
   * 컬럼 리사이즈 중
   */
  private handleResize(currentX: number): void {
    if (!this.resizeColumnId) return;

    const deltaX = currentX - this.resizeStartX;
    const minWidth = this.options.columnMinWidths.get(this.resizeColumnId) || 80;
    const newWidth = Math.max(minWidth, this.resizeStartWidth + deltaX);

    // 컬럼 너비 저장 (마지막 컬럼은 제외)
    const lastLang = this.options.languages[this.options.languages.length - 1]!;
    const lastLangColumnId = `values.${lastLang}`;
    if (this.resizeColumnId !== lastLangColumnId) {
      this.options.columnWidths.set(this.resizeColumnId, newWidth);
    }

    // 콜백 호출
    if (this.options.callbacks.onResize) {
      this.options.callbacks.onResize(this.resizeColumnId, newWidth);
    }
  }

  /**
   * 컬럼 리사이즈 종료
   */
  endResize(): void {
    if (this.resizeHandler) {
      document.removeEventListener("mousemove", this.resizeHandler, true);
      this.resizeHandler = null;
    }

    if (this.resizeEndHandler) {
      document.removeEventListener("mouseup", this.resizeEndHandler, true);
      this.resizeEndHandler = null;
    }

    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const columnId = this.resizeColumnId;
    const finalWidth = columnId
      ? this.options.columnWidths.get(columnId) || this.resizeStartWidth
      : this.resizeStartWidth;

    // 리사이즈 종료
    this.isResizing = false;
    this.resizeColumnId = null;

    // 콜백 호출
    if (columnId && this.options.callbacks.onResizeEnd) {
      this.options.callbacks.onResizeEnd(columnId, finalWidth);
    }
  }

  /**
   * 리사이즈 중인지 확인
   */
  isResizingActive(): boolean {
    return this.isResizing;
  }

  /**
   * 리사이즈 상태 초기화 (필요시)
   */
  reset(): void {
    if (this.isResizing) {
      this.endResize();
    }
  }
}

