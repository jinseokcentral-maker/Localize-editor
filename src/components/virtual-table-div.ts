/**
 * Virtual Table (Div-based Grid) - @tanstack/virtual-core를 사용한 가상화 그리드
 *
 * 테이블 구조 대신 div 기반 그리드로 구현하여 가상 스크롤링과 완벽하게 호환
 */

import {
  Virtualizer,
  observeElementRect,
  observeElementOffset,
  elementScroll,
} from "@/virtual-core/index";
import type { Translation, TranslationChange } from "@/types/translation";
import { ChangeTracker } from "./change-tracker";
import { UndoRedoManager, type UndoRedoAction } from "./undo-redo-manager";
import { ModifierKeyTracker } from "./modifier-key-tracker";
import { FocusManager } from "./focus-manager";
import { CellEditor } from "./cell-editor";
import { KeyboardHandler } from "./keyboard-handler";
import { ColumnResizer } from "./column-resizer";
import { ColumnWidthCalculator } from "./column-width-calculator";
import { GridRenderer, type ColumnWidths } from "./grid-renderer";
import { getLangFromColumnId, getTranslationKey } from "./grid-utils";
import "@/styles/virtual-table-div.css";

export interface VirtualTableDivOptions {
  container: HTMLElement;
  translations: readonly Translation[];
  languages: readonly string[];
  defaultLanguage: string;
  readOnly?: boolean;
  onCellChange?: (id: string, lang: string, value: string) => void;
  rowHeight?: number;
  headerHeight?: number;
  columnWidths?: Map<string, number>;
}

export class VirtualTableDiv {
  private container: HTMLElement;
  private scrollElement: HTMLElement | null = null;
  private gridElement: HTMLElement | null = null;
  private headerElement: HTMLElement | null = null;
  private bodyElement: HTMLElement | null = null;
  private options: VirtualTableDivOptions;
  private rowVirtualizer: Virtualizer<HTMLElement, HTMLElement> | null = null;
  private virtualizerCleanup: (() => void) | null = null;
  private renderScheduled: boolean = false;
  private resizeObserver: ResizeObserver | null = null;
  private columnWidths: Map<string, number> = new Map();
  private editableColumns: Set<string> = new Set();
  private rowHeight: number = 40;
  private headerHeight: number = 40;
  private changeTracker = new ChangeTracker();
  private undoRedoManager = new UndoRedoManager();

  // 모듈화된 컴포넌트들
  private modifierKeyTracker = new ModifierKeyTracker();
  private focusManager = new FocusManager();
  private cellEditor: CellEditor;
  private keyboardHandlerModule: KeyboardHandler;
  private columnResizer: ColumnResizer;
  private columnWidthCalculator: ColumnWidthCalculator;
  private gridRenderer: GridRenderer;

  // 컬럼 리사이즈 관련 상태
  private columnMinWidths: Map<string, number> = new Map();

  constructor(options: VirtualTableDivOptions) {
    this.container = options.container;
    this.options = options;
    this.columnWidths = options.columnWidths || new Map();
    this.rowHeight = options.rowHeight || 40;
    this.headerHeight = options.headerHeight || 40;

    // 편집 가능한 컬럼 설정
    this.editableColumns = new Set(["key", "context"]);
    options.languages.forEach((lang) => {
      this.editableColumns.add(`values.${lang}`);
    });

    // 컬럼 최소 너비 설정
    this.columnMinWidths.set("key", 100);
    this.columnMinWidths.set("context", 100);
    options.languages.forEach((lang) => {
      this.columnMinWidths.set(`values.${lang}`, 80);
    });

    // 원본 데이터 초기화
    this.changeTracker.initializeOriginalData(
      options.translations,
      options.languages
    );

    // CellEditor 초기화
    this.cellEditor = new CellEditor(
      options.translations,
      this.changeTracker,
      this.undoRedoManager,
      {
        onCellChange: options.onCellChange,
        updateCellStyle: (rowId, columnId) => {
          this.updateCellStyle(rowId, columnId);
        },
        updateCellContent: (cell, rowId, columnId, value) => {
          const rowIndexAttr = cell.getAttribute("data-row-index");
          const rowIndex = rowIndexAttr ? parseInt(rowIndexAttr, 10) : 0;
          this.gridRenderer.updateCellContent(
            cell,
            rowId,
            columnId,
            value,
            rowIndex
          );
        },
      }
    );

    // KeyboardHandler 초기화
    this.keyboardHandlerModule = new KeyboardHandler(
      this.modifierKeyTracker,
      this.focusManager,
      {
        onUndo: () => this.handleUndo(),
        onRedo: () => this.handleRedo(),
        getAllColumns: () => [
          "key",
          "context",
          ...options.languages.map((lang) => `values.${lang}`),
        ],
        getMaxRowIndex: () => options.translations.length - 1,
        focusCell: (rowIndex, columnId) => {
          this.focusCell(rowIndex, columnId);
        },
      }
    );

    // ColumnWidthCalculator 초기화
    this.columnWidthCalculator = new ColumnWidthCalculator({
      columnWidths: this.columnWidths,
      columnMinWidths: this.columnMinWidths,
      languages: options.languages,
    });

    // ColumnResizer 초기화
    this.columnResizer = new ColumnResizer({
      columnWidths: this.columnWidths,
      columnMinWidths: this.columnMinWidths,
      languages: options.languages,
      callbacks: {
        onResize: (columnId, width) => {
          this.applyColumnWidth(columnId, width);
        },
        onResizeEnd: () => {
          // 리사이즈 종료 후 모든 행을 다시 렌더링
          if (this.rowVirtualizer && this.bodyElement) {
            this.renderVirtualRows();
          }
        },
      },
    });

    // GridRenderer 초기화
    this.gridRenderer = new GridRenderer({
      languages: options.languages,
      readOnly: options.readOnly,
      editableColumns: this.editableColumns,
      callbacks: {
        onCellDblClick: (rowIndex, columnId, cell) => {
          this.startEditing(rowIndex, columnId, cell);
        },
        onCellFocus: (rowIndex, columnId) => {
          this.focusManager.focusCell(rowIndex, columnId);
        },
        updateCellStyle: (rowId, columnId, cell) => {
          this.updateCellStyle(rowId, columnId, cell);
        },
      },
    });
  }

  /**
   * 그리드 렌더링
   */
  render(): void {
    // 기존 그리드가 있으면 제거
    if (this.scrollElement && this.container.contains(this.scrollElement)) {
      this.container.removeChild(this.scrollElement);
    }

    // 스크롤 컨테이너 생성
    this.scrollElement = document.createElement("div");
    this.scrollElement.className = "virtual-grid-scroll-container";
    this.scrollElement.style.width = "100%";
    this.scrollElement.style.height = "100%";
    this.scrollElement.style.overflow = "auto";
    this.scrollElement.style.position = "relative";

    // 그리드 컨테이너 생성
    this.gridElement = document.createElement("div");
    this.gridElement.className = "virtual-grid";
    this.gridElement.setAttribute("role", "grid");
    if (this.options.readOnly) {
      this.gridElement.classList.add("readonly");
    }

    // 헤더 생성
    this.headerElement = document.createElement("div");
    this.headerElement.className = "virtual-grid-header";
    this.renderHeader();
    this.gridElement.appendChild(this.headerElement);

    // 바디 생성
    this.bodyElement = document.createElement("div");
    this.bodyElement.className = "virtual-grid-body";
    this.bodyElement.style.position = "relative";
    this.gridElement.appendChild(this.bodyElement);

    // 스크롤 컨테이너에 그리드 추가
    this.scrollElement.appendChild(this.gridElement);
    this.container.appendChild(this.scrollElement);

    // 컨테이너 크기 변경 감지
    this.observeContainerResize();

    // 가상 스크롤링 초기화
    requestAnimationFrame(() => {
      this.initVirtualScrolling();
    });

    // 키보드 이벤트 리스너 추가
    this.attachKeyboardListeners();
  }

  /**
   * 컨테이너 크기 변경 감지
   */
  private observeContainerResize(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.headerElement) {
          this.headerElement.innerHTML = "";
          this.renderHeader();
        }

        if (this.rowVirtualizer) {
          this.renderVirtualRows();
        }
      });

      this.resizeObserver.observe(this.container);
    }
  }

  /**
   * 가상 스크롤링 초기화
   */
  private initVirtualScrolling(): void {
    if (!this.scrollElement || !this.bodyElement) {
      console.error("VirtualTableDiv: scrollElement or bodyElement is null");
      return;
    }

    const getInitialRect = (): { width: number; height: number } => {
      if (this.scrollElement) {
        const rect = this.scrollElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { width: rect.width, height: rect.height };
        }
      }
      const containerWidth = this.container.clientWidth || 800;
      const containerHeight = this.container.clientHeight || 600;
      return { width: containerWidth, height: containerHeight };
    };

    const initialRect = getInitialRect();

    this.rowVirtualizer = new Virtualizer<HTMLElement, HTMLElement>({
      count: this.options.translations.length,
      getScrollElement: () => this.scrollElement,
      estimateSize: () => this.rowHeight,
      scrollToFn: elementScroll,
      observeElementRect: observeElementRect,
      observeElementOffset: observeElementOffset,
      initialRect,
      onChange: () => {
        if (!this.renderScheduled) {
          this.renderScheduled = true;
          requestAnimationFrame(() => {
            this.renderScheduled = false;
            this.renderVirtualRows();
          });
        }
      },
    });

    this.rowVirtualizer._willUpdate();
    this.virtualizerCleanup = this.rowVirtualizer._didMount();

    requestAnimationFrame(() => {
      this.renderVirtualRows();
    });
  }

  /**
   * 가상 행 렌더링
   */
  private renderVirtualRows(): void {
    if (!this.rowVirtualizer || !this.bodyElement) {
      return;
    }

    // 편집 중인 셀 정보 저장
    let editingCellData: {
      rowId: string;
      columnId: string;
      value: string;
    } | null = null;
    const editingCell = this.cellEditor.getEditingCell();
    if (editingCell) {
      const editingRow = this.bodyElement.querySelector(
        `[data-row-index="${editingCell.rowIndex}"]`
      );
      if (editingRow) {
        const editingCellElement = editingRow.querySelector(
          `[data-column-id="${editingCell.columnId}"]`
        );
        if (editingCellElement) {
          const input = editingCellElement.querySelector("input");
          if (input) {
            editingCellData = {
              rowId: editingCell.rowId,
              columnId: editingCell.columnId,
              value: input.value,
            };
          }
        }
      }
    }

    // 기존 행 제거
    this.bodyElement.innerHTML = "";

    // 가상 아이템 가져오기
    const virtualItems = this.rowVirtualizer.getVirtualItems();
    const totalSize = this.rowVirtualizer.getTotalSize();

    // 바디의 높이를 전체 크기로 설정
    this.bodyElement.style.height = `${totalSize}px`;

    // 리사이즈 중이면 저장된 컬럼 너비를 사용, 아니면 헤더의 실제 너비 사용
    let columnWidths: ColumnWidths;
    const containerWidth = this.getContainerWidth();

    if (this.columnResizer.isResizingActive()) {
      // 리사이즈 중: 저장된 컬럼 너비 사용
      columnWidths =
        this.columnWidthCalculator.calculateColumnWidths(containerWidth);
    } else {
      // 리사이즈 중이 아닐 때: 저장된 컬럼 너비를 우선 사용, 없으면 헤더의 실제 너비 사용
      const hasStoredWidths = this.columnWidths.size > 0;

      if (hasStoredWidths) {
        // 저장된 컬럼 너비 사용 (리사이즈된 값 유지)
        columnWidths =
          this.columnWidthCalculator.calculateColumnWidths(containerWidth);
      } else {
        // 저장된 너비가 없을 때만 헤더의 실제 너비를 가져와서 사용
        const headerWidths = this.getColumnWidthsFromHeader();

        if (headerWidths) {
          // 헤더의 실제 너비 사용 (헤더와 바디 동기화)
          // 마지막 컬럼은 끝까지 채우도록 재계산
          const fixedWidth =
            headerWidths.key +
            headerWidths.context +
            headerWidths.languages.slice(0, -1).reduce((sum, w) => sum + w, 0);
          const lastLangMinWidth =
            this.columnMinWidths.get(
              `values.${this.options.languages[
                this.options.languages.length - 1
              ]!}`
            ) || 80;
          const lastLangWidth = Math.max(
            lastLangMinWidth,
            containerWidth - fixedWidth
          );

          columnWidths = {
            key: headerWidths.key,
            context: headerWidths.context,
            languages: [...headerWidths.languages.slice(0, -1), lastLangWidth],
          };
        } else {
          // 폴백: 계산된 너비 사용
          columnWidths =
            this.columnWidthCalculator.calculateColumnWidths(containerWidth);
        }
      }
    }

    // 각 가상 아이템에 대해 행 생성
    virtualItems.forEach((virtualItem) => {
      const translation = this.options.translations[virtualItem.index];
      if (!translation) {
        return;
      }

      const row = this.gridRenderer.createRow(
        translation,
        virtualItem.index,
        columnWidths
      );

      // 전체 너비는 항상 컨테이너 너비와 일치 (마지막 컬럼이 끝까지 채워짐)
      const totalWidth = containerWidth;

      // 가상 스크롤링을 위한 위치 설정
      row.style.position = "absolute";
      row.style.top = `${virtualItem.start}px`;
      row.style.left = "0";
      row.style.width = `${totalWidth}px`;
      row.style.minWidth = `${totalWidth}px`;
      row.style.maxWidth = `${totalWidth}px`;
      row.style.height = `${virtualItem.size}px`;
      row.setAttribute("data-index", virtualItem.index.toString());

      this.bodyElement!.appendChild(row);

      // 편집 중인 셀이면 다시 편집 모드로 전환
      if (editingCellData && translation.id === editingCellData.rowId) {
        const cellElement = row.querySelector(
          `[data-column-id="${editingCellData.columnId}"]`
        );
        if (cellElement) {
          requestAnimationFrame(() => {
            this.startEditing(
              virtualItem.index,
              editingCellData!.columnId,
              cellElement as HTMLElement
            );
            const input = cellElement.querySelector("input");
            if (input) {
              input.value = editingCellData!.value;
              input.focus();
              input.select();
            }
          });
        }
      }

      // Virtualizer가 요소를 측정할 수 있도록 설정
      this.rowVirtualizer!.measureElement(row);
    });
  }

  /**
   * 헤더 렌더링
   */
  private renderHeader(): void {
    if (!this.headerElement) return;

    const headerRow = document.createElement("div");
    headerRow.className = "virtual-grid-header-row";
    headerRow.setAttribute("role", "row");

    const containerWidth = this.getContainerWidth();

    let columnWidths: ColumnWidths;

    if (this.columnWidths.size > 0) {
      // 저장된 컬럼 너비 사용 (리사이즈된 값 유지)
      columnWidths =
        this.columnWidthCalculator.calculateColumnWidths(containerWidth);
    } else {
      // 저장된 너비가 없을 때만 계산
      columnWidths =
        this.columnWidthCalculator.calculateColumnWidths(containerWidth);

      // 초기 렌더링 시 계산된 컬럼 너비를 저장 (리사이즈 전 기본값)
      // 마지막 컬럼은 저장하지 않음 (항상 동적으로 계산)
      this.columnWidths.set("key", columnWidths.key);
      this.columnWidths.set("context", columnWidths.context);
      this.options.languages.slice(0, -1).forEach((lang, index) => {
        const langWidth = columnWidths.languages[index]!;
        this.columnWidths.set(`values.${lang}`, langWidth);
      });
    }

    // 전체 너비는 항상 컨테이너 너비와 일치 (마지막 컬럼이 끝까지 채워짐)
    const totalWidth = containerWidth;
    headerRow.style.width = `${totalWidth}px`;
    headerRow.style.minWidth = `${totalWidth}px`;
    headerRow.style.maxWidth = `${totalWidth}px`;

    // Key 컬럼 (sticky)
    const keyHeaderCell = this.gridRenderer.createHeaderCell(
      "Key",
      columnWidths.key,
      0,
      10,
      "key"
    );
    this.columnResizer.addResizeHandle(keyHeaderCell, "key");
    headerRow.appendChild(keyHeaderCell);

    // Context 컬럼 (sticky)
    const contextHeaderCell = this.gridRenderer.createHeaderCell(
      "Context",
      columnWidths.context,
      columnWidths.key,
      10,
      "context"
    );
    this.columnResizer.addResizeHandle(contextHeaderCell, "context");
    headerRow.appendChild(contextHeaderCell);

    // 언어 컬럼들
    this.options.languages.forEach((lang, index) => {
      const langWidth = columnWidths.languages[index]!;
      const columnId = `values.${lang}`;
      const headerCell = this.gridRenderer.createHeaderCell(
        lang.toUpperCase(),
        langWidth,
        0,
        0,
        columnId
      );
      this.columnResizer.addResizeHandle(headerCell, columnId);
      headerRow.appendChild(headerCell);
    });

    this.headerElement.appendChild(headerRow);
  }

  /**
   * 특정 컬럼의 너비를 모든 셀에 적용
   * 마지막 컬럼은 항상 끝까지 채워지도록 함
   */
  private applyColumnWidth(columnId: string, width: number): void {
    const containerWidth = this.getContainerWidth();
    const { columnWidths, totalWidth } =
      this.columnWidthCalculator.applyColumnWidth(
        columnId,
        width,
        containerWidth
      );

    // 헤더 셀 업데이트
    if (this.headerElement) {
      const headerRow = this.headerElement.querySelector(
        ".virtual-grid-header-row"
      ) as HTMLElement | null;
      if (headerRow) {
        headerRow.style.width = `${totalWidth}px`;
        headerRow.style.minWidth = `${totalWidth}px`;
        headerRow.style.maxWidth = `${totalWidth}px`;
      }

      const keyHeaderCell = this.headerElement.querySelector(
        '[data-column-id="key"]'
      ) as HTMLElement | null;
      if (keyHeaderCell) {
        keyHeaderCell.style.width = `${columnWidths.key}px`;
        keyHeaderCell.style.minWidth = `${columnWidths.key}px`;
        keyHeaderCell.style.maxWidth = `${columnWidths.key}px`;
      }

      const contextHeaderCell = this.headerElement.querySelector(
        '[data-column-id="context"]'
      ) as HTMLElement | null;
      if (contextHeaderCell) {
        contextHeaderCell.style.width = `${columnWidths.context}px`;
        contextHeaderCell.style.minWidth = `${columnWidths.context}px`;
        contextHeaderCell.style.maxWidth = `${columnWidths.context}px`;
        contextHeaderCell.style.left = `${columnWidths.key}px`;
      }

      this.options.languages.forEach((lang, index) => {
        const langHeaderCell = this.headerElement!.querySelector(
          `[data-column-id="values.${lang}"]`
        ) as HTMLElement | null;
        if (langHeaderCell) {
          const langWidth = columnWidths.languages[index]!;
          langHeaderCell.style.width = `${langWidth}px`;
          langHeaderCell.style.minWidth = `${langWidth}px`;
          langHeaderCell.style.maxWidth = `${langWidth}px`;
        }
      });
    }

    // 바디 셀 업데이트
    if (this.bodyElement) {
      const rows = this.bodyElement.querySelectorAll(".virtual-grid-row");
      rows.forEach((row) => {
        const htmlRow = row as HTMLElement;
        htmlRow.style.width = `${totalWidth}px`;
        htmlRow.style.minWidth = `${totalWidth}px`;
        htmlRow.style.maxWidth = `${totalWidth}px`;
      });

      const keyCells = this.bodyElement.querySelectorAll(
        '[data-column-id="key"]'
      );
      keyCells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = `${columnWidths.key}px`;
        htmlCell.style.minWidth = `${columnWidths.key}px`;
        htmlCell.style.maxWidth = `${columnWidths.key}px`;
      });

      const contextCells = this.bodyElement.querySelectorAll(
        '[data-column-id="context"]'
      );
      contextCells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = `${columnWidths.context}px`;
        htmlCell.style.minWidth = `${columnWidths.context}px`;
        htmlCell.style.maxWidth = `${columnWidths.context}px`;
        htmlCell.style.left = `${columnWidths.key}px`;
      });

      this.options.languages.forEach((lang, index) => {
        const langCells = this.bodyElement!.querySelectorAll(
          `[data-column-id="values.${lang}"]`
        );
        const langWidth = columnWidths.languages[index]!;
        langCells.forEach((cell) => {
          const htmlCell = cell as HTMLElement;
          htmlCell.style.width = `${langWidth}px`;
          htmlCell.style.minWidth = `${langWidth}px`;
          htmlCell.style.maxWidth = `${langWidth}px`;
        });
      });
    }
  }

  /**
   * 헤더에서 실제 컬럼 너비 가져오기
   */
  private getColumnWidthsFromHeader(): {
    key: number;
    context: number;
    languages: number[];
  } | null {
    if (!this.headerElement) {
      return null;
    }

    const headerRow = this.headerElement.querySelector(
      ".virtual-grid-header-row"
    );
    if (!headerRow) {
      return null;
    }

    const headerCells = headerRow.querySelectorAll(".virtual-grid-header-cell");
    const widths: { key: number; context: number; languages: number[] } = {
      key: 0,
      context: 0,
      languages: [],
    };

    headerCells.forEach((headerCell) => {
      const columnId = headerCell.getAttribute("data-column-id");
      const actualWidth =
        (headerCell as HTMLElement).offsetWidth ||
        (headerCell as HTMLElement).getBoundingClientRect().width;

      if (columnId === "key") {
        widths.key = actualWidth;
      } else if (columnId === "context") {
        widths.context = actualWidth;
      } else if (columnId && columnId.startsWith("values.")) {
        widths.languages.push(actualWidth);
      }
    });

    // 모든 너비가 유효한지 확인
    if (
      widths.key > 0 &&
      widths.context > 0 &&
      widths.languages.length === this.options.languages.length
    ) {
      return widths;
    }

    return null;
  }

  /**
   * 편집 시작
   */
  private startEditing(
    rowIndex: number,
    columnId: string,
    cell: HTMLElement
  ): void {
    // 읽기 전용 모드 체크
    if (this.options.readOnly) {
      // 읽기 전용 모드에서는 언어 컬럼만 편집 불가
      // Key와 Context는 읽기 전용 모드에서도 편집 가능
      if (columnId.startsWith("values.")) {
        return;
      }
    }

    const rowId = cell.getAttribute("data-row-id");
    if (!rowId) return;

    this.cellEditor.startEditing(rowIndex, columnId, rowId, cell);
  }

  /**
   * 편집 중지
   */
  private stopEditing(): void {
    this.cellEditor.stopEditing(this.bodyElement || undefined);
  }

  /**
   * 셀 스타일 업데이트
   */
  private updateCellStyle(
    rowId: string,
    columnId: string,
    cell?: HTMLElement
  ): void {
    if (!this.bodyElement) return;

    const targetCell =
      cell ||
      (this.bodyElement.querySelector(
        `[data-row-id="${rowId}"][data-column-id="${columnId}"]`
      ) as HTMLElement);

    if (!targetCell) return;

    // Dirty 상태 확인
    const changeKey = `${rowId}-${columnId}`;
    const changesMap = this.changeTracker.getChangesMap();
    const isDirty = changesMap.has(changeKey);

    if (isDirty) {
      targetCell.classList.add("cell-dirty");
    } else {
      targetCell.classList.remove("cell-dirty");
    }

    // Empty 상태 확인
    if (columnId.startsWith("values.")) {
      const translation = this.options.translations.find((t) => t.id === rowId);
      if (translation) {
        const lang = columnId.replace("values.", "");
        const value = translation.values[lang] || "";
        if (!value || (typeof value === "string" && value.trim() === "")) {
          targetCell.classList.add("cell-empty");
        } else {
          targetCell.classList.remove("cell-empty");
        }
      }
    }
  }

  /**
   * 키보드 이벤트 리스너 추가
   */
  private attachKeyboardListeners(): void {
    // Modifier 키 추적 시작
    this.modifierKeyTracker.attach();

    // KeyboardHandler 시작
    this.keyboardHandlerModule.attach();
  }

  /**
   * 셀에 포커스 설정
   */
  private focusCell(rowIndex: number, columnId: string): void {
    if (!this.bodyElement) return;

    const cell = this.bodyElement.querySelector(
      `[data-row-index="${rowIndex}"][data-column-id="${columnId}"]`
    ) as HTMLElement;

    if (cell) {
      cell.focus();
      this.focusManager.focusCell(rowIndex, columnId);
    }
  }

  /**
   * Undo 처리
   */
  private handleUndo(): void {
    if (!this.undoRedoManager.canUndo()) {
      console.log("VirtualTableDiv: Cannot undo - no history");
      return;
    }

    const action = this.undoRedoManager.undo();
    if (!action) {
      console.log("VirtualTableDiv: Undo returned null");
      return;
    }

    this.applyUndoRedoAction(action);
  }

  /**
   * Redo 처리
   */
  private handleRedo(): void {
    if (!this.undoRedoManager.canRedo()) {
      console.log("VirtualTableDiv: Cannot redo - no future history");
      return;
    }

    const action = this.undoRedoManager.redo();
    if (!action) {
      console.log("VirtualTableDiv: Redo returned null");
      return;
    }

    this.applyUndoRedoAction(action);
  }

  /**
   * Undo/Redo 액션 적용
   */
  private applyUndoRedoAction(action: UndoRedoAction): void {
    if (action.type !== "cell-change") {
      console.log("VirtualTableDiv: Invalid action type", action.type);
      return;
    }

    // 편집 중이면 종료
    if (this.cellEditor.isEditing()) {
      this.stopEditing();
    }

    // 실제 Translation 데이터 업데이트
    const translation = this.options.translations.find(
      (t) => t.id === action.rowId
    );
    if (!translation) {
      console.error("VirtualTableDiv: Translation not found", action.rowId);
      return;
    }

    // readonly 타입을 우회하기 위해 타입 단언 사용
    const mutableTranslation = translation as any;
    if (action.columnId === "key") {
      mutableTranslation.key = action.newValue;
    } else if (action.columnId === "context") {
      mutableTranslation.context = action.newValue;
    } else if (action.columnId.startsWith("values.")) {
      const lang = action.columnId.replace("values.", "");
      mutableTranslation.values[lang] = action.newValue;
    } else {
      console.error("VirtualTableDiv: Invalid columnId", action.columnId);
      return;
    }

    // DOM 셀 찾기 (가상 스크롤링으로 인해 화면에 없을 수 있음)
    const cell = this.bodyElement?.querySelector(
      `[data-row-id="${action.rowId}"][data-column-id="${action.columnId}"]`
    ) as HTMLElement;
    // 셀이 화면에 있으면 업데이트
    if (cell) {
      const rowIndexAttr = cell.getAttribute("data-row-index");
      const rowIndex = rowIndexAttr ? parseInt(rowIndexAttr, 10) : 0;
      this.gridRenderer.updateCellContent(
        cell,
        action.rowId,
        action.columnId,
        action.newValue,
        rowIndex
      );
    } else {
      // 화면에 없으면 스타일만 업데이트 (다음 렌더링 시 반영됨)
      this.updateCellStyle(action.rowId, action.columnId);
    }

    // 변경사항 추적
    const originalValue = this.changeTracker.getOriginalValue(
      action.rowId,
      action.columnId
    );
    const lang = getLangFromColumnId(action.columnId);
    const translationKey = getTranslationKey(
      this.options.translations,
      action.rowId,
      action.columnId,
      action.newValue
    );

    this.changeTracker.trackChange(
      action.rowId,
      action.columnId,
      lang,
      originalValue,
      action.newValue,
      translationKey,
      () => {
        this.updateCellStyle(action.rowId, action.columnId);
      }
    );

    // onCellChange 콜백 호출
    if (this.options.onCellChange) {
      this.options.onCellChange(action.rowId, action.columnId, action.newValue);
    }

    // 가상 스크롤링으로 인해 화면 밖에 있는 경우를 위해 행 다시 렌더링
    if (this.rowVirtualizer && this.bodyElement) {
      this.renderVirtualRows();
    }
  }

  /**
   * 컨테이너 너비 가져오기
   */
  private getContainerWidth(): number {
    if (this.container && this.container.clientWidth > 0) {
      return this.container.clientWidth;
    }
    return typeof window !== "undefined" ? window.innerWidth : 1000;
  }

  /**
   * 읽기 전용 모드 설정
   */
  setReadOnly(readOnly: boolean): void {
    this.options = { ...this.options, readOnly };

    // GridRenderer의 readOnly 옵션도 업데이트
    this.gridRenderer = new GridRenderer({
      languages: this.options.languages,
      readOnly: readOnly,
      editableColumns: this.editableColumns,
      callbacks: {
        onCellDblClick: (rowIndex, columnId, cell) => {
          this.startEditing(rowIndex, columnId, cell);
        },
        onCellFocus: (rowIndex, columnId) => {
          this.focusManager.focusCell(rowIndex, columnId);
        },
        updateCellStyle: (rowId, columnId, cell) => {
          this.updateCellStyle(rowId, columnId, cell);
        },
      },
    });

    if (this.gridElement) {
      if (readOnly) {
        this.gridElement.classList.add("readonly");
      } else {
        this.gridElement.classList.remove("readonly");
      }
    }

    // 모든 셀의 tabindex 업데이트
    if (this.bodyElement) {
      const cells = this.bodyElement.querySelectorAll(".virtual-grid-cell");
      cells.forEach((cell) => {
        const columnId = cell.getAttribute("data-column-id");
        const editable = columnId && this.editableColumns.has(columnId);
        // 읽기 전용 모드에서는 언어 컬럼만 tabindex -1, Key/Context는 여전히 편집 가능
        if (readOnly && columnId && columnId.startsWith("values.")) {
          cell.setAttribute("tabindex", "-1");
        } else {
          cell.setAttribute(
            "tabindex",
            editable && !readOnly ? "0" : editable ? "0" : "-1"
          );
        }
      });
    }

    // 바디 다시 렌더링하여 새로운 GridRenderer 옵션 적용
    // 이렇게 하면 모든 셀이 새로운 readOnly 옵션으로 다시 생성됨
    if (this.bodyElement && this.rowVirtualizer) {
      this.renderVirtualRows();
    }
  }

  /**
   * 변경사항 목록 반환
   */
  getChanges(): TranslationChange[] {
    return this.changeTracker.getChanges();
  }

  /**
   * 변경사항 초기화
   */
  clearChanges(): void {
    this.changeTracker.clearChanges((rowId, field) => {
      this.updateCellStyle(rowId, field);
    });
  }

  /**
   * 그리드 정리
   */
  destroy(): void {
    // KeyboardHandler 해제
    if (this.keyboardHandlerModule) {
      this.keyboardHandlerModule.detach();
    }

    // ModifierKeyTracker 해제
    if (this.modifierKeyTracker) {
      this.modifierKeyTracker.detach();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.virtualizerCleanup) {
      this.virtualizerCleanup();
      this.virtualizerCleanup = null;
    }

    if (this.scrollElement && this.container.contains(this.scrollElement)) {
      this.container.removeChild(this.scrollElement);
    }

    this.scrollElement = null;
    this.gridElement = null;
    this.headerElement = null;
    this.bodyElement = null;
    this.rowVirtualizer = null;
  }
}
