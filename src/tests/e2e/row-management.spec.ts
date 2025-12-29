/**
 * Row Management E2E 테스트
 *
 * 새 행 추가, 삭제 관련 E2E 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("Row Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });
  });

  test.describe("Add Row Placeholder", () => {
    test("새 행 추가 placeholder가 표시되어야 함", async ({ page }) => {
      const placeholder = page.locator(".add-row-placeholder");
      await expect(placeholder).toBeVisible({ timeout: 2000 });
    });

    test("placeholder에 올바른 텍스트가 표시되어야 함", async ({ page }) => {
      const placeholder = page.locator(".add-row-placeholder");
      const text = await placeholder.textContent();
      expect(text).toContain("Click to add new translation key");
      expect(text).toContain("Ctrl+N");
    });
  });

  test.describe("Command Palette - Add Commands", () => {
    test(":add-above 명령이 표시되어야 함", async ({ page }) => {
      // 먼저 셀에 포커스
      const firstCell = page
        .locator('.virtual-grid-cell[data-column-id="key"]')
        .first();
      await firstCell.click();
      await page.waitForTimeout(100);

      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";

      // 커맨드 팔레트 열기
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForTimeout(100);

      // "add above" 검색
      const input = page.locator(".command-palette-input");
      await input.fill("add above");
      await page.waitForTimeout(200);

      // "Add Row Above" 명령 선택
      const addAboveCommand = page
        .locator(".command-palette-item")
        .filter({ hasText: /Add Row Above/i })
        .first();
      await expect(addAboveCommand).toBeVisible({ timeout: 2000 });
    });

    test(":add-below 명령이 표시되어야 함", async ({ page }) => {
      // 먼저 셀에 포커스
      const firstCell = page
        .locator('.virtual-grid-cell[data-column-id="key"]')
        .first();
      await firstCell.click();
      await page.waitForTimeout(100);

      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";

      // 커맨드 팔레트 열기
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForTimeout(100);

      // "add below" 검색
      const input = page.locator(".command-palette-input");
      await input.fill("add below");
      await page.waitForTimeout(200);

      // "Add Row Below" 명령 선택
      const addBelowCommand = page
        .locator(".command-palette-item")
        .filter({ hasText: /Add Row Below/i })
        .first();
      await expect(addBelowCommand).toBeVisible({ timeout: 2000 });
    });

    test(":delete 명령이 표시되어야 함", async ({ page }) => {
      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";

      // 커맨드 팔레트 열기
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForTimeout(100);

      // "delete" 검색
      const input = page.locator(".command-palette-input");
      await input.fill("delete");
      await page.waitForTimeout(200);

      // "Delete Current Row" 명령 선택
      const deleteCommand = page
        .locator(".command-palette-item")
        .filter({ hasText: /Delete Current Row/i })
        .first();
      await expect(deleteCommand).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe("Command Line", () => {
    test(":add above 명령으로 현재 행 위에 새 행 추가", async ({ page }) => {
      // 먼저 셀에 포커스
      const firstCell = page
        .locator('.virtual-grid-cell[data-column-id="key"]')
        .first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // : 키로 CommandLine 열기
      await page.keyboard.press("Shift+Semicolon");
      await page.waitForTimeout(100);

      // CommandLine이 열렸는지 확인
      const commandLine = page.locator(".command-line");
      await expect(commandLine).toBeVisible({ timeout: 1000 });

      // "add above" 입력
      await page.keyboard.type("add above");
      await page.waitForTimeout(100);

      // Enter로 실행
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);

      // 새 행이 추가되었는지 확인
      const newRow = page.locator(".virtual-grid-row.new-row");
      await expect(newRow).toBeVisible({ timeout: 2000 });
    });

    test(":add below 명령으로 현재 행 아래에 새 행 추가", async ({ page }) => {
      // 먼저 셀에 포커스
      const firstCell = page
        .locator('.virtual-grid-cell[data-column-id="key"]')
        .first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // : 키로 CommandLine 열기
      await page.keyboard.press("Shift+Semicolon");
      await page.waitForTimeout(100);

      // "add below" 입력
      await page.keyboard.type("add below");
      await page.waitForTimeout(100);

      // Enter로 실행
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);

      // 새 행이 추가되었는지 확인
      const newRow = page.locator(".virtual-grid-row.new-row");
      await expect(newRow).toBeVisible({ timeout: 2000 });
    });
  });
});
