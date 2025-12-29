/**
 * 다중 셀 선택 E2E 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("Multi-cell Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
  });

  test.describe("단일 클릭 선택", () => {
    test("셀 클릭 시 선택되어야 함", async ({ page }) => {
      const cell = page.locator(".virtual-grid-cell").first();
      await cell.click();
      await page.waitForTimeout(100);

      // 선택된 셀에 cell-selected 클래스가 추가되어야 함
      await expect(cell).toHaveClass(/cell-selected/);
    });

    test("다른 셀 클릭 시 기존 선택이 해제되어야 함", async ({ page }) => {
      const cells = page.locator(".virtual-grid-cell");
      const firstCell = cells.nth(1); // key 컬럼
      const secondCell = cells.nth(2); // context 컬럼

      await firstCell.click();
      await page.waitForTimeout(100);
      await expect(firstCell).toHaveClass(/cell-selected/);

      await secondCell.click();
      await page.waitForTimeout(100);
      await expect(secondCell).toHaveClass(/cell-selected/);
      await expect(firstCell).not.toHaveClass(/cell-selected/);
    });
  });

  test.describe("Ctrl/Cmd+Click 다중 선택", () => {
    test("Ctrl+Click으로 여러 셀을 선택할 수 있어야 함", async ({ page }) => {
      // 언어 컬럼 셀 사용 (sticky가 아닌 셀)
      const firstCell = page
        .locator(
          '.virtual-grid-cell[data-row-index="0"][data-column-id^="values."]',
        )
        .first();
      const secondCell = page
        .locator(
          '.virtual-grid-cell[data-row-index="1"][data-column-id^="values."]',
        )
        .first();

      await firstCell.click();
      await page.waitForTimeout(100);

      // ControlOrMeta: macOS에서는 Cmd, 그 외에서는 Ctrl
      await secondCell.click({ modifiers: ["ControlOrMeta"] });
      await page.waitForTimeout(100);

      await expect(firstCell).toHaveClass(/cell-selected/);
      await expect(secondCell).toHaveClass(/cell-selected/);
    });

    test("Ctrl+Click으로 선택된 셀을 해제할 수 있어야 함", async ({ page }) => {
      const firstCell = page
        .locator(
          '.virtual-grid-cell[data-row-index="0"][data-column-id^="values."]',
        )
        .first();
      const secondCell = page
        .locator(
          '.virtual-grid-cell[data-row-index="1"][data-column-id^="values."]',
        )
        .first();

      await firstCell.click();
      await secondCell.click({ modifiers: ["ControlOrMeta"] });
      await page.waitForTimeout(100);

      // Ctrl+Click으로 첫 번째 셀 해제
      await firstCell.click({ modifiers: ["ControlOrMeta"] });
      await page.waitForTimeout(100);

      await expect(firstCell).not.toHaveClass(/cell-selected/);
      await expect(secondCell).toHaveClass(/cell-selected/);
    });
  });

  test.describe("Shift+Click 범위 선택", () => {
    test("Shift+Click으로 범위를 선택할 수 있어야 함", async ({ page }) => {
      // 첫 번째 행의 key 셀 클릭
      const firstRowKey = page.locator(
        '.virtual-grid-cell[data-row-index="0"][data-column-id="key"]',
      );
      await firstRowKey.click();
      await page.waitForTimeout(100);

      // 세 번째 행의 context 셀을 Shift+Click
      const thirdRowContext = page.locator(
        '.virtual-grid-cell[data-row-index="2"][data-column-id="context"]',
      );
      await thirdRowContext.click({ modifiers: ["Shift"] });
      await page.waitForTimeout(100);

      // 범위 내의 모든 셀이 선택되어야 함
      for (let row = 0; row <= 2; row++) {
        for (const col of ["key", "context"]) {
          const cell = page.locator(
            `.virtual-grid-cell[data-row-index="${row}"][data-column-id="${col}"]`,
          );
          await expect(cell).toHaveClass(/cell-selected/);
        }
      }
    });
  });

  test.describe("Shift+Arrow 범위 확장", () => {
    test("Shift+ArrowDown으로 선택을 확장할 수 있어야 함", async ({ page }) => {
      // 첫 번째 행의 key 셀 클릭
      const firstRowKey = page.locator(
        '.virtual-grid-cell[data-row-index="0"][data-column-id="key"]',
      );
      await firstRowKey.click();
      await page.waitForTimeout(100);

      // Shift+ArrowDown으로 확장
      await page.keyboard.press("Shift+ArrowDown");
      await page.waitForTimeout(100);

      // 두 행이 선택되어야 함
      const row0Key = page.locator(
        '.virtual-grid-cell[data-row-index="0"][data-column-id="key"]',
      );
      const row1Key = page.locator(
        '.virtual-grid-cell[data-row-index="1"][data-column-id="key"]',
      );

      await expect(row0Key).toHaveClass(/cell-selected/);
      await expect(row1Key).toHaveClass(/cell-selected/);
    });

    test("Shift+ArrowRight으로 선택을 확장할 수 있어야 함", async ({
      page,
    }) => {
      // 첫 번째 행의 key 셀 클릭
      const firstRowKey = page.locator(
        '.virtual-grid-cell[data-row-index="0"][data-column-id="key"]',
      );
      await firstRowKey.click();
      await page.waitForTimeout(100);

      // Shift+ArrowRight으로 확장
      await page.keyboard.press("Shift+ArrowRight");
      await page.waitForTimeout(100);

      // 두 컬럼이 선택되어야 함
      const keyCell = page.locator(
        '.virtual-grid-cell[data-row-index="0"][data-column-id="key"]',
      );
      const contextCell = page.locator(
        '.virtual-grid-cell[data-row-index="0"][data-column-id="context"]',
      );

      await expect(keyCell).toHaveClass(/cell-selected/);
      await expect(contextCell).toHaveClass(/cell-selected/);
    });
  });

  test.describe("선택 스타일", () => {
    test("선택된 셀에 cell-selected 클래스가 추가되어야 함", async ({
      page,
    }) => {
      // 언어 컬럼 셀 사용 (sticky가 아닌 셀로 테스트)
      const cell = page
        .locator(
          '.virtual-grid-cell[data-row-index="0"][data-column-id^="values."]',
        )
        .first();
      await cell.click();
      await page.waitForTimeout(100);

      // cell-selected 클래스가 추가되어야 함
      await expect(cell).toHaveClass(/cell-selected/);

      // outline이 적용되어야 함 (선택 표시)
      const outline = await cell.evaluate((el) => {
        return window.getComputedStyle(el).outline;
      });
      expect(outline).toContain("solid");
    });
  });
});
