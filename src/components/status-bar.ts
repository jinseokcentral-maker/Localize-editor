/**
 * 상태바 (Status Bar) 컴포넌트
 * 
 * 화면 하단에 현재 상태 정보를 표시
 * - 현재 모드
 * - 행/컬럼 위치
 * - 변경사항 수
 * - 빈 번역 수
 * - 중복 Key 수
 */

export interface StatusBarInfo {
  mode: string;
  rowIndex: number | null;
  totalRows: number;
  columnId: string | null;
  changesCount: number;
  emptyCount: number;
  duplicateCount: number;
}

export interface StatusBarCallbacks {
  onStatusUpdate?: (info: StatusBarInfo) => void;
}

export class StatusBar {
  private statusBarElement: HTMLElement | null = null;
  private container: HTMLElement;
  private callbacks: StatusBarCallbacks;

  constructor(
    container: HTMLElement,
    callbacks: StatusBarCallbacks = {}
  ) {
    this.container = container;
    this.callbacks = callbacks;
  }

  /**
   * 상태바 생성 및 표시
   */
  create(): void {
    if (this.statusBarElement) {
      return;
    }

    this.statusBarElement = document.createElement("div");
    this.statusBarElement.className = "status-bar";
    this.statusBarElement.setAttribute("role", "status");
    this.statusBarElement.setAttribute("aria-live", "polite");
    this.statusBarElement.setAttribute("aria-atomic", "true");

    this.container.appendChild(this.statusBarElement);
  }

  /**
   * 상태 정보 업데이트
   */
  update(info: StatusBarInfo): void {
    if (!this.statusBarElement) {
      this.create();
    }

    if (!this.statusBarElement) {
      return;
    }

    const parts: string[] = [];

    // 모드
    parts.push(`[${info.mode}]`);

    // 행/컬럼 위치
    if (info.rowIndex !== null) {
      parts.push(`Row ${info.rowIndex + 1}/${info.totalRows}`);
    } else {
      parts.push(`Row -/${info.totalRows}`);
    }

    if (info.columnId) {
      const columnName = this.getColumnDisplayName(info.columnId);
      parts.push(`Col: ${columnName}`);
    }

    // 변경사항 수
    if (info.changesCount > 0) {
      parts.push(`${info.changesCount} change${info.changesCount !== 1 ? "s" : ""}`);
    }

    // 빈 번역 수
    if (info.emptyCount > 0) {
      parts.push(`${info.emptyCount} empty`);
    }

    // 중복 Key 수
    if (info.duplicateCount > 0) {
      parts.push(`${info.duplicateCount} duplicate${info.duplicateCount !== 1 ? "s" : ""}`);
    }

    this.statusBarElement.textContent = parts.join(" | ");

    // 콜백 호출
    if (this.callbacks.onStatusUpdate) {
      this.callbacks.onStatusUpdate(info);
    }
  }

  /**
   * 컬럼 ID를 표시 이름으로 변환
   */
  private getColumnDisplayName(columnId: string): string {
    if (columnId === "row-number") {
      return "#";
    }
    if (columnId === "key") {
      return "Key";
    }
    if (columnId === "context") {
      return "Context";
    }
    if (columnId.startsWith("values.")) {
      return columnId.replace("values.", "").toUpperCase();
    }
    return columnId;
  }

  /**
   * 상태바 제거
   */
  destroy(): void {
    if (this.statusBarElement && this.statusBarElement.parentElement) {
      this.statusBarElement.parentElement.removeChild(this.statusBarElement);
      this.statusBarElement = null;
    }
  }

  /**
   * 상태바 표시 여부
   */
  isVisible(): boolean {
    return this.statusBarElement !== null;
  }
}



