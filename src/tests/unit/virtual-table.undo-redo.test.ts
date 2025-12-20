import { describe, it, expect } from "vitest";
import { VirtualTable } from "@/components/virtual-table";
import type { Translation, VirtualTableOptions } from "@/types/translation";
import { setupVirtualTableTest } from "./virtual-table.helpers";

describe("VirtualTable - Undo/Redo", () => {
  const { getContainer, setTable } = setupVirtualTableTest();

  it("여러 셀을 수정한 후 undo를 두 번 하면 두 개의 변경사항이 모두 취소되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key1",
        values: { en: "Value 1", ko: "값 1" },
      },
      {
        id: "2",
        key: "test.key2",
        values: { en: "Value 2", ko: "값 2" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en", "ko"],
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

    // 첫 번째 셀 수정 (row 1, en)
    const cell1 = getContainer().querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(cell1).toBeTruthy();
    if (!cell1) return;

    const dblClick1 = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell1.dispatchEvent(dblClick1);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input1 = cell1.querySelector('input') as HTMLInputElement;
    expect(input1).toBeTruthy();
    if (!input1) return;

    input1.value = "Modified Value 1";
    input1.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cell1.textContent).toBe("Modified Value 1");
    expect(table.canUndo()).toBe(true);

    // 두 번째 셀 수정 (row 2, en)
    const cell2 = getContainer().querySelector('td[data-row-id="2"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(cell2).toBeTruthy();
    if (!cell2) return;

    const dblClick2 = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell2.dispatchEvent(dblClick2);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input2 = cell2.querySelector('input') as HTMLInputElement;
    expect(input2).toBeTruthy();
    if (!input2) return;

    input2.value = "Modified Value 2";
    input2.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cell2.textContent).toBe("Modified Value 2");
    expect(table.canUndo()).toBe(true);

    // 첫 번째 Undo (두 번째 변경사항 취소)
    const undoEvent1 = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(undoEvent1);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cell2.textContent).toBe("Value 2"); // 두 번째 셀이 원래 값으로 복원
    expect(cell1.textContent).toBe("Modified Value 1"); // 첫 번째 셀은 여전히 수정됨
    expect(table.canUndo()).toBe(true); // 아직 undo 가능

    // 두 번째 Undo (첫 번째 변경사항 취소)
    const undoEvent2 = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(undoEvent2);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cell1.textContent).toBe("Value 1"); // 첫 번째 셀이 원래 값으로 복원
    expect(cell2.textContent).toBe("Value 2"); // 두 번째 셀도 원래 값
    expect(table.canUndo()).toBe(false); // 더 이상 undo 불가능
  });

  it("undo 후 redo를 하면 변경사항이 다시 적용되어야 함", async () => {
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

    // jsdom 환경 지원
    const scrollContainer = getContainer().querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', { configurable: true, get: () => 800 });
      Object.defineProperty(scrollContainer, 'offsetHeight', { configurable: true, get: () => 600 });
    }

    // DOM 렌더링 대기
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 셀 수정
    const cell = getContainer().querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return;

    const dblClick = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClick);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (!input) return;

    input.value = "Modified Value";
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cell.textContent).toBe("Modified Value");
    expect(table.canUndo()).toBe(true);
    expect(table.canRedo()).toBe(false);

    // Undo
    const undoEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(undoEvent);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cell.textContent).toBe("Value 1");
    expect(table.canUndo()).toBe(false);
    expect(table.canRedo()).toBe(true);

    // Redo
    const redoEvent = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(redoEvent);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cell.textContent).toBe("Modified Value");
    expect(table.canUndo()).toBe(true);
    expect(table.canRedo()).toBe(false);
  });
});

