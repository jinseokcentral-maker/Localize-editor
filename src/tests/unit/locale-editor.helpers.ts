import { beforeEach, afterEach } from "vitest";
import { LocaleEditor } from "@/components/locale-editor";

/**
 * LocaleEditor 테스트 헬퍼
 * 
 * beforeEach/afterEach를 공유하는 테스트 헬퍼 함수
 */
export function setupLocaleEditorTest() {
  let container: HTMLElement;
  let editor: LocaleEditor;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  return {
    getContainer: () => container,
    getEditor: () => editor,
    setEditor: (newEditor: LocaleEditor) => {
      editor = newEditor;
    },
  };
}

