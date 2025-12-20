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
import type { Translation, LocaleEditorOptions } from "@/types/translation";

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

  constructor(options: LocaleEditorOptions) {
    this.options = options;
  }

  /**
   * 그리드를 렌더링합니다.
   */
  render(): void {
    const { container, translations, languages, defaultLanguage, readOnly } =
      this.options;

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
    const columns: ColDef[] = [
      {
        field: "key",
        headerName: "Key",
        width: 250,
        pinned: "left",
        cellStyle: { fontWeight: "bold" },
        editable: false,
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
      for (const lang of languages) {
        row[`values.${lang}`] = t.values[lang] || "";
      }

      return row;
    });
  }

  /**
   * Grid API 반환
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
   * 셀 값 변경 이벤트 처리
   */
  private handleCellValueChanged(event: CellValueChangedEvent): void {
    const { onCellChange } = this.options;
    
    // onCellChange 콜백이 없으면 아무것도 하지 않음
    if (!onCellChange) {
      return;
    }

    // 필드명 확인: "values.{lang}" 형식 또는 "context" 필드
    const field = event.colDef?.field;
    if (!field) {
      return;
    }

    // context 필드인 경우
    if (field === "context") {
      const rowId = event.data?.id;
      if (!rowId) {
        return;
      }
      const newValue = event.newValue !== undefined && event.newValue !== null
        ? event.newValue
        : (event.data?.[field] ?? event.node?.data?.[field] ?? "");
      const valueString = newValue !== undefined && newValue !== null ? String(newValue) : "";
      onCellChange(rowId, "context", valueString);
      return;
    }

    // "values.{lang}" 형식이 아니면 무시
    if (!field.startsWith("values.")) {
      return;
    }

    // 언어 코드 추출 (예: "values.en" -> "en")
    const lang = field.replace("values.", "");

    // 행의 id 추출
    const rowId = event.data?.id;
    if (!rowId) {
      return;
    }

    // 새로운 값 추출
    // AG Grid의 onCellValueChanged 이벤트에서:
    // - event.newValue: 새로운 값 (사용자가 직접 편집할 때 항상 설정됨) ⭐ 중요!
    // - event.oldValue: 이전 값
    // - event.data: 업데이트된 행 데이터 (새 값이 이미 반영됨)
    // - event.node.data: rowNode의 데이터 (새 값이 이미 반영됨)
    // 
    // ⚠️ 주의: 사용자가 직접 편집할 때는 event.newValue가 항상 설정되므로 이를 우선 사용해야 함!
    // AG Grid는 자동으로 event.data와 event.node.data를 업데이트하므로,
    // event.newValue를 사용하는 것이 가장 안전함
    const newValue = event.newValue !== undefined && event.newValue !== null
      ? event.newValue
      : (event.data?.[field] ?? event.node?.data?.[field] ?? "");
    
    // 최종적으로 문자열로 변환 (빈 값도 빈 문자열로)
    const valueString = newValue !== undefined && newValue !== null ? String(newValue) : "";

    // onCellChange 콜백 호출
    onCellChange(rowId, lang, valueString);
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
