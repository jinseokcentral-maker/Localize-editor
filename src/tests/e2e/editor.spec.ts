import { test, expect } from "@playwright/test";

test.describe("LocaleEditor - AG Grid 통합 (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("그리드가 렌더링되어야 함", async ({ page }) => {
    // AG Grid 루트 요소 확인
    const gridRoot = page.locator(".ag-root-wrapper");
    await expect(gridRoot).toBeVisible();
  });

  test("행과 컬럼이 표시되어야 함", async ({ page }) => {
    // 헤더 확인
    const header = page.locator(".ag-header");
    await expect(header).toBeVisible();

    // Key 컬럼 헤더 확인
    const keyHeader = page.locator(".ag-header-cell").filter({
      hasText: "Key",
    });
    await expect(keyHeader).toBeVisible();
  });

  test("스크롤이 동작해야 함", async ({ page }) => {
    const gridContainer = page.locator(".ag-body-viewport");
    
    // 스크롤 가능한지 확인
    const scrollable = await gridContainer.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    if (scrollable) {
      // 스크롤 테스트
      await gridContainer.evaluate((el) => {
        el.scrollTop = 100;
      });

      const scrollTop = await gridContainer.evaluate((el) => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    }
  });

  test("스크롤 성능 테스트 - 부드러운 스크롤", async ({ page }) => {
    const gridContainer = page.locator(".ag-body-viewport");
    
    // 스크롤 가능한지 확인
    const scrollable = await gridContainer.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    if (scrollable) {
      // 연속적인 스크롤 동작을 테스트하여 성능 확인
      const scrollStartTime = Date.now();
      
      // 여러 번 스크롤하여 부드러움 확인
      for (let i = 0; i < 5; i++) {
        await gridContainer.evaluate((el, offset) => {
          el.scrollTop = offset;
        }, (i + 1) * 200);
        
        // 약간의 대기 시간 (렌더링 완료 대기)
        await page.waitForTimeout(50);
      }
      
      const scrollEndTime = Date.now();
      const scrollDuration = scrollEndTime - scrollStartTime;
      
      // 스크롤 동작이 500ms 이내에 완료되어야 함 (부드러운 스크롤)
      expect(scrollDuration).toBeLessThan(500);
    }
  });

  test("데이터가 표시되어야 함", async ({ page }) => {
    // 그리드 셀 확인 (데이터가 있으면)
    const cells = page.locator(".ag-cell");
    const cellCount = await cells.count();

    // 최소한 Key 컬럼은 있어야 함
    expect(cellCount).toBeGreaterThan(0);
  });
});


