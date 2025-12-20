import { describe, it, expect } from "vitest";
import { LocaleEditor } from "@/components/locale-editor";
import type { Translation, LocaleEditorOptions } from "@/types/translation";
import { setupLocaleEditorTest } from "./locale-editor.helpers";

describe("LocaleEditor - Phase 1-3: 빈 번역 셀 하이라이트", () => {
  const { getContainer, setEditor } = setupLocaleEditorTest();

  it("빈 번역 셀은 시각적으로 하이라이트되어야 함", () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "English", ko: "" }, // ko가 빈 값
      },
      {
        id: "2",
        key: "test.key2",
        values: { en: "", ko: "한국어" }, // en이 빈 값
      },
      {
        id: "3",
        key: "test.key3",
        values: { en: "English", ko: "한국어" }, // 모두 채워짐
      },
    ];

    const options: LocaleEditorOptions = {
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const editor = new LocaleEditor(options);
    setEditor(editor);
    editor.render();

    // 컬럼 정의 확인
    const columnDefs = editor.getColumnDefs();
    
    // en 컬럼의 cellClassRules 확인
    const enColumn = columnDefs?.find((col) => col.field === "values.en");
    expect(enColumn).toBeDefined();
    expect(enColumn?.cellClassRules).toBeDefined();
    expect(enColumn?.cellClassRules?.["cell-empty"]).toBeDefined();
    expect(typeof enColumn?.cellClassRules?.["cell-empty"]).toBe("function");

    // ko 컬럼의 cellClassRules 확인
    const koColumn = columnDefs?.find((col) => col.field === "values.ko");
    expect(koColumn).toBeDefined();
    expect(koColumn?.cellClassRules).toBeDefined();
    expect(koColumn?.cellClassRules?.["cell-empty"]).toBeDefined();
    expect(typeof koColumn?.cellClassRules?.["cell-empty"]).toBe("function");
  });

  it("빈 값인 셀에만 cell-empty 클래스가 적용되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "English", ko: "" }, // ko가 빈 값
      },
      {
        id: "2",
        key: "test.key2",
        values: { en: "", ko: "한국어" }, // en이 빈 값
      },
    ];

    const options: LocaleEditorOptions = {
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const editor = new LocaleEditor(options);
    setEditor(editor);
    editor.render();

    const gridApi = editor.getGridApi();
    const columnDefs = editor.getColumnDefs();
    
    const enColumn = columnDefs?.find((col) => col.field === "values.en");
    const koColumn = columnDefs?.find((col) => col.field === "values.ko");

    // 첫 번째 행: en은 값이 있음, ko는 빈 값
    const row1Node = gridApi?.getRowNode("1");
    expect(row1Node).toBeTruthy();
    
    if (row1Node && enColumn?.cellClassRules?.["cell-empty"]) {
      const isEmptyEn = enColumn.cellClassRules["cell-empty"]({
        data: row1Node.data,
        colDef: enColumn,
      } as any);
      expect(isEmptyEn).toBe(false); // en은 값이 있으므로 false
    }

    if (row1Node && koColumn?.cellClassRules?.["cell-empty"]) {
      const isEmptyKo = koColumn.cellClassRules["cell-empty"]({
        data: row1Node.data,
        colDef: koColumn,
      } as any);
      expect(isEmptyKo).toBe(true); // ko는 빈 값이므로 true
    }

    // 두 번째 행: en은 빈 값, ko는 값이 있음
    const row2Node = gridApi?.getRowNode("2");
    expect(row2Node).toBeTruthy();
    
    if (row2Node && enColumn?.cellClassRules?.["cell-empty"]) {
      const isEmptyEn = enColumn.cellClassRules["cell-empty"]({
        data: row2Node.data,
        colDef: enColumn,
      } as any);
      expect(isEmptyEn).toBe(true); // en은 빈 값이므로 true
    }

    if (row2Node && koColumn?.cellClassRules?.["cell-empty"]) {
      const isEmptyKo = koColumn.cellClassRules["cell-empty"]({
        data: row2Node.data,
        colDef: koColumn,
      } as any);
      expect(isEmptyKo).toBe(false); // ko는 값이 있으므로 false
    }
  });

  it("셀에 값을 입력하면 빈 셀 하이라이트가 제거되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "English", ko: "" }, // ko가 빈 값
      },
    ];

    const options: LocaleEditorOptions = {
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const editor = new LocaleEditor(options);
    setEditor(editor);
    editor.render();

    const gridApi = editor.getGridApi();
    const rowNode = gridApi?.getRowNode("1");
    const columnDefs = editor.getColumnDefs();
    const koColumn = columnDefs?.find((col) => col.field === "values.ko");

    // 초기 상태: ko는 빈 값이므로 하이라이트되어야 함
    if (rowNode && koColumn?.cellClassRules?.["cell-empty"]) {
      const isEmptyBefore = koColumn.cellClassRules["cell-empty"]({
        data: rowNode.data,
        colDef: koColumn,
      } as any);
      expect(isEmptyBefore).toBe(true);
    }

    // 값을 입력
    rowNode?.setDataValue("values.ko", "한국어");
    await new Promise(resolve => setTimeout(resolve, 100));

    // 값이 입력된 후: 하이라이트가 제거되어야 함
    if (rowNode && koColumn?.cellClassRules?.["cell-empty"]) {
      const isEmptyAfter = koColumn.cellClassRules["cell-empty"]({
        data: rowNode.data,
        colDef: koColumn,
      } as any);
      expect(isEmptyAfter).toBe(false);
    }
  });

  it("Context 컬럼은 빈 값 하이라이트 대상이 아니어야 함", () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "English" },
        context: "", // context가 빈 값이어도 하이라이트 안됨
      },
    ];

    const options: LocaleEditorOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const editor = new LocaleEditor(options);
    setEditor(editor);
    editor.render();

    const columnDefs = editor.getColumnDefs();
    const contextColumn = columnDefs?.find((col) => col.field === "context");
    
    // Context 컬럼에는 cell-empty 클래스 규칙이 없어야 함
    expect(contextColumn).toBeDefined();
    expect(contextColumn?.cellClassRules?.["cell-empty"]).toBeUndefined();
  });
});

