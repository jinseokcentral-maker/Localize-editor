import { describe, it, expect, vi } from "vitest";
import { LocaleEditor } from "@/components/locale-editor";
import type { Translation, LocaleEditorOptions } from "@/types/translation";
import { setupLocaleEditorTest } from "./locale-editor.helpers";

describe("LocaleEditor - Phase 1-5: Context 컬럼 편집 지원", () => {
  const { getContainer, setEditor } = setupLocaleEditorTest();

  describe("Context 컬럼 편집", () => {
    it("readOnly 모드가 아니면 Context 컬럼이 편집 가능해야 함", () => {
      const translations: Translation[] = [
        {
          id: "1",
          key: "test.key1",
          values: { en: "English", ko: "한국어" },
          context: "Test context",
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

      const columnDefs = editor.getColumnDefs();
      const contextColumn = columnDefs?.find((col) => col.field === "context");
      
      expect(contextColumn?.editable).toBe(true);
      expect(contextColumn?.cellEditor).toBe("agTextCellEditor");
    });

    it("readOnly 모드일 때 Context 컬럼은 편집 불가능해야 함", () => {
      const translations: Translation[] = [
        {
          id: "1",
          key: "test.key1",
          values: { en: "English", ko: "한국어" },
          context: "Test context",
        },
      ];

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
        readOnly: true,
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const columnDefs = editor.getColumnDefs();
      const contextColumn = columnDefs?.find((col) => col.field === "context");
      
      expect(contextColumn?.editable).toBe(false);
    });

    it("Context 값 변경 시 onCellChange 콜백이 호출되어야 함", async () => {
      const onCellChange = vi.fn();
      
      const translations: Translation[] = [
        {
          id: "1",
          key: "test.key1",
          values: { en: "English", ko: "한국어" },
          context: "Old context",
        },
      ];

      const options: LocaleEditorOptions = {
        translations,
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: getContainer(),
        readOnly: false,
        onCellChange,
      };

      const editor = new LocaleEditor(options);
      setEditor(editor);
      editor.render();

      const gridApi = editor.getGridApi();
      expect(gridApi).toBeTruthy();

      // Context 값 변경
      const rowNode = gridApi?.getRowNode("1");
      expect(rowNode).toBeTruthy();
      
      rowNode?.setDataValue("context", "New context");

      // onCellChange 콜백이 호출되었는지 확인
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(onCellChange).toHaveBeenCalledWith("1", "context", "New context");
    });

    it("Context 값 변경 시 변경사항 추적이 되어야 함", async () => {
      const translations: Translation[] = [
        {
          id: "1",
          key: "test.key1",
          values: { en: "English", ko: "한국어" },
          context: "Old context",
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
      expect(gridApi).toBeTruthy();

      // Context 값 변경
      const rowNode = gridApi?.getRowNode("1");
      rowNode?.setDataValue("context", "New context");

      await new Promise(resolve => setTimeout(resolve, 100));

      // 변경사항 확인
      const changes = editor.getChanges();
      const contextChange = changes.find((c) => c.id === "1" && c.lang === "context");
      
      expect(contextChange).toBeDefined();
      expect(contextChange?.oldValue).toBe("Old context");
      expect(contextChange?.newValue).toBe("New context");
    });

    it("Context 값 변경 시 dirty cell 스타일이 적용되어야 함", async () => {
      const translations: Translation[] = [
        {
          id: "1",
          key: "test.key1",
          values: { en: "English", ko: "한국어" },
          context: "Old context",
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
      expect(gridApi).toBeTruthy();

      // Context 값 변경
      const rowNode = gridApi?.getRowNode("1");
      rowNode?.setDataValue("context", "New context");

      await new Promise(resolve => setTimeout(resolve, 200));

      // cell-dirty 클래스가 적용되었는지 확인 (columnDefs에 cellClassRules가 설정되어 있는지 확인)
      const columnDefs = editor.getColumnDefs();
      const contextColumn = columnDefs?.find((col) => col.field === "context");
      
      expect(contextColumn?.cellClassRules).toBeDefined();
      expect(contextColumn?.cellClassRules?.["cell-dirty"]).toBeDefined();
    });

    it("Context 값이 빈 문자열로 변경되어도 변경사항이 추적되어야 함", async () => {
      const translations: Translation[] = [
        {
          id: "1",
          key: "test.key1",
          values: { en: "English", ko: "한국어" },
          context: "Original context",
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
      
      // Context 값을 빈 문자열로 변경
      const rowNode = gridApi?.getRowNode("1");
      rowNode?.setDataValue("context", "");

      await new Promise(resolve => setTimeout(resolve, 100));

      // 변경사항 확인
      const changes = editor.getChanges();
      const contextChange = changes.find((c) => c.id === "1" && c.lang === "context");
      
      expect(contextChange).toBeDefined();
      expect(contextChange?.oldValue).toBe("Original context");
      expect(contextChange?.newValue).toBe("");
    });
  });
});

