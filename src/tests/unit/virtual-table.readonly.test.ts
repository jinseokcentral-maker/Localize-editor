import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VirtualTable } from "@/components/virtual-table";
import type { Translation } from "@/types/translation";
import { setupVirtualTableTest } from "./virtual-table.helpers";

describe("VirtualTable - Read-only mode", () => {
  const { getContainer, setTable } = setupVirtualTableTest();

  const translations: Translation[] = [
    {
      id: "1",
      key: "test.key1",
      values: { en: "English", ko: "한국어" },
      context: "Test context",
    },
    {
      id: "2",
      key: "test.key2",
      values: { en: "English 2", ko: "한국어 2" },
    },
  ];

  it("setReadOnly(true) should make language columns non-editable", async () => {
    const container = getContainer();
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.display = "block";

    const table = new VirtualTable({
      container,
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: false,
    });
    setTable(table);
    table.render();

    // 스크롤 컨테이너 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.style.width = '800px';
      scrollContainer.style.height = '600px';
      scrollContainer.style.display = 'block';
      Object.defineProperty(scrollContainer, 'offsetWidth', {
        configurable: true,
        get: () => 800,
      });
      Object.defineProperty(scrollContainer, 'offsetHeight', {
        configurable: true,
        get: () => 600,
      });
    }

    // 렌더링 완료 대기
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(undefined));
        });
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 셀 찾기 (반복 체크)
    let langCell: HTMLTableCellElement | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      langCell = container.querySelector(
        'td[data-column-id="values.en"][data-row-id="1"]'
      ) as HTMLTableCellElement;
      if (langCell) break;
    }

    expect(langCell).toBeTruthy();
    if (!langCell) return;

    // 초기 상태: 편집 가능
    expect(table.isReadOnly()).toBe(false);
    expect(langCell.getAttribute("tabindex")).toBe("0");

    // read-only 모드로 변경
    table.setReadOnly(true);
    expect(table.isReadOnly()).toBe(true);

    // 재렌더링 완료 대기
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 셀 다시 찾기
    langCell = container.querySelector(
      'td[data-column-id="values.en"][data-row-id="1"]'
    ) as HTMLTableCellElement;
    expect(langCell).toBeTruthy();
    if (!langCell) return;

    // tabindex가 -1이어야 함 (편집 불가)
    expect(langCell.getAttribute("tabindex")).toBe("-1");

    // tooltip이 있어야 함
    expect(langCell.getAttribute("title")).toBe(
      "You cannot edit in read-only mode"
    );

    // cursor가 not-allowed여야 함
    expect(langCell.style.cursor).toBe("not-allowed");
  });

  it("setReadOnly(false) should make language columns editable again", async () => {
    const container = getContainer();
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.display = "block";

    const table = new VirtualTable({
      container,
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: true,
    });
    setTable(table);
    table.render();

    // 스크롤 컨테이너 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.style.width = '800px';
      scrollContainer.style.height = '600px';
      scrollContainer.style.display = 'block';
      Object.defineProperty(scrollContainer, 'offsetWidth', {
        configurable: true,
        get: () => 800,
      });
      Object.defineProperty(scrollContainer, 'offsetHeight', {
        configurable: true,
        get: () => 600,
      });
    }

    // 렌더링 완료 대기
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(undefined));
        });
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 셀 찾기
    let langCell: HTMLTableCellElement | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      langCell = container.querySelector(
        'td[data-column-id="values.en"][data-row-id="1"]'
      ) as HTMLTableCellElement;
      if (langCell) break;
    }

    expect(langCell).toBeTruthy();
    if (!langCell) return;

    // 초기 상태: read-only
    expect(table.isReadOnly()).toBe(true);
    expect(langCell.getAttribute("tabindex")).toBe("-1");

    // 편집 가능 모드로 변경
    table.setReadOnly(false);
    expect(table.isReadOnly()).toBe(false);

    // 재렌더링 완료 대기
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 셀 다시 찾기
    langCell = container.querySelector(
      'td[data-column-id="values.en"][data-row-id="1"]'
    ) as HTMLTableCellElement;
    expect(langCell).toBeTruthy();
    if (!langCell) return;

    // tabindex가 0이어야 함 (편집 가능)
    expect(langCell.getAttribute("tabindex")).toBe("0");

    // tooltip이 없어야 함
    expect(langCell.getAttribute("title")).toBeNull();

    // cursor가 기본값이어야 함
    expect(langCell.style.cursor).toBe("");
  });

  it("Key and Context columns should remain editable in read-only mode", async () => {
    const container = getContainer();
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.display = "block";

    const table = new VirtualTable({
      container,
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: true,
    });
    setTable(table);
    table.render();

    // 스크롤 컨테이너 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.style.width = '800px';
      scrollContainer.style.height = '600px';
      scrollContainer.style.display = 'block';
      Object.defineProperty(scrollContainer, 'offsetWidth', {
        configurable: true,
        get: () => 800,
      });
      Object.defineProperty(scrollContainer, 'offsetHeight', {
        configurable: true,
        get: () => 600,
      });
    }

    // 렌더링 완료 대기
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(undefined));
        });
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Key 컬럼 셀 찾기
    let keyCell: HTMLTableCellElement | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      keyCell = container.querySelector(
        'td[data-column-id="key"][data-row-id="1"]'
      ) as HTMLTableCellElement;
      if (keyCell) break;
    }
    expect(keyCell).toBeTruthy();
    if (!keyCell) return;

    // Key 컬럼은 편집 가능해야 함
    expect(keyCell.getAttribute("tabindex")).toBe("0");

    // Context 컬럼 셀 찾기
    let contextCell: HTMLTableCellElement | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      contextCell = container.querySelector(
        'td[data-column-id="context"][data-row-id="1"]'
      ) as HTMLTableCellElement;
      if (contextCell) break;
    }
    expect(contextCell).toBeTruthy();
    if (!contextCell) return;

    // Context 컬럼도 편집 가능해야 함
    expect(contextCell.getAttribute("tabindex")).toBe("0");
  });

  it("read-only mode should prevent double-click editing on language columns", async () => {
    const container = getContainer();
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.display = "block";

    const table = new VirtualTable({
      container,
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: true,
    });
    setTable(table);
    table.render();

    // 스크롤 컨테이너 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.style.width = '800px';
      scrollContainer.style.height = '600px';
      scrollContainer.style.display = 'block';
      Object.defineProperty(scrollContainer, 'offsetWidth', {
        configurable: true,
        get: () => 800,
      });
      Object.defineProperty(scrollContainer, 'offsetHeight', {
        configurable: true,
        get: () => 600,
      });
    }

    // 렌더링 완료 대기
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(undefined));
        });
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 언어 컬럼 셀 찾기
    let langCell: HTMLTableCellElement | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      langCell = container.querySelector(
        'td[data-column-id="values.en"][data-row-id="1"]'
      ) as HTMLTableCellElement;
      if (langCell) break;
    }
    expect(langCell).toBeTruthy();
    if (!langCell) return;

    // 더블클릭 이벤트 발생
    const dblClickEvent = new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
    });

    // 편집이 시작되지 않아야 함 (editingCell이 null이어야 함)
    langCell.dispatchEvent(dblClickEvent);

    // editingCell은 여전히 null이어야 함
    // (내부 상태에 접근할 수 없으므로, 편집 모드가 아닌 것을 확인하는 다른 방법 필요)
    // 여기서는 간접적으로 확인: input 요소가 생성되지 않았는지 확인
    await new Promise((resolve) => setTimeout(resolve, 50));
    const input = langCell.querySelector("input");
    expect(input).toBeNull();
  });

  it("isReadOnly() should return current read-only state", () => {
    const table = new VirtualTable({
      container: getContainer(),
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: false,
    });
    setTable(table);
    table.render();

    expect(table.isReadOnly()).toBe(false);

    table.setReadOnly(true);
    expect(table.isReadOnly()).toBe(true);

    table.setReadOnly(false);
    expect(table.isReadOnly()).toBe(false);
  });

  it("table should have 'readonly' CSS class when in read-only mode", async () => {
    const container = getContainer();
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.display = "block";

    const table = new VirtualTable({
      container,
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      readOnly: false,
    });
    setTable(table);
    table.render();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const tableElement = container.querySelector("table.virtual-table");
    expect(tableElement).toBeTruthy();
    expect(tableElement?.classList.contains("readonly")).toBe(false);

    table.setReadOnly(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(tableElement?.classList.contains("readonly")).toBe(true);

    table.setReadOnly(false);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(tableElement?.classList.contains("readonly")).toBe(false);
  });
});

