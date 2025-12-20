import { describe, it, expect } from "vitest";
import { VirtualTable } from "@/components/virtual-table";
import type { Translation, VirtualTableOptions } from "@/types/translation";
import { setupVirtualTableTest } from "./virtual-table.helpers";

describe("VirtualTable - Key 컬럼 중복 검증", () => {
  const { getContainer, setTable } = setupVirtualTableTest();

  it("중복된 Key를 입력하면 빨간색으로 표시되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "Value 1" },
      },
      {
        id: "2",
        key: "test.key2",
        values: { en: "Value 2" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = getContainer().querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // DOM이 렌더링될 때까지 대기
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 두 번째 행의 Key 셀을 편집하여 첫 번째 행의 Key와 중복되도록 함
    const cell = getContainer().querySelector('td[data-row-id="2"][data-column-id="key"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return;

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (!input) return;

    // 중복된 Key 입력
    input.value = "test.key1"; // 첫 번째 행의 Key와 동일
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // cell-duplicate-key 클래스가 적용되었는지 확인
    expect(cell.classList.contains('cell-duplicate-key')).toBe(true);
    expect(cell.getAttribute('title')).toBe('Key must be unique. This key already exists.');

    // 편집 완료 (중복된 Key는 저장되지 않고 이전 값으로 복원됨)
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 편집 완료 후 이전 값으로 복원되므로 중복 표시는 사라져야 함
    // (이전 값은 중복이 아니므로)
    expect(cell.classList.contains('cell-duplicate-key')).toBe(false);
    expect(cell.getAttribute('title')).toBeNull();
  });

  it("중복된 Key를 입력한 후 Enter를 누르면 이전 값으로 복원되고 dirty가 아니어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "Value 1" },
      },
      {
        id: "2",
        key: "test.key2",
        values: { en: "Value 2" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = getContainer().querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // DOM이 렌더링될 때까지 대기
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 두 번째 행의 Key 셀을 편집
    const cell = getContainer().querySelector('td[data-row-id="2"][data-column-id="key"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return;

    const originalKey = "test.key2"; // 원래 Key 값
    expect(cell.textContent).toBe(originalKey);

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (!input) return;

    // 중복된 Key 입력
    input.value = "test.key1"; // 첫 번째 행의 Key와 동일 (중복)
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Enter 키로 편집 완료
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enterEvent);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 이전 값으로 복원되었는지 확인
    expect(cell.textContent).toBe(originalKey);

    // dirty 상태가 아니어야 함 (변경사항이 저장되지 않았으므로)
    expect(cell.classList.contains('cell-dirty')).toBe(false);
    expect(table.getChanges().length).toBe(0);
  });

  it("중복되지 않은 Key를 입력하면 빨간색 표시가 없어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "Value 1" },
      },
      {
        id: "2",
        key: "test.key2",
        values: { en: "Value 2" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = getContainer().querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // DOM이 렌더링될 때까지 대기
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 두 번째 행의 Key 셀을 편집
    const cell = getContainer().querySelector('td[data-row-id="2"][data-column-id="key"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return;

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (!input) return;

    // 중복되지 않은 Key 입력
    input.value = "test.key3"; // 새로운 Key
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // cell-duplicate-key 클래스가 적용되지 않았는지 확인
    expect(cell.classList.contains('cell-duplicate-key')).toBe(false);
    expect(cell.getAttribute('title')).toBeNull();

    // 편집 완료
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 편집 완료 후에도 중복 표시가 없어야 함
    expect(cell.classList.contains('cell-duplicate-key')).toBe(false);
  });

  it("자기 자신의 Key는 중복으로 간주하지 않아야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "Value 1" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = getContainer().querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // DOM이 렌더링될 때까지 대기
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 첫 번째 행의 Key 셀을 편집 (같은 Key로 변경)
    const cell = getContainer().querySelector('td[data-row-id="1"][data-column-id="key"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return;

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (!input) return;

    // 같은 Key로 변경 (자기 자신이므로 중복이 아님)
    input.value = "test.key1";
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // cell-duplicate-key 클래스가 적용되지 않았는지 확인
    expect(cell.classList.contains('cell-duplicate-key')).toBe(false);
    expect(cell.getAttribute('title')).toBeNull();

    // 편집 완료
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 편집 완료 후에도 중복 표시가 없어야 함
    expect(cell.classList.contains('cell-duplicate-key')).toBe(false);
  });

  it("빈 Key는 중복으로 간주하지 않아야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "Value 1" },
      },
      {
        id: "2",
        key: "test.key2",
        values: { en: "Value 2" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
    };

    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // jsdom 환경 지원: 스크롤 컨테이너 크기 설정
    const scrollContainer = getContainer().querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // DOM이 렌더링될 때까지 대기
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 두 번째 행의 Key 셀을 편집하여 빈 값으로 변경
    const cell = getContainer().querySelector('td[data-row-id="2"][data-column-id="key"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return;

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (!input) return;

    // 빈 Key 입력
    input.value = "";
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // cell-duplicate-key 클래스가 적용되지 않았는지 확인 (빈 값은 중복이 아님)
    expect(cell.classList.contains('cell-duplicate-key')).toBe(false);
    expect(cell.getAttribute('title')).toBeNull();
  });
});
