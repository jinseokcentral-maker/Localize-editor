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
import { CommandPalette } from "./command-palette";
import { CommandRegistry, type EditorMode } from "./command-registry";
import { TextSearchMatcher, type SearchMatch } from "./text-search-matcher";
import {
  QuickSearch,
  parseSearchQuery,
  type QuickSearchMatch,
} from "./quick-search";
import { QuickSearchUI } from "./quick-search-ui";
import { StatusBar } from "./status-bar";
import { FindReplace, type FindMatch } from "./find-replace";
import "@/styles/virtual-table-div.css";
import "@/styles/quick-search.css";
import "@/styles/status-bar.css";

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
  private commandRegistry: CommandRegistry;
  private commandPalette: CommandPalette;
  private currentMode: EditorMode = "excel";

  // 컬럼 리사이즈 관련 상태
  private columnMinWidths: Map<string, number> = new Map();

  // 필터 관련 상태
  private originalTranslations: readonly Translation[] = [];
  private currentFilter: "none" | "empty" | "changed" | "duplicate" | "search" =
    "none";
  private currentSearchKeyword: string = "";

  // Goto 텍스트 검색 관련 상태
  private currentGotoMatches: {
    keyword: string;
    matches: SearchMatch[];
    currentIndex: number;
  } | null = null;

  // 빠른 검색 관련 상태
  private quickSearch: QuickSearch | null = null;
  private quickSearchUI: QuickSearchUI | null = null;
  private currentQuickSearchMatches: QuickSearchMatch[] = [];
  private currentQuickSearchIndex: number = -1;

  // 상태바
  private statusBar: StatusBar | null = null;

  // 찾기/바꾸기
  private findReplace: FindReplace | null = null;

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

    // 원본 데이터 보관 (필터링용)
    this.originalTranslations = [...options.translations];

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
        onCellChange: (id, columnId, value) => {
          // 상태바 업데이트 (변경사항 수 변경)
          this.updateStatusBar();
          // 원래 콜백 호출
          if (options.onCellChange) {
            options.onCellChange(id, columnId, value);
          }
        },
        onEditStateChange: () => {
          this.updateStatusBar();
        },
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

    // CommandRegistry 초기화
    this.commandRegistry = new CommandRegistry({
      onCommandExecuted: () => {
        // 명령 실행 후 추가 처리 (필요 시)
      },
    });

    // 기본 명령어 등록
    this.registerDefaultCommands();

    // CommandPalette 초기화
    // QuickSearch 초기화
    this.quickSearch = new QuickSearch({
      translations: options.translations,
      languages: options.languages,
    });

    this.quickSearchUI = new QuickSearchUI(this.container, {
      onSearch: (query) => {
        this.handleQuickSearch(query);
      },
      onClose: () => {
        this.closeQuickSearch();
      },
      onNextMatch: () => {
        this.goToNextQuickSearchMatch();
      },
      onPrevMatch: () => {
        this.goToPrevQuickSearchMatch();
      },
    });

    this.commandPalette = new CommandPalette(this.commandRegistry, {
      onCommandExecute: () => {
        // 명령 실행 후 처리
      },
      onClose: () => {
        // 팔레트 닫힘 후 포커스 복원
        if (this.bodyElement) {
          const focusedCell = this.focusManager.getFocusedCell();
          if (focusedCell) {
            this.focusCell(focusedCell.rowIndex, focusedCell.columnId);
          }
        }
      },
      onFindMatches: (keyword: string) => {
        return this.findMatches(keyword);
      },
      onGotoMatch: (match) => {
        this.gotoToMatch(match);
        // 검색 결과 저장 (goto next/prev를 위해)
        const palette = this.commandPalette as any;
        const matches = palette?.fuzzyFindResults || [];
        const matchIndex = matches.findIndex(
          (m: SearchMatch) => m.rowIndex === match.rowIndex
        );

        this.currentGotoMatches = {
          keyword: palette?.fuzzyFindQuery || "",
          matches: matches,
          currentIndex: matchIndex !== -1 ? matchIndex : 0,
        };
      },
    });

    // KeyboardHandler 초기화
    this.keyboardHandlerModule = new KeyboardHandler(
      this.modifierKeyTracker,
      this.focusManager,
      {
        onUndo: () => this.handleUndo(),
        onRedo: () => this.handleRedo(),
        onStartEditing: (rowIndex, columnId) => {
          this.startEditingFromKeyboard(rowIndex, columnId);
        },
        getAllColumns: () => [
          "key",
          "context",
          ...options.languages.map((lang) => `values.${lang}`),
        ],
        getMaxRowIndex: () => options.translations.length - 1,
        focusCell: (rowIndex, columnId) => {
          this.focusCell(rowIndex, columnId);
        },
        onOpenCommandPalette: (mode) => {
          this.commandPalette.open(mode as EditorMode);
        },
        onOpenQuickSearch: () => {
          this.openQuickSearch();
        },
        onQuickSearchNext: () => {
          this.goToNextQuickSearchMatch();
        },
        onQuickSearchPrev: () => {
          this.goToPrevQuickSearchMatch();
        },
        isQuickSearchMode: () => {
          return this.quickSearchUI?.isSearchMode() || false;
        },
        isEditableColumn: (columnId) => {
          return this.editableColumns.has(columnId);
        },
        isReadOnly: () => {
          return this.options.readOnly || false;
        },
        onOpenFind: () => {
          this.openFindReplace("find");
        },
        onOpenReplace: () => {
          this.openFindReplace("replace");
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
          this.updateStatusBar();
        },
        updateCellStyle: (rowId, columnId, cell) => {
          this.updateCellStyle(rowId, columnId, cell);
        },
      },
    });

    // FindReplace 초기화
    this.findReplace = new FindReplace({
      translations: options.translations,
      languages: options.languages,
      onFind: (matches) => {
        if (matches.length > 0) {
          const match = matches[0];
          this.gotoToFindMatch(match);
        }
      },
      onReplace: (match, replacement) => {
        this.replaceFindMatch(match, replacement);
      },
      onReplaceAll: (matches, replacement) => {
        this.replaceAllFindMatches(matches, replacement);
      },
      onClose: () => {
        // 찾기/바꾸기 닫힘 후 처리
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

    // 상태바 초기화
    this.initStatusBar();
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
      count: this.getFilteredTranslations().length,
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
            headerWidths.rowNumber +
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
            rowNumber: headerWidths.rowNumber,
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
      const filteredTranslations = this.getFilteredTranslations();
      const translation = filteredTranslations[virtualItem.index];
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

      // 빠른 검색 하이라이트 적용
      this.applyQuickSearchHighlight(row, virtualItem.index);

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
      this.columnWidths.set("row-number", columnWidths.rowNumber);
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

    // 행 번호 헤더 (sticky, 맨 왼쪽)
    const rowNumberHeaderCell = this.gridRenderer.createHeaderCell(
      "",
      columnWidths.rowNumber,
      0,
      15, // 가장 높은 z-index
      "row-number"
    );
    rowNumberHeaderCell.classList.add("row-number-header");
    headerRow.appendChild(rowNumberHeaderCell);

    // Key 컬럼 (sticky)
    const keyHeaderCell = this.gridRenderer.createHeaderCell(
      "Key",
      columnWidths.key,
      columnWidths.rowNumber, // 행 번호 컬럼 너비만큼 left 오프셋
      10,
      "key"
    );
    this.columnResizer.addResizeHandle(keyHeaderCell, "key");
    headerRow.appendChild(keyHeaderCell);

    // Context 컬럼 (sticky)
    const contextHeaderCell = this.gridRenderer.createHeaderCell(
      "Context",
      columnWidths.context,
      columnWidths.rowNumber + columnWidths.key, // 행 번호 + Key 너비만큼 left 오프셋
      10,
      "context"
    );
    this.columnResizer.addResizeHandle(contextHeaderCell, "context");
    headerRow.appendChild(contextHeaderCell);

    // 언어 컬럼들
    this.options.languages.forEach((lang, index) => {
      const langWidth = columnWidths.languages[index]!;
      const columnId = `values.${lang}`;
      const leftOffset =
        columnWidths.rowNumber + columnWidths.key + columnWidths.context;
      const headerCell = this.gridRenderer.createHeaderCell(
        lang.toUpperCase(),
        langWidth,
        leftOffset,
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

      const rowNumberHeaderCell = this.headerElement.querySelector(
        '[data-column-id="row-number"]'
      ) as HTMLElement | null;
      if (rowNumberHeaderCell) {
        rowNumberHeaderCell.style.width = `${columnWidths.rowNumber}px`;
        rowNumberHeaderCell.style.minWidth = `${columnWidths.rowNumber}px`;
        rowNumberHeaderCell.style.maxWidth = `${columnWidths.rowNumber}px`;
      }

      const keyHeaderCell = this.headerElement.querySelector(
        '[data-column-id="key"]'
      ) as HTMLElement | null;
      if (keyHeaderCell) {
        keyHeaderCell.style.width = `${columnWidths.key}px`;
        keyHeaderCell.style.minWidth = `${columnWidths.key}px`;
        keyHeaderCell.style.maxWidth = `${columnWidths.key}px`;
        keyHeaderCell.style.left = `${columnWidths.rowNumber}px`;
      }

      const contextHeaderCell = this.headerElement.querySelector(
        '[data-column-id="context"]'
      ) as HTMLElement | null;
      if (contextHeaderCell) {
        contextHeaderCell.style.width = `${columnWidths.context}px`;
        contextHeaderCell.style.minWidth = `${columnWidths.context}px`;
        contextHeaderCell.style.maxWidth = `${columnWidths.context}px`;
        contextHeaderCell.style.left = `${
          columnWidths.rowNumber + columnWidths.key
        }px`;
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
          const leftOffset =
            columnWidths.rowNumber + columnWidths.key + columnWidths.context;
          langHeaderCell.style.left = `${leftOffset}px`;
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

      const rowNumberCells = this.bodyElement.querySelectorAll(
        '[data-column-id="row-number"]'
      );
      rowNumberCells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = `${columnWidths.rowNumber}px`;
        htmlCell.style.minWidth = `${columnWidths.rowNumber}px`;
        htmlCell.style.maxWidth = `${columnWidths.rowNumber}px`;
      });

      const keyCells = this.bodyElement.querySelectorAll(
        '[data-column-id="key"]'
      );
      keyCells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = `${columnWidths.key}px`;
        htmlCell.style.minWidth = `${columnWidths.key}px`;
        htmlCell.style.maxWidth = `${columnWidths.key}px`;
        htmlCell.style.left = `${columnWidths.rowNumber}px`;
      });

      const contextCells = this.bodyElement.querySelectorAll(
        '[data-column-id="context"]'
      );
      contextCells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = `${columnWidths.context}px`;
        htmlCell.style.minWidth = `${columnWidths.context}px`;
        htmlCell.style.maxWidth = `${columnWidths.context}px`;
        htmlCell.style.left = `${columnWidths.rowNumber + columnWidths.key}px`;
      });

      this.options.languages.forEach((lang, index) => {
        const langCells = this.bodyElement!.querySelectorAll(
          `[data-column-id="values.${lang}"]`
        );
        const langWidth = columnWidths.languages[index]!;
        const leftOffset =
          columnWidths.rowNumber + columnWidths.key + columnWidths.context;
        langCells.forEach((cell) => {
          const htmlCell = cell as HTMLElement;
          htmlCell.style.width = `${langWidth}px`;
          htmlCell.style.minWidth = `${langWidth}px`;
          htmlCell.style.maxWidth = `${langWidth}px`;
          htmlCell.style.left = `${leftOffset}px`;
        });
      });
    }
  }

  /**
   * 헤더에서 실제 컬럼 너비 가져오기
   */
  private getColumnWidthsFromHeader(): {
    rowNumber: number;
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
    const widths: {
      rowNumber: number;
      key: number;
      context: number;
      languages: number[];
    } = {
      rowNumber: 0,
      key: 0,
      context: 0,
      languages: [],
    };

    headerCells.forEach((headerCell) => {
      const columnId = headerCell.getAttribute("data-column-id");
      const actualWidth =
        (headerCell as HTMLElement).offsetWidth ||
        (headerCell as HTMLElement).getBoundingClientRect().width;

      if (columnId === "row-number") {
        widths.rowNumber = actualWidth;
      } else if (columnId === "key") {
        widths.key = actualWidth;
      } else if (columnId === "context") {
        widths.context = actualWidth;
      } else if (columnId && columnId.startsWith("values.")) {
        widths.languages.push(actualWidth);
      }
    });

    // 모든 너비가 유효한지 확인
    if (
      widths.rowNumber > 0 &&
      widths.key > 0 &&
      widths.context > 0 &&
      widths.languages.length === this.options.languages.length
    ) {
      return widths;
    }

    return null;
  }

  /**
   * 편집 시작 (더블클릭 또는 키보드)
   */
  private startEditing(
    rowIndex: number,
    columnId: string,
    cell: HTMLElement
  ): void {
    // 읽기 전용 모드에서는 모든 셀 편집 불가
    if (this.options.readOnly) {
      return;
    }

    const rowId = cell.getAttribute("data-row-id");
    if (!rowId) return;

    this.cellEditor.startEditing(rowIndex, columnId, rowId, cell);

    // 상태바 업데이트 (편집 모드로 변경)
    this.updateStatusBar();
  }

  /**
   * 키보드로 편집 시작 (F2 또는 Enter)
   */
  private startEditingFromKeyboard(rowIndex: number, columnId: string): void {
    if (!this.bodyElement) return;

    // 편집 가능한 컬럼인지 확인
    if (!this.editableColumns.has(columnId)) {
      return;
    }

    // 읽기 전용 모드 확인
    if (this.options.readOnly) {
      return;
    }

    // 셀 찾기
    const cell = this.bodyElement.querySelector(
      `[data-row-index="${rowIndex}"][data-column-id="${columnId}"]`
    ) as HTMLElement;

    if (cell) {
      this.startEditing(rowIndex, columnId, cell);
    }
  }

  /**
   * 편집 중지
   */
  private stopEditing(): void {
    this.cellEditor.stopEditing(this.bodyElement || undefined);

    // 상태바 업데이트 (Normal 모드로 변경)
    this.updateStatusBar();
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

    // 먼저 FocusManager에 포커스 상태 저장
    this.focusManager.focusCell(rowIndex, columnId);

    // 상태바 업데이트
    this.updateStatusBar();

    // 셀이 DOM에 있는지 확인
    let cell = this.bodyElement.querySelector(
      `[data-row-index="${rowIndex}"][data-column-id="${columnId}"]`
    ) as HTMLElement;

    // 셀이 없으면 (가상 스크롤링으로 인해 아직 렌더링되지 않음) 스크롤하여 보이게 함
    if (!cell && this.rowVirtualizer) {
      // 스크롤 수행
      this.rowVirtualizer.scrollToIndex(rowIndex, {
        align: "start",
        behavior: "auto",
      });

      // 스크롤 후 즉시 렌더링 강제 (가능한 경우)
      if (this.renderScheduled === false) {
        this.renderVirtualRows();
      }

      // 스크롤 후 셀이 렌더링될 때까지 대기 (여러 프레임 기다림)
      const tryFocus = (attempts: number = 0) => {
        if (attempts > 20) return; // 최대 20번 시도 (약 1초)

        // 즉시 한 번 확인
        cell = this.bodyElement!.querySelector(
          `[data-row-index="${rowIndex}"][data-column-id="${columnId}"]`
        ) as HTMLElement;

        if (cell) {
          // 셀을 찾았으면 포커스 설정
          cell.focus();
          // 포커스 이벤트가 발생하도록 강제
          cell.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
          return;
        }

        // 아직 렌더링되지 않았으면 다음 프레임에서 다시 시도
        requestAnimationFrame(() => {
          tryFocus(attempts + 1);
        });
      };

      // 즉시 한 번 시도
      tryFocus(0);
    } else if (cell) {
      // 셀이 이미 있으면 바로 포커스
      cell.focus();
      // 포커스 이벤트가 발생하도록 강제
      cell.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
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

    // 상태바 업데이트 (변경사항 수 변경/포커스 유지)
    this.updateStatusBar();
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

    // 상태바 업데이트 (변경사항 수 변경)
    this.updateStatusBar();
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
        // 읽기 전용 모드에서는 모든 셀 편집 불가
        if (readOnly) {
          cell.setAttribute("tabindex", "-1");
        } else {
          cell.setAttribute("tabindex", editable ? "0" : "-1");
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
   * 기본 명령어 등록
   */
  private registerDefaultCommands(): void {
    // Goto 명령
    this.commandRegistry.registerCommand({
      id: "goto",
      label: "Go to Row",
      keywords: ["goto", "go", "row", "line", "jump", "top", "bottom"],
      category: "navigation",
      description: "Navigate to a specific row number, or use 'top'/'bottom'",
      execute: (args) => {
        if (args && args.length > 0) {
          const arg = args[0].toLowerCase();

          // "top" 또는 "first" 키워드 처리
          if (arg === "top" || arg === "first" || arg === "1") {
            this.gotoTop();
            return;
          }

          // "bottom" 또는 "last" 키워드 처리
          if (arg === "bottom" || arg === "last") {
            this.gotoBottom();
            return;
          }

          // 숫자 처리
          const rowIndex = parseInt(args[0], 10);
          if (!isNaN(rowIndex) && rowIndex > 0) {
            this.gotoRow(rowIndex - 1); // 1-based to 0-based
          }
        }
      },
    });

    // Goto Next 명령
    this.commandRegistry.registerCommand({
      id: "goto-next",
      label: "Go to Next Match",
      keywords: ["goto", "next", "match", "forward"],
      category: "navigation",
      description: "Navigate to the next search match",
      execute: () => {
        this.gotoToNextMatch();
      },
    });

    // Goto Prev 명령
    this.commandRegistry.registerCommand({
      id: "goto-prev",
      label: "Go to Previous Match",
      keywords: ["goto", "prev", "previous", "back", "backward"],
      category: "navigation",
      description: "Navigate to the previous search match",
      execute: () => {
        this.gotoToPrevMatch();
      },
    });

    // Search 명령
    this.commandRegistry.registerCommand({
      id: "search",
      label: "Search",
      keywords: ["search", "find", "query"],
      category: "filter",
      description: "Search for keywords in translations",
      execute: (args) => {
        if (args && args.length > 0) {
          const keyword = args.join(" ");
          this.searchKeyword(keyword);
        }
      },
    });

    // Filter Empty
    this.commandRegistry.registerCommand({
      id: "filter-empty",
      label: "Filter: Empty Translations",
      keywords: ["filter", "empty", "blank", "missing"],
      category: "filter",
      description: "Show only rows with empty translations",
      execute: () => {
        this.filterEmpty();
      },
    });

    // Filter Changed
    this.commandRegistry.registerCommand({
      id: "filter-changed",
      label: "Filter: Changed Cells",
      keywords: ["filter", "changed", "dirty", "modified"],
      category: "filter",
      description: "Show only rows with changed cells",
      execute: () => {
        this.filterChanged();
      },
    });

    // Filter Duplicate
    this.commandRegistry.registerCommand({
      id: "filter-duplicate",
      label: "Filter: Duplicate Keys",
      keywords: ["filter", "duplicate", "dupe"],
      category: "filter",
      description: "Show only rows with duplicate keys",
      execute: () => {
        this.filterDuplicate();
      },
    });

    // Clear Filter
    this.commandRegistry.registerCommand({
      id: "clear-filter",
      label: "Clear Filter",
      keywords: ["clear", "filter", "reset", "show", "all"],
      category: "filter",
      description: "Clear all filters and show all rows",
      execute: () => {
        this.clearFilter();
      },
    });

    // Undo
    this.commandRegistry.registerCommand({
      id: "undo",
      label: "Undo",
      keywords: ["undo", "revert"],
      shortcut: "Cmd+Z",
      category: "edit",
      description: "Undo last action",
      execute: () => {
        this.handleUndo();
      },
    });

    // Redo
    this.commandRegistry.registerCommand({
      id: "redo",
      label: "Redo",
      keywords: ["redo", "repeat"],
      shortcut: "Cmd+Y",
      category: "edit",
      description: "Redo last undone action",
      execute: () => {
        this.handleRedo();
      },
    });

    // Toggle Read Only
    this.commandRegistry.registerCommand({
      id: "readonly",
      label: "Toggle Read Only",
      keywords: ["readonly", "read", "only", "lock", "unlock"],
      category: "edit",
      description: "Toggle read-only mode",
      execute: () => {
        const newReadOnly = !this.options.readOnly;
        this.setReadOnly(newReadOnly);
      },
    });

    // Help
    this.commandRegistry.registerCommand({
      id: "help",
      label: "Show Help",
      keywords: ["help", "?", "documentation", "docs"],
      category: "help",
      description: "Show keyboard shortcuts and help",
      execute: () => {
        this.showHelp();
      },
    });
  }

  /**
   * 특정 행으로 이동
   */
  private gotoRow(rowIndex: number): void {
    const filteredTranslations = this.getFilteredTranslations();
    if (rowIndex < 0 || rowIndex >= filteredTranslations.length) {
      return;
    }

    // 가상 스크롤러로 스크롤
    if (this.rowVirtualizer) {
      this.rowVirtualizer.scrollToIndex(rowIndex, {
        align: "start",
        behavior: "smooth",
      });
    }

    // 첫 번째 편집 가능한 컬럼에 포커스
    const columns = [
      "key",
      "context",
      ...this.options.languages.map((lang) => `values.${lang}`),
    ];
    const firstEditableColumn = columns.find((col) =>
      this.editableColumns.has(col)
    );
    if (firstEditableColumn) {
      // 스크롤이 완료될 때까지 충분한 시간 대기
      setTimeout(() => {
        this.focusCell(rowIndex, firstEditableColumn);
      }, 300);
    }
  }

  /**
   * 첫 번째 행으로 이동
   */
  private gotoTop(): void {
    this.gotoRow(0);
  }

  /**
   * 마지막 행으로 이동
   */
  private gotoBottom(): void {
    const filteredTranslations = this.getFilteredTranslations();
    if (filteredTranslations.length > 0) {
      this.gotoRow(filteredTranslations.length - 1);
    }
  }

  /**
   * 텍스트로 매치 찾기 (fuzzy find)
   * @param keyword 검색 키워드
   * @returns 매치 결과 배열 (점수 순으로 정렬)
   */
  findMatches(keyword: string): SearchMatch[] {
    // 필터링된 translations로 매처 생성
    const filteredTranslations = this.getFilteredTranslations();
    const matcher = new TextSearchMatcher({
      translations: filteredTranslations,
      languages: this.options.languages,
    });

    return matcher.findMatches(keyword);
  }

  /**
   * 검색 결과의 첫 번째 매치로 이동
   * @param match 검색 결과 매치
   */
  gotoToMatch(match: SearchMatch): void {
    this.gotoRow(match.rowIndex);

    // currentGotoMatches 업데이트 (현재 매치 인덱스 찾기)
    if (this.currentGotoMatches) {
      const matchIndex = this.currentGotoMatches.matches.findIndex(
        (m) => m.rowIndex === match.rowIndex
      );
      if (matchIndex !== -1) {
        this.currentGotoMatches.currentIndex = matchIndex;
      }
    }
  }

  /**
   * 다음 검색 결과로 이동
   */
  gotoToNextMatch(): void {
    if (
      !this.currentGotoMatches ||
      this.currentGotoMatches.matches.length === 0
    ) {
      return;
    }

    const { matches, currentIndex } = this.currentGotoMatches;
    const nextIndex = (currentIndex + 1) % matches.length; // 순환
    const nextMatch = matches[nextIndex];

    this.currentGotoMatches.currentIndex = nextIndex;
    this.gotoRow(nextMatch.rowIndex);
  }

  /**
   * 이전 검색 결과로 이동
   */
  gotoToPrevMatch(): void {
    if (
      !this.currentGotoMatches ||
      this.currentGotoMatches.matches.length === 0
    ) {
      return;
    }

    const { matches, currentIndex } = this.currentGotoMatches;
    const prevIndex =
      currentIndex === 0 ? matches.length - 1 : currentIndex - 1; // 순환
    const prevMatch = matches[prevIndex];

    this.currentGotoMatches.currentIndex = prevIndex;
    this.gotoRow(prevMatch.rowIndex);
  }

  /**
   * 찾기/바꾸기 열기
   */
  private openFindReplace(mode: "find" | "replace"): void {
    if (!this.findReplace) return;
    this.findReplace.open(mode);
  }

  /**
   * 찾기 매칭으로 이동
   */
  private gotoToFindMatch(match: FindMatch): void {
    this.gotoRow(match.rowIndex);
    // 해당 셀에 포커스
    this.focusCell(match.rowIndex, match.columnId);
    // 편집 모드로 시작 (선택적)
    // this.startEditingFromKeyboard(match.rowIndex, match.columnId);
  }

  /**
   * 찾기 매칭 바꾸기
   */
  private replaceFindMatch(match: FindMatch, replacement: string): void {
    const translations = this.getFilteredTranslations();
    if (match.rowIndex < 0 || match.rowIndex >= translations.length) {
      return;
    }

    const translation = translations[match.rowIndex];
    let currentValue: string | null = null;

    if (match.columnId === "key") {
      currentValue = translation.key;
    } else if (match.columnId === "context") {
      currentValue = translation.context || null;
    } else if (match.columnId.startsWith("values.")) {
      const lang = match.columnId.replace("values.", "");
      currentValue = translation.values[lang] || null;
    }

    if (currentValue === null) return;

    // 매칭된 부분을 replacement로 교체
    const before = currentValue.substring(0, match.matchIndex);
    const after = currentValue.substring(match.matchIndex + match.matchLength);
    const newValue = before + replacement + after;

    // 셀 값 변경
    if (match.columnId === "key") {
      // Key는 직접 변경 불가 (readonly)
      return;
    } else if (match.columnId === "context") {
      this.cellEditor.applyChange(
        translation.id,
        "context",
        newValue,
        this.getFilteredTranslations()
      );
    } else if (match.columnId.startsWith("values.")) {
      const lang = match.columnId.replace("values.", "");
      this.cellEditor.applyChange(
        translation.id,
        `values.${lang}`,
        newValue,
        this.getFilteredTranslations()
      );
    }

    // 상태바 업데이트
    this.updateStatusBar();
    // 렌더링 업데이트
    this.scheduleRender();
  }

  /**
   * 모든 찾기 매칭 바꾸기
   */
  private replaceAllFindMatches(matches: FindMatch[], replacement: string): void {
    // 역순으로 처리하여 인덱스 변경 문제 방지
    const sortedMatches = [...matches].sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) {
        return b.rowIndex - a.rowIndex; // 행 번호 역순
      }
      return b.matchIndex - a.matchIndex; // 같은 행이면 인덱스 역순
    });

    sortedMatches.forEach((match) => {
      this.replaceFindMatch(match, replacement);
    });
  }

  /**
   * 현재 검색 매칭 정보 가져오기
   */
  getCurrentMatchInfo(): { current: number; total: number } | null {
    if (
      !this.currentGotoMatches ||
      this.currentGotoMatches.matches.length === 0
    ) {
      return null;
    }

    return {
      current: this.currentGotoMatches.currentIndex + 1, // 1-based
      total: this.currentGotoMatches.matches.length,
    };
  }

  /**
   * 필터링된 translations 반환
   */
  private getFilteredTranslations(): readonly Translation[] {
    let filtered = [...this.originalTranslations];

    // 검색 필터
    if (this.currentFilter === "search" && this.currentSearchKeyword.trim()) {
      const keyword = this.currentSearchKeyword.toLowerCase().trim();
      filtered = filtered.filter((translation) => {
        // Key 검색
        if (translation.key.toLowerCase().includes(keyword)) {
          return true;
        }
        // Context 검색
        if (translation.context?.toLowerCase().includes(keyword)) {
          return true;
        }
        // Language values 검색
        return this.options.languages.some((lang) => {
          const value = translation.values[lang] || "";
          return value.toLowerCase().includes(keyword);
        });
      });
    }

    // 빈 번역 필터
    if (this.currentFilter === "empty") {
      filtered = filtered.filter((translation) => {
        return this.options.languages.some((lang) => {
          const value = translation.values[lang] || "";
          return value.trim() === "";
        });
      });
    }

    // 변경된 셀 필터
    if (this.currentFilter === "changed") {
      filtered = filtered.filter((translation) => {
        // Key 변경 체크
        if (this.changeTracker.hasChange(translation.id, "key")) {
          return true;
        }
        // Context 변경 체크
        if (this.changeTracker.hasChange(translation.id, "context")) {
          return true;
        }
        // Language values 변경 체크
        return this.options.languages.some((lang) => {
          return this.changeTracker.hasChange(translation.id, `values.${lang}`);
        });
      });
    }

    // 중복 Key 필터
    if (this.currentFilter === "duplicate") {
      const keyCounts = new Map<string, number>();
      this.originalTranslations.forEach((t) => {
        const count = keyCounts.get(t.key) || 0;
        keyCounts.set(t.key, count + 1);
      });

      filtered = filtered.filter((translation) => {
        return (keyCounts.get(translation.key) || 0) > 1;
      });
    }

    return filtered;
  }

  /**
   * 필터링된 translations로 그리드 업데이트
   */
  private applyFilter(): void {
    // 필터링된 translations로 options 업데이트
    const filtered = this.getFilteredTranslations();
    (this.options as any).translations = filtered;

    // 가상 스크롤러 재초기화
    if (this.rowVirtualizer) {
      // Virtualizer의 count를 직접 업데이트할 수 없으므로 재생성
      this.initVirtualScrolling();
    }

    // 헤더와 바디 재렌더링
    if (this.headerElement) {
      this.headerElement.innerHTML = "";
      this.renderHeader();
    }

    this.renderVirtualRows();

    // 상태바 업데이트 (필터 변경으로 인한 행 수 변경)
    this.updateStatusBar();
  }

  /**
   * 키워드 검색
   */
  private searchKeyword(keyword: string): void {
    this.currentSearchKeyword = keyword;
    this.currentFilter = keyword.trim() ? "search" : "none";
    this.applyFilter();
  }

  /**
   * 빈 번역 필터
   */
  private filterEmpty(): void {
    this.currentFilter = "empty";
    this.currentSearchKeyword = "";
    this.applyFilter();
  }

  /**
   * 변경된 셀 필터
   */
  private filterChanged(): void {
    this.currentFilter = "changed";
    this.currentSearchKeyword = "";
    this.applyFilter();
  }

  /**
   * 중복 Key 필터
   */
  private filterDuplicate(): void {
    this.currentFilter = "duplicate";
    this.currentSearchKeyword = "";
    this.applyFilter();
  }

  /**
   * 필터 제거
   */
  private clearFilter(): void {
    this.currentFilter = "none";
    this.currentSearchKeyword = "";
    (this.options as any).translations = [...this.originalTranslations];
    this.applyFilter();
  }

  /**
   * 도움말 표시 (모달 UI)
   */
  private showHelp(): void {
    // 기존 모달이 있으면 제거
    const existingModal = document.querySelector(".help-modal-overlay");
    if (existingModal) {
      existingModal.remove();
    }

    // Help 모달 CSS 로드 (한 번만)
    if (!document.querySelector('link[href*="help-modal.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = new URL("../styles/help-modal.css", import.meta.url).href;
      document.head.appendChild(link);
    }

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "help-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Keyboard Shortcuts Help");
    overlay.setAttribute("aria-modal", "true");

    // Modal
    const modal = document.createElement("div");
    modal.className = "help-modal";

    // Header
    const header = document.createElement("div");
    header.className = "help-modal-header";

    const title = document.createElement("h2");
    title.className = "help-modal-title";
    title.textContent = "Keyboard Shortcuts";

    const closeButton = document.createElement("button");
    closeButton.className = "help-modal-close";
    closeButton.innerHTML = "×";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.onclick = () => overlay.remove();

    header.appendChild(title);
    header.appendChild(closeButton);

    // Content
    const content = document.createElement("div");
    content.className = "help-modal-content";

    // Keyboard Shortcuts Section
    const shortcutsSection = document.createElement("div");
    shortcutsSection.className = "help-modal-section";

    const shortcutsTitle = document.createElement("h3");
    shortcutsTitle.className = "help-modal-section-title";
    shortcutsTitle.textContent = "Keyboard Shortcuts";
    shortcutsSection.appendChild(shortcutsTitle);

    const shortcutsList = document.createElement("ul");
    shortcutsList.className = "help-modal-shortcut-list";

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const cmdKey = isMac ? "Cmd" : "Ctrl";

    const shortcuts = [
      { description: "Open Command Palette", keys: [cmdKey, "K"] },
      { description: "Undo", keys: [cmdKey, "Z"] },
      { description: "Redo", keys: [cmdKey, "Y"] },
      { description: "Navigate to next cell", keys: ["Tab"] },
      {
        description: "Navigate to next row (in language columns)",
        keys: ["Enter"],
      },
      { description: "Navigate cells", keys: ["Arrow", "Keys"] },
      { description: "Edit cell", keys: ["Double", "Click"] },
    ];

    shortcuts.forEach((shortcut) => {
      const item = document.createElement("li");
      item.className = "help-modal-shortcut-item";

      const description = document.createElement("span");
      description.className = "help-modal-shortcut-description";
      description.textContent = shortcut.description;

      const keys = document.createElement("div");
      keys.className = "help-modal-shortcut-keys";

      shortcut.keys.forEach((key, index) => {
        if (index > 0) {
          const separator = document.createElement("span");
          separator.className = "help-modal-shortcut-key-separator";
          separator.textContent = "+";
          keys.appendChild(separator);
        }

        const keyElement = document.createElement("kbd");
        keyElement.className = "help-modal-shortcut-key";
        keyElement.textContent = key;
        keys.appendChild(keyElement);
      });

      item.appendChild(description);
      item.appendChild(keys);
      shortcutsList.appendChild(item);
    });

    shortcutsSection.appendChild(shortcutsList);
    content.appendChild(shortcutsSection);

    // Commands Section
    const commandsSection = document.createElement("div");
    commandsSection.className = "help-modal-section";

    const commandsTitle = document.createElement("h3");
    commandsTitle.className = "help-modal-section-title";
    commandsTitle.textContent = "Available Commands";
    commandsSection.appendChild(commandsTitle);

    const commandsList = document.createElement("ul");
    commandsList.className = "help-modal-command-list";

    const commands = [
      {
        name: "goto <number>",
        description: "Navigate to a specific row number",
      },
      { name: "goto top", description: "Navigate to the first row" },
      { name: "goto bottom", description: "Navigate to the last row" },
      {
        name: "search <keyword>",
        description: "Search for keywords in translations",
      },
      {
        name: "filter empty",
        description: "Show only rows with empty translations",
      },
      {
        name: "filter changed",
        description: "Show only rows with changed cells",
      },
      {
        name: "filter duplicate",
        description: "Show only rows with duplicate keys",
      },
      {
        name: "clear filter",
        description: "Clear all filters and show all rows",
      },
      { name: "undo", description: "Undo last action" },
      { name: "redo", description: "Redo last undone action" },
      { name: "readonly", description: "Toggle read-only mode" },
      { name: "help", description: "Show this help dialog" },
    ];

    commands.forEach((command) => {
      const item = document.createElement("li");
      item.className = "help-modal-command-item";

      const name = document.createElement("div");
      name.className = "help-modal-command-name";
      name.textContent = command.name;

      const description = document.createElement("div");
      description.className = "help-modal-command-description";
      description.textContent = command.description;

      item.appendChild(name);
      item.appendChild(description);
      commandsList.appendChild(item);
    });

    commandsSection.appendChild(commandsList);
    content.appendChild(commandsSection);

    // Assemble
    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Overlay 클릭 시 닫기
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Escape 키로 닫기
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);

    // 모달이 제거될 때 이벤트 리스너 정리
    const observer = new MutationObserver(() => {
      if (!document.body.contains(overlay)) {
        document.removeEventListener("keydown", escapeHandler);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
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
   * 빠른 검색 모드 열기
   */
  private openQuickSearch(): void {
    if (this.quickSearchUI) {
      this.quickSearchUI.open();
    }
  }

  /**
   * 빠른 검색 모드 닫기
   */
  private closeQuickSearch(): void {
    if (this.quickSearchUI) {
      this.quickSearchUI.close();
    }
    this.currentQuickSearchMatches = [];
    this.currentQuickSearchIndex = -1;
    // 하이라이트 제거를 위해 다시 렌더링
    if (this.bodyElement) {
      this.renderVirtualRows();
    }
  }

  /**
   * 빠른 검색 실행
   */
  private handleQuickSearch(query: string): void {
    if (!this.quickSearch || !this.quickSearchUI) {
      return;
    }

    const parsedQuery = parseSearchQuery(query);
    if (!parsedQuery) {
      this.currentQuickSearchMatches = [];
      this.currentQuickSearchIndex = -1;
      this.quickSearchUI.updateStatus(0, 0);
      // 하이라이트 제거를 위해 다시 렌더링
      if (this.bodyElement) {
        this.renderVirtualRows();
      }
      return;
    }

    const matches = this.quickSearch.findMatches(parsedQuery);
    this.currentQuickSearchMatches = matches;
    this.currentQuickSearchIndex = matches.length > 0 ? 0 : -1;

    if (matches.length > 0) {
      this.quickSearchUI.updateStatus(
        this.currentQuickSearchIndex,
        matches.length
      );
      // 첫 번째 매칭으로 이동
      this.goToQuickSearchMatch(matches[0]);
    } else {
      this.quickSearchUI.updateStatus(0, 0);
    }

    // 하이라이트를 위해 다시 렌더링
    if (this.bodyElement) {
      this.renderVirtualRows();
    }
  }

  /**
   * 다음 매칭으로 이동
   */
  private goToNextQuickSearchMatch(): void {
    if (this.currentQuickSearchMatches.length === 0) {
      return;
    }

    // currentQuickSearchIndex가 유효하지 않으면 0으로 설정
    if (
      this.currentQuickSearchIndex < 0 ||
      this.currentQuickSearchIndex >= this.currentQuickSearchMatches.length
    ) {
      this.currentQuickSearchIndex = 0;
    }

    this.currentQuickSearchIndex =
      (this.currentQuickSearchIndex + 1) %
      this.currentQuickSearchMatches.length;
    const match = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
    this.goToQuickSearchMatch(match);

    if (this.quickSearchUI) {
      this.quickSearchUI.updateStatus(
        this.currentQuickSearchIndex,
        this.currentQuickSearchMatches.length
      );
    }
  }

  /**
   * 이전 매칭으로 이동
   */
  private goToPrevQuickSearchMatch(): void {
    if (this.currentQuickSearchMatches.length === 0) {
      return;
    }

    this.currentQuickSearchIndex =
      this.currentQuickSearchIndex <= 0
        ? this.currentQuickSearchMatches.length - 1
        : this.currentQuickSearchIndex - 1;
    const match = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
    this.goToQuickSearchMatch(match);

    if (this.quickSearchUI) {
      this.quickSearchUI.updateStatus(
        this.currentQuickSearchIndex,
        this.currentQuickSearchMatches.length
      );
    }
  }

  /**
   * 특정 매칭으로 이동
   */
  private goToQuickSearchMatch(match: QuickSearchMatch): void {
    // 스크롤하여 셀이 보이도록 (먼저 스크롤)
    if (this.rowVirtualizer && this.scrollElement) {
      const virtualItems = this.rowVirtualizer.getVirtualItems();
      const rowElement = virtualItems.find(
        (item) => item.index === match.rowIndex
      );
      if (rowElement && this.bodyElement) {
        const row = this.bodyElement.querySelector(
          `[data-index="${match.rowIndex}"]`
        ) as HTMLElement;
        if (row) {
          // smooth 스크롤 대신 즉시 스크롤 (테스트 안정성)
          row.scrollIntoView({ behavior: "auto", block: "center" });
        }
      } else {
        // 가상화된 범위 밖에 있으면 스크롤 위치 조정
        const rowTop = match.rowIndex * this.rowHeight;
        this.scrollElement.scrollTop =
          rowTop - this.scrollElement.clientHeight / 2;
      }
    }

    // 셀에 포커스 (스크롤 후)
    requestAnimationFrame(() => {
      this.focusCell(match.rowIndex, match.columnId);

      // 하이라이트를 위해 다시 렌더링
      if (this.bodyElement) {
        this.renderVirtualRows();
      }
    });
  }

  /**
   * 빠른 검색 하이라이트 적용
   */
  private applyQuickSearchHighlight(row: HTMLElement, rowIndex: number): void {
    if (this.currentQuickSearchMatches.length === 0) {
      return;
    }

    // 모든 셀에서 하이라이트 제거
    const cells = row.querySelectorAll(".virtual-grid-cell");
    cells.forEach((cell) => {
      cell.classList.remove(
        "quick-search-matched",
        "quick-search-current-match"
      );
      const content = cell.querySelector(".virtual-grid-cell-content");
      if (content) {
        // 하이라이트 제거 (원본 텍스트로 복원)
        const originalText = content.getAttribute("data-original-text");
        if (originalText !== null) {
          content.textContent = originalText;
          content.removeAttribute("data-original-text");
        }
      }
    });

    // 매칭된 셀에 하이라이트 적용
    this.currentQuickSearchMatches.forEach((match) => {
      if (match.rowIndex !== rowIndex) {
        return;
      }

      const cell = row.querySelector(
        `[data-column-id="${match.columnId}"]`
      ) as HTMLElement;
      if (!cell) {
        return;
      }

      const content = cell.querySelector(".virtual-grid-cell-content");
      if (!content) {
        return;
      }

      // 원본 텍스트 저장
      if (!content.getAttribute("data-original-text")) {
        content.setAttribute("data-original-text", match.matchedText);
      }

      // 하이라이트 적용
      const highlighted = QuickSearch.highlightText(
        match.matchedText,
        match.matchIndices
      );
      content.innerHTML = highlighted;

      // 매칭된 셀 클래스 추가
      cell.classList.add("quick-search-matched");

      // 현재 매칭 셀 강조
      if (
        this.currentQuickSearchIndex >= 0 &&
        this.currentQuickSearchIndex < this.currentQuickSearchMatches.length &&
        this.currentQuickSearchMatches[this.currentQuickSearchIndex]
          .rowIndex === rowIndex &&
        this.currentQuickSearchMatches[this.currentQuickSearchIndex]
          .columnId === match.columnId
      ) {
        cell.classList.add("quick-search-current-match");
      }
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

    // CommandPalette 정리
    if (this.commandPalette && this.commandPalette.isPaletteOpen()) {
      this.commandPalette.close();
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

    // 상태바 정리
    if (this.statusBar) {
      this.statusBar.destroy();
      this.statusBar = null;
    }
  }

  /**
   * 상태바 초기화
   */
  private initStatusBar(): void {
    this.statusBar = new StatusBar(this.container, {
      onStatusUpdate: () => {
        // 필요 시 추가 처리
      },
    });
    this.statusBar.create();
    this.updateStatusBar();
  }

  /**
   * 상태바 정보 수집 및 업데이트
   */
  private updateStatusBar(): void {
    if (!this.statusBar) {
      return;
    }

    // 현재 모드 확인 (편집 중이면 "Editing", 아니면 "Normal")
    const isEditing = this.cellEditor.getEditingCell() !== null;
    const mode = isEditing ? "Editing" : "Normal";

    // 현재 포커스된 셀 정보
    const focusedCell = this.focusManager.getFocusedCell();
    const totalRows = this.getFilteredTranslations().length;

    let rowIndex =
      focusedCell && typeof focusedCell.rowIndex === "number"
        ? focusedCell.rowIndex
        : null;

    if (totalRows > 0) {
      if (rowIndex === null) {
        rowIndex = 0; // 포커스가 없어도 첫 행 기준으로 표시
      } else if (rowIndex >= totalRows) {
        rowIndex = totalRows - 1;
      }
    } else {
      rowIndex = 0; // 빈 그리드인 경우 0/0 형태로 표시
    }

    const columnId = focusedCell ? focusedCell.columnId : null;

    // 변경사항 수
    const changesCount = this.changeTracker.getChanges().length;

    // 빈 번역 수 계산
    const emptyCount = this.countEmptyTranslations();

    // 중복 Key 수 계산
    const duplicateCount = this.countDuplicateKeys();

    // 상태바 업데이트
    this.statusBar.update({
      mode,
      rowIndex,
      totalRows,
      columnId,
      changesCount,
      emptyCount,
      duplicateCount,
    });
  }

  /**
   * 빈 번역 수 계산
   */
  private countEmptyTranslations(): number {
    const translations = this.getFilteredTranslations();
    let emptyCount = 0;

    translations.forEach((translation) => {
      this.options.languages.forEach((lang) => {
        const value = translation.values[lang] || "";
        if (!value || (typeof value === "string" && value.trim() === "")) {
          emptyCount++;
        }
      });
    });

    return emptyCount;
  }

  /**
   * 중복 Key 수 계산
   */
  private countDuplicateKeys(): number {
    const translations = this.getFilteredTranslations();
    const keyMap = new Map<string, number>();

    // 각 Key의 출현 횟수 계산
    translations.forEach((translation) => {
      const key = translation.key.trim();
      if (key) {
        keyMap.set(key, (keyMap.get(key) || 0) + 1);
      }
    });

    // 중복된 Key 수 계산 (2개 이상인 Key)
    let duplicateCount = 0;
    keyMap.forEach((count) => {
      if (count > 1) {
        duplicateCount += count - 1; // 중복된 개수만 카운트
      }
    });

    return duplicateCount;
  }
}
