import {
  createGrid,
  type GridApi,
  ModuleRegistry,
  AllCommunityModule,
  type GridOptions,
  type ColDef,
  type CellValueChangedEvent,
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
  private columnDefs: ColDef[] = [];
  private options: LocaleEditorOptions;
  private changeTracker = new ChangeTracker();

  constructor(options: LocaleEditorOptions) {
    this.options = options;
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
      },
      // 셀 값 변경 이벤트 핸들러
      onCellValueChanged: (event) => {
        this.handleCellValueChanged(event);
      },
    };

    // 컨테이너에 테마 클래스 추가
    container.classList.add("ag-theme-alpine");

    // Grid 생성
    this.gridApi = createGrid(container, gridOptions);
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
        editable: false, // Key는 편집 불가
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
