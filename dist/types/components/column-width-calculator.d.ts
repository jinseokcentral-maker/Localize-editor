/**
 * 컬럼 너비 계산 모듈
 *
 * 컬럼 너비 계산 및 관리 로직을 담당합니다.
 */
export interface ColumnWidthCalculation {
    key: number;
    context: number;
    languages: number[];
}
export interface ColumnWidthCalculatorOptions {
    columnWidths: Map<string, number>;
    columnMinWidths: Map<string, number>;
    languages: readonly string[];
    defaultKeyWidth?: number;
    defaultContextWidth?: number;
    defaultLangWidth?: number;
}
export declare class ColumnWidthCalculator {
    private options;
    private defaultKeyWidth;
    private defaultContextWidth;
    private defaultLangWidth;
    constructor(options: ColumnWidthCalculatorOptions);
    /**
     * 컬럼 너비 가져오기
     */
    getColumnWidthValue(columnId: string, defaultWidth?: number): number;
    /**
     * 기본 너비 가져오기
     */
    private getDefaultWidth;
    /**
     * 컬럼 너비 계산
     * 마지막 컬럼이 항상 끝까지 채워지도록 함
     */
    calculateColumnWidths(containerWidth: number): ColumnWidthCalculation;
    /**
     * 특정 컬럼의 너비를 설정하고 모든 컬럼 너비를 재계산
     */
    applyColumnWidth(columnId: string, width: number, containerWidth: number): {
        columnWidths: ColumnWidthCalculation;
        totalWidth: number;
    };
}
//# sourceMappingURL=column-width-calculator.d.ts.map