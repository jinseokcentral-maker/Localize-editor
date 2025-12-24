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

export class ColumnWidthCalculator {
  private defaultKeyWidth: number;
  private defaultContextWidth: number;
  private defaultLangWidth: number;

  constructor(private options: ColumnWidthCalculatorOptions) {
    this.defaultKeyWidth = options.defaultKeyWidth ?? 200;
    this.defaultContextWidth = options.defaultContextWidth ?? 200;
    this.defaultLangWidth = options.defaultLangWidth ?? 150;
  }

  /**
   * 컬럼 너비 가져오기
   */
  getColumnWidthValue(columnId: string, defaultWidth?: number): number {
    return (
      this.options.columnWidths.get(columnId) ||
      defaultWidth ||
      this.getDefaultWidth(columnId)
    );
  }

  /**
   * 기본 너비 가져오기
   */
  private getDefaultWidth(columnId: string): number {
    if (columnId === "key") return this.defaultKeyWidth;
    if (columnId === "context") return this.defaultContextWidth;
    return this.defaultLangWidth;
  }

  /**
   * 컬럼 너비 계산
   * 마지막 컬럼이 항상 끝까지 채워지도록 함
   */
  calculateColumnWidths(containerWidth: number): ColumnWidthCalculation {
    const keyWidth = this.getColumnWidthValue("key", this.defaultKeyWidth);
    const contextWidth = this.getColumnWidthValue(
      "context",
      this.defaultContextWidth
    );
    const langWidths = this.options.languages.map((lang) =>
      this.getColumnWidthValue(`values.${lang}`, this.defaultLangWidth)
    );

    // 마지막 컬럼을 제외한 나머지 컬럼들의 총 너비
    const fixedWidth =
      keyWidth +
      contextWidth +
      langWidths.slice(0, -1).reduce((sum, w) => sum + w, 0);

    // 마지막 컬럼 너비 = 컨테이너 너비 - 고정 너비 (최소 너비 보장)
    const lastLang =
      this.options.languages[this.options.languages.length - 1]!;
    const lastLangMinWidth =
      this.options.columnMinWidths.get(`values.${lastLang}`) || 80;
    const lastLangWidth = Math.max(
      lastLangMinWidth,
      containerWidth - fixedWidth
    );

    // 마지막 컬럼을 제외한 언어 컬럼들
    const otherLangWidths = langWidths.slice(0, -1);

    return {
      key: keyWidth,
      context: contextWidth,
      languages: [...otherLangWidths, lastLangWidth],
    };
  }

  /**
   * 특정 컬럼의 너비를 설정하고 모든 컬럼 너비를 재계산
   */
  applyColumnWidth(
    columnId: string,
    width: number,
    containerWidth: number
  ): {
    columnWidths: ColumnWidthCalculation;
    totalWidth: number;
  } {
    // 마지막 컬럼이 아닌 경우에만 저장
    const lastLang = this.options.languages[this.options.languages.length - 1]!;
    const lastLangColumnId = `values.${lastLang}`;
    if (columnId !== lastLangColumnId) {
      this.options.columnWidths.set(columnId, width);
    }

    const keyWidth =
      columnId === "key"
        ? width
        : this.getColumnWidthValue("key", this.defaultKeyWidth);
    const contextWidth =
      columnId === "context"
        ? width
        : this.getColumnWidthValue("context", this.defaultContextWidth);

    // 마지막 컬럼을 제외한 언어 컬럼들
    const otherLangWidths = this.options.languages.slice(0, -1).map((lang) => {
      const langColumnId = `values.${lang}`;
      return columnId === langColumnId
        ? width
        : this.getColumnWidthValue(langColumnId, this.defaultLangWidth);
    });

    // 마지막 컬럼 너비 = 컨테이너 너비 - 고정 너비
    const fixedWidth =
      keyWidth + contextWidth + otherLangWidths.reduce((sum, w) => sum + w, 0);
    const lastLangMinWidth = this.options.columnMinWidths.get(lastLangColumnId) || 80;
    const lastLangWidth = Math.max(
      lastLangMinWidth,
      containerWidth - fixedWidth
    );

    const langWidths = [...otherLangWidths, lastLangWidth];

    // 전체 너비 계산 (모든 컬럼 너비의 합 = 컨테이너 너비)
    const totalWidth = containerWidth;

    return {
      columnWidths: {
        key: keyWidth,
        context: contextWidth,
        languages: langWidths,
      },
      totalWidth,
    };
  }
}

