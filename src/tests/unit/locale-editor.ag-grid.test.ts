import { describe, it, expect } from "vitest";
import { LocaleEditor } from "@/components/locale-editor";
import type { Translation, LocaleEditorOptions } from "@/types/translation";
import { setupLocaleEditorTest } from "./locale-editor.helpers";

describe("LocaleEditor - AG Grid 통합 (Step 2)", () => {
  const { getContainer, setEditor } = setupLocaleEditorTest();

  describe("초기화", () => {
    it("LocaleEditor 인스턴스를 생성할 수 있어야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [],
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      expect(editor).toBeInstanceOf(LocaleEditor);
    });

    it("render() 호출 시 그리드가 초기화되어야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "common.buttons.submit",
            values: { en: "Submit", ko: "제출" },
          },
        ],
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      // AG Grid가 렌더링되었는지 확인 (컨테이너에 그리드 요소가 있는지)
      expect(getContainer().querySelector(".ag-root-wrapper")).toBeTruthy();
    });
  });

  describe("데이터 변환", () => {
    it("Translation[]을 AG Grid RowData로 변환해야 함", () => {
      const translations: Translation[] = [
        {
          id: "1",
          key: "common.buttons.submit",
          values: { en: "Submit", ko: "제출" },
          context: "Submit button",
        },
        {
          id: "2",
          key: "common.buttons.cancel",
          values: { en: "Cancel", ko: "취소" },
        },
      ];

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      // 그리드에 데이터가 로드되었는지 확인
      const gridApi = editor.getGridApi();
      expect(gridApi).toBeTruthy();

      const rowCount = gridApi?.getDisplayedRowCount();
      expect(rowCount).toBe(2);
    });

    it("빈 translations 배열을 처리해야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [],
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const gridApi = editor.getGridApi();
      const rowCount = gridApi?.getDisplayedRowCount();
      expect(rowCount).toBe(0);
    });

    it("여러 언어를 올바르게 변환해야 함", () => {
      const translations: Translation[] = [
        {
          id: "1",
          key: "test.key",
          values: { en: "English", ko: "한국어", ja: "日本語" },
        },
      ];

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en", "ko", "ja"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const gridApi = editor.getGridApi();
      const rowData = gridApi?.getRenderedNodes()[0]?.data;

      expect(rowData).toBeDefined();
      expect(rowData?.key).toBe("test.key");
      expect(rowData?.["values.en"]).toBe("English");
      expect(rowData?.["values.ko"]).toBe("한국어");
      expect(rowData?.["values.ja"]).toBe("日本語");
    });
  });

  describe("컬럼 정의", () => {
    it("Key 컬럼이 있어야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "test.key",
            values: { en: "Test" },
          },
        ],
        languages: ["en"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const columnDefs = editor.getColumnDefs();
      const keyColumn = columnDefs?.find((col) => col.field === "key");

      expect(keyColumn).toBeDefined();
      expect(keyColumn?.headerName).toBe("Key");
      expect(keyColumn?.pinned).toBe("left");
    });

    it("Context 컬럼이 있어야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "test.key",
            values: { en: "Test" },
            context: "Test context",
          },
        ],
        languages: ["en"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const columnDefs = editor.getColumnDefs();
      const contextColumn = columnDefs?.find((col) => col.field === "context");

      expect(contextColumn).toBeDefined();
      expect(contextColumn?.headerName).toBe("Context");
    });

    it("각 언어별 컬럼이 있어야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "test.key",
            values: { en: "English", ko: "한국어" },
          },
        ],
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const columnDefs = editor.getColumnDefs();
      const enColumn = columnDefs?.find((col) => col.field === "values.en");
      const koColumn = columnDefs?.find((col) => col.field === "values.ko");

      expect(enColumn).toBeDefined();
      expect(enColumn?.headerName).toBe("EN");
      expect(koColumn).toBeDefined();
      expect(koColumn?.headerName).toBe("KO");
    });

    it("언어 컬럼은 편집 가능해야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "test.key",
            values: { en: "Test" },
          },
        ],
        languages: ["en"],
        defaultLanguage: "en",
        container: getContainer(),
        readOnly: false,
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const columnDefs = editor.getColumnDefs();
      const enColumn = columnDefs?.find((col) => col.field === "values.en");

      expect(enColumn?.editable).toBe(true);
    });

    it("readOnly 모드일 때 언어 컬럼은 편집 불가능해야 함", () => {
      const options: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "test.key",
            values: { en: "Test" },
          },
        ],
        languages: ["en"],
        defaultLanguage: "en",
        container: getContainer(),
        readOnly: true,
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const columnDefs = editor.getColumnDefs();
      const enColumn = columnDefs?.find((col) => col.field === "values.en");

      expect(enColumn?.editable).toBe(false);
    });
  });

  describe("가상 스크롤", () => {
    it("대용량 데이터에서도 렌더링되어야 함", () => {
      const translations: Translation[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}` },
      }));

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const gridApi = editor.getGridApi();
      const rowCount = gridApi?.getDisplayedRowCount();

      expect(rowCount).toBe(1000);
    });
  });

  describe("성능 테스트", () => {
    it("1,000개 행의 초기 렌더링이 100ms 이하여야 함", () => {
      const translations: Translation[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}`, ko: `값 ${i}` },
      }));

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);

      const startTime = performance.now();
      editor.render();
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // 성능 목표: 100ms 이하
      expect(renderTime).toBeLessThan(100);

      // 데이터가 올바르게 로드되었는지 확인
      const gridApi = editor.getGridApi();
      expect(gridApi?.getDisplayedRowCount()).toBe(1000);
    });

    it("5,000개 행에서도 렌더링되어야 함 (스트레스 테스트)", () => {
      const translations: Translation[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}`, ko: `값 ${i}` },
      }));

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const gridApi = editor.getGridApi();
      const rowCount = gridApi?.getDisplayedRowCount();

      expect(rowCount).toBe(5000);
    });

    it("10,000개 행에서도 렌더링되어야 함 (스트레스 테스트)", () => {
      const translations: Translation[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}`, ko: `값 ${i}` },
      }));

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const gridApi = editor.getGridApi();
      const rowCount = gridApi?.getDisplayedRowCount();

      expect(rowCount).toBe(10000);
    });

    it("여러 언어(10개)에서도 렌더링되어야 함", () => {
      const languages = ["en", "ko", "ja", "zh", "es", "fr", "de", "it", "pt", "ru"];
      const translations: Translation[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: languages.reduce(
          (acc, lang) => ({ ...acc, [lang]: `${lang}-Value ${i}` }),
          {} as Record<string, string>
        ),
      }));

      const options: LocaleEditorOptions = {
        translations,
        languages,
        defaultLanguage: "en",
        container: getContainer(),
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      const startTime = performance.now();
      editor.render();
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // 여러 언어 컬럼이 있어도 성능 목표 유지 (150ms 이하로 완화)
      expect(renderTime).toBeLessThan(150);

      const gridApi = editor.getGridApi();
      expect(gridApi?.getDisplayedRowCount()).toBe(1000);

      // 모든 언어 컬럼이 있는지 확인
      const columnDefs = editor.getColumnDefs();
      for (const lang of languages) {
        const column = columnDefs?.find((col) => col.field === `values.${lang}`);
        expect(column).toBeDefined();
      }
    });
  });
});

