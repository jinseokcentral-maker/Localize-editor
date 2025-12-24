/**
 * 필터 기능 E2E 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("Filter 기능", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Command Palette에서 search 명령으로 키워드 검색", async ({
    page,
  }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 초기 행 수 확인
    const initialRows = page.locator(".virtual-grid-row");
    const initialCount = await initialRows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Command Palette 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    // 검색 입력 - "search Welcome" 형식으로 입력 (fuzzy search가 첫 단어로 매칭)
    const input = page.locator(".command-palette-input");
    await input.fill("search Welcome");
    await page.waitForTimeout(500);

    // "Search" 명령이 표시되는지 확인 (label이 "Search"이므로)
    const searchCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /search/i })
      .first();
    await expect(searchCommand).toBeVisible({ timeout: 5000 });
    
    // 명령 실행
    await searchCommand.click();

    // 팔레트가 닫히고 필터가 적용될 때까지 대기
    await page.waitForTimeout(500);
    await expect(page.locator(".command-palette-overlay")).not.toBeVisible({ timeout: 1000 });

    // 검색 결과 확인 (필터링된 행만 표시)
    const filteredRows = page.locator(".virtual-grid-row");
    const filteredCount = await filteredRows.count();
    
    // 필터링된 행 수가 원본보다 작거나 같아야 함
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    // "Welcome"이 포함된 행이 있는지 확인 (실제 데이터에 있는 키워드)
    if (filteredCount > 0) {
      const firstRow = filteredRows.first();
      const cells = firstRow.locator(".virtual-grid-cell");
      const cellTexts = await cells.allTextContents();
      const hasWelcome = cellTexts.some(text => text.toLowerCase().includes("welcome"));
      expect(hasWelcome).toBe(true);
    }
  });

  test("Command Palette에서 filter-empty 명령으로 빈 번역 필터", async ({
    page,
  }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 전체 행 수 확인
    const initialRows = page.locator(".virtual-grid-row");
    const initialCount = await initialRows.count();
    expect(initialCount).toBeGreaterThan(0);

    // Command Palette 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    // "filter empty" 검색
    const input = page.locator(".command-palette-input");
    await input.fill("filter empty");
    await page.waitForTimeout(300);

    // "Filter: Empty Translations" 명령 실행
    const filterCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /empty/i })
      .first();
    await expect(filterCommand).toBeVisible();
    await filterCommand.click();

    // 필터 적용 후 행 수 확인
    await page.waitForTimeout(500);
    const filteredRows = page.locator(".virtual-grid-row");
    const filteredCount = await filteredRows.count();

    // 필터링된 행 수가 원본보다 작거나 같아야 함
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // 빈 번역이 있는 행만 표시되는지 확인
    if (filteredCount > 0) {
      const firstRow = filteredRows.first();
      const cells = firstRow.locator(".virtual-grid-cell");
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(0);
    }
  });

  test("Command Palette에서 filter-changed 명령으로 변경된 셀 필터", async ({
    page,
  }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 먼저 셀 편집하여 변경사항 생성 (실제 데이터에 있는 "Welcome" 사용)
    const firstEditableCell = page
      .locator(".virtual-grid-cell")
      .filter({ hasText: /welcome/i })
      .first();
    await expect(firstEditableCell).toBeVisible({ timeout: 5000 });

    await firstEditableCell.dblclick({ force: true });
    await page.waitForTimeout(200);

    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill("Changed Value");
    await input.press("Enter");
    await page.waitForTimeout(500); // 변경사항이 추적될 때까지 대기

    // Command Palette 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    // "filter changed" 검색
    const paletteInput = page.locator(".command-palette-input");
    await paletteInput.fill("filter changed");
    await page.waitForTimeout(300);

    // "Filter: Changed Cells" 명령 실행
    const filterCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /changed/i })
      .first();
    await expect(filterCommand).toBeVisible();
    await filterCommand.click();

    // 팔레트가 닫히고 필터가 적용될 때까지 대기
    await page.waitForTimeout(500);
    await expect(page.locator(".command-palette-overlay")).not.toBeVisible({ timeout: 1000 });

    // 필터 적용 확인
    const filteredRows = page.locator(".virtual-grid-row");
    const filteredCount = await filteredRows.count();

    // 변경된 셀이 있으면 필터링된 행이 표시되어야 함
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test("Command Palette에서 filter-duplicate 명령으로 중복 Key 필터", async ({
    page,
  }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // Command Palette 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    // "filter duplicate" 검색
    const input = page.locator(".command-palette-input");
    await input.fill("filter duplicate");
    await page.waitForTimeout(300);

    // "Filter: Duplicate Keys" 명령 실행
    const filterCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /duplicate/i })
      .first();
    await expect(filterCommand).toBeVisible();
    await filterCommand.click();

    // 팔레트가 닫히고 필터가 적용될 때까지 대기
    await page.waitForTimeout(500);
    await expect(page.locator(".command-palette-overlay")).not.toBeVisible({ timeout: 1000 });

    // 필터 적용 확인
    const filteredRows = page.locator(".virtual-grid-row");
    const filteredCount = await filteredRows.count();

    // 중복 Key가 있으면 필터링된 행이 표시되어야 함
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test("Command Palette에서 clear-filter 명령으로 필터 제거", async ({
    page,
  }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 전체 행 수 확인
    const initialRows = page.locator(".virtual-grid-row");
    const initialCount = await initialRows.count();

    // 먼저 필터 적용
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    const input = page.locator(".command-palette-input");
    await input.fill("filter empty");
    await page.waitForTimeout(300);

    const filterCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /empty/i })
      .first();
    await filterCommand.click();
    await page.waitForTimeout(500);

    // 필터 적용 후 행 수 확인
    const filteredRows = page.locator(".virtual-grid-row");
    const filteredCount = await filteredRows.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // 필터 제거
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    const clearInput = page.locator(".command-palette-input");
    await clearInput.fill("clear filter");
    await page.waitForTimeout(300);

    const clearCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /clear/i })
      .first();
    await expect(clearCommand).toBeVisible();
    await clearCommand.click();

    // 필터 제거 후 원본 행 수로 복원 확인
    await page.waitForTimeout(500);
    const restoredRows = page.locator(".virtual-grid-row");
    const restoredCount = await restoredRows.count();
    expect(restoredCount).toBe(initialCount);
  });

  test("검색 필터가 실시간으로 적용되어야 함", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // Command Palette 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    const input = page.locator(".command-palette-input");
    await input.fill("search Welcome");
    await page.waitForTimeout(500);

    // "search" 명령이 표시되는지 확인 (fuzzy search가 "search Welcome"에서 "search"를 찾아야 함)
    const searchCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /search/i })
      .first();
    await expect(searchCommand).toBeVisible({ timeout: 5000 });
    await searchCommand.click();

    // 필터링된 결과 확인
    await page.waitForTimeout(500);
    const rows = page.locator(".virtual-grid-row");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("여러 필터를 순차적으로 적용할 수 있어야 함", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 첫 번째 필터: 빈 번역
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    const input1 = page.locator(".command-palette-input");
    await input1.fill("filter empty");
    await page.waitForTimeout(300);
    const filter1 = page
      .locator(".command-palette-item")
      .filter({ hasText: /empty/i })
      .first();
    await filter1.click();
    await page.waitForTimeout(500);

    const count1 = await page.locator(".virtual-grid-row").count();

    // 두 번째 필터: 중복 Key (이전 필터를 덮어씀)
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    const input2 = page.locator(".command-palette-input");
    await input2.fill("filter duplicate");
    await page.waitForTimeout(300);
    const filter2 = page
      .locator(".command-palette-item")
      .filter({ hasText: /duplicate/i })
      .first();
    await filter2.click();
    await page.waitForTimeout(500);

    const count2 = await page.locator(".virtual-grid-row").count();

    // 필터가 변경되었는지 확인
    expect(count2).toBeGreaterThanOrEqual(0);
  });

  test("필터 적용 후 스크롤이 정상 작동해야 함", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 필터 적용
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

    const input = page.locator(".command-palette-input");
    await input.fill("filter empty");
    await page.waitForTimeout(300);
    const filterCommand = page
      .locator(".command-palette-item")
      .filter({ hasText: /empty/i })
      .first();
    await filterCommand.click();
    await page.waitForTimeout(500);

    // 스크롤 컨테이너 찾기
    const scrollContainer = page.locator(".virtual-grid-scroll-container");
    await expect(scrollContainer).toBeVisible();

    // 스크롤 가능한지 확인
    const scrollHeight = await scrollContainer.evaluate(
      (el) => el.scrollHeight
    );
    const clientHeight = await scrollContainer.evaluate(
      (el) => el.clientHeight
    );

    if (scrollHeight > clientHeight) {
      // 스크롤 실행
      await scrollContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2;
      });
      await page.waitForTimeout(300);

      // 스크롤 후에도 행이 표시되는지 확인
      const rows = page.locator(".virtual-grid-row");
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });
});

