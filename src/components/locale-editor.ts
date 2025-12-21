import {
  createGrid,
  type GridApi,
  ModuleRegistry,
  AllCommunityModule,
  type GridOptions,
  type ColDef,
  type CellValueChangedEvent,
  type NavigateToNextCellParams,
  type CellPosition,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "@/styles/ag-grid-custom.css"; // 커스터마이징 스타일
import { Effect, Option } from "effect";
import type {
  Translation,
  LocaleEditorOptions,
  TranslationChange,
} from "@/types/translation";
import { LocaleEditorError } from "@/types/errors";
import { FieldSchema, validateWithEffect } from "@/utils/validation";
import { ChangeTracker } from "./change-tracker";

// AG Grid 모듈 등록 (한 번만 실행)
let modulesRegistered = false;
if (!modulesRegistered) {
  ModuleRegistry.registerModules([AllCommunityModule]);
  modulesRegistered = true;
}

/**
 * LocaleEditor - AG Grid 기반 i18n 번역 에디터
 */
export class LocaleEditor {
  private gridApi: GridApi | null = null;
  private isEscapeKeyPressed = false; // ESC 키가 눌렸는지 추적
  private columnDefs: ColDef[] = [];
  private options: LocaleEditorOptions;
  private changeTracker = new ChangeTracker();
  private popoverMouseLeaveHandler: ((e: MouseEvent) => void) | null = null;
  private popoverMouseEnterHandler: (() => void) | null = null;

  constructor(options: LocaleEditorOptions) {
    this.options = options;
  }

  /**
   * readOnly 모드 업데이트 및 그리드 재렌더링
   */
  setReadOnly(readOnly: boolean): void {
    this.options = { ...this.options, readOnly };
    
    if (this.gridApi) {
      // 컬럼 크기 저장
      const columnState = this.gridApi.getColumnState();
      const widthMap = new Map<string, number>();
      columnState.forEach(state => {
        if (state.colId && state.width) {
          widthMap.set(state.colId, state.width);
        }
      });
      
      // 새로운 컬럼 정의 생성 (pinned 속성 포함)
      const newColumnDefs = this.prepareColumns(this.options.languages, readOnly);
      
      // 저장된 컬럼 크기 적용
      newColumnDefs.forEach(colDef => {
        if (colDef.field && widthMap.has(colDef.field)) {
          colDef.width = widthMap.get(colDef.field)!;
        }
      });
      
      // 컬럼 정의 업데이트 (pinned 속성이 새 정의에 포함되어 있음)
      this.columnDefs = newColumnDefs;
      this.gridApi.setGridOption("columnDefs", newColumnDefs);
      
      // 셀 새로고침 (editable 상태 변경 반영)
      this.gridApi.refreshCells({ force: true });
      
      // popover 표시/숨김 처리
      this.updateReadOnlyPopover(readOnly);
    }
  }

  /**
   * 읽기 전용 모드일 때 popover 표시/숨김
   */
  private updateReadOnlyPopover(readOnly: boolean): void {
    if (!this.gridApi) return;

    const container = this.options.container;
    const existingPopover = container.querySelector('.readonly-popover') as HTMLElement | null;
    
    // 기존 이벤트 리스너 제거
    if (this.popoverMouseLeaveHandler) {
      container.removeEventListener('mouseleave', this.popoverMouseLeaveHandler);
      this.popoverMouseLeaveHandler = null;
    }
    if (this.popoverMouseEnterHandler) {
      container.removeEventListener('mouseenter', this.popoverMouseEnterHandler);
      this.popoverMouseEnterHandler = null;
    }
    
    if (readOnly) {
      // 이미 존재하면 제거하고 다시 생성
      if (existingPopover) {
        existingPopover.remove();
      }
      
      // 새 popover 생성 함수
      const createPopover = () => {
        const popover = document.createElement('div');
        popover.className = 'readonly-popover';
        popover.textContent = this.getEditDisabledMessage('', '', null);
        container.style.position = 'relative'; // position context 설정
        container.appendChild(popover);
        return popover;
      };
      
      // 초기 popover 생성
      createPopover();
      
      // 마우스가 그리드 영역을 벗어나면 popover 제거
      this.popoverMouseLeaveHandler = (e: MouseEvent) => {
        // relatedTarget이 container 안에 없으면 (그리드를 떠나면) popover 제거
        if (!container.contains(e.relatedTarget as Node)) {
          const currentPopover = container.querySelector('.readonly-popover');
          if (currentPopover) {
            currentPopover.remove();
          }
        }
      };
      
      // 마우스가 다시 들어오면 popover 표시
      this.popoverMouseEnterHandler = () => {
        const currentPopover = container.querySelector('.readonly-popover');
        if (!currentPopover && readOnly) {
          createPopover();
        }
      };
      
      container.addEventListener('mouseleave', this.popoverMouseLeaveHandler);
      container.addEventListener('mouseenter', this.popoverMouseEnterHandler);
    } else {
      // 읽기 전용 모드가 아니면 popover 제거
      if (existingPopover) {
        existingPopover.remove();
      }
    }
  }

  /**
   * 현재 readOnly 상태 반환
   */
  isReadOnly(): boolean {
    return this.options.readOnly ?? false;
  }

  /**
   * 그리드를 렌더링합니다.
   */
  render(): void {
    const { container, translations, languages, readOnly } =
      this.options;

    // 원본 데이터 초기화 (변경사항 추적용)
    this.changeTracker.initializeOriginalData(translations, languages);

    // 컬럼 정의
    this.columnDefs = this.prepareColumns(languages, readOnly ?? false);

    // 데이터 변환
    const rowData = this.prepareRowData(translations, languages);

    // Grid 옵션
    const gridOptions: GridOptions = {
      theme: "legacy", // Legacy CSS 테마 사용 (ag-grid.css + ag-theme-alpine.css)
      columnDefs: this.columnDefs,
      rowData,
      // 행 ID 추출 함수 (getRowNode를 사용하기 위해 필요)
      getRowId: (params) => params.data.id,
      defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
      },
      // 헤더 포커스 비활성화 (헤더 셀 선택 방지)
      suppressHeaderFocus: true,
      // Tab 키가 그리드 밖으로 나가지 않도록 설정
      enableCellTextSelection: false,
      // 성능 최적화
      animateRows: false,
      suppressScrollOnNewData: true,
      // 가상 스크롤 활성화
      suppressRowVirtualisation: false,
      suppressColumnVirtualisation: false,
      // 그리드 준비 완료 시 컬럼 크기 자동 조정
      onGridReady: (params) => {
        // 모든 컬럼이 컨테이너 너비를 채우도록 조정
        params.api.sizeColumnsToFit();
        
        // 읽기 전용 모드면 popover 표시
        if (readOnly) {
          this.updateReadOnlyPopover(true);
        }
      },
      // 셀 값 변경 이벤트 핸들러
      onCellValueChanged: (event) => {
        this.handleCellValueChanged(event);
      },
      // 셀 편집 완료 이벤트 (Enter 키로 편집 완료 후 다음 셀로 이동)
      // ESC 키로 취소된 경우에는 이동하지 않음
      onCellEditingStopped: (event) => {
        this.handleCellEditingStopped(event);
      },
      // Tab 키 네비게이션 커스터마이징 (AG Grid가 Tab 키를 처리할 때 호출)
      // 편집 중이 아닐 때만 처리 (편집 중은 onCellKeyDown에서 처리)
      navigateToNextCell: (params) => {
        // 편집 중이면 null 반환하여 onCellKeyDown에서 처리하도록 함
        // AG Grid가 편집 중일 때 navigateToNextCell을 호출하는지 확인이 필요하지만,
        // 일단 편집 중이 아닐 때만 처리하도록 함
        return this.handleNavigateToNextCell(params);
      },
      // 키보드 이벤트 처리 - 우리가 정의한 동작만 허용
      onCellKeyDown: (event) => {
        if (!event.event) return false;
        
        const key = (event.event as KeyboardEvent).key;
        const isShift = (event.event as KeyboardEvent).shiftKey;
        const currentRowIndex = event.rowIndex ?? null;
        const currentColumn = 'column' in event ? event.column : null;
        
        // ESC 키: 편집 취소 (기본 동작 허용, 플래그만 설정)
        if (key === 'Escape') {
          this.isEscapeKeyPressed = true;
          return false; // 기본 동작 허용
        }
        
        // Enter 키: 기본 동작 허용 (handleCellEditingStopped에서 처리)
        if (key === 'Enter') {
          return false; // 기본 동작 허용
        }
        
        // Tab 키: 편집 중이면 편집 종료 후 다음 셀로 이동
        if (key === 'Tab') {
          // 편집 중인지 확인 (AG Grid API를 통해 확인)
          const isEditing = event.api?.getEditingCells().length > 0;
          
          if (isEditing && event.api) {
            // 편집 중이면 먼저 편집 종료 (변경사항 저장)
            // stopEditing(true)를 호출하면 자동으로 다음 셀로 이동하는데,
            // 우리는 커스텀 네비게이션을 원하므로 false로 호출하고 수동으로 처리
            event.api.stopEditing(false); // false = 포커스 이동 안 함
            
            // 편집 종료 후 다음 셀로 이동
            // setTimeout을 사용하여 편집 종료가 완전히 완료된 후 실행
            if (currentRowIndex !== null && currentRowIndex !== undefined && currentColumn) {
              setTimeout(() => {
                if (this.gridApi) {
                  this.handleTabNavigationAfterEditDirectly(
                    currentRowIndex,
                    currentColumn,
                    isShift
                  );
                }
              }, 0);
            }
            
            // 기본 Tab 동작 완전히 차단
            event.event.preventDefault();
            event.event.stopPropagation();
            return false;
          }
          // 편집 중이 아니면 navigateToNextCell에서 처리
          // 하지만 여기서도 기본 동작을 차단하여 navigateToNextCell만 사용하도록 함
          event.event.preventDefault();
          event.event.stopPropagation();
          return false;
        }
        
        // 편집 모드에서는 텍스트 입력을 위한 키 허용 (브라우저 기본 동작)
        const isEditing = event.api?.getEditingCells().length > 0;
        if (isEditing) {
          return false; // 편집 모드에서는 기본 동작 허용
        }
        
        // 편집 모드가 아닐 때는 Arrow keys, Space 등 네비게이션 키도 차단
        // (우리가 정의한 Tab만 사용)
        // Arrow keys, Space 등은 기본 동작 차단
        if (
          key.startsWith('Arrow') ||
          key === 'Space' ||
          key === 'Home' ||
          key === 'End' ||
          key === 'PageUp' ||
          key === 'PageDown'
        ) {
          event.event.preventDefault();
          event.event.stopPropagation();
          return false;
        }
        
        // 나머지 키는 기본 동작 허용 (예: 문자 입력 등)
        return false;
      },
    };

    // 컨테이너에 테마 클래스 추가
    container.classList.add("ag-theme-alpine");

    // Grid 생성
    this.gridApi = createGrid(container, gridOptions);
  }

  /**
   * 편집 불가능한 필드에 대한 tooltip 메시지 생성
   */
  private getEditDisabledMessage(field: string, rowId: string, rowData: any): string {
    // 커스텀 메시지 생성 함수가 있으면 사용
    if (this.options.getEditDisabledTooltip) {
      return this.options.getEditDisabledTooltip(field, rowId, rowData);
    }
    // 기본 메시지
    return "You can not edit";
  }

  /**
   * 컬럼 정의 준비
   */
  private prepareColumns(
    languages: readonly string[],
    readOnly: boolean
  ): ColDef[] {
    // cellClassRules에서 changes에 접근하기 위한 참조
    const changesMap = this.changeTracker.getChangesMap();

    const columns: ColDef[] = [
      {
        field: "key",
        headerName: "Key",
        width: 200,
        pinned: "left",
        editable: !readOnly, // 읽기 전용 모드가 아니면 편집 가능
        cellEditor: "agTextCellEditor",
        cellEditorParams: {
          useFormatter: false,
        },
        // 변경된 셀에 스타일 적용
        cellClassRules: {
          "cell-dirty": (params: any) => {
            if (!params.data?.id) return false;
            const changeKey = `${params.data.id}-key`;
            return changesMap.has(changeKey);
          },
        },
      },
      {
        field: "context",
        headerName: "Context",
        width: 200,
        pinned: "left",
        editable: !readOnly, // 읽기 전용 모드가 아니면 편집 가능
        cellEditor: "agTextCellEditor",
        cellEditorParams: {
          useFormatter: false,
        },
        // 변경된 셀에 스타일 적용
        cellClassRules: {
          "cell-dirty": (params: any) => {
            if (!params.data?.id) return false;
            const changeKey = `${params.data.id}-context`;
            return changesMap.has(changeKey);
          },
        },
      },
    ];

    // 언어별 컬럼 추가
    for (const lang of languages) {
      const field = `values.${lang}`;
      columns.push({
        field,
        headerName: lang.toUpperCase(),
        editable: !readOnly,
        flex: 1, // 남은 공간을 균등하게 채우기
        minWidth: 150, // 최소 너비 보장
        cellEditor: "agTextCellEditor",
        cellEditorParams: {
          useFormatter: false,
        },
        // 중첩된 필드명을 사용할 때 valueGetter/valueSetter 필요
        valueGetter: (params) => {
          return params.data?.[field] ?? "";
        },
        valueSetter: (params) => {
          // 값 설정
          if (params.data) {
            params.data[field] = params.newValue ?? "";
            return true; // 값이 성공적으로 설정됨
          }
          return false;
        },
        // 변경된 셀에 스타일 적용
        cellClassRules: {
          "cell-dirty": (params: any) => {
            if (!params.data?.id) return false;
            const changeKey = `${params.data.id}-${field}`;
            return changesMap.has(changeKey);
          },
          // 빈 번역 셀 하이라이트
          "cell-empty": (params: any) => {
            if (!params.data) return false;
            const value = params.data[field];
            // 빈 문자열, null, undefined를 빈 값으로 간주
            return !value || (typeof value === "string" && value.trim() === "");
          },
        },
      });
    }

    return columns;
  }

  /**
   * Translation[]을 AG Grid RowData로 변환
   */
  private prepareRowData(
    translations: readonly Translation[],
    languages: readonly string[]
  ): any[] {
    return translations.map((t) => {
      const row: any = {
        id: t.id,
        key: t.key,
        context: t.context || "",
      };

      // 각 언어별 값 추가
      languages.forEach((lang) => {
        row[`values.${lang}`] = t.values[lang] || "";
      });

      return row;
    });
  }

  /**
   * GridApi 반환
   */
  getGridApi(): GridApi | null {
    return this.gridApi;
  }

  /**
   * 컬럼 정의 반환
   */
  getColumnDefs(): ColDef[] {
    return this.columnDefs;
  }

  /**
   * 셀 값 변경 이벤트 처리 (Effect 기반)
   */
  private handleCellValueChangedEffect(
    event: CellValueChangedEvent
  ): Effect.Effect<void, LocaleEditorError | import("@/types/errors").ValidationError> {
    const fieldOption = Option.fromNullable(event.colDef?.field);
    
    // field가 없으면 무시
    if (Option.isNone(fieldOption)) {
      return Effect.void;
    }

    const field = fieldOption.value;
    
    return Effect.flatMap(
      validateWithEffect(FieldSchema, field, "Invalid field format"),
      (validField) => {
        // key 필드인 경우
        if (validField === "key") {
          const rowId = event.data?.id;
          if (!rowId) {
            return Effect.fail(
              new LocaleEditorError({
                message: "Row ID not found in cell event",
                code: "INVALID_CELL_EVENT",
              })
            );
          }
          const newValue = event.newValue !== undefined && event.newValue !== null
            ? event.newValue
            : (event.data?.[validField] ?? event.node?.data?.[validField] ?? "");
          const valueString = newValue !== undefined && newValue !== null ? String(newValue) : "";
          
          // 원본 값 가져오기 및 변경사항 추적
          const oldValue = this.changeTracker.getOriginalValue(rowId, validField);
          this.changeTracker.trackChange(
            rowId,
            validField,
            "key",
            oldValue,
            valueString,
            valueString, // key 자체를 key로 사용
            (rowId, field) => {
              this.updateCellStyle(rowId, field, true);
            }
          );
          
          // onCellChange 콜백 호출 (있으면)
          if (this.options.onCellChange) {
            this.options.onCellChange(rowId, "key", valueString);
          }
          
          // Key 변경 후 정렬 수행 (성능 최적화: requestAnimationFrame으로 지연)
          if (this.gridApi) {
            requestAnimationFrame(() => {
              if (this.gridApi) {
                // key 컬럼으로 정렬 (asc)
                this.gridApi.applyColumnState({
                  state: [{ colId: "key", sort: "asc" }],
                  defaultState: { sort: null },
                });
              }
            });
          }
          
          return Effect.void;
        }
        
        // context 필드인 경우
        if (validField === "context") {
          const rowId = event.data?.id;
          if (!rowId) {
            return Effect.fail(
              new LocaleEditorError({
                message: "Row ID not found in cell event",
                code: "INVALID_CELL_EVENT",
              })
            );
          }
          const newValue = event.newValue !== undefined && event.newValue !== null
            ? event.newValue
            : (event.data?.[validField] ?? event.node?.data?.[validField] ?? "");
          const valueString = newValue !== undefined && newValue !== null ? String(newValue) : "";
          
          // 원본 값 가져오기 및 변경사항 추적
          const oldValue = this.changeTracker.getOriginalValue(rowId, validField);
          this.changeTracker.trackChange(
            rowId,
            validField,
            "context",
            oldValue,
            valueString,
            event.data?.key || "",
            (rowId, field) => {
              this.updateCellStyle(rowId, field, true);
            }
          );
          
          // onCellChange 콜백 호출 (있으면)
          if (this.options.onCellChange) {
            this.options.onCellChange(rowId, "context", valueString);
          }
          return Effect.void;
        }

        // "values.{lang}" 형식이 아니면 무시
        if (!validField.startsWith("values.")) {
          return Effect.void;
        }

        // 언어 코드 추출 (예: "values.en" -> "en")
        const lang = validField.replace("values.", "");

        // 행의 id 추출
        const rowId = event.data?.id;
        if (!rowId) {
          return Effect.fail(
            new LocaleEditorError({
              message: "Row ID not found in cell event",
              code: "INVALID_CELL_EVENT",
            })
          );
        }

        // 새로운 값 추출
        const newValue = event.newValue !== undefined && event.newValue !== null
          ? event.newValue
          : (event.data?.[validField] ?? event.node?.data?.[validField] ?? "");
        
        // 최종적으로 문자열로 변환 (빈 값도 빈 문자열로)
        const valueString = newValue !== undefined && newValue !== null ? String(newValue) : "";

        // 원본 값 가져오기 및 변경사항 추적
        const oldValue = this.changeTracker.getOriginalValue(rowId, validField);
        this.changeTracker.trackChange(
          rowId,
          validField,
          lang,
          oldValue,
          valueString,
          event.data?.key || "",
          (rowId, field) => {
            this.updateCellStyle(rowId, field, true);
          }
        );

        // onCellChange 콜백 호출 (있으면)
        if (this.options.onCellChange) {
          this.options.onCellChange(rowId, lang, valueString);
        }
        return Effect.void;
      }
    );
  }

  /**
   * 셀 값 변경 이벤트 처리 (기존 API 호환성 유지)
   */
  private handleCellValueChanged(event: CellValueChangedEvent): void {
    const effect = this.handleCellValueChangedEffect(event);
    // 에러가 발생해도 무시 (기존 동작 유지)
    Effect.runSync(Effect.either(effect));
  }

  /**
   * 셀 스타일 업데이트 (Effect 기반)
   */
  private updateCellStyleEffect(
    rowId: string,
    field: string,
    _isDirty: boolean
  ): Effect.Effect<void, LocaleEditorError> {
    const gridApiOption = Option.fromNullable(this.gridApi);
    
    if (Option.isNone(gridApiOption)) {
      return Effect.fail(
        new LocaleEditorError({
          message: "Grid API is not available",
          code: "GRID_API_NOT_AVAILABLE",
        })
      );
    }

    const gridApi = gridApiOption.value;
    const rowNode = gridApi.getRowNode(rowId);
    
    if (!rowNode) {
      return Effect.fail(
        new LocaleEditorError({
          message: `Row node not found for row ID: ${rowId}`,
          code: "ROW_NODE_NOT_FOUND",
        })
      );
    }

    const column = gridApi.getColumn(field);
    
    if (!column) {
      return Effect.fail(
        new LocaleEditorError({
          message: `Column not found: ${field}`,
          code: "COLUMN_NOT_FOUND",
        })
      );
    }

    // requestAnimationFrame으로 다음 프레임에 실행하여
    // 여러 변경사항을 배치 처리할 수 있도록 최적화
    return Effect.sync(() => {
      requestAnimationFrame(() => {
        if (this.gridApi) {
          this.gridApi.refreshCells({
            rowNodes: [rowNode],
            columns: [field],
            force: true, // 강제로 새로고침
          });
        }
      });
    });
  }

  /**
   * 셀 스타일 업데이트 (변경사항 표시)
   * 
   * 성능 최적화:
   * - cellClassRules가 이미 정의되어 있어서, refreshCells를 호출하면
   *   cellClassRules가 재평가되어 스타일이 업데이트됨
   * - 단일 셀만 refresh하므로 성능 영향은 미미함 (O(1) 셀만 업데이트)
   * - 대안: refreshCells 없이 cellClassRules만 사용할 수도 있지만,
   *   즉시 반영을 위해 refreshCells 사용 (사용자 경험 우선)
   */
  private updateCellStyle(rowId: string, field: string, _isDirty: boolean): void {
    const effect = this.updateCellStyleEffect(rowId, field, _isDirty);
    // 에러가 발생해도 무시 (기존 동작 유지)
    Effect.runSync(Effect.either(effect));
  }

  /**
   * 셀 편집 완료 이벤트 처리 (Enter 키로 편집 완료 후 아래 행의 같은 컬럼으로 이동)
   * ESC 키로 취소된 경우에는 이동하지 않음
   * 모든 편집 가능한 컬럼(Key, Context, Language)에서 동일하게 동작
   */
  private handleCellEditingStopped(event: any): void {
    if (!this.gridApi) return;

    // ESC 키로 편집이 취소된 경우에는 이동하지 않음
    if (this.isEscapeKeyPressed) {
      this.isEscapeKeyPressed = false; // 플래그 초기화
      return;
    }

    // Enter 키로 편집이 완료된 경우에만 처리
    // (Tab 키는 navigateToNextCell에서 처리)
    const { column, rowIndex } = event;
    if (!column || rowIndex === undefined) return;

    const colDef = column.getColDef();
    
    // 편집 가능한 컬럼이 아니면 무시
    if (!colDef.editable) return;

    // 아래 행으로 이동
    const rowCount = this.gridApi.getDisplayedRowCount();
    if (rowIndex < rowCount - 1) {
      // 다음 프레임에 포커스 이동 및 편집 시작 (편집 완료 후)
      requestAnimationFrame(() => {
        if (this.gridApi) {
          this.gridApi.setFocusedCell(rowIndex + 1, column);
          this.gridApi.startEditingCell({
            rowIndex: rowIndex + 1,
            colKey: column,
          });
        }
      });
    }
  }

  /**
   * Tab 키 네비게이션 처리 (편집 모드로 시작하지 않음)
   * onCellKeyDown에서 호출됨
   * @deprecated 사용되지 않음
   */
  private handleTabKeyNavigationFromEvent(event: any): void {
    if (!this.gridApi) return;

    const isEditing = event.editing;
    const currentRowIndex = event.rowIndex;
    const currentColumn = event.column;
    const isShift = event.event.shiftKey;

    if (currentRowIndex === undefined || !currentColumn) return;

    // 편집 중이면 먼저 편집 완료 (동기적으로 즉시 처리)
    if (isEditing && event.api) {
      event.api.stopEditing(false); // false = 포커스 이동 안 함
    }

    // 편집 완료 직후 즉시 네비게이션 수행 (동기적으로)
    // requestAnimationFrame을 사용하면 AG Grid가 그 사이에 기본 Tab 동작을 수행할 수 있음
    this.handleTabKeyNavigationInternal(currentRowIndex, currentColumn, isShift);
  }

  /**
   * Tab 키 네비게이션 내부 로직 (requestAnimationFrame에서 호출)
   */
  private handleTabKeyNavigationInternal(currentRowIndex: number, currentColumn: any, isShift: boolean): void {
    if (!this.gridApi) return;

    const allColumns = this.gridApi.getColumns();
    if (!allColumns || allColumns.length === 0) return;

    // 편집 가능한 컬럼만 필터링
    const editableColumns = allColumns.filter(
      (col) => col.getColDef().editable
    );

    if (editableColumns.length === 0) return;

    const currentColId = currentColumn.getColId();
    const currentColIndex = editableColumns.findIndex(
      (col) => col.getColId() === currentColId
    );

    // 현재 컬럼이 편집 가능한 컬럼이 아니면 첫 번째 편집 가능한 컬럼으로 순환
    let nextRowIndex = currentRowIndex;
    let nextColIndex = currentColIndex >= 0 ? currentColIndex : 0;

    if (isShift) {
      // Shift+Tab: 왼쪽 편집 가능한 컬럼으로 이동
      if (currentColIndex >= 0 && currentColIndex > 0) {
        nextColIndex = currentColIndex - 1;
      } else {
        // 이전 행의 마지막 편집 가능한 컬럼
        if (currentRowIndex > 0) {
          nextRowIndex = currentRowIndex - 1;
          nextColIndex = editableColumns.length - 1;
        } else {
          // 첫 번째 행이면 마지막 행으로 순환
          const rowCount = this.gridApi.getDisplayedRowCount();
          nextRowIndex = rowCount - 1;
          nextColIndex = editableColumns.length - 1;
        }
      }
    } else {
      // Tab: 오른쪽 편집 가능한 컬럼으로 이동
      if (currentColIndex >= 0 && currentColIndex < editableColumns.length - 1) {
        nextColIndex = currentColIndex + 1;
      } else {
        // 다음 행의 첫 번째 편집 가능한 컬럼
        const rowCount = this.gridApi.getDisplayedRowCount();
        if (currentRowIndex < rowCount - 1) {
          nextRowIndex = currentRowIndex + 1;
          nextColIndex = 0;
        } else {
          // 마지막 행이면 첫 번째 행으로 순환 (그리드 밖으로 나가지 않음)
          nextRowIndex = 0;
          nextColIndex = 0;
        }
      }
    }

    // 다음 프레임에 포커스 이동 (편집 모드로 시작하지 않음)
    requestAnimationFrame(() => {
      if (this.gridApi) {
        this.gridApi.setFocusedCell(nextRowIndex, editableColumns[nextColIndex]);
      }
    });
  }

  /**
   * 편집 후 Tab 키 네비게이션 처리 (편집 모드로 시작하지 않음)
   * 편집 중 Tab 키를 누르면 편집을 종료하고 다음/이전 셀로 이동
   * 직접 rowIndex, column, isShift를 받아서 처리 (이벤트 객체 대신)
   */
  private handleTabNavigationAfterEditDirectly(
    currentRowIndex: number,
    currentColumn: any,
    isShift: boolean
  ): void {
    if (!this.gridApi) return;

    const allColumns = this.gridApi.getColumns();
    if (!allColumns || allColumns.length === 0) return;

    // 편집 가능한 컬럼만 필터링
    const editableColumns = allColumns.filter(
      (col) => col.getColDef().editable
    );

    if (editableColumns.length === 0) return;

    const currentColId = currentColumn.getColId();
    const currentColIndex = editableColumns.findIndex(
      (col) => col.getColId() === currentColId
    );

    if (currentColIndex < 0) return;

    let nextRowIndex = currentRowIndex;
    let nextColIndex = currentColIndex;

    if (!isShift) {
      // Tab: 오른쪽 편집 가능한 컬럼으로 이동
      if (currentColIndex < editableColumns.length - 1) {
        nextColIndex = currentColIndex + 1;
      } else {
        // 다음 행의 첫 번째 편집 가능한 컬럼
        const rowCount = this.gridApi.getDisplayedRowCount();
        if (currentRowIndex < rowCount - 1) {
          nextRowIndex = currentRowIndex + 1;
          nextColIndex = 0;
        } else {
          // 마지막 행이면 첫 번째 행으로 순환
          nextRowIndex = 0;
          nextColIndex = 0;
        }
      }
    } else {
      // Shift+Tab: 왼쪽 편집 가능한 컬럼으로 이동
      if (currentColIndex > 0) {
        nextColIndex = currentColIndex - 1;
      } else {
        // 이전 행의 마지막 편집 가능한 컬럼
        if (currentRowIndex > 0) {
          nextRowIndex = currentRowIndex - 1;
          nextColIndex = editableColumns.length - 1;
        } else {
          // 첫 번째 행이면 마지막 행으로 순환
          const rowCount = this.gridApi.getDisplayedRowCount();
          nextRowIndex = rowCount - 1;
          nextColIndex = editableColumns.length - 1;
        }
      }
    }

    // 다음 셀로 포커스 이동 (편집 모드로 시작하지 않음)
    this.gridApi.setFocusedCell(nextRowIndex, editableColumns[nextColIndex]);
  }

  /**
   * 키보드 네비게이션 처리 (Tab/Shift+Tab) - 편집 중이 아닐 때
   * 
   * Tab: 오른쪽 편집 가능한 컬럼으로 이동 (편집 모드로 시작하지 않음)
   * - 편집 가능한 컬럼만 순회
   * - 같은 행의 다음 편집 가능한 컬럼으로 이동
   * - 마지막 편집 가능한 컬럼이면 다음 행의 첫 번째 편집 가능한 컬럼으로 이동
   * - 마지막 행의 마지막 편집 가능한 컬럼이면 첫 번째 행의 첫 번째 편집 가능한 컬럼으로 순환
   * 
   * Enter 키는 handleCellEditingStopped에서 처리
   */
  private handleNavigateToNextCell(
    params: NavigateToNextCellParams
  ): CellPosition | null {
    if (!this.gridApi) return null;

    const { key, previousCellPosition } = params;
    const { rowIndex, column, rowPinned } = previousCellPosition || {};
    
    if (rowIndex === undefined || !column) return null;

    // Tab 키만 처리 (Enter는 handleCellEditingStopped에서 처리)
    if (key !== "Tab") return null;

    const allColumns = this.gridApi.getColumns();
    if (!allColumns || allColumns.length === 0) return null;

    // 편집 가능한 컬럼만 필터링
    const editableColumns = allColumns.filter(
      (col) => col.getColDef().editable
    );

    if (editableColumns.length === 0) return null;

    const currentColId = typeof column === "string" ? column : column.getColId();
    const currentColIndex = editableColumns.findIndex(
      (col) => col.getColId() === currentColId
    );

    // 현재 컬럼이 편집 가능한 컬럼이 아니면 null 반환하여 그리드 밖으로 나가지 않도록 순환
    if (currentColIndex < 0) {
      // 편집 불가능한 컬럼에서 Tab을 누르면 첫 번째 편집 가능한 컬럼으로 순환
      const rowCount = this.gridApi.getDisplayedRowCount();
      if (!params.event?.shiftKey) {
        // Tab: 첫 번째 편집 가능한 컬럼으로 이동 (순환)
        if (rowIndex < rowCount - 1) {
          return {
            rowIndex: rowIndex + 1,
            rowPinned: null,
            column: editableColumns[0],
          };
        } else {
          return {
            rowIndex: 0,
            rowPinned: null,
            column: editableColumns[0],
          };
        }
      } else {
        // Shift+Tab: 마지막 편집 가능한 컬럼으로 이동 (순환)
        if (rowIndex > 0) {
          return {
            rowIndex: rowIndex - 1,
            rowPinned: null,
            column: editableColumns[editableColumns.length - 1],
          };
        } else {
          return {
            rowIndex: rowCount - 1,
            rowPinned: null,
            column: editableColumns[editableColumns.length - 1],
          };
        }
      }
    }

    // Tab: 오른쪽 편집 가능한 컬럼으로 이동
    if (!params.event?.shiftKey) {
      if (currentColIndex < editableColumns.length - 1) {
        // 같은 행의 다음 편집 가능한 컬럼으로 이동
        return {
          rowIndex,
          rowPinned: rowPinned || null,
          column: editableColumns[currentColIndex + 1],
        };
      } else {
        // 마지막 편집 가능한 컬럼이면 다음 행의 첫 번째 편집 가능한 컬럼으로 이동
        const rowCount = this.gridApi.getDisplayedRowCount();
        if (rowIndex < rowCount - 1) {
          return {
            rowIndex: rowIndex + 1,
            rowPinned: null,
            column: editableColumns[0],
          };
        } else {
          // 마지막 행이면 첫 번째 행의 첫 번째 편집 가능한 컬럼으로 순환
          return {
            rowIndex: 0,
            rowPinned: null,
            column: editableColumns[0],
          };
        }
      }
    }

    // Shift+Tab: 왼쪽 편집 가능한 컬럼으로 이동
    if (params.event?.shiftKey) {
      if (currentColIndex > 0) {
        // 같은 행의 이전 편집 가능한 컬럼으로 이동
        return {
          rowIndex,
          rowPinned: rowPinned || null,
          column: editableColumns[currentColIndex - 1],
        };
      } else {
        // 첫 번째 편집 가능한 컬럼이면 이전 행의 마지막 편집 가능한 컬럼으로 이동
        if (rowIndex > 0) {
          return {
            rowIndex: rowIndex - 1,
            rowPinned: null,
            column: editableColumns[editableColumns.length - 1],
          };
        } else {
          // 첫 번째 행이면 마지막 행의 마지막 편집 가능한 컬럼으로 순환
          const rowCount = this.gridApi.getDisplayedRowCount();
          return {
            rowIndex: rowCount - 1,
            rowPinned: null,
            column: editableColumns[editableColumns.length - 1],
          };
        }
      }
    }

    return null;
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
    this.changeTracker.clearChanges((rowId, field, isDirty) =>
      this.updateCellStyle(rowId, field, isDirty)
    );
  }

  /**
   * 그리드 정리
   */
  destroy(): void {
    if (this.gridApi) {
      this.gridApi.destroy();
      this.gridApi = null;
    }
  }
}
