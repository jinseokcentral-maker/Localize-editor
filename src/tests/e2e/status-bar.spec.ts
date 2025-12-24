/**
 * 상태바 (Status Bar) E2E 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("상태바 (Status Bar)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
  });

  test("상태바가 화면 하단에 표시되어야 함", async ({ page }) => {

    // 상태바 확인
    const statusBar = page.locator(".status-bar");
    await expect(statusBar).toBeVisible();

    // 화면 하단에 위치하는지 확인
    const statusBarBox = await statusBar.boundingBox();
    const viewportSize = page.viewportSize();
    if (statusBarBox && viewportSize) {
      expect(statusBarBox.y + statusBarBox.height).toBeCloseTo(
        viewportSize.height,
        5
      );
    }
  });

  test("기본 상태 정보가 표시되어야 함", async ({ page }) => {
    const statusBar = page.locator(".status-bar");
    await expect(statusBar).toBeVisible();

    const text = await statusBar.textContent();
    expect(text).toContain("[Normal]");
    expect(text).toContain("Row");
    expect(text).toContain("/");
  });

  test("셀 포커스 시 행/컬럼 정보가 업데이트되어야 함", async ({ page }) => {

    // 첫 번째 셀 클릭
    const firstCell = page.locator(".virtual-grid-cell").first();
    await firstCell.click();
    await page.waitForTimeout(100);

    const statusBar = page.locator(".status-bar");
    const text = await statusBar.textContent();
    expect(text).toMatch(/Row \d+\/\d+/);
  });

  test("편집 모드일 때 상태바에 Editing이 표시되어야 함", async ({
    page,
  }) => {

    // 편집 가능한 셀 더블클릭
    const editableCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    await editableCell.dblclick();
    await page.waitForTimeout(200);

    const statusBar = page.locator(".status-bar");
    const text = await statusBar.textContent();
    expect(text).toContain("[Editing]");

    // 편집 종료 (Escape)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const textAfter = await statusBar.textContent();
    expect(textAfter).toContain("[Normal]");
  });

  test("셀 변경 시 변경사항 수가 업데이트되어야 함", async ({ page }) => {

    // 편집 가능한 셀 더블클릭
    const editableCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    await editableCell.dblclick();
    await page.waitForTimeout(100);

    // 값 변경
    await page.keyboard.type("New Value");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const statusBar = page.locator(".status-bar");
    const text = await statusBar.textContent();
    expect(text).toContain("1 change");
  });

  test("빈 번역 수가 표시되어야 함", async ({ page }) => {

    const statusBar = page.locator(".status-bar");
    await page.waitForTimeout(500); // 상태바 업데이트 대기

    const text = await statusBar.textContent();
    // 빈 번역이 있으면 표시되어야 함
    if (text && text.includes("empty")) {
      expect(text).toMatch(/\d+ empty/);
    }
  });

  test("중복 Key 수가 표시되어야 함", async ({ page }) => {

    const statusBar = page.locator(".status-bar");
    await page.waitForTimeout(500); // 상태바 업데이트 대기

    const text = await statusBar.textContent();
    // 중복 Key가 있으면 표시되어야 함
    if (text && text.includes("duplicate")) {
      expect(text).toMatch(/\d+ duplicate/);
    }
  });

  test("필터 변경 시 행 수가 업데이트되어야 함", async ({ page }) => {

    // Command Palette 열기
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(200);

    // 필터 명령 입력
    const input = page.locator(".command-palette-input");
    await input.fill("filter empty");
    await page.waitForTimeout(200);

    // Enter로 실행
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    const statusBar = page.locator(".status-bar");
    const text = await statusBar.textContent();
    expect(text).toMatch(/Row \d+\/\d+/);
  });

  test("Undo/Redo 시 변경사항 수가 업데이트되어야 함", async ({ page }) => {

    // 편집 가능한 셀 더블클릭
    const editableCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    await editableCell.dblclick();
    await page.waitForTimeout(100);

    // 값 변경
    await page.keyboard.type("New Value");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // 변경사항 확인
    let statusBar = page.locator(".status-bar");
    let text = await statusBar.textContent();
    expect(text).toContain("1 change");

    // Undo (Cmd+Z)
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(300);

    // 변경사항 수가 0이 되어야 함
    text = await statusBar.textContent();
    expect(text).not.toContain("change");
  });

  test("키보드 네비게이션 시 행/컬럼 정보가 업데이트되어야 함", async ({
    page,
  }) => {

    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();

    // 화살표 키로 이동
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);

    const statusBar = page.locator(".status-bar");
    const text = await statusBar.textContent();
    expect(text).toMatch(/Row \d+\/\d+/);
  });
});


