/**
 * ColumnWidthCalculator 단위 테스트
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ColumnWidthCalculator } from "../column-width-calculator";

describe("ColumnWidthCalculator", () => {
  let calculator: ColumnWidthCalculator;
  let columnWidths: Map<string, number>;
  let columnMinWidths: Map<string, number>;

  beforeEach(() => {
    columnWidths = new Map();
    columnMinWidths = new Map([
      ["key", 100],
      ["context", 100],
      ["values.en", 80],
      ["values.ko", 80],
    ]);

    calculator = new ColumnWidthCalculator({
      columnWidths,
      columnMinWidths,
      languages: ["en", "ko"],
      defaultKeyWidth: 200,
      defaultContextWidth: 200,
      defaultLangWidth: 150,
    });
  });

  describe("getColumnWidthValue", () => {
    it("should return stored width if available", () => {
      columnWidths.set("key", 250);
      expect(calculator.getColumnWidthValue("key")).toBe(250);
    });

    it("should return default width if not stored", () => {
      expect(calculator.getColumnWidthValue("key")).toBe(200);
      expect(calculator.getColumnWidthValue("context")).toBe(200);
      expect(calculator.getColumnWidthValue("values.en")).toBe(150);
    });

    it("should use provided default width", () => {
      expect(calculator.getColumnWidthValue("key", 300)).toBe(300);
    });
  });

  describe("calculateColumnWidths", () => {
    it("should calculate column widths correctly", () => {
      const result = calculator.calculateColumnWidths(1000);

      expect(result.key).toBe(200);
      expect(result.context).toBe(200);
      expect(result.languages.length).toBe(2);
    });

    it("should make last column fill remaining width", () => {
      const containerWidth = 1000;
      const result = calculator.calculateColumnWidths(containerWidth);

      const fixedWidth = result.rowNumber + result.key + result.context + result.languages[0]!;
      const lastColumnWidth = result.languages[1]!;
      const totalWidth = fixedWidth + lastColumnWidth;

      expect(totalWidth).toBe(containerWidth);
    });

    it("should respect minimum width for last column", () => {
      const containerWidth = 500; // 작은 컨테이너
      const result = calculator.calculateColumnWidths(containerWidth);

      const lastColumnWidth = result.languages[1]!;
      expect(lastColumnWidth).toBeGreaterThanOrEqual(80); // 최소 너비
    });

    it("should use stored widths when available", () => {
      columnWidths.set("key", 300);
      columnWidths.set("context", 250);
      columnWidths.set("values.en", 200);

      const result = calculator.calculateColumnWidths(1000);

      expect(result.key).toBe(300);
      expect(result.context).toBe(250);
      expect(result.languages[0]).toBe(200);
    });
  });

  describe("applyColumnWidth", () => {
    it("should apply width to specified column", () => {
      const containerWidth = 1000;
      const result = calculator.applyColumnWidth("key", 300, containerWidth);

      expect(result.columnWidths.key).toBe(300);
      expect(result.totalWidth).toBe(containerWidth);
    });

    it("should recalculate other columns when one is resized", () => {
      const containerWidth = 1000;
      const result = calculator.applyColumnWidth("key", 300, containerWidth);

      // 다른 컬럼들은 기본값 또는 저장된 값 사용
      expect(result.columnWidths.context).toBe(200);
      expect(result.columnWidths.languages.length).toBe(2);
    });

    it("should make last column fill remaining space", () => {
      const containerWidth = 1000;
      const result = calculator.applyColumnWidth("key", 300, containerWidth);

      const fixedWidth =
        result.columnWidths.rowNumber +
        result.columnWidths.key +
        result.columnWidths.context +
        result.columnWidths.languages[0]!;
      const lastColumnWidth = result.columnWidths.languages[1]!;
      const totalWidth = fixedWidth + lastColumnWidth;

      expect(totalWidth).toBe(containerWidth);
    });

    it("should not save width for last language column", () => {
      const containerWidth = 1000;
      const lastLangColumnId = "values.ko";
      calculator.applyColumnWidth(lastLangColumnId, 500, containerWidth);

      // 마지막 컬럼은 저장되지 않아야 함
      expect(columnWidths.has(lastLangColumnId)).toBe(false);
    });

    it("should save width for non-last columns", () => {
      const containerWidth = 1000;
      calculator.applyColumnWidth("key", 300, containerWidth);
      calculator.applyColumnWidth("values.en", 250, containerWidth);

      expect(columnWidths.get("key")).toBe(300);
      expect(columnWidths.get("values.en")).toBe(250);
    });

    it("should respect minimum width for last column", () => {
      const containerWidth = 500; // 작은 컨테이너
      const result = calculator.applyColumnWidth("key", 400, containerWidth);

      const lastColumnWidth = result.columnWidths.languages[1]!;
      expect(lastColumnWidth).toBeGreaterThanOrEqual(80); // 최소 너비
    });
  });
});

