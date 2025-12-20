import { describe, it, expect } from "vitest";
import { VirtualTable, type VirtualTableOptions } from "@/components/virtual-table";
import type { Translation } from "@/types/translation";
import { setupVirtualTableTest } from "./virtual-table.helpers";

describe("VirtualTable - 빈 번역 셀 하이라이트", () => {
  const { getContainer, setTable } = setupVirtualTableTest();

  it("빈 번역 셀은 시각적으로 하이라이트되어야 함 (cell-empty 클래스)", async () => {
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

    const options: VirtualTableOptions = {
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const container = getContainer();
    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // DOM이 렌더링될 때까지 대기 (가상 스크롤링 초기화 시간 포함)
    // requestAnimationFrame을 여러 번 트리거
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 여러 번 체크하여 셀이 렌더링될 때까지 대기
    let row1EnCell: HTMLTableCellElement | null = null;
    let row1KoCell: HTMLTableCellElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      row1EnCell = container.querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
      row1KoCell = container.querySelector('td[data-row-id="1"][data-column-id="values.ko"]') as HTMLTableCellElement;
      if (row1EnCell && row1KoCell) break;
    }
    
    expect(row1EnCell).toBeTruthy();
    expect(row1KoCell).toBeTruthy();
    
    expect(row1EnCell.classList.contains('cell-empty')).toBe(false); // en은 값이 있음
    expect(row1KoCell.classList.contains('cell-empty')).toBe(true); // ko는 빈 값

    // 두 번째 행: en은 빈 값, ko는 값이 있음
    const row2EnCell = container.querySelector('td[data-row-id="2"][data-column-id="values.en"]') as HTMLTableCellElement;
    const row2KoCell = container.querySelector('td[data-row-id="2"][data-column-id="values.ko"]') as HTMLTableCellElement;
    
    expect(row2EnCell).toBeTruthy();
    expect(row2KoCell).toBeTruthy();
    
    expect(row2EnCell.classList.contains('cell-empty')).toBe(true); // en은 빈 값
    expect(row2KoCell.classList.contains('cell-empty')).toBe(false); // ko는 값이 있음

    // 세 번째 행: 모두 값이 있음
    const row3EnCell = container.querySelector('td[data-row-id="3"][data-column-id="values.en"]') as HTMLTableCellElement;
    const row3KoCell = container.querySelector('td[data-row-id="3"][data-column-id="values.ko"]') as HTMLTableCellElement;
    
    expect(row3EnCell).toBeTruthy();
    expect(row3KoCell).toBeTruthy();
    
    expect(row3EnCell.classList.contains('cell-empty')).toBe(false);
    expect(row3KoCell.classList.contains('cell-empty')).toBe(false);
  });

  it("Key와 Context 컬럼은 cell-empty 클래스가 적용되지 않아야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Value" },
        context: "", // 빈 context
      },
    ];

    const container = getContainer();
    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container,
      readOnly: false,
    };

    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // requestAnimationFrame을 여러 번 트리거
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const keyCell = container.querySelector('td[data-row-id="1"][data-column-id="key"]') as HTMLTableCellElement;
    const contextCell = container.querySelector('td[data-row-id="1"][data-column-id="context"]') as HTMLTableCellElement;

    expect(keyCell).toBeTruthy();
    expect(contextCell).toBeTruthy();

    // Key와 Context는 cell-empty 클래스가 적용되지 않아야 함 (언어 컬럼만 적용)
    expect(keyCell.classList.contains('cell-empty')).toBe(false);
    expect(contextCell.classList.contains('cell-empty')).toBe(false);
  });

  it("셀에 값을 입력하면 빈 셀 하이라이트가 제거되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "", ko: "한국어" }, // en이 빈 값
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const container = getContainer();
    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // requestAnimationFrame을 여러 번 트리거
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 초기에는 빈 셀 하이라이트가 적용되어야 함
    let enCell = container.querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(enCell).toBeTruthy();
    if (!enCell) return;
    expect(enCell.classList.contains('cell-empty')).toBe(true);

    // 셀 편집
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    enCell.dispatchEvent(dblClickEvent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = enCell.querySelector('input') as HTMLInputElement;
    input.value = "English";
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 빈 셀 하이라이트가 제거되어야 함
    enCell = container.querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(enCell).toBeTruthy();
    if (!enCell) return;
    expect(enCell.classList.contains('cell-empty')).toBe(false);
  });

  it("빈 문자열과 공백만 있는 경우 모두 빈 값으로 처리해야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "   ", ko: "" }, // 공백만 있는 경우와 빈 문자열
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const container = getContainer();
    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // requestAnimationFrame을 여러 번 트리거
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const enCell = container.querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    const koCell = container.querySelector('td[data-row-id="1"][data-column-id="values.ko"]') as HTMLTableCellElement;

    expect(enCell).toBeTruthy();
    expect(koCell).toBeTruthy();
    if (!enCell || !koCell) return;

    // 공백만 있는 경우와 빈 문자열 모두 빈 값으로 처리
    expect(enCell.classList.contains('cell-empty')).toBe(true);
    expect(koCell.classList.contains('cell-empty')).toBe(true);
  });
});

