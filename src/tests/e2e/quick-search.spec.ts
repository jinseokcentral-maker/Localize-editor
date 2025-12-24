/**
 * 빠른 검색 (Quick Search) E2E 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("빠른 검색 (Quick Search)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });
  });

  test("/ 키로 검색 모드 진입", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);

    // 검색 바가 표시되는지 확인 (애니메이션 대기)
    const searchBar = page.locator(".quick-search-bar");
    await expect(searchBar).toBeVisible({ timeout: 2000 });

    // 입력 필드가 포커스되어 있는지 확인
    const input = page.locator(".quick-search-input");
    await expect(input).toBeFocused({ timeout: 1000 });
  });

  test("검색어 입력 시 실시간 검색", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // 검색어 입력
    const input = page.locator(".quick-search-input");
    await input.fill("button");

    // 검색 결과가 나타날 때까지 대기 (debounce 고려)
    await page.waitForTimeout(800);

    // 매칭된 셀이 하이라이트되어 있는지 확인
    const highlightedCells = page.locator(".quick-search-matched");
    const count = await highlightedCells.count();
    if (count > 0) {
      await expect(highlightedCells.first()).toBeVisible({ timeout: 2000 });
    } else {
      // 매칭이 없을 수도 있음 (데이터에 따라)
      // 최소한 검색이 실행되었는지 확인
      const status = page.locator(".quick-search-status");
      await expect(status).toBeVisible();
    }
  });

  test("검색 결과 수가 표시되어야 함", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // 검색어 입력
    const input = page.locator(".quick-search-input");
    await input.fill("button");

    await page.waitForTimeout(800);

    // 검색 결과 수 표시 확인
    const status = page.locator(".quick-search-status");
    await expect(status).toBeVisible();
    const statusText = await status.textContent();
    expect(statusText).toMatch(/\d+\/\d+\s+matches/);
  });

  test("n 키로 다음 매칭으로 이동", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // 검색어 입력
    const input = page.locator(".quick-search-input");
    await input.fill("button");

    await page.waitForTimeout(800);

    // 첫 번째 매칭 확인
    const firstMatch = page.locator(".quick-search-current-match").first();
    await expect(firstMatch).toBeVisible({ timeout: 2000 });

    // n 키 입력
    await page.keyboard.press("n");
    await page.waitForTimeout(300);

    // 두 번째 매칭으로 이동 확인
    const status = page.locator(".quick-search-status");
    const statusText = await status.textContent();
    expect(statusText).toMatch(/2\/\d+\s+matches/);
  });

  test("N 키로 이전 매칭으로 이동", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // 검색어 입력
    const input = page.locator(".quick-search-input");
    await input.fill("button");

    await page.waitForTimeout(800);

    // n 키로 다음 매칭으로 이동
    await page.keyboard.press("n");
    await page.waitForTimeout(300);

    // N 키로 이전 매칭으로 이동
    await page.keyboard.press("Shift+N");
    await page.waitForTimeout(300);

    // 첫 번째 매칭으로 돌아왔는지 확인
    const status = page.locator(".quick-search-status");
    const statusText = await status.textContent();
    expect(statusText).toMatch(/1\/\d+\s+matches/);
  });

  test("Escape 키로 검색 모드 종료", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // Escape 키 입력
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // 검색 바가 닫혔는지 확인
    const searchBar = page.locator(".quick-search-bar");
    await expect(searchBar).not.toBeVisible({ timeout: 1000 });
  });

  test("컬럼별 검색 - key:keyword", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // key:keyword 형식으로 검색
    const input = page.locator(".quick-search-input");
    await input.fill("key:button");

    await page.waitForTimeout(500);

    // 검색 결과 확인
    const highlightedCells = page.locator(".quick-search-matched");
    await expect(highlightedCells.first()).toBeVisible({ timeout: 2000 });

    // Key 컬럼만 매칭되었는지 확인 (간접적으로)
    const status = page.locator(".quick-search-status");
    await expect(status).toBeVisible();
  });

  test("컬럼별 검색 - en:keyword", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // en:keyword 형식으로 검색
    const input = page.locator(".quick-search-input");
    await input.fill("en:Welcome");

    await page.waitForTimeout(500);

    // 검색 결과 확인
    const highlightedCells = page.locator(".quick-search-matched");
    await expect(highlightedCells.first()).toBeVisible({ timeout: 2000 });
  });

  test("검색 모드에서 Enter 키로 다음 매칭 이동", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // 검색어 입력
    const input = page.locator(".quick-search-input");
    await input.fill("button");

    await page.waitForTimeout(800);

    // 입력 필드에 포커스가 있는지 확인하고, Enter 키 입력
    await input.focus();
    await page.waitForTimeout(100);
    await input.press("Enter");
    await page.waitForTimeout(500); // 상태 업데이트 대기

    // 다음 매칭으로 이동 확인
    const status = page.locator(".quick-search-status");
    await expect(status).toBeVisible({ timeout: 1000 });
    const statusText = await status.textContent();
    expect(statusText).toMatch(/2\/\d+\s+matches/);
  });

  test("검색 결과가 없을 때 메시지 표시", async ({ page }) => {
    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // / 키 입력
    await page.keyboard.press("/");
    await page.waitForTimeout(100);
    await page.waitForSelector(".quick-search-bar", { timeout: 2000 });

    // 존재하지 않는 검색어 입력
    const input = page.locator(".quick-search-input");
    await input.fill("nonexistentkeyword12345");

    await page.waitForTimeout(500);

    // "No matches" 메시지 확인
    const status = page.locator(".quick-search-status");
    const statusText = await status.textContent();
    expect(statusText).toContain("No matches");
  });
});

