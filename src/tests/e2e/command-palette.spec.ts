/**
 * Command Palette E2E 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("Command Palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Cmd/Ctrl+K로 팔레트 열기", async ({ page, browserName }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // Cmd/Ctrl+K 입력
    await page.keyboard.press(`${modifierKey}+KeyK`);

    // 팔레트가 열렸는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).toBeVisible({ timeout: 1000 });

    const input = page.locator(".command-palette-input");
    await expect(input).toBeVisible();
  });

  test("검색 입력 및 실시간 필터링", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 검색 입력
    const input = page.locator(".command-palette-input");
    await input.fill("goto");

    await page.waitForTimeout(200);

    // 검색 결과 확인
    const items = page.locator(".command-palette-item");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    // "go to" 또는 "goto" 관련 명령이 포함되어 있는지 확인
    const firstItem = items.first();
    const text = await firstItem.textContent();
    expect(text?.toLowerCase()).toMatch(/go\s*to|goto/);
  });

  test("키보드 네비게이션 (ArrowUp/Down)", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 아래로 이동
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(50);

    let selected = page.locator(".command-palette-item-selected");
    await expect(selected).toBeVisible();

    // 위로 이동
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(50);

    // 첫 번째 항목이 선택되어 있는지 확인
    selected = page.locator(".command-palette-item-selected");
    await expect(selected).toBeVisible();
  });

  test("Enter로 명령 실행", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "help" 검색 (인자 없이 실행 가능한 명령)
    const input = page.locator(".command-palette-input");
    await input.fill("help");
    await page.waitForTimeout(200);

    // Enter로 실행
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // 팔레트가 닫혔는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 2000 });
  });

  test("Escape로 팔레트 닫기", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // Escape로 닫기
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    // 팔레트가 닫혔는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("goto 명령 실행 및 행 이동 확인", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto 5" 입력
    const input = page.locator(".command-palette-input");
    await input.fill("goto 5");
    await page.waitForTimeout(200);

    // Enter로 실행
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // 5번째 행이 보이는지 확인 (행 번호는 1-based이므로 5번째 행)
    // role="row"를 사용하여 행만 선택
    const row5 = page.locator('[role="row"][data-row-index="4"]'); // 0-based index
    await expect(row5).toBeVisible({ timeout: 2000 });
  });

  test("검색어 없을 때 자주 사용하는 명령 표시", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 검색어 없이 명령 목록 확인
    const items = page.locator(".command-palette-item");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    // "No commands found" 메시지가 없는지 확인
    const emptyMessage = page.locator(".command-palette-item-empty");
    await expect(emptyMessage).not.toBeVisible();
  });

  test("부분 일치 검색", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 부분 일치 검색
    const input = page.locator(".command-palette-input");
    await input.fill("fil");
    await page.waitForTimeout(200);

    // "filter" 관련 명령이 표시되는지 확인
    const items = page.locator(".command-palette-item");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    const firstItemText = await items.first().textContent();
    expect(firstItemText?.toLowerCase()).toMatch(/filter|fil/);
  });

  test("대소문자 무시 검색", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 대문자로 검색
    const input = page.locator(".command-palette-input");
    await input.fill("GOTO");
    await page.waitForTimeout(200);

    // 결과가 있는지 확인
    const items = page.locator(".command-palette-item");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test("키보드만으로 모든 기능 접근", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 검색
    await page.keyboard.type("undo");
    await page.waitForTimeout(200);

    // 네비게이션
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(50);

    // 실행
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // 팔레트가 닫혔는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("오버레이 클릭 시 팔레트 닫기", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 오버레이 클릭
    const overlay = page.locator(".command-palette-overlay");
    await overlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);

    // 팔레트가 닫혔는지 확인
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("명령 클릭으로 실행", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // 첫 번째 명령 클릭
    const firstItem = page.locator(".command-palette-item").first();
    await firstItem.click();
    await page.waitForTimeout(200);

    // 팔레트가 닫혔는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("모든 브라우저에서 Cmd/Ctrl+K 작동", async ({ page, browserName }) => {
    // 브라우저별로 테스트
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    await page.keyboard.press(`${modifierKey}+KeyK`);
    await page.waitForTimeout(100);

    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).toBeVisible({ timeout: 1000 });
  });
});

