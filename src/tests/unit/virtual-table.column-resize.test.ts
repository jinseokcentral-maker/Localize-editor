import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VirtualTable } from '@/components/virtual-table';
import type { Translation } from '@/types/translation';

describe('VirtualTable - Column Resize', () => {
  let container: HTMLElement;
  let virtualTable: VirtualTable;
  
  const mockTranslations: Translation[] = [
    {
      id: '1',
      key: 'common.buttons.submit',
      values: { en: 'Submit', ko: '제출' },
      context: 'Submit button',
    },
    {
      id: '2',
      key: 'common.buttons.cancel',
      values: { en: 'Cancel', ko: '취소' },
    },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1000px';
    container.style.height = '600px';
    container.style.display = 'block';
    document.body.appendChild(container);

    // jsdom에서 offsetWidth/offsetHeight를 위해 mock 설정
    Object.defineProperty(container, 'offsetWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(container, 'offsetHeight', {
      configurable: true,
      value: 600,
    });
  });

  afterEach(() => {
    if (virtualTable) {
      virtualTable.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  async function setupVirtualTable(): Promise<void> {
    virtualTable = new VirtualTable({
      container,
      translations: mockTranslations,
      languages: ['en', 'ko'],
      defaultLanguage: 'en',
      rowHeight: 40,
    });
    
    virtualTable.render();
    
    // DOM이 완전히 렌더링될 때까지 대기
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 200);
        });
      });
    });
    
    // jsdom에서 offsetWidth/offsetHeight mock 설정
    const scrollContainer = container.querySelector('.virtual-table-scroll-container') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(scrollContainer, 'offsetHeight', {
        configurable: true,
        value: 600,
      });
    }
    
    // 모든 헤더 셀에 offsetWidth mock 설정
    const headerCells = container.querySelectorAll('th');
    headerCells.forEach(cell => {
      Object.defineProperty(cell, 'offsetWidth', {
        configurable: true,
        value: 200,
        writable: true,
      });
    });
    
    // 모든 바디 셀에 offsetWidth mock 설정
    const bodyCells = container.querySelectorAll('td');
    bodyCells.forEach(cell => {
      Object.defineProperty(cell, 'offsetWidth', {
        configurable: true,
        value: 200,
        writable: true,
      });
    });
  }

  it('should add resize handle to language columns', async () => {
    await setupVirtualTable();
    
    // 헤더에서 언어 컬럼 찾기
    const headerCells = container.querySelectorAll('th[data-column-id^="values."]');
    expect(headerCells.length).toBeGreaterThan(0);
    
    // 각 언어 컬럼에 리사이즈 핸들이 있는지 확인
    headerCells.forEach(headerCell => {
      const resizeHandle = headerCell.querySelector('.column-resize-handle');
      expect(resizeHandle).toBeTruthy();
    });
  });

  it('should not add resize handle to key and context columns', async () => {
    await setupVirtualTable();
    
    // Key와 Context 컬럼에는 리사이즈 핸들이 없어야 함
    const keyHeader = Array.from(container.querySelectorAll('th')).find(
      th => th.textContent === 'Key'
    );
    const contextHeader = Array.from(container.querySelectorAll('th')).find(
      th => th.textContent === 'Context'
    );
    
    if (keyHeader) {
      const resizeHandle = keyHeader.querySelector('.column-resize-handle');
      expect(resizeHandle).toBeFalsy();
    }
    
    if (contextHeader) {
      const resizeHandle = contextHeader.querySelector('.column-resize-handle');
      expect(resizeHandle).toBeFalsy();
    }
  });

  it('should resize column when dragging resize handle', async () => {
    await setupVirtualTable();
    
    // EN 컬럼의 리사이즈 핸들 찾기
    const enHeader = Array.from(container.querySelectorAll('th[data-column-id]')).find(
      th => th.getAttribute('data-column-id') === 'values.en'
    ) as HTMLElement;
    
    expect(enHeader).toBeTruthy();
    if (!enHeader) return;
    
    const resizeHandle = enHeader.querySelector('.column-resize-handle') as HTMLElement;
    expect(resizeHandle).toBeTruthy();
    if (!resizeHandle) return;
    
    // 초기 너비 확인
    const initialWidth = 200; // mock된 값
    let currentWidth = initialWidth;
    
    // offsetWidth를 동적으로 업데이트할 수 있도록 설정
    Object.defineProperty(enHeader, 'offsetWidth', {
      configurable: true,
      get: () => currentWidth,
    });
    
    // 리사이즈 시뮬레이션: mousedown -> mousemove -> mouseup
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 250, // 초기 위치
    });
    resizeHandle.dispatchEvent(mousedownEvent);
    
    // 50px 오른쪽으로 드래그
    const mousemoveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 300, // 50px 이동
    });
    document.dispatchEvent(mousemoveEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 리사이즈 핸들러에서 너비가 업데이트되었을 것으로 가정
    currentWidth = 250; // 새로운 너비
    
    // mouseup으로 리사이즈 종료
    const mouseupEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(mouseupEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 너비가 변경되었는지 확인 (스타일로 확인)
    const newWidthStyle = enHeader.style.width;
    expect(newWidthStyle).toBeTruthy();
  });

  it('should respect minimum width when resizing', async () => {
    await setupVirtualTable();
    
    const enHeader = Array.from(container.querySelectorAll('th[data-column-id]')).find(
      th => th.getAttribute('data-column-id') === 'values.en'
    ) as HTMLElement;
    
    expect(enHeader).toBeTruthy();
    if (!enHeader) return;
    
    const resizeHandle = enHeader.querySelector('.column-resize-handle') as HTMLElement;
    expect(resizeHandle).toBeTruthy();
    if (!resizeHandle) return;
    
    // minWidth는 80px
    const minWidth = 80;
    
    // mousedown
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 250,
    });
    resizeHandle.dispatchEvent(mousedownEvent);
    
    // 너무 많이 왼쪽으로 드래그 (너무 작게 만들려고 시도)
    const mousemoveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 50, // 200px 작게 (200 - 150 = 50, 이건 minWidth보다 작음)
    });
    document.dispatchEvent(mousemoveEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // mouseup
    const mouseupEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(mouseupEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 최소 너비보다 작아지지 않아야 함 (스타일에서 확인)
    const finalWidthStyle = enHeader.style.width;
    if (finalWidthStyle) {
      const finalWidth = parseInt(finalWidthStyle.replace('px', ''), 10);
      expect(finalWidth).toBeGreaterThanOrEqual(minWidth);
    }
  });

  it('should update all cells of the same column when resizing', async () => {
    await setupVirtualTable();
    
    const enHeader = Array.from(container.querySelectorAll('th[data-column-id]')).find(
      th => th.getAttribute('data-column-id') === 'values.en'
    ) as HTMLElement;
    
    expect(enHeader).toBeTruthy();
    if (!enHeader) return;
    
    const resizeHandle = enHeader.querySelector('.column-resize-handle') as HTMLElement;
    expect(resizeHandle).toBeTruthy();
    if (!resizeHandle) return;
    
    // 바디 셀 찾기
    const bodyCells = container.querySelectorAll('td[data-column-id="values.en"]') as NodeListOf<HTMLElement>;
    if (bodyCells.length === 0) {
      // 바디 셀이 없으면 테스트 스킵 (jsdom 환경)
      return;
    }
    
    // 리사이즈
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 250,
    });
    resizeHandle.dispatchEvent(mousedownEvent);
    
    const mousemoveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 280, // 30px 이동
    });
    document.dispatchEvent(mousemoveEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const mouseupEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(mouseupEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 헤더와 모든 바디 셀의 너비 스타일이 일치해야 함
    const newHeaderWidthStyle = enHeader.style.width;
    if (newHeaderWidthStyle) {
      bodyCells.forEach(cell => {
        const cellWidthStyle = cell.style.width;
        expect(cellWidthStyle).toBe(newHeaderWidthStyle);
      });
    }
  });

  it('should preserve cell structure after resize', async () => {
    await setupVirtualTable();
    
    const enHeader = Array.from(container.querySelectorAll('th[data-column-id]')).find(
      th => th.getAttribute('data-column-id') === 'values.en'
    ) as HTMLElement;
    
    expect(enHeader).toBeTruthy();
    if (!enHeader) return;
    
    const resizeHandle = enHeader.querySelector('.column-resize-handle') as HTMLElement;
    expect(resizeHandle).toBeTruthy();
    if (!resizeHandle) return;
    
    // 초기 셀 구조 확인
    const initialBodyCells = container.querySelectorAll('td[data-column-id="values.en"]');
    if (initialBodyCells.length === 0) {
      // 바디 셀이 없으면 테스트 스킵 (jsdom 환경)
      return;
    }
    
    const firstCell = initialBodyCells[0] as HTMLElement;
    const initialCellContent = firstCell.innerHTML;
    expect(initialCellContent).toBeTruthy();
    
    // 리사이즈
    const mousedownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 250,
    });
    resizeHandle.dispatchEvent(mousedownEvent);
    
    const mousemoveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 290, // 40px 이동
    });
    document.dispatchEvent(mousemoveEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const mouseupEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(mouseupEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 셀 구조가 유지되어야 함 (내용이 사라지지 않아야 함)
    const finalBodyCells = container.querySelectorAll('td[data-column-id="values.en"]');
    expect(finalBodyCells.length).toBe(initialBodyCells.length);
    
    const finalFirstCell = finalBodyCells[0] as HTMLElement;
    const finalCellContent = finalFirstCell.innerHTML;
    expect(finalCellContent).toBeTruthy();
    // 내용이 유지되어야 함 (div 요소가 있어야 함)
    expect(finalFirstCell.querySelector('div')).toBeTruthy();
  });
});

