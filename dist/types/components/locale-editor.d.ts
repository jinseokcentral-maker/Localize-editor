import { type GridApi, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import "@/styles/ag-grid-custom.css";
import type { LocaleEditorOptions, TranslationChange } from "@/types/translation";
/**
 * LocaleEditor - AG Grid 기반 i18n 번역 에디터
 */
export declare class LocaleEditor {
    private gridApi;
    private isEscapeKeyPressed;
    private columnDefs;
    private options;
    private changeTracker;
    private popoverMouseLeaveHandler;
    private popoverMouseEnterHandler;
    constructor(options: LocaleEditorOptions);
    /**
     * readOnly 모드 업데이트 및 그리드 재렌더링
     */
    setReadOnly(readOnly: boolean): void;
    /**
     * 읽기 전용 모드일 때 popover 표시/숨김
     */
    private updateReadOnlyPopover;
    /**
     * 현재 readOnly 상태 반환
     */
    isReadOnly(): boolean;
    /**
     * 그리드를 렌더링합니다.
     */
    render(): void;
    /**
     * 편집 불가능한 필드에 대한 tooltip 메시지 생성
     */
    private getEditDisabledMessage;
    /**
     * 컬럼 정의 준비
     */
    private prepareColumns;
    /**
     * Translation[]을 AG Grid RowData로 변환
     */
    private prepareRowData;
    /**
     * GridApi 반환
     */
    getGridApi(): GridApi | null;
    /**
     * 컬럼 정의 반환
     */
    getColumnDefs(): ColDef[];
    /**
     * 셀 값 변경 이벤트 처리 (Effect 기반)
     */
    private handleCellValueChangedEffect;
    /**
     * 셀 값 변경 이벤트 처리 (기존 API 호환성 유지)
     */
    private handleCellValueChanged;
    /**
     * 셀 스타일 업데이트 (Effect 기반)
     */
    private updateCellStyleEffect;
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
    private updateCellStyle;
    /**
     * 셀 편집 완료 이벤트 처리 (Enter 키로 편집 완료 후 아래 행의 같은 컬럼으로 이동)
     * ESC 키로 취소된 경우에는 이동하지 않음
     * 모든 편집 가능한 컬럼(Key, Context, Language)에서 동일하게 동작
     */
    private handleCellEditingStopped;
    /**
     * Tab 키 네비게이션 처리 (편집 모드로 시작하지 않음)
     * onCellKeyDown에서 호출됨
     * @deprecated 사용되지 않음
     */
    private handleTabKeyNavigationFromEvent;
    /**
     * Tab 키 네비게이션 내부 로직 (requestAnimationFrame에서 호출)
     */
    private handleTabKeyNavigationInternal;
    /**
     * 편집 후 Tab 키 네비게이션 처리 (편집 모드로 시작하지 않음)
     * 편집 중 Tab 키를 누르면 편집을 종료하고 다음/이전 셀로 이동
     * 직접 rowIndex, column, isShift를 받아서 처리 (이벤트 객체 대신)
     */
    private handleTabNavigationAfterEditDirectly;
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
    private handleNavigateToNextCell;
    /**
     * 변경사항 목록 반환
     */
    getChanges(): TranslationChange[];
    /**
     * 변경사항 초기화
     */
    clearChanges(): void;
    /**
     * 그리드 정리
     */
    destroy(): void;
}
//# sourceMappingURL=locale-editor.d.ts.map