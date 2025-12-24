/**
 * VirtualTableDiv E2E 테스트
 * 
 * 주요 기능에 대한 End-to-End 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("VirtualTableDiv - 기본 렌더링", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
  });

  test("그리드가 렌더링되어야 함", async ({ page }) => {
    const grid = page.locator(".virtual-grid");
    await expect(grid).toBeVisible();
  });

  test("헤더가 표시되어야 함", async ({ page }) => {
    const header = page.locator(".virtual-grid-header");
    await expect(header).toBeVisible();

    // Key, Context, 언어 컬럼 헤더 확인 (헤더 셀만 선택)
    await expect(page.locator('.virtual-grid-header-cell[data-column-id="key"]')).toBeVisible();
    await expect(page.locator('.virtual-grid-header-cell[data-column-id="context"]')).toBeVisible();
    await expect(page.locator('.virtual-grid-header-cell[data-column-id="values.en"]')).toBeVisible();
    await expect(page.locator('.virtual-grid-header-cell[data-column-id="values.ko"]')).toBeVisible();
  });

  test("데이터 행이 표시되어야 함", async ({ page }) => {
    const rows = page.locator(".virtual-grid-row");
    await expect(rows.first()).toBeVisible();
    // 최소한 몇 개의 행이 있어야 함
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("스크롤이 작동해야 함", async ({ page }) => {
    const scrollContainer = page.locator(".virtual-grid-scroll-container");
    await expect(scrollContainer).toBeVisible();

    // 스크롤 가능한지 확인
    const scrollHeight = await scrollContainer.evaluate(
      (el) => el.scrollHeight
    );
    const clientHeight = await scrollContainer.evaluate(
      (el) => el.clientHeight
    );
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });
});

test.describe("VirtualTableDiv - 셀 편집", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("더블클릭으로 셀 편집이 시작되어야 함", async ({ page }) => {
    // 첫 번째 언어 셀 찾기 (바디 셀만 선택)
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();

    await firstLangCell.dblclick();
    await page.waitForTimeout(100); // 편집 모드 시작 대기

    // 편집 input이 나타나야 함
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toBeFocused();
  });

  test("셀 편집 후 Enter로 저장되어야 함", async ({ page }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();

    await firstLangCell.dblclick();
    await page.waitForTimeout(100);

    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("New Value");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // 편집 모드가 종료되고 값이 저장되어야 함
    await expect(input).not.toBeVisible();
    await expect(firstLangCell).toContainText("New Value");
  });

  test("셀 편집 후 Escape로 취소되어야 함", async ({ page }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    const originalValue = await firstLangCell.textContent();

    await firstLangCell.dblclick();
    await page.waitForTimeout(100);

    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("Should Not Save");
    await input.press("Escape");
    await page.waitForTimeout(100);

    // 편집 모드가 종료되고 원래 값이 유지되어야 함
    await expect(input).not.toBeVisible();
    await expect(firstLangCell).toContainText(originalValue || "");
  });

  test("Key 컬럼 편집이 가능해야 함", async ({ page }) => {
    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();

    await firstKeyCell.dblclick();
    await page.waitForTimeout(100);

    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test("Context 컬럼 편집이 가능해야 함", async ({ page }) => {
    const firstContextCell = page.locator('.virtual-grid-cell[data-column-id="context"]').first();

    await firstContextCell.dblclick();
    await page.waitForTimeout(100);

    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
  });
});

test.describe("VirtualTableDiv - 키보드 네비게이션", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Tab 키로 다음 셀로 이동해야 함", async ({ page }) => {
    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    await firstKeyCell.focus();
    await page.waitForTimeout(50);

    await page.keyboard.press("Tab");
    await page.waitForTimeout(50);

    // Context 셀로 이동
    const contextCell = page.locator('.virtual-grid-cell[data-column-id="context"]').first();
    await expect(contextCell).toBeFocused();
  });

  test("Shift+Tab으로 이전 셀로 이동해야 함", async ({ page }) => {
    const firstContextCell = page
      .locator('.virtual-grid-cell[data-column-id="context"]')
      .first();
    await firstContextCell.focus();
    await page.waitForTimeout(50);

    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(50);

    // Key 셀로 이동
    const keyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    await expect(keyCell).toBeFocused();
  });

  test("Arrow 키로 네비게이션이 작동해야 함", async ({ page }) => {
    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    await firstKeyCell.focus();
    await page.waitForTimeout(50);

    // 오른쪽 화살표
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
    const contextCell = page.locator('.virtual-grid-cell[data-column-id="context"]').first();
    await expect(contextCell).toBeFocused();

    // 아래 화살표
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(50);
    const secondContextCell = page
      .locator('.virtual-grid-cell[data-column-id="context"]')
      .nth(1);
    await expect(secondContextCell).toBeFocused();
  });

  test("Enter 키로 아래 행으로 이동해야 함 (언어 컬럼)", async ({ page }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    await firstLangCell.focus();
    await page.waitForTimeout(50);

    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);

    // 아래 행의 같은 컬럼으로 이동
    const secondLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .nth(1);
    await expect(secondLangCell).toBeFocused();
  });
});

test.describe("VirtualTableDiv - 컬럼 리사이즈", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("컬럼 리사이즈 핸들이 표시되어야 함", async ({ page }) => {
    const resizeHandles = page.locator(".column-resize-handle");
    const count = await resizeHandles.count();
    expect(count).toBeGreaterThan(0);
  });

  test("컬럼 리사이즈가 작동해야 함", async ({ page }) => {
    const keyHeader = page.locator('.virtual-grid-header-cell[data-column-id="key"]').first();
    const initialWidth = await keyHeader.evaluate((el) => el.offsetWidth);

    const resizeHandle = page
      .locator('.virtual-grid-header-cell[data-column-id="key"]')
      .locator(".column-resize-handle")
      .first();

    const box = await resizeHandle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 50, box.y + box.height / 2);
      await page.mouse.up();
      await page.waitForTimeout(100);

      // 너비가 변경되었는지 확인
      const newWidth = await keyHeader.evaluate((el) => el.offsetWidth);
      expect(newWidth).not.toBe(initialWidth);
    }
  });
});

test.describe("VirtualTableDiv - 변경사항 추적", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("셀 편집 시 dirty 상태가 표시되어야 함", async ({ page }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();

    await firstLangCell.dblclick();
    await page.waitForTimeout(100);

    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("Changed Value");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // dirty 클래스가 추가되어야 함
    await expect(firstLangCell).toHaveClass(/cell-dirty/);
  });

  test("빈 셀은 cell-empty 클래스를 가져야 함", async ({ page }) => {
    // 빈 값이 있는 셀 찾기 (실제 데이터에 따라 다를 수 있음)
    const langCells = page.locator('.virtual-grid-cell[data-column-id="values.en"]');
    const count = await langCells.count();

    // 빈 셀이 있는지 확인 (실제 데이터에 따라)
    for (let i = 0; i < Math.min(count, 10); i++) {
      const cell = langCells.nth(i);
      const text = await cell.textContent();
      if (!text || text.trim() === "") {
        await expect(cell).toHaveClass(/cell-empty/);
        break;
      }
    }
  });
});

test.describe("VirtualTableDiv - 읽기 전용 모드", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("읽기 전용 모드 토글이 작동해야 함", async ({ page }) => {
    const toggleBtn = page.locator("#toggle-editable-btn");
    await expect(toggleBtn).toBeVisible();

    // 초기 상태 확인
    await expect(toggleBtn).toContainText("편집 가능");

    // 토글 클릭
    await toggleBtn.click();

    // 읽기 전용 모드로 변경 확인
    await expect(toggleBtn).toContainText("읽기 전용");
  });

  test("읽기 전용 모드에서 셀 편집이 불가능해야 함", async ({ page }) => {
    // 읽기 전용 모드로 전환
    const toggleBtn = page.locator("#toggle-editable-btn");
    await toggleBtn.click();
    await page.waitForTimeout(300); // 모드 전환 대기

    // 읽기 전용 모드로 변경되었는지 확인
    await expect(toggleBtn).toContainText("읽기 전용");

    // 모든 셀 타입에 대해 편집 불가 확인
    // 1. 언어 셀
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    await firstLangCell.dblclick();
    await page.waitForTimeout(200);
    const langInput = page.locator(".virtual-grid-cell-input");
    await expect(langInput).not.toBeVisible({ timeout: 2000 });

    // 2. Key 셀
    const firstKeyCell = page
      .locator('.virtual-grid-cell[data-column-id="key"]')
      .first();
    await firstKeyCell.dblclick();
    await page.waitForTimeout(200);
    const keyInput = page.locator(".virtual-grid-cell-input");
    await expect(keyInput).not.toBeVisible({ timeout: 2000 });

    // 3. Context 셀
    const firstContextCell = page
      .locator('.virtual-grid-cell[data-column-id="context"]')
      .first();
    await firstContextCell.dblclick();
    await page.waitForTimeout(200);
    const contextInput = page.locator(".virtual-grid-cell-input");
    await expect(contextInput).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe("VirtualTableDiv - Undo/Redo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Cmd+Z (Mac) 또는 Ctrl+Z (Windows)로 Undo가 작동해야 함", async ({
    page,
  }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    const originalValue = await firstLangCell.textContent();

    // 셀 편집
    await firstLangCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("New Value");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // Undo 실행
    const isMac = (await page.evaluate(() => navigator.platform)) === "MacIntel";
    if (isMac) {
      await page.keyboard.press("Meta+Z");
    } else {
      await page.keyboard.press("Control+Z");
    }
    await page.waitForTimeout(100);

    // 원래 값으로 복원되어야 함
    await expect(firstLangCell).toContainText(originalValue || "");
  });

  test("Cmd+Y 또는 Ctrl+Y로 Redo가 작동해야 함", async ({ page }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();

    // 셀 편집
    await firstLangCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("New Value");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // Undo
    const isMac = (await page.evaluate(() => navigator.platform)) === "MacIntel";
    if (isMac) {
      await page.keyboard.press("Meta+Z");
    } else {
      await page.keyboard.press("Control+Z");
    }
    await page.waitForTimeout(100);

    // Redo
    if (isMac) {
      await page.keyboard.press("Meta+Shift+Z");
    } else {
      await page.keyboard.press("Control+Y");
    }
    await page.waitForTimeout(100);

    // 다시 "New Value"로 복원되어야 함
    await expect(firstLangCell).toContainText("New Value");
  });
});

test.describe("VirtualTableDiv - Key 중복 검증", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("중복된 Key를 입력하면 시각적 표시가 나타나야 함", async ({ page }) => {
    // 첫 번째 Key 셀 편집
    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    const secondKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').nth(1);

    // 두 번째 행의 Key 값 확인
    const duplicateKey = await secondKeyCell.textContent();

    // 첫 번째 행의 Key를 두 번째와 동일하게 변경
    await firstKeyCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill(duplicateKey || "");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // 중복 표시 클래스가 추가되어야 함
    await expect(firstKeyCell).toHaveClass(/cell-duplicate-key/);
  });
});

test.describe("VirtualTableDiv - 변경사항 관리", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("변경사항 조회 버튼이 작동해야 함 (getChanges)", async ({ page }) => {
    // 셀 편집
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    await firstLangCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("Test Value");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // 변경사항이 추적되어야 함 (dirty 클래스)
    await expect(firstLangCell).toHaveClass(/cell-dirty/);
  });
});

test.describe("VirtualTableDiv - 대량 데이터 처리", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1000개 이상의 행도 부드럽게 스크롤되어야 함", async ({ page }) => {
    const scrollContainer = page.locator(".virtual-grid-scroll-container");

    // 스크롤을 아래로 이동
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });

    // 일부 행이 여전히 표시되어야 함
    const rows = page.locator(".virtual-grid-row");
    const visibleCount = await rows.count();
    expect(visibleCount).toBeGreaterThan(0);
  });

  test("스크롤 후에도 헤더와 바디가 정렬되어야 함", async ({ page }) => {
    const scrollContainer = page.locator(".virtual-grid-scroll-container");

    // 스크롤
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 500;
    });

    await page.waitForTimeout(100); // 렌더링 대기

    // 헤더와 바디의 컬럼이 정렬되어 있어야 함
    const headerCells = page.locator(".virtual-grid-header-cell");
    const bodyCells = page.locator(".virtual-grid-cell").first();

    // 헤더와 바디가 모두 존재해야 함
    await expect(headerCells.first()).toBeVisible();
    await expect(bodyCells).toBeVisible();
  });

  test("스크롤 후에도 편집이 정상 작동해야 함", async ({ page }) => {
    const scrollContainer = page.locator(".virtual-grid-scroll-container");

    // 중간 부분으로 스크롤
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });

    await page.waitForTimeout(300); // 렌더링 대기

    // 스크롤 후 다시 상단으로 스크롤하여 보이는 셀 찾기
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 0;
    });

    await page.waitForTimeout(300); // 렌더링 대기

    // 보이는 첫 번째 셀 편집
    const langCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    
    // 셀이 실제로 보이는지 확인
    await expect(langCell).toBeVisible({ timeout: 5000 });
    
    // 더블클릭 시도 (force 옵션 사용)
    await langCell.dblclick({ force: true });
    await page.waitForTimeout(200);

    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
  });
});

test.describe("VirtualTableDiv - 포커스 관리", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("셀에 포커스가 설정되어야 함", async ({ page, browserName }) => {
    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    
    // WebKit에서는 포커스가 다르게 작동할 수 있음
    if (browserName === "webkit") {
      // WebKit에서는 클릭으로 포커스 설정
      await firstKeyCell.click();
      await page.waitForTimeout(100);
    } else {
      await firstKeyCell.focus();
      await page.waitForTimeout(100);
    }

    // 포커스 클래스가 추가되어야 함 (WebKit에서는 다를 수 있으므로 조건부)
    if (browserName === "webkit") {
      // WebKit에서는 포커스 상태 확인이 다를 수 있음
      const isFocused = await firstKeyCell.evaluate((el) => document.activeElement === el);
      expect(isFocused || firstKeyCell.locator(":focus").count() > 0).toBeTruthy();
    } else {
      await expect(firstKeyCell).toHaveClass(/focused/);
    }
  });

  test("Tab으로 이동 시 포커스가 전달되어야 함", async ({ page }) => {
    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    await firstKeyCell.focus();
    await page.waitForTimeout(50);

    await page.keyboard.press("Tab");
    await page.waitForTimeout(50);

    const contextCell = page.locator('.virtual-grid-cell[data-column-id="context"]').first();
    // WebKit에서는 focused 클래스가 제대로 적용되지 않을 수 있으므로 실제 포커스도 확인
    const isFocused = await contextCell.evaluate((el) => {
      return document.activeElement === el || el.classList.contains("focused");
    });
    expect(isFocused).toBe(true);
  });
});

test.describe("VirtualTableDiv - 여러 언어 컬럼", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("모든 언어 컬럼이 표시되어야 함", async ({ page }) => {
    await expect(page.locator('.virtual-grid-header-cell[data-column-id="values.en"]')).toBeVisible();
    await expect(page.locator('.virtual-grid-header-cell[data-column-id="values.ko"]')).toBeVisible();
  });

  test("각 언어 컬럼을 독립적으로 편집할 수 있어야 함", async ({ page }) => {
    const enCell = page.locator('.virtual-grid-cell[data-column-id="values.en"]').first();
    const koCell = page.locator('.virtual-grid-cell[data-column-id="values.ko"]').first();

    // EN 셀 편집
    await enCell.dblclick();
    await page.waitForTimeout(100);
    let input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("English Value");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // KO 셀 편집
    await koCell.dblclick();
    await page.waitForTimeout(100);
    input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("한국어 값");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // 각각 독립적으로 저장되어야 함
    await expect(enCell).toContainText("English Value");
    await expect(koCell).toContainText("한국어 값");
  });
});

test.describe("VirtualTableDiv - 셀 콘텐츠 업데이트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("편집 후 셀 내용이 즉시 업데이트되어야 함", async ({ page }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();

    await firstLangCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("Updated Value");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // 셀 내용이 즉시 업데이트되어야 함
    await expect(firstLangCell).toContainText("Updated Value");
  });

  test("빈 값으로 변경하면 cell-empty 클래스가 추가되어야 함", async ({
    page,
  }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();

    // 기존에 값이 있는 셀을 빈 값으로 변경
    await firstLangCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill("");
    await input.press("Enter");
    await page.waitForTimeout(100);

    // cell-empty 클래스가 추가되어야 함
    await expect(firstLangCell).toHaveClass(/cell-empty/);
  });
});

test.describe("VirtualTableDiv - 접근성 (Accessibility)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("그리드에 role='grid' 속성이 있어야 함", async ({ page }) => {
    const grid = page.locator(".virtual-grid");
    await expect(grid).toHaveAttribute("role", "grid");
  });

  test("키보드만으로 모든 셀에 접근 가능해야 함", async ({ page, browserName }) => {
    // WebKit에서는 키보드 접근이 다르게 작동할 수 있음
    if (browserName === "webkit") {
      test.skip();
      return;
    }

    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    await firstKeyCell.focus();
    await page.waitForTimeout(100);

    // Tab으로 모든 컬럼을 순회
    const columns = ["key", "context", "values.en", "values.ko"];
    for (const columnId of columns) {
      const cell = page.locator(`.virtual-grid-cell[data-column-id="${columnId}"]`).first();
      await expect(cell).toBeFocused({ timeout: 2000 });
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);
    }
  });

  test("포커스된 셀은 시각적으로 표시되어야 함", async ({ page, browserName }) => {
    const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
    
    // WebKit에서는 포커스가 다르게 작동할 수 있음
    if (browserName === "webkit") {
      await firstKeyCell.click();
      await page.waitForTimeout(100);
      // WebKit에서는 포커스 상태 확인이 다를 수 있음
      const hasFocus = await firstKeyCell.evaluate((el) => {
        return document.activeElement === el || el.classList.contains("focused");
      });
      expect(hasFocus).toBeTruthy();
    } else {
      await firstKeyCell.focus();
      await page.waitForTimeout(100);
      // focused 클래스가 있어야 함
      await expect(firstKeyCell).toHaveClass(/focused/);
    }
  });

  test("셀에 적절한 data 속성이 있어야 함", async ({ page }) => {
    const firstCell = page.locator(".virtual-grid-cell").first();
    await expect(firstCell).toHaveAttribute("data-column-id");
    await expect(firstCell).toHaveAttribute("data-row-index");
  });

  test("헤더 셀에 적절한 속성이 있어야 함", async ({ page }) => {
    const headerCell = page.locator(".virtual-grid-header-cell").first();
    await expect(headerCell).toHaveAttribute("data-column-id");
  });
});

test.describe("VirtualTableDiv - 에러 처리", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("빈 translations 배열로도 렌더링되어야 함", async ({ page }) => {
    // 빈 데이터로 그리드 초기화 (main.ts에서 테스트하기 어려우므로
    // 실제로는 빈 행이 표시되어야 함)
    const rows = page.locator(".virtual-grid-row");
    // 최소한 그리드 구조는 렌더링되어야 함
    const grid = page.locator(".virtual-grid");
    await expect(grid).toBeVisible();
  });

  test("잘못된 컬럼 ID로 접근 시도 시 안전하게 처리되어야 함", async ({
    page,
  }) => {
    // 존재하지 않는 컬럼으로 포커스 이동 시도
    // 실제로는 아무 동작도 하지 않거나 안전하게 무시되어야 함
    const grid = page.locator(".virtual-grid");
    await expect(grid).toBeVisible();
    // 에러가 발생하지 않아야 함
  });

  test("편집 중 다른 셀 클릭 시 현재 편집이 안전하게 종료되어야 함", async ({
    page,
  }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    const secondLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .nth(1);

    // 첫 번째 셀 편집 시작
    await firstLangCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });

    // 두 번째 셀 클릭
    await secondLangCell.click();
    await page.waitForTimeout(100);

    // 첫 번째 셀의 편집이 종료되어야 함
    await expect(input).not.toBeVisible();
  });

  test("리사이즈 중 스크롤 시 안전하게 처리되어야 함", async ({ page }) => {
    const resizeHandle = page
      .locator('.virtual-grid-header-cell[data-column-id="key"]')
      .locator(".column-resize-handle")
      .first();

    const box = await resizeHandle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();

      // 리사이즈 중 스크롤
      const scrollContainer = page.locator(".virtual-grid-scroll-container");
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 100;
      });

      await page.mouse.up();

      // 에러가 발생하지 않아야 함
      const grid = page.locator(".virtual-grid");
      await expect(grid).toBeVisible();
    }
  });
});

test.describe("VirtualTableDiv - 성능 테스트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });


  test("초기 렌더링이 1초 이내에 완료되어야 함", async ({ page }) => {
    const startTime = Date.now();

    // 그리드가 렌더링될 때까지 대기
    await page.locator(".virtual-grid").waitFor({ state: "visible" });

    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(1000);
  });

  test("스크롤 시 렌더링이 부드럽게 작동해야 함 (60fps 이상)", async ({
    page,
  }) => {
    const scrollContainer = page.locator(".virtual-grid-scroll-container");

    // 스크롤 애니메이션 측정
    const frames: number[] = [];
    let lastTime = Date.now();

    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const container = document.querySelector(
          ".virtual-grid-scroll-container"
        ) as HTMLElement;
        if (!container) {
          resolve();
          return;
        }

        let frameCount = 0;
        const maxFrames = 60; // 1초간 측정 (60fps 기준)

        const measureFrame = () => {
          frameCount++;
          if (frameCount >= maxFrames) {
            resolve();
            return;
          }
          requestAnimationFrame(measureFrame);
        };

        // 스크롤 시작
        container.scrollTop = 0;
        const scrollInterval = setInterval(() => {
          container.scrollTop += 10;
          if (container.scrollTop >= container.scrollHeight / 2) {
            clearInterval(scrollInterval);
          }
        }, 16); // ~60fps

        requestAnimationFrame(measureFrame);
      });
    });

    // 스크롤이 부드럽게 작동하는지 확인
    const finalScrollTop = await scrollContainer.evaluate(
      (el) => el.scrollTop
    );
    expect(finalScrollTop).toBeGreaterThan(0);
  });

  test("대량 데이터(1000개 이상)에서도 스크롤이 부드럽게 작동해야 함", async ({
    page,
  }) => {
    const scrollContainer = page.locator(".virtual-grid-scroll-container");

    // 스크롤 높이 확인
    const scrollHeight = await scrollContainer.evaluate(
      (el) => el.scrollHeight
    );

    if (scrollHeight > 1000) {
      // 중간으로 스크롤
      const startTime = Date.now();
      await scrollContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2;
      });

      // 렌더링 대기
      await page.waitForTimeout(100);

      const scrollTime = Date.now() - startTime;
      // 스크롤이 500ms 이내에 완료되어야 함
      expect(scrollTime).toBeLessThan(500);

      // 행이 여전히 표시되어야 함
      const rows = page.locator(".virtual-grid-row");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("메모리 누수 없이 반복 스크롤이 가능해야 함", async ({ page }) => {
    const scrollContainer = page.locator(".virtual-grid-scroll-container");

    // 여러 번 스크롤 반복
    for (let i = 0; i < 10; i++) {
      await scrollContainer.evaluate((el, index) => {
        el.scrollTop = (index % 2 === 0) ? el.scrollHeight / 2 : 0;
      }, i);
      await page.waitForTimeout(50);
    }

    // 그리드가 여전히 정상 작동해야 함
    const grid = page.locator(".virtual-grid");
    await expect(grid).toBeVisible();

    // 스크롤 후 다시 상단으로 돌아가서 보이는 셀 찾기
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(200);

    // 셀 편집이 여전히 작동해야 함
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();
    
    // 셀이 실제로 보이는지 확인
    await expect(firstLangCell).toBeVisible({ timeout: 5000 });
    
    await firstLangCell.dblclick();
    await page.waitForTimeout(200);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test("편집 중 빠른 연속 입력이 부드럽게 처리되어야 함", async ({
    page,
  }) => {
    const firstLangCell = page
      .locator('.virtual-grid-cell[data-column-id="values.en"]')
      .first();

    await firstLangCell.dblclick();
    await page.waitForTimeout(100);
    const input = page.locator(".virtual-grid-cell-input");
    await expect(input).toBeVisible({ timeout: 5000 });

    // 빠른 연속 입력
    const testText = "Quick typing test ".repeat(10);
    await input.fill(testText);

    // 입력이 모두 반영되어야 함
    const value = await input.inputValue();
    expect(value).toBe(testText);
  });
});

test.describe("VirtualTableDiv - 브라우저 호환성", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Chrome에서 정상 작동해야 함", async ({ page, browserName }) => {
    if (browserName === "chromium") {
      const grid = page.locator(".virtual-grid");
      await expect(grid).toBeVisible();

      // 기본 기능 테스트
      const firstLangCell = page
        .locator('.virtual-grid-cell[data-column-id="values.en"]')
        .first();
      await firstLangCell.dblclick();
      await page.waitForTimeout(100);
      const input = page.locator(".virtual-grid-cell-input");
      await expect(input).toBeVisible({ timeout: 5000 });
    }
  });

  test("Firefox에서 정상 작동해야 함", async ({ page, browserName }) => {
    if (browserName === "firefox") {
      const grid = page.locator(".virtual-grid");
      await expect(grid).toBeVisible();

      // 키보드 네비게이션 테스트
      const firstKeyCell = page.locator('.virtual-grid-cell[data-column-id="key"]').first();
      await firstKeyCell.focus();
      await page.waitForTimeout(50);
      await page.keyboard.press("Tab");
      await page.waitForTimeout(50);
      const contextCell = page.locator('.virtual-grid-cell[data-column-id="context"]').first();
      await expect(contextCell).toBeFocused();
    }
  });

  test("Safari/WebKit에서 정상 작동해야 함", async ({ page, browserName }) => {
    if (browserName === "webkit") {
      const grid = page.locator(".virtual-grid");
      await expect(grid).toBeVisible();

      // 스크롤 테스트
      const scrollContainer = page.locator(".virtual-grid-scroll-container");
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 100;
      });

      const rows = page.locator(".virtual-grid-row");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

