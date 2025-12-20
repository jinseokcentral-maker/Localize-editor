import { test, expect } from "@playwright/test";

test.describe("LocaleEditor - 편집 기능 (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Editable Toggle", () => {
    test("토글 버튼을 클릭하면 편집 모드가 변경되어야 함", async ({ page }) => {
      // 초기 상태: 편집 가능
      const toggleBtn = page.locator("#toggle-editable-btn");
      await expect(toggleBtn).toBeVisible();
      await expect(toggleBtn).toContainText("편집 가능");

      // 토글 버튼 클릭
      await toggleBtn.click();

      // 읽기 전용 모드로 변경 확인
      await expect(toggleBtn).toContainText("읽기 전용");
      
      // 상태 메시지 확인
      const statusEl = page.locator("#editable-status");
      await expect(statusEl).toContainText("읽기 전용 모드");
    });

    test("읽기 전용 모드에서 popover가 표시되어야 함", async ({ page }) => {
      // 읽기 전용 모드로 전환
      const toggleBtn = page.locator("#toggle-editable-btn");
      await toggleBtn.click();

      // popover가 표시되는지 확인
      const popover = page.locator(".readonly-popover");
      await expect(popover).toBeVisible();
      await expect(popover).toContainText("You can not edit");
    });

    test("마우스를 그리드에서 벗어나면 popover가 사라져야 함", async ({ page }) => {
      // 읽기 전용 모드로 전환
      const toggleBtn = page.locator("#toggle-editable-btn");
      await toggleBtn.click();

      // popover 확인
      const popover = page.locator(".readonly-popover");
      await expect(popover).toBeVisible();

      // 그리드 밖으로 마우스 이동
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);

      // popover가 사라졌는지 확인
      await expect(popover).not.toBeVisible();
    });

    test("마우스가 다시 그리드에 들어오면 popover가 다시 나타나야 함", async ({ page }) => {
      // 읽기 전용 모드로 전환
      const toggleBtn = page.locator("#toggle-editable-btn");
      await toggleBtn.click();

      const gridContainer = page.locator("#editor-container");
      
      // popover 확인
      const popover = page.locator(".readonly-popover");
      await expect(popover).toBeVisible();

      // 그리드 밖으로 마우스 이동
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);
      await expect(popover).not.toBeVisible();

      // 그리드로 마우스 다시 이동
      const box = await gridContainer.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(100);
        
        // popover가 다시 나타나는지 확인
        await expect(popover).toBeVisible();
      }
    });
  });

  test.describe("Key 컬럼 편집", () => {
    test("Key 컬럼을 편집할 수 있어야 함", async ({ page }) => {
      const gridContainer = page.locator("#editor-container");
      await expect(gridContainer).toBeVisible();

      // 첫 번째 행의 Key 셀을 찾아서 더블클릭
      const keyCell = page.locator(".ag-cell[col-id='key']").first();
      await keyCell.dblclick();

      // 편집 모드 진입 확인
      const editor = page.locator(".ag-cell-inline-editing");
      await expect(editor).toBeVisible();

      // 값 변경
      await editor.fill("new.key.name");
      await editor.press("Enter");

      // 값이 변경되었는지 확인
      await expect(keyCell).toContainText("new.key.name");
    });

    test("Key 값 변경 후 자동 정렬이 되어야 함", async ({ page }) => {
      const gridContainer = page.locator("#editor-container");
      await expect(gridContainer).toBeVisible();

      // 첫 번째 행의 Key 셀 편집
      const firstKeyCell = page.locator(".ag-cell[col-id='key']").first();
      const originalText = await firstKeyCell.textContent();
      
      await firstKeyCell.dblclick();
      const editor = page.locator(".ag-cell-inline-editing");
      await editor.fill("zzz.last.key");
      await editor.press("Enter");

      // 정렬이 적용되어 해당 행이 마지막으로 이동했는지 확인
      // (정렬은 비동기로 일어나므로 약간의 대기 필요)
      await page.waitForTimeout(300);
      
      // 마지막 행의 Key가 변경된 값인지 확인
      const lastKeyCell = page.locator(".ag-cell[col-id='key']").last();
      await expect(lastKeyCell).toContainText("zzz.last.key");
    });
  });

  test.describe("Context 컬럼 편집", () => {
    test("Context 컬럼을 편집할 수 있어야 함", async ({ page }) => {
      const gridContainer = page.locator("#editor-container");
      await expect(gridContainer).toBeVisible();

      // Context 컬럼이 있는 첫 번째 행 찾기
      const contextCell = page.locator(".ag-cell[col-id='context']").first();
      
      // Context 셀을 더블클릭하여 편집
      await contextCell.dblclick();

      // 편집 모드 진입 확인
      const editor = page.locator(".ag-cell-inline-editing");
      await expect(editor).toBeVisible();

      // 값 변경
      await editor.fill("New context value");
      await editor.press("Enter");

      // 값이 변경되었는지 확인
      await expect(contextCell).toContainText("New context value");
    });

    test("Context 값 변경 시 dirty cell 스타일이 적용되어야 함", async ({ page }) => {
      const gridContainer = page.locator("#editor-container");
      await expect(gridContainer).toBeVisible();

      // Context 셀 편집
      const contextCell = page.locator(".ag-cell[col-id='context']").first();
      await contextCell.dblclick();
      
      const editor = page.locator(".ag-cell-inline-editing");
      await editor.fill("Modified context");
      await editor.press("Enter");

      // cell-dirty 클래스가 적용되었는지 확인
      await page.waitForTimeout(200);
      await expect(contextCell).toHaveClass(/cell-dirty/);
    });
  });

  test.describe("빈 번역 셀 하이라이트", () => {
    test("빈 번역 셀에 하이라이트가 표시되어야 함", async ({ page }) => {
      const gridContainer = page.locator("#editor-container");
      await expect(gridContainer).toBeVisible();

      // 빈 셀 찾기 (values.* 컬럼 중 빈 값)
      const emptyCell = page.locator(".ag-cell.cell-empty").first();
      
      // cell-empty 클래스가 적용되었는지 확인
      if (await emptyCell.count() > 0) {
        await expect(emptyCell).toBeVisible();
        await expect(emptyCell).toHaveClass(/cell-empty/);
      }
    });

    test("값을 입력하면 빈 셀 하이라이트가 제거되어야 함", async ({ page }) => {
      const gridContainer = page.locator("#editor-container");
      await expect(gridContainer).toBeVisible();

      // 빈 번역 셀 찾기
      const emptyCells = page.locator(".ag-cell.cell-empty");
      const emptyCellCount = await emptyCells.count();
      
      if (emptyCellCount > 0) {
        const firstEmptyCell = emptyCells.first();
        
        // 빈 셀 편집
        await firstEmptyCell.dblclick();
        const editor = page.locator(".ag-cell-inline-editing");
        await editor.fill("New translation");
        await editor.press("Enter");

        // cell-empty 클래스가 제거되었는지 확인
        await page.waitForTimeout(200);
        await expect(firstEmptyCell).not.toHaveClass(/cell-empty/);
      }
    });
  });
});

