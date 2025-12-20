import { describe, it, expect, vi } from "vitest";
import { VirtualTable, type VirtualTableOptions } from "@/components/virtual-table";
import type { Translation } from "@/types/translation";
import { setupVirtualTableTest } from "./virtual-table.helpers";

describe("VirtualTable - 변경사항 추적 (dirty cells)", () => {
  const { getContainer, setTable } = setupVirtualTableTest();

  it("셀 값이 변경되면 변경사항이 추적되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Old Value", ko: "기존 값" },
      },
    ];

    const onCellChange = vi.fn();
    const options: VirtualTableOptions = {
      translations,
      languages: ["en", "ko"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
      onCellChange,
    };

    const container = getContainer();
    const table = new VirtualTable(options);
    setTable(table);
    table.render();

    // 스크롤 컨테이너가 제대로 생성되었는지 확인
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    expect(scrollContainer).toBeTruthy();
    
    // jsdom 환경에서는 레이아웃이 계산되지 않으므로 크기를 명시적으로 설정
    // VirtualTable이 100%로 설정하므로, 부모 컨테이너의 크기를 먼저 설정
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.display = 'block';
    
    if (scrollContainer) {
      // 스크롤 컨테이너의 크기를 명시적으로 설정 (jsdom 환경 지원)
      scrollContainer.style.width = '800px';
      scrollContainer.style.height = '600px';
      scrollContainer.style.display = 'block';
      
      // Object.defineProperty를 사용하여 offsetWidth/offsetHeight를 오버라이드
      // jsdom에서는 이것들이 0을 반환하므로, 명시적으로 설정한 값을 반환하도록 함
      Object.defineProperty(scrollContainer, 'offsetWidth', {
        configurable: true,
        get: () => 800,
      });
      Object.defineProperty(scrollContainer, 'offsetHeight', {
        configurable: true,
        get: () => 600,
      });
      
      // 레이아웃 계산을 강제 (이제 실제 값을 반환함)
      scrollContainer.offsetWidth;
      scrollContainer.offsetHeight;
    }

    // DOM이 렌더링될 때까지 대기
    // requestAnimationFrame을 여러 번 트리거하기 위해 여러 프레임 대기
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(undefined);
          });
        });
      });
    }
    
    // 추가 대기 시간
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // 여러 번 체크하여 셀이 렌더링될 때까지 대기
    let cell: HTMLTableCellElement | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      cell = container.querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
      if (cell) break;
    }
    
    if (!cell) {
      // 디버깅 정보
      const tbody = container.querySelector('tbody');
      const allCells = container.querySelectorAll('td');
      const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
      const scrollRect = scrollContainer?.getBoundingClientRect();
      
      console.log('Debug info:');
      console.log('- Scroll container:', scrollContainer ? `found (${scrollContainer.offsetWidth}x${scrollContainer.offsetHeight})` : 'not found');
      console.log('- Scroll rect:', scrollRect ? `${scrollRect.width}x${scrollRect.height}` : 'null');
      console.log('- Tbody:', tbody ? `found (height: ${tbody.style.height}, children: ${tbody.children.length})` : 'not found');
      console.log('- Total cells:', allCells.length);
      console.log('- Container size:', container.offsetWidth, 'x', container.offsetHeight);
      
      throw new Error(`Cell not found. Tbody children: ${tbody?.children.length || 0}, Total cells: ${allCells.length}`);
    }
    
    expect(cell).toBeTruthy();

    // 더블클릭 이벤트 발생
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);

    // 편집 모드로 전환될 때까지 대기
    await new Promise((resolve) => setTimeout(resolve, 50));

    // input 필드 찾기
    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    // 값 변경
    input.value = "New Value";
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // blur 이벤트로 편집 완료
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    
    // 변경사항 추적이 완료될 때까지 대기
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 변경사항이 추적되었는지 확인
    const changes = table.getChanges();
    expect(changes).toBeDefined();
    expect(changes.length).toBeGreaterThan(0);
    
    // 변경된 셀 정보 확인
    const enChange = changes.find(c => c.id === "1" && c.lang === "en");
    expect(enChange).toBeDefined();
    expect(enChange?.oldValue).toBe("Old Value");
    expect(enChange?.newValue).toBe("New Value");
  });

  it("변경된 셀은 시각적으로 표시되어야 함 (cell-dirty 클래스)", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Old Value" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
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

    await new Promise((resolve) => setTimeout(resolve, 300));

    // 셀 편집
    const cell = getContainer().querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return; // 타입 가드

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = "New Value";
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 변경된 셀에 cell-dirty 클래스가 적용되었는지 확인
    const updatedCell = getContainer().querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(updatedCell).toBeTruthy();
    expect(updatedCell.classList.contains('cell-dirty')).toBe(true);
  });

  it("변경사항을 초기화하면 cell-dirty 클래스가 제거되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Old Value" },
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
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

    await new Promise((resolve) => setTimeout(resolve, 300));

    // 셀 편집
    const cell = getContainer().querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return; // 타입 가드
    
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    input.value = "New Value";
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 변경사항 확인
    let updatedCell = getContainer().querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(updatedCell.classList.contains('cell-dirty')).toBe(true);

    // 변경사항 초기화
    table.clearChanges();
    
    await new Promise((resolve) => setTimeout(resolve, 50));

    // cell-dirty 클래스가 제거되었는지 확인
    updatedCell = getContainer().querySelector('td[data-row-id="1"][data-column-id="values.en"]') as HTMLTableCellElement;
    expect(updatedCell.classList.contains('cell-dirty')).toBe(false);
    
    // 변경사항 목록도 비어있어야 함
    const changes = table.getChanges();
    expect(changes.length).toBe(0);
  });

  it("Key 컬럼 변경도 추적되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "old.key",
        values: { en: "Value" },
      },
    ];

    const onCellChange = vi.fn();
    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
      defaultLanguage: "en",
      container: getContainer(),
      readOnly: false,
      onCellChange,
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

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Key 셀 편집
    const cell = getContainer().querySelector('td[data-row-id="1"][data-column-id="key"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return; // 타입 가드

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    input.value = "new.key";
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 변경사항 확인
    const changes = table.getChanges();
    const keyChange = changes.find(c => c.id === "1" && c.lang === "key");
    expect(keyChange).toBeDefined();
    expect(keyChange?.oldValue).toBe("old.key");
    expect(keyChange?.newValue).toBe("new.key");
  });

  it("Context 컬럼 변경도 추적되어야 함", async () => {
    const translations: Translation[] = [
      {
        id: "1",
        key: "test.key",
        values: { en: "Value" },
        context: "Old context",
      },
    ];

    const options: VirtualTableOptions = {
      translations,
      languages: ["en"],
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

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Context 셀 편집
    const cell = getContainer().querySelector('td[data-row-id="1"][data-column-id="context"]') as HTMLTableCellElement;
    expect(cell).toBeTruthy();
    if (!cell) return; // 타입 가드

    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    cell.dispatchEvent(dblClickEvent);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = cell.querySelector('input') as HTMLInputElement;
    input.value = "New context";
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 변경사항 확인
    const changes = table.getChanges();
    const contextChange = changes.find(c => c.id === "1" && c.lang === "context");
    expect(contextChange).toBeDefined();
    expect(contextChange?.oldValue).toBe("Old context");
    expect(contextChange?.newValue).toBe("New context");
  });
});

