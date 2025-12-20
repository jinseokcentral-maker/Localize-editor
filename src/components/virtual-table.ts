/**
 * Virtual Table - @tanstack/virtual-core를 사용한 가상화 테이블
 * 
 * AG Grid 대신 사용할 headless 테이블 구현
 */

import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@/virtual-core/index";
import type { Translation } from "@/types/translation";
import "@/styles/virtual-table.css";

export interface VirtualTableOptions {
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

export class VirtualTable {
  private container: HTMLElement;
  private scrollElement: HTMLElement | null = null;
  private tableElement: HTMLTableElement | null = null;
  private headerElement: HTMLTableSectionElement | null = null;
  private bodyElement: HTMLTableSectionElement | null = null;
  private options: VirtualTableOptions;
  private rowVirtualizer: Virtualizer<HTMLElement, HTMLTableRowElement> | null = null;
  private virtualizerCleanup: (() => void) | null = null;
  private renderScheduled: boolean = false;
  private resizeObserver: ResizeObserver | null = null;
  private columnWidths: Map<string, number> = new Map();
  private editableColumns: Set<string> = new Set();
  private rowHeight: number = 40;
  
  // 편집 관련 상태
  private editingCell: { rowIndex: number; columnId: string } | null = null;
  private isEscapeKeyPressed = false;

  constructor(options: VirtualTableOptions) {
    this.container = options.container;
    this.options = options;
    this.columnWidths = options.columnWidths || new Map();
    this.rowHeight = options.rowHeight || 40;
    
    // 편집 가능한 컬럼 설정
    this.editableColumns = new Set(['key', 'context']);
    options.languages.forEach(lang => {
      this.editableColumns.add(`values.${lang}`);
    });
  }

  /**
   * 테이블 렌더링
   */
  render(): void {
    // 기존 테이블이 있으면 제거
    if (this.scrollElement && this.container.contains(this.scrollElement)) {
      this.container.removeChild(this.scrollElement);
    }

    // 스크롤 컨테이너 생성 (가상 스크롤링용)
    this.scrollElement = document.createElement('div');
    this.scrollElement.className = 'virtual-table-scroll-container';
    this.scrollElement.style.width = '100%';
    this.scrollElement.style.height = '100%';
    this.scrollElement.style.overflow = 'auto';
    this.scrollElement.style.position = 'relative';

    // 테이블 생성 (헤더와 바디를 모두 포함)
    this.tableElement = document.createElement('table');
    this.tableElement.className = 'virtual-table';
    if (this.options.readOnly) {
      this.tableElement.classList.add('readonly');
    }
    this.tableElement.setAttribute('role', 'grid');
    // 테이블 너비는 컨테이너 너비에 맞춤
    const totalWidth = this.getTotalTableWidth();
    this.tableElement.style.width = totalWidth;
    this.tableElement.style.minWidth = totalWidth;
    this.tableElement.style.maxWidth = totalWidth;
    this.tableElement.style.tableLayout = 'fixed';

    // 헤더 생성 (가상 스크롤 컨테이너 안에 포함)
    this.headerElement = document.createElement('thead');
    this.renderHeader();
    this.tableElement.appendChild(this.headerElement);

    // 바디 생성
    this.bodyElement = document.createElement('tbody');
    this.bodyElement.style.position = 'relative';
    this.bodyElement.style.display = 'block';
    this.bodyElement.style.minHeight = '0';
    this.tableElement.appendChild(this.bodyElement);

    // 스크롤 컨테이너에 테이블 추가
    this.scrollElement.appendChild(this.tableElement);
    this.container.appendChild(this.scrollElement);

    // 컨테이너 크기 변경 감지 (ResizeObserver 사용)
    this.observeContainerResize();

    // 가상 스크롤링 초기화 (다음 프레임에서 실행하여 DOM이 완전히 렌더링된 후)
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
    // 기존 observer 정리
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // ResizeObserver로 컨테이너 크기 변경 감지
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // 테이블 너비 업데이트
        if (this.tableElement) {
          const totalWidth = this.getTotalTableWidth();
          this.tableElement.style.width = totalWidth;
          this.tableElement.style.minWidth = totalWidth;
          this.tableElement.style.maxWidth = totalWidth;
        }
        
        // 가상 행들도 다시 렌더링 (너비가 변경되었으므로)
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
      console.error('VirtualTable: scrollElement or bodyElement is null');
      return;
    }

    this.rowVirtualizer = new Virtualizer<HTMLElement, HTMLTableRowElement>({
      count: this.options.translations.length,
      getScrollElement: () => this.scrollElement,
      estimateSize: () => this.rowHeight,
      scrollToFn: elementScroll,
      observeElementRect: observeElementRect,
      observeElementOffset: observeElementOffset,
      onChange: () => {
        // requestAnimationFrame으로 렌더링 최적화
        if (!this.renderScheduled) {
          this.renderScheduled = true;
          requestAnimationFrame(() => {
            this.renderScheduled = false;
            this.renderVirtualRows();
          });
        }
      },
    });

    // Virtualizer 초기화 (필수: 스크롤 이벤트 리스너 등을 등록)
    this.rowVirtualizer._willUpdate();
    
    // cleanup 함수 저장 (destroy 시 호출)
    this.virtualizerCleanup = this.rowVirtualizer._didMount();
    
    // 초기 렌더링 (다음 프레임에서 실행하여 DOM이 완전히 준비된 후)
    requestAnimationFrame(() => {
      this.renderVirtualRows();
    });

    // 스크롤 이벤트 리스너는 Virtualizer가 자동으로 처리
  }

  /**
   * 가상 행 렌더링
   */
  private renderVirtualRows(): void {
    if (!this.rowVirtualizer || !this.bodyElement) {
      return;
    }

    // 편집 중인 셀 정보 저장 (재렌더링 전)
    let editingCellData: { rowId: string; columnId: string; value: string } | null = null;
    if (this.editingCell) {
      const editingRow = this.bodyElement.querySelector(`tr[data-row-index="${this.editingCell.rowIndex}"]`);
      if (editingRow) {
        const editingCellElement = editingRow.querySelector(`td[data-column-id="${this.editingCell.columnId}"]`);
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

    // tbody의 높이를 전체 크기로 설정 (스크롤 가능하도록)
    this.bodyElement.style.height = `${totalSize}px`;

    // 각 가상 아이템에 대해 행 생성
    virtualItems.forEach((virtualItem) => {
      const translation = this.options.translations[virtualItem.index];
      if (!translation) {
        return;
      }

      const row = this.createRow(translation, virtualItem.index);
      
      // 가상 스크롤링을 위한 위치 설정
      const totalWidth = this.getTotalTableWidth();
      row.style.position = 'absolute';
      row.style.top = `${virtualItem.start}px`;
      row.style.left = '0';
      row.style.width = totalWidth;
      row.style.minWidth = totalWidth;
      row.style.maxWidth = totalWidth;
      row.style.height = `${virtualItem.size}px`;
      row.style.display = 'table';
      row.style.tableLayout = 'fixed';
      row.setAttribute('data-index', virtualItem.index.toString());

      this.bodyElement!.appendChild(row);

      // 편집 중인 셀이면 다시 편집 모드로 전환
      if (editingCellData && translation.id === editingCellData.rowId) {
        const cellElement = row.querySelector(`td[data-column-id="${editingCellData.columnId}"]`);
        if (cellElement) {
          // 다음 프레임에서 편집 모드로 전환 (행이 DOM에 완전히 추가된 후)
          requestAnimationFrame(() => {
            this.startEditing(virtualItem.index, editingCellData!.columnId, cellElement as HTMLTableCellElement);
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

    const headerRow = document.createElement('tr');
    headerRow.setAttribute('role', 'row');

    // 컬럼 너비 계산 (헤더와 바디가 일치하도록)
    const containerWidth = this.getContainerWidth();
    const columnWidths = this.calculateColumnWidths(containerWidth);
    
    // Key 컬럼
    const keyHeader = document.createElement('th');
    keyHeader.setAttribute('role', 'columnheader');
    keyHeader.textContent = 'Key';
    keyHeader.style.width = `${columnWidths.key}px`;
    keyHeader.style.minWidth = `${columnWidths.key}px`;
    keyHeader.style.maxWidth = `${columnWidths.key}px`;
    keyHeader.style.position = 'sticky';
    keyHeader.style.left = '0';
    keyHeader.style.zIndex = '10';
    headerRow.appendChild(keyHeader);

    // Context 컬럼
    const contextHeader = document.createElement('th');
    contextHeader.setAttribute('role', 'columnheader');
    contextHeader.textContent = 'Context';
    contextHeader.style.width = `${columnWidths.context}px`;
    contextHeader.style.minWidth = `${columnWidths.context}px`;
    contextHeader.style.maxWidth = `${columnWidths.context}px`;
    contextHeader.style.position = 'sticky';
    contextHeader.style.left = `${columnWidths.key}px`;
    contextHeader.style.zIndex = '10';
    headerRow.appendChild(contextHeader);

    // 언어 컬럼들
    this.options.languages.forEach((lang, index) => {
      const langWidth = columnWidths.languages[index]!;
      const langHeader = document.createElement('th');
      langHeader.setAttribute('role', 'columnheader');
      langHeader.textContent = lang.toUpperCase();
      langHeader.style.width = `${langWidth}px`;
      langHeader.style.minWidth = `${langWidth}px`;
      langHeader.style.maxWidth = `${langWidth}px`;
      headerRow.appendChild(langHeader);
    });

    this.headerElement.appendChild(headerRow);
  }

  /**
   * 컬럼 너비 계산 (컨테이너 너비에 맞춤)
   */
  private calculateColumnWidths(containerWidth: number): { key: number; context: number; languages: number[] } {
    // 기본 너비
    const defaultKeyWidth = 200;
    const defaultContextWidth = 200;
    const defaultLangWidth = 150;
    
    // 사용자 지정 너비가 있으면 사용, 없으면 기본값
    const keyWidth = this.getColumnWidthValue('key', defaultKeyWidth);
    const contextWidth = this.getColumnWidthValue('context', defaultContextWidth);
    const langWidths = this.options.languages.map(lang => 
      this.getColumnWidthValue(`values.${lang}`, defaultLangWidth)
    );
    
    // 전체 기본 너비 합계
    const totalDefaultWidth = keyWidth + contextWidth + langWidths.reduce((sum, w) => sum + w, 0);
    
    // 컨테이너 너비가 기본 너비 합계보다 크면, 남은 공간을 언어 컬럼들에 균등 분배
    if (containerWidth > totalDefaultWidth) {
      const extraWidth = containerWidth - totalDefaultWidth;
      const extraPerLang = Math.floor(extraWidth / langWidths.length);
      
      return {
        key: keyWidth,
        context: contextWidth,
        languages: langWidths.map(w => w + extraPerLang),
      };
    }
    
    // 컨테이너 너비가 작으면 비율에 맞게 축소
    const ratio = containerWidth / totalDefaultWidth;
    return {
      key: Math.floor(keyWidth * ratio),
      context: Math.floor(contextWidth * ratio),
      languages: langWidths.map(w => Math.floor(w * ratio)),
    };
  }

  /**
   * 바디 렌더링 (가상 스크롤링 적용)
   * 이 메서드는 이제 renderVirtualRows에서 처리됨
   */
  private renderBody(): void {
    // 가상 스크롤링이 활성화되어 있으면 renderVirtualRows에서 처리
    // 이 메서드는 호환성을 위해 남겨두지만 실제로는 사용되지 않음
  }

  /**
   * 행 생성
   */
  private createRow(translation: Translation, rowIndex: number): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');
    row.setAttribute('data-row-index', rowIndex.toString());
    row.setAttribute('data-row-id', translation.id);

    // Key 셀
    const keyCell = this.createCell(translation.id, 'key', translation.key, rowIndex, true);
    row.appendChild(keyCell);

    // Context 셀
    const contextCell = this.createCell(
      translation.id,
      'context',
      translation.context || '',
      rowIndex,
      true
    );
    row.appendChild(contextCell);

    // 언어 셀들
    this.options.languages.forEach(lang => {
      const value = translation.values[lang] || '';
      const cell = this.createCell(
        translation.id,
        `values.${lang}`,
        value,
        rowIndex,
        !this.options.readOnly
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
    editable: boolean
  ): HTMLTableCellElement {
    const cell = document.createElement('td');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('data-row-id', rowId);
    cell.setAttribute('data-column-id', columnId);
    cell.setAttribute('data-row-index', rowIndex.toString());
    cell.setAttribute('tabindex', editable ? '0' : '-1');
    
    // 컬럼 너비 설정 (헤더와 일치)
    const containerWidth = this.getContainerWidth();
    const columnWidths = this.calculateColumnWidths(containerWidth);
    
    if (columnId === 'key') {
      cell.style.width = `${columnWidths.key}px`;
      cell.style.minWidth = `${columnWidths.key}px`;
      cell.style.maxWidth = `${columnWidths.key}px`;
      cell.style.position = 'sticky';
      cell.style.left = '0';
      cell.style.zIndex = '5';
    } else if (columnId === 'context') {
      cell.style.width = `${columnWidths.context}px`;
      cell.style.minWidth = `${columnWidths.context}px`;
      cell.style.maxWidth = `${columnWidths.context}px`;
      cell.style.position = 'sticky';
      cell.style.left = `${columnWidths.key}px`;
      cell.style.zIndex = '5';
    } else if (columnId.startsWith('values.')) {
      const langIndex = this.options.languages.findIndex(lang => `values.${lang}` === columnId);
      if (langIndex >= 0) {
        const langWidth = columnWidths.languages[langIndex]!;
        cell.style.width = `${langWidth}px`;
        cell.style.minWidth = `${langWidth}px`;
        cell.style.maxWidth = `${langWidth}px`;
      }
    }

    // 셀 내용
    const cellContent = document.createElement('div');
    cellContent.textContent = value;
    cellContent.style.overflow = 'hidden';
    cellContent.style.textOverflow = 'ellipsis';
    cellContent.style.whiteSpace = 'nowrap';
    cell.appendChild(cellContent);

    // 더블클릭으로 편집 시작
    if (editable && !this.options.readOnly) {
      cell.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startEditing(rowIndex, columnId, cell);
      });
    }

    return cell;
  }

  /**
   * 편집 시작
   */
  private startEditing(rowIndex: number, columnId: string, cell: HTMLTableCellElement): void {
    // 이미 편집 중이면 취소
    if (this.editingCell) {
      this.stopEditing(false);
    }

    this.editingCell = { rowIndex, columnId };

    const cellContent = cell.querySelector('div');
    if (!cellContent) return;

    const currentValue = cellContent.textContent || '';
    
    // input 생성
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.boxSizing = 'border-box';
    input.style.border = '2px solid #3b82f6';
    input.style.padding = '4px 8px';
    input.style.outline = 'none';
    input.style.fontSize = '14px';
    input.style.fontFamily = 'inherit';
    input.style.backgroundColor = '#fff';
    input.style.color = '#1e293b';
    input.style.position = 'absolute';
    input.style.top = '0';
    input.style.left = '0';

    // 기존 내용 제거하고 input 추가
    cell.innerHTML = '';
    cell.style.position = 'relative'; // input이 absolute로 위치할 수 있도록
    cell.appendChild(input);
    
    // 다음 프레임에서 focus (DOM이 완전히 업데이트된 후)
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    // 편집 완료/취소 이벤트
    const finishEdit = (save: boolean) => {
      if (save && input.value !== currentValue) {
        const rowId = cell.getAttribute('data-row-id');
        if (rowId && this.options.onCellChange) {
          this.options.onCellChange(rowId, columnId, input.value);
        }
      }
      
      // 원래 내용으로 복원
      const newValue = save ? input.value : currentValue;
      cell.innerHTML = '';
      const div = document.createElement('div');
      div.textContent = newValue;
      div.style.overflow = 'hidden';
      div.style.textOverflow = 'ellipsis';
      div.style.whiteSpace = 'nowrap';
      cell.appendChild(div);
      
      this.editingCell = null;
    };

    input.addEventListener('blur', () => {
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
        finishEdit(true);
        // 다음 셀로 이동하는 로직은 나중에 구현
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.isEscapeKeyPressed = true;
        input.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        finishEdit(true);
        // Tab 네비게이션은 나중에 구현
      }
    });
  }

  /**
   * 편집 중지
   */
  private stopEditing(save: boolean): void {
    if (!this.editingCell) return;
    // 편집 중지 로직은 startEditing의 finishEdit에서 처리됨
    this.editingCell = null;
  }

  /**
   * 키보드 이벤트 리스너 추가
   */
  private attachKeyboardListeners(): void {
    if (!this.tableElement) return;

    this.tableElement.addEventListener('keydown', (e) => {
      // Tab 키 네비게이션은 나중에 구현
      if (e.key === 'Tab') {
        e.preventDefault();
        // 커스텀 Tab 네비게이션 로직
      }
    });
  }

  /**
   * 컬럼 너비 가져오기 (px 값 반환)
   */
  private getColumnWidth(columnId: string, defaultWidth: number): string {
    const width = this.columnWidths.get(columnId) || defaultWidth;
    return `${width}px`;
  }

  /**
   * 컬럼 너비 가져오기 (숫자 값 반환)
   */
  private getColumnWidthValue(columnId: string, defaultWidth: number): number {
    return this.columnWidths.get(columnId) || defaultWidth;
  }

  /**
   * 컨테이너 너비 가져오기 (또는 window 너비)
   */
  private getContainerWidth(): number {
    if (this.container && this.container.clientWidth > 0) {
      return this.container.clientWidth;
    }
    // container가 없거나 너비가 0이면 window 너비 사용
    return typeof window !== 'undefined' ? window.innerWidth : 1000;
  }

  /**
   * 테이블 전체 너비 계산 (컨테이너 너비에 맞춤)
   */
  private getTotalTableWidth(): string {
    return `${this.getContainerWidth()}px`;
  }

  /**
   * 테이블 제거
   */
  destroy(): void {
    if (this.scrollElement && this.container.contains(this.scrollElement)) {
      this.container.removeChild(this.scrollElement);
    }
    this.rowVirtualizer = null;
    this.tableElement = null;
    this.headerElement = null;
    this.bodyElement = null;
    this.scrollElement = null;
  }
}

