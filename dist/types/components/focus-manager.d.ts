/**
 * 포커스 관리 모듈
 */
export interface FocusedCell {
    rowIndex: number;
    columnId: string;
}
export declare class FocusManager {
    private focusedCell;
    /**
     * 현재 포커스된 셀 가져오기
     */
    getFocusedCell(): FocusedCell | null;
    /**
     * 셀에 포커스 설정
     */
    focusCell(rowIndex: number, columnId: string): void;
    /**
     * 포커스 해제
     */
    blur(): void;
    /**
     * 포커스가 있는지 확인
     */
    hasFocus(): boolean;
}
//# sourceMappingURL=focus-manager.d.ts.map