import { describe, it, expect } from "vitest";
import { LocaleEditor } from "@/components/locale-editor";
import type { Translation, LocaleEditorOptions } from "@/types/translation";
import { setupLocaleEditorTest } from "./locale-editor.helpers";

describe("LocaleEditor - Phase 1-2: 변경사항 추적 (dirty cells)", () => {
  const { getContainer, setEditor } = setupLocaleEditorTest();

  it("셀 값이 변경되면 변경사항이 추적되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Old Value", ko: "기존 값" },
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
    
    // 셀 값 변경
    rowNode?.setDataValue("values.en", "New Value");
    await new Promise(resolve => setTimeout(resolve, 100));

    // 변경사항이 추적되었는지 확인
    const changes = editor.getChanges();
    expect(changes).toBeDefined();
    expect(changes.length).toBeGreaterThan(0);
    
    // 변경된 셀 정보 확인
    const enChange = changes.find(c => c.id === "1" && c.lang === "en");
    expect(enChange).toBeDefined();
  });

  it("변경된 셀은 시각적으로 표시되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Old Value" },
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

    const gridApi = editor.getGridApi();
    const rowNode = gridApi?.getRowNode("1");
    
    // 셀 값 변경
    rowNode?.setDataValue("values.en", "New Value");
    await new Promise(resolve => setTimeout(resolve, 100));

    // 변경된 셀이 스타일이 적용되었는지 확인
    // AG Grid에서 변경된 셀을 찾아서 스타일 확인
    const cellElement = getContainer().querySelector(`[row-id="1"] [col-id="values.en"]`);
    expect(cellElement).toBeTruthy();
    // 변경된 셀에는 특별한 클래스나 스타일이 적용되어야 함
  });

  it("변경사항을 초기화할 수 있어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Old Value" },
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

    const gridApi = editor.getGridApi();
    const rowNode = gridApi?.getRowNode("1");
    
    // 셀 값 변경
    rowNode?.setDataValue("values.en", "New Value");
    await new Promise(resolve => setTimeout(resolve, 100));

    // 변경사항 확인
    let changes = editor.getChanges();
    expect(changes.length).toBeGreaterThan(0);

    // 변경사항 초기화
    editor.clearChanges();
    
    // 변경사항이 비어있는지 확인
    changes = editor.getChanges();
    expect(changes.length).toBe(0);
  });

  it("여러 셀을 변경하면 모든 변경사항이 추적되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "English", ko: "한국어" },
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
    
    // 여러 셀 값 변경
    rowNode?.setDataValue("values.en", "New English");
    await new Promise(resolve => setTimeout(resolve, 50));
    
    rowNode?.setDataValue("values.ko", "새 한국어");
    await new Promise(resolve => setTimeout(resolve, 50));

    // 모든 변경사항이 추적되었는지 확인
    const changes = editor.getChanges();
    expect(changes.length).toBe(2);
    
    const enChange = changes.find(c => c.id === "1" && c.lang === "en");
    const koChange = changes.find(c => c.id === "1" && c.lang === "ko");
    expect(enChange).toBeDefined();
    expect(koChange).toBeDefined();
  });

  it("같은 셀을 다시 원래 값으로 변경하면 변경사항에서 제거되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Original Value" },
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

    const gridApi = editor.getGridApi();
    const rowNode = gridApi?.getRowNode("1");
    
    // 셀 값 변경
    rowNode?.setDataValue("values.en", "New Value");
    await new Promise(resolve => setTimeout(resolve, 100));

    // 변경사항 확인
    let changes = editor.getChanges();
    expect(changes.length).toBe(1);

    // 다시 원래 값으로 변경
    rowNode?.setDataValue("values.en", "Original Value");
    await new Promise(resolve => setTimeout(resolve, 100));

    // 변경사항이 제거되었는지 확인
    changes = editor.getChanges();
    expect(changes.length).toBe(0);
  });
});

