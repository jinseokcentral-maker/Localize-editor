import { beforeEach, afterEach } from "vitest";
import { VirtualTable } from "@/components/virtual-table";

/**
 * VirtualTable 테스트 헬퍼
 * 
 * beforeEach/afterEach를 공유하는 테스트 헬퍼 함수
 */
export function setupVirtualTableTest() {
  let container: HTMLElement;
  let table: VirtualTable;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    container.style.position = "relative";
    // overflow: hidden을 제거하여 스크롤 가능하게 함
    document.body.appendChild(container);
    
    // 컨테이너가 DOM에 추가된 후 크기가 측정되도록 강제
    // offsetWidth/offsetHeight를 읽으면 레이아웃이 계산됨
    container.offsetWidth;
    container.offsetHeight;
  });

  afterEach(() => {
    if (table) {
      table.destroy();
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  return {
    getContainer: () => container,
    getTable: () => table,
    setTable: (newTable: VirtualTable) => {
      table = newTable;
    },
  };
}

