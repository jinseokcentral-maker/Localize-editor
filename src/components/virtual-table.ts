/**
 * Virtual Table - @tanstack/virtual-core를 사용한 가상화 테이블
 * 
 * AG Grid 대신 사용할 headless 테이블 구현
 */

import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@/virtual-core/index";
import type { Translation, TranslationChange } from "@/types/translation";
import { ChangeTracker } from "./change-tracker";
import { UndoRedoManager, type UndoRedoAction } from "./undo-redo-manager";
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
  private changeTracker = new ChangeTracker();
  private undoRedoManager = new UndoRedoManager();
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  
  // 편집 관련 상태
  private editingCell: { rowIndex: number; columnId: string } | null = null;
  private isEscapeKeyPressed = false;
  private isFinishingEdit = false; // finishEdit 중복 호출 방지

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
    
    // 원본 데이터 초기화 (변경사항 추적용)
    this.changeTracker.initializeOriginalData(options.translations, options.languages);
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
        
        // 헤더 다시 렌더링 (컬럼 너비가 변경되었으므로)
        if (this.headerElement && this.tableElement) {
          // 기존 헤더 내용 제거
          this.headerElement.innerHTML = '';
          // 헤더 다시 렌더링
          this.renderHeader();
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

    // 스크롤 컨테이너의 초기 크기 계산 (테스트 환경을 위한 폴백)
    const getInitialRect = (): { width: number; height: number } => {
      if (this.scrollElement) {
        const rect = this.scrollElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { width: rect.width, height: rect.height };
        }
      }
      // 폴백: 컨테이너 크기 사용
      const containerWidth = this.container.clientWidth || 800;
      const containerHeight = this.container.clientHeight || 600;
      return { width: containerWidth, height: containerHeight };
    };

    const initialRect = getInitialRect();

    this.rowVirtualizer = new Virtualizer<HTMLElement, HTMLTableRowElement>({
      count: this.options.translations.length,
      getScrollElement: () => this.scrollElement,
      estimateSize: () => this.rowHeight,
      scrollToFn: elementScroll,
      observeElementRect: observeElementRect,
      observeElementOffset: observeElementOffset,
      initialRect, // 초기 크기 제공 (테스트 환경 지원)
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

    const containerWidth = this.getContainerWidth();
    const columnWidths = this.calculateColumnWidths(containerWidth);
    
    // Key 컬럼 (sticky, z-index: 10)
    headerRow.appendChild(this.createHeaderCell('Key', columnWidths.key, 0, 10));
    
    // Context 컬럼 (sticky, z-index: 10)
    headerRow.appendChild(this.createHeaderCell('Context', columnWidths.context, columnWidths.key, 10));

    // 언어 컬럼들
    this.options.languages.forEach((lang, index) => {
      const langWidth = columnWidths.languages[index]!;
      headerRow.appendChild(this.createHeaderCell(lang.toUpperCase(), langWidth, 0, 0));
    });

    this.headerElement.appendChild(headerRow);
  }

  /**
   * 헤더 셀 생성
   */
  private createHeaderCell(text: string, width: number, left: number, zIndex: number): HTMLTableCellElement {
    const header = document.createElement('th');
    header.setAttribute('role', 'columnheader');
    header.textContent = text;
    header.style.width = `${width}px`;
    header.style.minWidth = `${width}px`;
    header.style.maxWidth = `${width}px`;
    
    if (left > 0 || zIndex > 0) {
      header.style.position = 'sticky';
      header.style.left = `${left}px`;
      header.style.zIndex = zIndex.toString();
    }
    
    return header;
  }

  /**
   * 셀에 너비 및 스타일 적용
   */
  private applyCellWidthAndStyle(cell: HTMLTableCellElement, columnId: string): void {
    const containerWidth = this.getContainerWidth();
    const columnWidths = this.calculateColumnWidths(containerWidth);
    
    let width: number;
    let left = 0;
    let zIndex = 0;
    
    if (columnId === 'key') {
      width = columnWidths.key;
      left = 0;
      zIndex = 5;
    } else if (columnId === 'context') {
      width = columnWidths.context;
      left = columnWidths.key;
      zIndex = 5;
    } else if (columnId.startsWith('values.')) {
      const langIndex = this.options.languages.findIndex(lang => `values.${lang}` === columnId);
      if (langIndex >= 0) {
        width = columnWidths.languages[langIndex]!;
      } else {
        return; // 알 수 없는 컬럼
      }
    } else {
      return; // 알 수 없는 컬럼
    }
    
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.maxWidth = `${width}px`;
    
    if (zIndex > 0) {
      cell.style.position = 'sticky';
      cell.style.left = `${left}px`;
      cell.style.zIndex = zIndex.toString();
    }
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
    
    // 컬럼 너비 및 스타일 설정 (헤더와 일치)
    this.applyCellWidthAndStyle(cell, columnId);

    // 셀 내용
    const cellContent = document.createElement('div');
    cellContent.textContent = value;
    cellContent.style.overflow = 'hidden';
    cellContent.style.textOverflow = 'ellipsis';
    cellContent.style.whiteSpace = 'nowrap';
    cellContent.style.width = '100%';
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
    }

    return cell;
  }

  /**
   * 편집 시작
   */
  private startEditing(rowIndex: number, columnId: string, cell: HTMLTableCellElement): void {
    // 이미 편집 중이면 취소
    if (this.editingCell) {
      this.stopEditing();
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
    input.style.zIndex = '10'; // 편집 중일 때 ::before 아이콘 위에 표시

    // 기존 내용 제거하고 input 추가
    cell.innerHTML = '';
    cell.style.position = 'relative'; // input이 absolute로 위치할 수 있도록
    cell.appendChild(input);
    
    // 다음 프레임에서 focus (DOM이 완전히 업데이트된 후)
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    // Key 컬럼 편집 중 실시간 중복 체크
    let isDuplicateKey = false; // 중복 상태 추적
    if (columnId === 'key') {
      const rowId = cell.getAttribute('data-row-id') || '';
      const updateDuplicateCheck = () => {
        const inputValue = input.value;
        // 기존 클래스 제거
        cell.classList.remove('cell-duplicate-key');
        cell.removeAttribute('title');
        isDuplicateKey = false;
        
        // 중복 체크 (임시로 현재 입력값으로 체크, 자기 자신 제외)
        if (inputValue && inputValue.trim() !== '') {
          const keysByRowId = new Map<string, string>();
          this.options.translations.forEach(t => {
            // 현재 편집 중인 행은 제외하고 체크
            if (t.id !== rowId) {
              keysByRowId.set(t.id, t.key);
            }
          });
          
          // changeTracker의 변경사항도 반영 (현재 편집 중인 행 제외)
          const changesMap = this.changeTracker.getChangesMap();
          changesMap.forEach((change, changeKey) => {
            const [changeRowId, changeColumnId] = changeKey.split('-', 2);
            if (changeColumnId === 'key' && changeRowId !== rowId) {
              keysByRowId.set(changeRowId, change.newValue);
            }
          });
          
          // 중복 체크
          if (Array.from(keysByRowId.values()).includes(inputValue)) {
            cell.classList.add('cell-duplicate-key');
            cell.setAttribute('title', 'Key must be unique. This key already exists.');
            input.setAttribute('title', 'Key must be unique. This key already exists.');
            isDuplicateKey = true;
          } else {
            cell.classList.remove('cell-duplicate-key');
            cell.removeAttribute('title');
            input.removeAttribute('title');
            isDuplicateKey = false;
          }
        }
      };
      
      input.addEventListener('input', updateDuplicateCheck);
      // 초기 체크
      updateDuplicateCheck();
    }

    // 편집 완료/취소 이벤트
    const finishEdit = (save: boolean) => {
      // 중복 호출 방지
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
      
      // 중복된 Key인 경우 저장하지 않음 (이전 값으로 복원)
      if (save && columnId === 'key' && isDuplicateKey) {
        save = false; // 중복된 Key는 저장하지 않음
      }
      
      if (save && input.value !== currentValue) {
        const newValue = input.value;
        const oldValue = currentValue; // 편집 시작 시점의 값
        
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
        
        // lang 값 결정: key는 'key', context는 'context', values.*는 언어 코드
        let lang: string;
        if (columnId === 'key') {
          lang = 'key';
        } else if (columnId === 'context') {
          lang = 'context';
        } else if (columnId.startsWith('values.')) {
          lang = columnId.replace('values.', '');
        } else {
          lang = columnId;
        }
        
        // translation key 결정
        const translationKey = columnId === 'key' ? newValue : (this.options.translations.find(t => t.id === rowId)?.key || '');
        
        this.changeTracker.trackChange(
          rowId,
          columnId,
          lang,
          originalValue,
          newValue,
          translationKey,
          () => {
            // 변경사항 추적 후 셀 스타일 업데이트
            this.updateCellStyle(rowId, columnId);
          }
        );
        
        // onCellChange 콜백 호출
        if (this.options.onCellChange) {
          this.options.onCellChange(rowId, columnId, newValue);
        }
      }
      
      // 원래 내용으로 복원 (변경사항 추적 후)
      const newValue = save ? input.value : currentValue;
      this.updateCellContent(cell, rowId, columnId, newValue);
      
      this.editingCell = null;
      this.isFinishingEdit = false;
    };

    input.addEventListener('blur', () => {
      // finishEdit이 이미 실행 중이면 무시 (중복 호출 방지)
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
        e.stopPropagation(); // 이벤트 전파 방지
        finishEdit(true);
        // blur 이벤트가 발생하지 않도록 input을 즉시 제거
        input.blur();
        // 다음 셀로 이동하는 로직은 나중에 구현
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
        // Tab 네비게이션은 나중에 구현
      }
    });
  }

  /**
   * 편집 중지
   */
  private stopEditing(): void {
    if (!this.editingCell) return;
    // 편집 중지 로직은 startEditing의 finishEdit에서 처리됨
    this.editingCell = null;
  }

  /**
   * 키보드 이벤트 리스너 추가
   */
  private attachKeyboardListeners(): void {
    // document에 이벤트 리스너를 추가하여 어디서든 작동하도록 함
    this.keyboardHandler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      
      // Undo: Ctrl+Z (Mac: Cmd+Z)
      // input 필드 내부가 아니거나, contentEditable이 아닌 경우에만 처리
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Ctrl+Z는 input 필드에서는 기본 동작(텍스트 undo)을 사용하므로 제외
      // 하지만 우리가 편집 중인 input이 아니면 처리
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey && !isInputField) {
        e.preventDefault();
        this.handleUndo();
        return;
      }
      
      // Redo: Ctrl+Y (Mac: Cmd+Y) 또는 Ctrl+Shift+Z (Mac: Cmd+Shift+Z)
      if (ctrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !isInputField) {
        e.preventDefault();
        this.handleRedo();
        return;
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
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

    // 셀 찾기
    const cell = this.bodyElement?.querySelector(
      `td[data-row-id="${action.rowId}"][data-column-id="${action.columnId}"]`
    ) as HTMLTableCellElement;
    
    if (!cell) return;

    // 현재 편집 중이면 중지
    if (this.editingCell) {
      this.stopEditing();
    }

    // 값 업데이트
    this.updateCellContent(cell, action.rowId, action.columnId, action.newValue);

    // 변경사항 추적 업데이트 (undo/redo는 히스토리에 추가하지 않음)
    const originalValue = this.changeTracker.getOriginalValue(action.rowId, action.columnId);
    
    // lang 값 결정
    const lang = action.columnId === 'key' ? 'key' 
      : action.columnId === 'context' ? 'context'
      : action.columnId.startsWith('values.') ? action.columnId.replace('values.', '')
      : action.columnId;
    
    // translation key 결정
    const translationKey = action.columnId === 'key' 
      ? action.newValue 
      : (this.options.translations.find(t => t.id === action.rowId)?.key || '');

    // changeTracker는 원본 값을 기준으로 변경사항을 추적하므로
    // undo/redo 시에도 원본 값과 새 값을 비교하여 변경사항을 업데이트
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
   * Key 중복 체크
   */
  private checkKeyDuplicate(rowId: string, keyValue: string): boolean {
    if (!keyValue || keyValue.trim() === '') {
      return false; // 빈 값은 중복이 아님 (빈 값 검증은 별도로 처리)
    }

    // 현재 translations 배열에서 모든 key 수집 (변경사항 반영)
    const keysByRowId = new Map<string, string>();
    this.options.translations.forEach(t => {
      keysByRowId.set(t.id, t.key);
    });

    // changeTracker의 변경사항 반영
    const changesMap = this.changeTracker.getChangesMap();
    changesMap.forEach((change, changeKey) => {
      const [changeRowId, changeColumnId] = changeKey.split('-', 2);
      if (changeColumnId === 'key') {
        keysByRowId.set(changeRowId, change.newValue);
      }
    });

    // 자기 자신을 제외하고 같은 key가 있는지 확인
    for (const [id, key] of keysByRowId.entries()) {
      if (id !== rowId && key === keyValue) {
        return true; // 중복 발견
      }
    }

    return false; // 중복 없음
  }

  /**
   * 셀 스타일 업데이트 (dirty/empty/duplicate-key 상태)
   */
  private updateCellStyle(rowId: string, columnId: string, cell?: HTMLTableCellElement): void {
    const targetCell = cell || this.bodyElement?.querySelector(`td[data-row-id="${rowId}"][data-column-id="${columnId}"]`) as HTMLTableCellElement;
    if (!targetCell) return;
    
    // 기존 클래스 제거
    targetCell.classList.remove('cell-dirty', 'cell-empty', 'cell-duplicate-key');
    targetCell.removeAttribute('title'); // tooltip 제거
    
    // Dirty 상태 확인
    const changeKey = `${rowId}-${columnId}`;
    const changesMap = this.changeTracker.getChangesMap();
    if (changesMap.has(changeKey)) {
      targetCell.classList.add('cell-dirty');
    }
    
    // Key 컬럼 중복 체크
    if (columnId === 'key') {
      const div = targetCell.querySelector('div');
      const keyValue = div?.textContent || '';
      if (keyValue && this.checkKeyDuplicate(rowId, keyValue)) {
        targetCell.classList.add('cell-duplicate-key');
        targetCell.setAttribute('title', 'Key must be unique. This key already exists.');
      }
    }
    
    // Empty 상태 확인 (언어 컬럼만)
    if (columnId.startsWith('values.')) {
      const div = targetCell.querySelector('div');
      const value = div?.textContent || '';
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        targetCell.classList.add('cell-empty');
      }
    }
  }
  
  /**
   * 셀 내용 업데이트
   */
  private updateCellContent(cell: HTMLTableCellElement, rowId: string, columnId: string, value: string): void {
    cell.innerHTML = '';
    cell.style.position = ''; // position 복원
    const div = document.createElement('div');
    div.textContent = value;
    div.style.overflow = 'hidden';
    div.style.textOverflow = 'ellipsis';
    div.style.whiteSpace = 'nowrap';
    div.style.width = '100%';
    cell.appendChild(div);
    
    // 스타일 업데이트
    this.updateCellStyle(rowId, columnId, cell);
  }
  
  /**
   * 변경사항 가져오기
   */
  getChanges(): TranslationChange[] {
    return this.changeTracker.getChanges();
  }
  
  /**
   * 변경사항 초기화
   */
  clearChanges(): void {
    this.changeTracker.clearChanges();
    this.undoRedoManager.clear(); // Undo/Redo 히스토리도 초기화
    // 모든 셀 스타일 업데이트
    if (this.bodyElement) {
      const cells = this.bodyElement.querySelectorAll('td[data-row-id][data-column-id]');
      cells.forEach(cell => {
        const rowId = cell.getAttribute('data-row-id')!;
        const columnId = cell.getAttribute('data-column-id')!;
        this.updateCellStyle(rowId, columnId, cell as HTMLTableCellElement);
      });
    }
  }

  /**
   * Undo 가능 여부
   */
  canUndo(): boolean {
    return this.undoRedoManager.canUndo();
  }

  /**
   * Redo 가능 여부
   */
  canRedo(): boolean {
    return this.undoRedoManager.canRedo();
  }

  /**
   * 히스토리 상태 가져오기 (디버깅용)
   */
  getUndoRedoState(): { length: number; currentIndex: number; canUndo: boolean; canRedo: boolean } {
    return this.undoRedoManager.getHistoryState();
  }
  
  /**
   * translations 업데이트 (정렬 후 사용)
   */
  updateTranslations(translations: readonly Translation[]): void {
    this.options = { ...this.options, translations };
    // 원본 데이터도 업데이트
    this.changeTracker.initializeOriginalData(translations, this.options.languages);
    this.render();
  }

  /**
   * 테이블 제거
   */
  destroy(): void {
    // 키보드 이벤트 리스너 제거
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    // ResizeObserver 제거
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Virtualizer cleanup
    if (this.virtualizerCleanup) {
      this.virtualizerCleanup();
      this.virtualizerCleanup = null;
    }
    
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

