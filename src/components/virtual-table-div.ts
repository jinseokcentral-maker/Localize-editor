/**
 * Virtual Table (Div-based Grid) - @tanstack/virtual-core를 사용한 가상화 그리드
 * 
 * 테이블 구조 대신 div 기반 그리드로 구현하여 가상 스크롤링과 완벽하게 호환
 */

import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@/virtual-core/index";
import type { Translation, TranslationChange } from "@/types/translation";
import { ChangeTracker } from "./change-tracker";
import { UndoRedoManager, type UndoRedoAction } from "./undo-redo-manager";
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
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  
  // 편집 관련 상태
  private editingCell: { rowIndex: number; columnId: string } | null = null;
  private isEscapeKeyPressed = false;
  private isFinishingEdit = false;
  
  // 컬럼 리사이즈 관련 상태
  private columnMinWidths: Map<string, number> = new Map();
  private isResizing: boolean = false;
  private resizeStartX: number = 0;
  private resizeStartWidth: number = 0;
  private resizeColumnId: string | null = null;
  private resizeHandler: ((e: MouseEvent) => void) | null = null;
  private resizeEndHandler: ((e: MouseEvent) => void) | null = null;

  // 포커스 관리
  private focusedCell: { rowIndex: number; columnId: string } | null = null;

  constructor(options: VirtualTableDivOptions) {
    this.container = options.container;
    this.options = options;
    this.columnWidths = options.columnWidths || new Map();
    this.rowHeight = options.rowHeight || 40;
    this.headerHeight = options.headerHeight || 40;
    
    // 편집 가능한 컬럼 설정
    this.editableColumns = new Set(['key', 'context']);
    options.languages.forEach(lang => {
      this.editableColumns.add(`values.${lang}`);
    });
    
    // 컬럼 최소 너비 설정
    this.columnMinWidths.set('key', 100);
    this.columnMinWidths.set('context', 100);
    options.languages.forEach(lang => {
      this.columnMinWidths.set(`values.${lang}`, 80);
    });
    
    // 원본 데이터 초기화
    this.changeTracker.initializeOriginalData(options.translations, options.languages);
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
    this.scrollElement = document.createElement('div');
    this.scrollElement.className = 'virtual-grid-scroll-container';
    this.scrollElement.style.width = '100%';
    this.scrollElement.style.height = '100%';
    this.scrollElement.style.overflow = 'auto';
    this.scrollElement.style.position = 'relative';

    // 그리드 컨테이너 생성
    this.gridElement = document.createElement('div');
    this.gridElement.className = 'virtual-grid';
    this.gridElement.setAttribute('role', 'grid');
    if (this.options.readOnly) {
      this.gridElement.classList.add('readonly');
    }

    // 헤더 생성
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'virtual-grid-header';
    this.renderHeader();
    this.gridElement.appendChild(this.headerElement);

    // 바디 생성
    this.bodyElement = document.createElement('div');
    this.bodyElement.className = 'virtual-grid-body';
    this.bodyElement.style.position = 'relative';
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

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.headerElement) {
          this.headerElement.innerHTML = '';
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
      console.error('VirtualTableDiv: scrollElement or bodyElement is null');
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
    let editingCellData: { rowId: string; columnId: string; value: string } | null = null;
    if (this.editingCell) {
      const editingRow = this.bodyElement.querySelector(`[data-row-index="${this.editingCell.rowIndex}"]`);
      if (editingRow) {
        const editingCellElement = editingRow.querySelector(`[data-column-id="${this.editingCell.columnId}"]`);
        if (editingCellElement) {
          const input = editingCellElement.querySelector('input');
          if (input) {
            editingCellData = {
              rowId: editingCellElement.getAttribute('data-row-id') || '',
              columnId: this.editingCell.columnId,
              value: input.value,
            };
          }
        }
      }
    }

    // 기존 행 제거
    this.bodyElement.innerHTML = '';

    // 가상 아이템 가져오기
    const virtualItems = this.rowVirtualizer.getVirtualItems();
    const totalSize = this.rowVirtualizer.getTotalSize();

    // 바디의 높이를 전체 크기로 설정
    this.bodyElement.style.height = `${totalSize}px`;

    // 리사이즈 중이면 저장된 컬럼 너비를 사용, 아니면 헤더의 실제 너비 사용
    let columnWidths: { key: number; context: number; languages: number[] };
    const containerWidth = this.getContainerWidth();
    
    if (this.isResizing) {
      // 리사이즈 중: 저장된 컬럼 너비 사용 (헤더의 실제 렌더링 너비는 아직 업데이트되지 않았을 수 있음)
      const defaultKeyWidth = 200;
      const defaultContextWidth = 200;
      const defaultLangWidth = 150;
      
      const keyWidth = this.getColumnWidthValue('key', defaultKeyWidth);
      const contextWidth = this.getColumnWidthValue('context', defaultContextWidth);
      const otherLangWidths = this.options.languages.slice(0, -1).map(lang => 
        this.getColumnWidthValue(`values.${lang}`, defaultLangWidth)
      );
      
      // 마지막 컬럼 너비 = 컨테이너 너비 - 고정 너비
      const fixedWidth = keyWidth + contextWidth + otherLangWidths.reduce((sum, w) => sum + w, 0);
      const lastLang = this.options.languages[this.options.languages.length - 1]!;
      const lastLangMinWidth = this.columnMinWidths.get(`values.${lastLang}`) || 80;
      const lastLangWidth = Math.max(lastLangMinWidth, containerWidth - fixedWidth);
      
      columnWidths = {
        key: keyWidth,
        context: contextWidth,
        languages: [...otherLangWidths, lastLangWidth],
      };
    } else {
      // 리사이즈 중이 아닐 때: 저장된 컬럼 너비를 우선 사용, 없으면 헤더의 실제 너비 사용
      const defaultKeyWidth = 200;
      const defaultContextWidth = 200;
      const defaultLangWidth = 150;
      
      // 저장된 컬럼 너비가 있는지 확인
      const hasStoredWidths = this.columnWidths.size > 0;
      
      if (hasStoredWidths) {
        // 저장된 컬럼 너비 사용 (리사이즈된 값 유지)
        const keyWidth = this.getColumnWidthValue('key', defaultKeyWidth);
        const contextWidth = this.getColumnWidthValue('context', defaultContextWidth);
        const otherLangWidths = this.options.languages.slice(0, -1).map(lang => 
          this.getColumnWidthValue(`values.${lang}`, defaultLangWidth)
        );
        
        // 마지막 컬럼 너비 = 컨테이너 너비 - 고정 너비
        const fixedWidth = keyWidth + contextWidth + otherLangWidths.reduce((sum, w) => sum + w, 0);
        const lastLang = this.options.languages[this.options.languages.length - 1]!;
        const lastLangMinWidth = this.columnMinWidths.get(`values.${lastLang}`) || 80;
        const lastLangWidth = Math.max(lastLangMinWidth, containerWidth - fixedWidth);
        
        columnWidths = {
          key: keyWidth,
          context: contextWidth,
          languages: [...otherLangWidths, lastLangWidth],
        };
      } else {
        // 저장된 너비가 없을 때만 헤더의 실제 너비를 가져와서 사용
        const headerWidths = this.getColumnWidthsFromHeader();
        
        if (headerWidths) {
          // 헤더의 실제 너비 사용 (헤더와 바디 동기화)
          // 마지막 컬럼은 끝까지 채우도록 재계산
          const fixedWidth = headerWidths.key + headerWidths.context + headerWidths.languages.slice(0, -1).reduce((sum, w) => sum + w, 0);
          const lastLangMinWidth = this.columnMinWidths.get(`values.${this.options.languages[this.options.languages.length - 1]!}`) || 80;
          const lastLangWidth = Math.max(lastLangMinWidth, containerWidth - fixedWidth);
          
          columnWidths = {
            key: headerWidths.key,
            context: headerWidths.context,
            languages: [...headerWidths.languages.slice(0, -1), lastLangWidth],
          };
        } else {
          // 폴백: 계산된 너비 사용
          columnWidths = this.calculateColumnWidths(containerWidth);
        }
      }
    }

    // 각 가상 아이템에 대해 행 생성
    virtualItems.forEach((virtualItem) => {
      const translation = this.options.translations[virtualItem.index];
      if (!translation) {
        return;
      }

      const row = this.createRow(translation, virtualItem.index, columnWidths);
      
      // 전체 너비는 항상 컨테이너 너비와 일치 (마지막 컬럼이 끝까지 채워짐)
      const totalWidth = containerWidth;
      
      // 가상 스크롤링을 위한 위치 설정
      row.style.position = 'absolute';
      row.style.top = `${virtualItem.start}px`;
      row.style.left = '0';
      row.style.width = `${totalWidth}px`;
      row.style.minWidth = `${totalWidth}px`;
      row.style.maxWidth = `${totalWidth}px`;
      row.style.height = `${virtualItem.size}px`;
      row.setAttribute('data-index', virtualItem.index.toString());

      this.bodyElement!.appendChild(row);

      // 편집 중인 셀이면 다시 편집 모드로 전환
      if (editingCellData && translation.id === editingCellData.rowId) {
        const cellElement = row.querySelector(`[data-column-id="${editingCellData.columnId}"]`);
        if (cellElement) {
          requestAnimationFrame(() => {
            this.startEditing(virtualItem.index, editingCellData!.columnId, cellElement as HTMLElement);
            const input = cellElement.querySelector('input');
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

    const headerRow = document.createElement('div');
    headerRow.className = 'virtual-grid-header-row';
    headerRow.setAttribute('role', 'row');

    // 저장된 컬럼 너비가 있으면 사용, 없으면 계산
    const defaultKeyWidth = 200;
    const defaultContextWidth = 200;
    const defaultLangWidth = 150;
    const containerWidth = this.getContainerWidth();
    
    let columnWidths: { key: number; context: number; languages: number[] };
    
    if (this.columnWidths.size > 0) {
      // 저장된 컬럼 너비 사용 (리사이즈된 값 유지)
      // 마지막 컬럼은 항상 끝까지 채우도록 재계산
      const keyWidth = this.getColumnWidthValue('key', defaultKeyWidth);
      const contextWidth = this.getColumnWidthValue('context', defaultContextWidth);
      const otherLangWidths = this.options.languages.slice(0, -1).map(lang =>
        this.getColumnWidthValue(`values.${lang}`, defaultLangWidth)
      );
      
      // 마지막 컬럼 너비 = 컨테이너 너비 - 고정 너비
      const fixedWidth = keyWidth + contextWidth + otherLangWidths.reduce((sum, w) => sum + w, 0);
      const lastLang = this.options.languages[this.options.languages.length - 1]!;
      const lastLangMinWidth = this.columnMinWidths.get(`values.${lastLang}`) || 80;
      const lastLangWidth = Math.max(lastLangMinWidth, containerWidth - fixedWidth);
      
      columnWidths = {
        key: keyWidth,
        context: contextWidth,
        languages: [...otherLangWidths, lastLangWidth],
      };
    } else {
      // 저장된 너비가 없을 때만 계산
      columnWidths = this.calculateColumnWidths(containerWidth);
      
      // 초기 렌더링 시 계산된 컬럼 너비를 저장 (리사이즈 전 기본값)
      // 마지막 컬럼은 저장하지 않음 (항상 동적으로 계산)
      this.columnWidths.set('key', columnWidths.key);
      this.columnWidths.set('context', columnWidths.context);
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
    const keyHeaderCell = this.createHeaderCell('Key', columnWidths.key, 0, 10, 'key');
    this.addResizeHandle(keyHeaderCell, 'key');
    headerRow.appendChild(keyHeaderCell);
    
    // Context 컬럼 (sticky)
    const contextHeaderCell = this.createHeaderCell('Context', columnWidths.context, columnWidths.key, 10, 'context');
    this.addResizeHandle(contextHeaderCell, 'context');
    headerRow.appendChild(contextHeaderCell);

    // 언어 컬럼들
    this.options.languages.forEach((lang, index) => {
      const langWidth = columnWidths.languages[index]!;
      const columnId = `values.${lang}`;
      const headerCell = this.createHeaderCell(lang.toUpperCase(), langWidth, 0, 0, columnId);
      this.addResizeHandle(headerCell, columnId);
      headerRow.appendChild(headerCell);
    });

    this.headerElement.appendChild(headerRow);
  }

  /**
   * 헤더 셀 생성
   */
  private createHeaderCell(text: string, width: number, left: number, zIndex: number, columnId?: string): HTMLElement {
    const header = document.createElement('div');
    header.className = 'virtual-grid-header-cell';
    header.setAttribute('role', 'columnheader');
    header.textContent = text;
    if (columnId) {
      header.setAttribute('data-column-id', columnId);
    }
    header.style.width = `${width}px`;
    header.style.minWidth = `${width}px`;
    header.style.maxWidth = `${width}px`;
    
    if (left > 0 || zIndex > 0) {
      header.style.position = 'sticky';
      header.style.left = `${left}px`;
      header.style.zIndex = zIndex.toString();
      header.style.backgroundColor = '#f8fafc';
    }
    
    header.style.overflow = 'visible';
    
    return header;
  }

  /**
   * 컬럼 리사이즈 핸들 추가
   */
  private addResizeHandle(headerCell: HTMLElement, columnId: string): void {
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'column-resize-handle';
    resizeHandle.setAttribute('data-column-id', columnId);
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '-2px';
    resizeHandle.style.top = '0';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.width = '4px';
    resizeHandle.style.cursor = 'col-resize';
    resizeHandle.style.zIndex = '25';
    resizeHandle.style.backgroundColor = 'transparent';
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startResize(columnId, e.clientX, headerCell);
    });
    
    headerCell.appendChild(resizeHandle);
  }

  /**
   * 컬럼 리사이즈 시작
   */
  private startResize(columnId: string, startX: number, headerCell: HTMLElement): void {
    this.isResizing = true;
    this.resizeStartX = startX;
    this.resizeStartWidth = headerCell.offsetWidth || headerCell.getBoundingClientRect().width;
    this.resizeColumnId = columnId;
    
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
    
    document.addEventListener('mousemove', this.resizeHandler, true);
    document.addEventListener('mouseup', this.resizeEndHandler, true);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  /**
   * 컬럼 리사이즈 중
   */
  private handleResize(currentX: number): void {
    if (!this.resizeColumnId) return;
    
    const deltaX = currentX - this.resizeStartX;
    const minWidth = this.columnMinWidths.get(this.resizeColumnId) || 80;
    const newWidth = Math.max(minWidth, this.resizeStartWidth + deltaX);
    
    this.columnWidths.set(this.resizeColumnId, newWidth);
    this.applyColumnWidth(this.resizeColumnId, newWidth);
  }

  /**
   * 특정 컬럼의 너비를 모든 셀에 적용
   * 마지막 컬럼은 항상 끝까지 채워지도록 함
   */
  private applyColumnWidth(columnId: string, width: number): void {
    // 마지막 컬럼이 아닌 경우에만 저장
    const lastLang = this.options.languages[this.options.languages.length - 1]!;
    const lastLangColumnId = `values.${lastLang}`;
    if (columnId !== lastLangColumnId) {
      this.columnWidths.set(columnId, width);
    }
    
    const defaultKeyWidth = 200;
    const defaultContextWidth = 200;
    const defaultLangWidth = 150;
    const containerWidth = this.getContainerWidth();
    
    const keyWidth = columnId === 'key' ? width : this.getColumnWidthValue('key', defaultKeyWidth);
    const contextWidth = columnId === 'context' ? width : this.getColumnWidthValue('context', defaultContextWidth);
    
    // 마지막 컬럼을 제외한 언어 컬럼들
    const otherLangWidths = this.options.languages.slice(0, -1).map((lang) => {
      const langColumnId = `values.${lang}`;
      return columnId === langColumnId ? width : this.getColumnWidthValue(langColumnId, defaultLangWidth);
    });
    
    // 마지막 컬럼 너비 = 컨테이너 너비 - 고정 너비
    const fixedWidth = keyWidth + contextWidth + otherLangWidths.reduce((sum, w) => sum + w, 0);
    const lastLangMinWidth = this.columnMinWidths.get(lastLangColumnId) || 80;
    const lastLangWidth = Math.max(lastLangMinWidth, containerWidth - fixedWidth);
    
    const langWidths = [...otherLangWidths, lastLangWidth];
    
    // 전체 너비 계산 (모든 컬럼 너비의 합 = 컨테이너 너비)
    const totalWidth = containerWidth;
    
    // 헤더 셀 업데이트
    if (this.headerElement) {
      const headerRow = this.headerElement.querySelector('.virtual-grid-header-row') as HTMLElement | null;
      if (headerRow) {
        // 헤더 행의 전체 너비를 명시적으로 설정 (모든 컬럼 너비의 합)
        // maxWidth도 설정하여 flex로 인한 자동 조정 방지
        headerRow.style.width = `${totalWidth}px`;
        headerRow.style.minWidth = `${totalWidth}px`;
        headerRow.style.maxWidth = `${totalWidth}px`;
      }
      
      const keyHeaderCell = this.headerElement.querySelector('[data-column-id="key"]') as HTMLElement | null;
      if (keyHeaderCell) {
        keyHeaderCell.style.width = `${keyWidth}px`;
        keyHeaderCell.style.minWidth = `${keyWidth}px`;
        keyHeaderCell.style.maxWidth = `${keyWidth}px`;
      }
      
      const contextHeaderCell = this.headerElement.querySelector('[data-column-id="context"]') as HTMLElement | null;
      if (contextHeaderCell) {
        contextHeaderCell.style.width = `${contextWidth}px`;
        contextHeaderCell.style.minWidth = `${contextWidth}px`;
        contextHeaderCell.style.maxWidth = `${contextWidth}px`;
        contextHeaderCell.style.left = `${keyWidth}px`;
      }
      
      this.options.languages.forEach((lang, index) => {
        const langHeaderCell = this.headerElement!.querySelector(`[data-column-id="values.${lang}"]`) as HTMLElement | null;
        if (langHeaderCell) {
          const langWidth = langWidths[index]!;
          langHeaderCell.style.width = `${langWidth}px`;
          langHeaderCell.style.minWidth = `${langWidth}px`;
          langHeaderCell.style.maxWidth = `${langWidth}px`;
        }
      });
    }
    
    // 바디 셀 업데이트
    if (this.bodyElement) {
      // 모든 행의 전체 너비도 업데이트
      const rows = this.bodyElement.querySelectorAll('.virtual-grid-row');
      rows.forEach((row, rowIndex) => {
        const htmlRow = row as HTMLElement;
        // maxWidth도 설정하여 flex로 인한 자동 조정 방지
        htmlRow.style.width = `${totalWidth}px`;
        htmlRow.style.minWidth = `${totalWidth}px`;
        htmlRow.style.maxWidth = `${totalWidth}px`;
        
      });
      
      const keyCells = this.bodyElement.querySelectorAll('[data-column-id="key"]');
      keyCells.forEach(cell => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = `${keyWidth}px`;
        htmlCell.style.minWidth = `${keyWidth}px`;
        htmlCell.style.maxWidth = `${keyWidth}px`;
      });
      
      const contextCells = this.bodyElement.querySelectorAll('[data-column-id="context"]');
      contextCells.forEach(cell => {
        const htmlCell = cell as HTMLElement;
        htmlCell.style.width = `${contextWidth}px`;
        htmlCell.style.minWidth = `${contextWidth}px`;
        htmlCell.style.maxWidth = `${contextWidth}px`;
        htmlCell.style.left = `${keyWidth}px`;
      });
      
      this.options.languages.forEach((lang, index) => {
        const langCells = this.bodyElement!.querySelectorAll(`[data-column-id="values.${lang}"]`);
        const langWidth = langWidths[index]!;
        langCells.forEach(cell => {
          const htmlCell = cell as HTMLElement;
          htmlCell.style.width = `${langWidth}px`;
          htmlCell.style.minWidth = `${langWidth}px`;
          htmlCell.style.maxWidth = `${langWidth}px`;
        });
        
      });
    }
  }

  /**
   * 컬럼 리사이즈 종료
   */
  private endResize(): void {
    if (this.resizeHandler) {
      document.removeEventListener('mousemove', this.resizeHandler, true);
      this.resizeHandler = null;
    }
    
    if (this.resizeEndHandler) {
      document.removeEventListener('mouseup', this.resizeEndHandler, true);
      this.resizeEndHandler = null;
    }
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // 리사이즈 종료 후 모든 행을 다시 렌더링하여 화면 밖의 행들도 업데이트
    this.isResizing = false;
    this.resizeColumnId = null;
    
    // 모든 행을 다시 렌더링하여 화면 밖의 행들도 업데이트
    if (this.rowVirtualizer && this.bodyElement) {
      this.renderVirtualRows();
    }
  }

  /**
   * 헤더에서 실제 컬럼 너비 가져오기
   */
  private getColumnWidthsFromHeader(): { key: number; context: number; languages: number[] } | null {
    if (!this.headerElement) {
      return null;
    }
    
    const headerRow = this.headerElement.querySelector('.virtual-grid-header-row');
    if (!headerRow) {
      return null;
    }
    
    const headerCells = headerRow.querySelectorAll('.virtual-grid-header-cell');
    const widths: { key: number; context: number; languages: number[] } = {
      key: 0,
      context: 0,
      languages: [],
    };
    
    headerCells.forEach((headerCell) => {
      const columnId = headerCell.getAttribute('data-column-id');
      const actualWidth = (headerCell as HTMLElement).offsetWidth || (headerCell as HTMLElement).getBoundingClientRect().width;
      
      if (columnId === 'key') {
        widths.key = actualWidth;
      } else if (columnId === 'context') {
        widths.context = actualWidth;
      } else if (columnId && columnId.startsWith('values.')) {
        widths.languages.push(actualWidth);
      }
    });
    
    // 모든 너비가 유효한지 확인
    if (widths.key > 0 && widths.context > 0 && widths.languages.length === this.options.languages.length) {
      return widths;
    }
    
    return null;
  }

  /**
   * 행 생성
   */
  private createRow(
    translation: Translation,
    rowIndex: number,
    columnWidths: { key: number; context: number; languages: number[] }
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'virtual-grid-row';
    row.setAttribute('role', 'row');
    row.setAttribute('data-row-index', rowIndex.toString());
    row.setAttribute('data-row-id', translation.id);

    // Key 셀
    const keyCell = this.createCell(translation.id, 'key', translation.key, rowIndex, true, columnWidths.key, 0, 10);
    row.appendChild(keyCell);

    // Context 셀
    const contextCell = this.createCell(
      translation.id,
      'context',
      translation.context || '',
      rowIndex,
      true,
      columnWidths.context,
      columnWidths.key,
      10
    );
    row.appendChild(contextCell);

    // 언어 셀들
    this.options.languages.forEach((lang, index) => {
      const value = translation.values[lang] || '';
      const langWidth = columnWidths.languages[index]!;
      const cell = this.createCell(
        translation.id,
        `values.${lang}`,
        value,
        rowIndex,
        !this.options.readOnly,
        langWidth,
        0,
        0
      );
      row.appendChild(cell);
    });

    return row;
  }

  /**
   * 셀 생성
   */
  private createCell(
    rowId: string,
    columnId: string,
    value: string,
    rowIndex: number,
    editable: boolean,
    width: number,
    left: number,
    zIndex: number
  ): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'virtual-grid-cell';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('data-row-id', rowId);
    cell.setAttribute('data-column-id', columnId);
    cell.setAttribute('data-row-index', rowIndex.toString());
    cell.setAttribute('tabindex', editable ? '0' : '-1');
    
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.maxWidth = `${width}px`;
    
    if (left > 0 || zIndex > 0) {
      cell.style.position = 'sticky';
      cell.style.left = `${left}px`;
      cell.style.zIndex = zIndex.toString();
      cell.style.backgroundColor = '#fafafa';
    }
    
    // 셀 내용
    const cellContent = document.createElement('div');
    cellContent.className = 'virtual-grid-cell-content';
    cellContent.textContent = value;
    cell.appendChild(cellContent);
    
    // Dirty/Empty 상태에 따른 CSS 클래스 추가
    this.updateCellStyle(rowId, columnId, cell);

    // 더블클릭으로 편집 시작
    if (editable && !this.options.readOnly) {
      cell.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startEditing(rowIndex, columnId, cell);
      });
      
      // 포커스 이벤트
      cell.addEventListener('focus', () => {
        this.focusedCell = { rowIndex, columnId };
        cell.classList.add('focused');
      });
      
      cell.addEventListener('blur', () => {
        cell.classList.remove('focused');
      });
    }

    return cell;
  }

  /**
   * 편집 시작
   */
  private startEditing(rowIndex: number, columnId: string, cell: HTMLElement): void {
    if (this.editingCell) {
      this.stopEditing();
    }

    this.editingCell = { rowIndex, columnId };

    const cellContent = cell.querySelector('.virtual-grid-cell-content');
    if (!cellContent) return;

    const currentValue = cellContent.textContent || '';
    
    // 편집용 input 생성
    const input = this.createEditInput(currentValue);
    cell.innerHTML = '';
    cell.appendChild(input);
    
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    // Key 컬럼 편집 중 실시간 중복 체크
    let isDuplicateKey = false;
    if (columnId === 'key') {
      const rowId = cell.getAttribute('data-row-id') || '';
      const updateDuplicateCheck = () => {
        const inputValue = input.value.trim();
        isDuplicateKey = false;
        cell.classList.remove('cell-duplicate-key');
        
        if (inputValue && this.checkKeyDuplicate(rowId, inputValue)) {
          isDuplicateKey = true;
          cell.classList.add('cell-duplicate-key');
        }
      };
      
      input.addEventListener('input', updateDuplicateCheck);
      updateDuplicateCheck();
    }

    // 편집 완료/취소 이벤트
    const finishEdit = (save: boolean) => {
      if (this.isFinishingEdit) {
        return;
      }
      
      this.isFinishingEdit = true;
      
      const rowId = cell.getAttribute('data-row-id');
      if (!rowId) {
        this.editingCell = null;
        this.isFinishingEdit = false;
        return;
      }
      
      if (save && columnId === 'key' && isDuplicateKey) {
        save = false;
      }
      
      if (save && input.value !== currentValue) {
        const newValue = input.value;
        const oldValue = currentValue;
        
        // Undo/Redo 히스토리에 추가
        this.undoRedoManager.push({
          type: 'cell-change',
          rowId,
          columnId,
          oldValue,
          newValue,
        });
        
        // 변경사항 추적
        const originalValue = this.changeTracker.getOriginalValue(rowId, columnId);
        const lang = this.getLangFromColumnId(columnId);
        const translationKey = this.getTranslationKey(rowId, columnId, newValue);
        
        this.changeTracker.trackChange(
          rowId,
          columnId,
          lang,
          originalValue,
          newValue,
          translationKey,
          () => {
            this.updateCellStyle(rowId, columnId);
          }
        );
        
        // onCellChange 콜백 호출
        if (this.options.onCellChange) {
          this.options.onCellChange(rowId, columnId, newValue);
        }
      }
      
      // 원래 내용으로 복원
      const newValue = save ? input.value : currentValue;
      this.updateCellContent(cell, rowId, columnId, newValue);
      
      this.editingCell = null;
      this.isFinishingEdit = false;
    };

    input.addEventListener('blur', () => {
      if (this.isFinishingEdit) {
        return;
      }
      
      if (!this.isEscapeKeyPressed) {
        finishEdit(true);
      } else {
        finishEdit(false);
        this.isEscapeKeyPressed = false;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        finishEdit(true);
        input.blur();
        // Enter 네비게이션은 키보드 핸들러에서 처리
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.isEscapeKeyPressed = true;
        input.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        finishEdit(true);
        input.blur();
        // Tab 네비게이션은 키보드 핸들러에서 처리
      }
    });
  }

  /**
   * 편집 중지
   */
  private stopEditing(): void {
    if (!this.editingCell) return;
    this.editingCell = null;
  }

  /**
   * 편집용 input 생성
   */
  private createEditInput(value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'virtual-grid-cell-input';
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.border = '2px solid #3b82f6';
    input.style.outline = 'none';
    input.style.padding = '4px 8px';
    input.style.fontSize = '14px';
    input.style.fontFamily = 'inherit';
    input.style.backgroundColor = '#fff';
    return input;
  }

  /**
   * 셀 내용 업데이트
   */
  private updateCellContent(cell: HTMLElement, rowId: string, columnId: string, value: string): void {
    cell.innerHTML = '';
    const cellContent = document.createElement('div');
    cellContent.className = 'virtual-grid-cell-content';
    cellContent.textContent = value;
    cell.appendChild(cellContent);
    
    // 편집 가능한 셀은 더블클릭 이벤트 다시 추가
    if (!this.options.readOnly && this.editableColumns.has(columnId)) {
      cell.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = parseInt(cell.getAttribute('data-row-index') || '0');
        this.startEditing(rowIndex, columnId, cell);
      });
    }
    
    this.updateCellStyle(rowId, columnId, cell);
  }

  /**
   * 셀 스타일 업데이트
   */
  private updateCellStyle(rowId: string, columnId: string, cell?: HTMLElement): void {
    if (!this.bodyElement) return;
    
    const targetCell = cell || this.bodyElement.querySelector(
      `[data-row-id="${rowId}"][data-column-id="${columnId}"]`
    ) as HTMLElement;
    
    if (!targetCell) return;
    
    // Dirty 상태 확인
    const changeKey = `${rowId}-${columnId}`;
    const changesMap = this.changeTracker.getChangesMap();
    const isDirty = changesMap.has(changeKey);
    
    if (isDirty) {
      targetCell.classList.add('cell-dirty');
    } else {
      targetCell.classList.remove('cell-dirty');
    }
    
    // Empty 상태 확인
    if (columnId.startsWith('values.')) {
      const translation = this.options.translations.find(t => t.id === rowId);
      if (translation) {
        const lang = columnId.replace('values.', '');
        const value = translation.values[lang] || '';
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          targetCell.classList.add('cell-empty');
        } else {
          targetCell.classList.remove('cell-empty');
        }
      }
    }
  }

  /**
   * 키보드 이벤트 리스너 추가
   */
  private attachKeyboardListeners(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Undo/Redo
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey && !isInputField) {
        e.preventDefault();
        this.handleUndo();
        return;
      }
      
      if (ctrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !isInputField) {
        e.preventDefault();
        this.handleRedo();
        return;
      }
      
      // 키보드 네비게이션 (셀 포커스가 있을 때만)
      if (this.focusedCell && !isInputField) {
        this.handleKeyboardNavigation(e);
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * 키보드 네비게이션 처리
   */
  private handleKeyboardNavigation(e: KeyboardEvent): void {
    if (!this.focusedCell || !this.bodyElement) return;
    
    const { rowIndex, columnId } = this.focusedCell;
    const allColumns = ['key', 'context', ...this.options.languages.map(lang => `values.${lang}`)];
    const currentColIndex = allColumns.indexOf(columnId);
    
    if (currentColIndex < 0) return;
    
    let nextRowIndex = rowIndex;
    let nextColIndex = currentColIndex;
    
    // Tab / Shift+Tab
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.shiftKey) {
        // Shift+Tab: 이전 편집 가능한 컬럼
        if (currentColIndex > 0) {
          nextColIndex = currentColIndex - 1;
        } else {
          if (rowIndex > 0) {
            nextRowIndex = rowIndex - 1;
            nextColIndex = allColumns.length - 1;
          } else {
            nextRowIndex = this.options.translations.length - 1;
            nextColIndex = allColumns.length - 1;
          }
        }
      } else {
        // Tab: 다음 편집 가능한 컬럼
        if (currentColIndex < allColumns.length - 1) {
          nextColIndex = currentColIndex + 1;
        } else {
          if (rowIndex < this.options.translations.length - 1) {
            nextRowIndex = rowIndex + 1;
            nextColIndex = 0;
          } else {
            nextRowIndex = 0;
            nextColIndex = 0;
          }
        }
      }
      
      this.focusCell(nextRowIndex, allColumns[nextColIndex]!);
    }
    
    // Enter / Shift+Enter
    if (e.key === 'Enter' && columnId.startsWith('values.')) {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.shiftKey) {
        // Shift+Enter: 위 행
        if (rowIndex > 0) {
          this.focusCell(rowIndex - 1, columnId);
        }
      } else {
        // Enter: 아래 행
        if (rowIndex < this.options.translations.length - 1) {
          this.focusCell(rowIndex + 1, columnId);
        }
      }
    }
    
    // Arrow keys
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.key === 'ArrowRight' && currentColIndex < allColumns.length - 1) {
        this.focusCell(rowIndex, allColumns[currentColIndex + 1]!);
      } else if (e.key === 'ArrowLeft' && currentColIndex > 0) {
        this.focusCell(rowIndex, allColumns[currentColIndex - 1]!);
      } else if (e.key === 'ArrowDown' && rowIndex < this.options.translations.length - 1) {
        this.focusCell(rowIndex + 1, columnId);
      } else if (e.key === 'ArrowUp' && rowIndex > 0) {
        this.focusCell(rowIndex - 1, columnId);
      }
    }
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
      this.focusedCell = { rowIndex, columnId };
    }
  }

  /**
   * Undo 처리
   */
  private handleUndo(): void {
    const action = this.undoRedoManager.undo();
    if (!action) return;
    this.applyUndoRedoAction(action);
  }

  /**
   * Redo 처리
   */
  private handleRedo(): void {
    const action = this.undoRedoManager.redo();
    if (!action) return;
    this.applyUndoRedoAction(action);
  }

  /**
   * Undo/Redo 액션 적용
   */
  private applyUndoRedoAction(action: UndoRedoAction): void {
    if (action.type !== 'cell-change') return;

    const cell = this.bodyElement?.querySelector(
      `[data-row-id="${action.rowId}"][data-column-id="${action.columnId}"]`
    ) as HTMLElement;
    
    if (!cell) return;

    if (this.editingCell) {
      this.stopEditing();
    }

    this.updateCellContent(cell, action.rowId, action.columnId, action.newValue);

    const originalValue = this.changeTracker.getOriginalValue(action.rowId, action.columnId);
    const lang = this.getLangFromColumnId(action.columnId);
    const translationKey = this.getTranslationKey(action.rowId, action.columnId, action.newValue);

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

    if (this.options.onCellChange) {
      this.options.onCellChange(action.rowId, action.columnId, action.newValue);
    }
  }

  /**
   * 컬럼 너비 가져오기
   */
  private getColumnWidthValue(columnId: string, defaultWidth: number): number {
    return this.columnWidths.get(columnId) || defaultWidth;
  }

  /**
   * 컨테이너 너비 가져오기
   */
  private getContainerWidth(): number {
    if (this.container && this.container.clientWidth > 0) {
      return this.container.clientWidth;
    }
    return typeof window !== 'undefined' ? window.innerWidth : 1000;
  }

  /**
   * 컬럼 너비 계산
   * 마지막 컬럼이 항상 끝까지 채워지도록 함
   */
  private calculateColumnWidths(containerWidth: number): { key: number; context: number; languages: number[] } {
    const defaultKeyWidth = 200;
    const defaultContextWidth = 200;
    const defaultLangWidth = 150;
    
    const keyWidth = this.getColumnWidthValue('key', defaultKeyWidth);
    const contextWidth = this.getColumnWidthValue('context', defaultContextWidth);
    const langWidths = this.options.languages.map(lang => 
      this.getColumnWidthValue(`values.${lang}`, defaultLangWidth)
    );
    
    // 마지막 컬럼을 제외한 나머지 컬럼들의 총 너비
    const fixedWidth = keyWidth + contextWidth + langWidths.slice(0, -1).reduce((sum, w) => sum + w, 0);
    
    // 마지막 컬럼 너비 = 컨테이너 너비 - 고정 너비 (최소 너비 보장)
    const lastLangMinWidth = this.columnMinWidths.get(`values.${this.options.languages[this.options.languages.length - 1]!}`) || 80;
    const lastLangWidth = Math.max(lastLangMinWidth, containerWidth - fixedWidth);
    
    // 마지막 컬럼을 제외한 언어 컬럼들
    const otherLangWidths = langWidths.slice(0, -1);
    
    return {
      key: keyWidth,
      context: contextWidth,
      languages: [...otherLangWidths, lastLangWidth],
    };
  }

  /**
   * Key 중복 체크
   */
  private checkKeyDuplicate(currentRowId: string, key: string): boolean {
    return this.options.translations.some(
      t => t.id !== currentRowId && t.key === key
    );
  }

  /**
   * columnId에서 lang 값 추출
   */
  private getLangFromColumnId(columnId: string): string {
    if (columnId === 'key') return 'key';
    if (columnId === 'context') return 'context';
    if (columnId.startsWith('values.')) return columnId.replace('values.', '');
    return columnId;
  }

  /**
   * translation key 값 결정
   */
  private getTranslationKey(rowId: string, columnId: string, newValue: string): string {
    if (columnId === 'key') return newValue;
    return this.options.translations.find(t => t.id === rowId)?.key || '';
  }

  /**
   * 읽기 전용 모드 설정
   */
  setReadOnly(readOnly: boolean): void {
    this.options = { ...this.options, readOnly };
    if (this.gridElement) {
      if (readOnly) {
        this.gridElement.classList.add('readonly');
      } else {
        this.gridElement.classList.remove('readonly');
      }
    }
    // 모든 셀의 tabindex 업데이트
    if (this.bodyElement) {
      const cells = this.bodyElement.querySelectorAll('.virtual-grid-cell');
      cells.forEach(cell => {
        const columnId = cell.getAttribute('data-column-id');
        const editable = columnId && this.editableColumns.has(columnId);
        cell.setAttribute('tabindex', editable && !readOnly ? '0' : '-1');
      });
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
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
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

