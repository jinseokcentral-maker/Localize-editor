/**
 * 그리드 렌더링 모듈
 * 
 * 헤더, 행, 셀 렌더링 관련 로직을 담당합니다.
 */

import type { Translation } from "@/types/translation";

export interface ColumnWidths {
  rowNumber: number;
  key: number;
  context: number;
  languages: number[];
}

export interface GridRendererCallbacks {
  onCellDblClick?: (rowIndex: number, columnId: string, cell: HTMLElement) => void;
  onCellFocus?: (rowIndex: number, columnId: string) => void;
  updateCellStyle?: (rowId: string, columnId: string, cell?: HTMLElement) => void;
}

export interface GridRendererOptions {
  languages: readonly string[];
  readOnly?: boolean;
  editableColumns: Set<string>;
  callbacks: GridRendererCallbacks;
}

export class GridRenderer {
  private options: GridRendererOptions;

  constructor(options: GridRendererOptions) {
    this.options = options;
  }

  /**
   * 헤더 셀 생성
   */
  createHeaderCell(
    text: string,
    width: number,
    left: number,
    zIndex: number,
    columnId?: string
  ): HTMLElement {
    const header = document.createElement("div");
    header.className = "virtual-grid-header-cell";
    header.setAttribute("role", "columnheader");
    header.textContent = text;
    if (columnId) {
      header.setAttribute("data-column-id", columnId);
    }
    header.style.width = `${width}px`;
    header.style.minWidth = `${width}px`;
    header.style.maxWidth = `${width}px`;

    if (left > 0 || zIndex > 0) {
      header.style.position = "sticky";
      header.style.left = `${left}px`;
      header.style.zIndex = zIndex.toString();
      header.style.backgroundColor = "#f8fafc";
    }

    header.style.overflow = "visible";

    return header;
  }

  /**
   * 행 생성
   */
  createRow(
    translation: Translation,
    rowIndex: number,
    columnWidths: ColumnWidths
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "virtual-grid-row";
    row.setAttribute("role", "row");
    row.setAttribute("data-row-index", rowIndex.toString());
    row.setAttribute("data-row-id", translation.id);

    // 행 번호 셀 (Excel처럼 맨 왼쪽)
    const rowNumberCell = this.createCell(
      translation.id,
      "row-number",
      (rowIndex + 1).toString(), // 1부터 시작
      rowIndex,
      false, // 편집 불가
      columnWidths.rowNumber,
      0,
      15 // 가장 높은 z-index로 sticky
    );
    rowNumberCell.classList.add("row-number-cell");
    row.appendChild(rowNumberCell);

    // Key 셀
    const keyCell = this.createCell(
      translation.id,
      "key",
      translation.key,
      rowIndex,
      !this.options.readOnly, // 읽기 전용 모드면 편집 불가
      columnWidths.key,
      columnWidths.rowNumber, // 행 번호 컬럼 너비만큼 left 오프셋
      10
    );
    row.appendChild(keyCell);

    // Context 셀
    const contextCell = this.createCell(
      translation.id,
      "context",
      translation.context || "",
      rowIndex,
      !this.options.readOnly, // 읽기 전용 모드면 편집 불가
      columnWidths.context,
      columnWidths.rowNumber + columnWidths.key, // 행 번호 + Key 너비만큼 left 오프셋
      10
    );
    row.appendChild(contextCell);

    // 언어 셀들
    this.options.languages.forEach((lang, index) => {
      const value = translation.values[lang] || "";
      const langWidth = columnWidths.languages[index]!;
      // 언어 셀은 읽기 전용 모드에서는 편집 불가
      // editable 파라미터는 실제 편집 가능 여부를 의미 (readOnly 체크 포함)
      const leftOffset = columnWidths.rowNumber + columnWidths.key + columnWidths.context;
      const cell = this.createCell(
        translation.id,
        `values.${lang}`,
        value,
        rowIndex,
        !this.options.readOnly, // 읽기 전용 모드면 false
        langWidth,
        leftOffset,
        0
      );
      row.appendChild(cell);
    });

    return row;
  }

  /**
   * 셀 생성
   */
  createCell(
    rowId: string,
    columnId: string,
    value: string,
    rowIndex: number,
    editable: boolean,
    width: number,
    left: number,
    zIndex: number
  ): HTMLElement {
    const cell = document.createElement("div");
    cell.className = "virtual-grid-cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("data-row-id", rowId);
    cell.setAttribute("data-column-id", columnId);
    cell.setAttribute("data-row-index", rowIndex.toString());
    cell.setAttribute("tabindex", editable ? "0" : "-1");

    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.maxWidth = `${width}px`;

    if (left > 0 || zIndex > 0) {
      cell.style.position = "sticky";
      cell.style.left = `${left}px`;
      cell.style.zIndex = zIndex.toString();
      cell.style.backgroundColor = "#fafafa";
    }

    // 셀 내용
    const cellContent = document.createElement("div");
    cellContent.className = "virtual-grid-cell-content";
    cellContent.textContent = value;
    cell.appendChild(cellContent);

    // Dirty/Empty 상태에 따른 CSS 클래스 추가
    if (this.options.callbacks.updateCellStyle) {
      this.options.callbacks.updateCellStyle(rowId, columnId, cell);
    }

    // 더블클릭으로 편집 시작
    // 읽기 전용 모드에서는 모든 셀 편집 불가
    if (editable && !this.options.readOnly) {
      cell.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.options.callbacks.onCellDblClick) {
          this.options.callbacks.onCellDblClick(rowIndex, columnId, cell);
        }
      });

      // 포커스 이벤트
      cell.addEventListener("focus", () => {
        if (this.options.callbacks.onCellFocus) {
          this.options.callbacks.onCellFocus(rowIndex, columnId);
        }
        cell.classList.add("focused");
      });

      cell.addEventListener("blur", () => {
        cell.classList.remove("focused");
      });
    }

    return cell;
  }

  /**
   * 셀 내용 업데이트
   */
  updateCellContent(
    cell: HTMLElement,
    rowId: string,
    columnId: string,
    value: string,
    rowIndex: number
  ): void {
    cell.innerHTML = "";
    const cellContent = document.createElement("div");
    cellContent.className = "virtual-grid-cell-content";
    cellContent.textContent = value;
    cell.appendChild(cellContent);

    // 편집 가능한 셀은 더블클릭 이벤트 다시 추가
    if (!this.options.readOnly && this.options.editableColumns.has(columnId)) {
      cell.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.options.callbacks.onCellDblClick) {
          this.options.callbacks.onCellDblClick(rowIndex, columnId, cell);
        }
      });
    }

    // 스타일 업데이트
    if (this.options.callbacks.updateCellStyle) {
      this.options.callbacks.updateCellStyle(rowId, columnId, cell);
    }
  }
}

