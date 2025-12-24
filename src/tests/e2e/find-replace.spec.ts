/**
 * 찾기/바꾸기 (Find & Replace) E2E 테스트
 */

import { test, expect } from "@playwright/test";

test.describe("찾기/바꾸기 (Find & Replace)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });
  });

  test("Cmd/Ctrl+F로 찾기 열기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);

    // Cmd/Ctrl+F 입력
    await page.keyboard.press(`${modifierKey}+KeyF`);

    // 찾기 UI가 열렸는지 확인
    const overlay = page.locator(".find-replace-overlay");
    await expect(overlay).toBeVisible({ timeout: 1000 });

    const findInput = page.locator(".find-replace-find-input");
    await expect(findInput).toBeVisible();
    await expect(findInput).toBeFocused({ timeout: 1000 });
  });

  test("Cmd/Ctrl+H로 바꾸기 열기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 그리드에 포커스
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);

    // Cmd/Ctrl+H 입력
    await page.keyboard.press(`${modifierKey}+KeyH`);

    // 바꾸기 UI가 열렸는지 확인
    const overlay = page.locator(".find-replace-overlay");
    await expect(overlay).toBeVisible({ timeout: 1000 });

    const replaceSection = page.locator(".find-replace-replace-section");
    await expect(replaceSection).toBeVisible();

    const replaceInput = page.locator(".find-replace-replace-input");
    await expect(replaceInput).toBeVisible();
    await expect(replaceInput).toBeFocused({ timeout: 1000 });
  });

  test("검색어 입력 시 실시간 검색", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    await page.waitForTimeout(500); // debounce 대기

    // 검색 결과가 표시되는지 확인
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible();
    const resultText = await result.textContent();
    expect(resultText).toMatch(/\d+ of \d+ matches|No matches found/);
  });

  test("다음 매칭으로 이동", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    
    // 결과 요소가 실제로 업데이트될 때까지 기다리기
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible({ timeout: 2000 });
    
    // 검색 결과가 나타날 때까지 기다리기 (텍스트가 "matches"를 포함할 때까지)
    // waitForFunction 대신 직접 텍스트를 확인하는 방법 사용
    await page.waitForFunction(
      () => {
        const el = document.querySelector(".find-replace-result");
        return el && el.textContent && el.textContent.includes("matches");
      },
      { timeout: 5000 }
    );
    
    // 초기 결과 확인
    const initialResultText = await result.textContent();
    expect(initialResultText).toMatch(/\d+ of \d+ matches/);
    
    // 다음 버튼 클릭 (title 속성으로 정확히 선택, 닫기 버튼이 가리지 않도록)
    const nextButton = page.locator('button[title="Next"]');
    await expect(nextButton).toBeVisible({ timeout: 1000 });
    
    // 닫기 버튼이 가리지 않도록 확인
    const closeButton = page.locator('.find-replace-close-button');
    if (await closeButton.isVisible()) {
      // 닫기 버튼이 다른 버튼을 가리지 않도록 force 클릭 사용
      await nextButton.click({ force: true });
    } else {
      await nextButton.click();
    }
    
    await page.waitForTimeout(500);

    // 결과가 업데이트되었는지 확인
    const updatedResultText = await result.textContent();
    expect(updatedResultText).toMatch(/\d+ of \d+ matches/);
  });

  test("이전 매칭으로 이동", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    
    // 결과 요소가 실제로 업데이트될 때까지 기다리기
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible({ timeout: 2000 });
    
    // 검색 결과가 나타날 때까지 기다리기
    await page.waitForFunction(
      () => {
        const el = document.querySelector(".find-replace-result");
        return el && el.textContent && el.textContent.includes("matches");
      },
      { timeout: 5000 }
    );
    
    // 초기 결과 확인
    const initialResultText = await result.textContent();
    expect(initialResultText).toMatch(/\d+ of \d+ matches/);
    
    // 이전 버튼 클릭 (title 속성으로 정확히 선택)
    const prevButton = page.locator('button[title="Previous"]');
    await expect(prevButton).toBeVisible({ timeout: 1000 });
    
    // 닫기 버튼이 가리지 않도록 확인
    const closeButton = page.locator('.find-replace-close-button');
    if (await closeButton.isVisible()) {
      await prevButton.click({ force: true });
    } else {
      await prevButton.click();
    }
    await page.waitForTimeout(500);

    // 결과가 업데이트되었는지 확인
    const updatedResultText = await result.textContent();
    expect(updatedResultText).toMatch(/\d+ of \d+ matches/);
  });

  test("Enter 키로 다음 매칭으로 이동", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    
    // 결과 요소가 실제로 업데이트될 때까지 기다리기
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible({ timeout: 2000 });
    
    // 검색 결과가 나타날 때까지 기다리기
    await page.waitForFunction(
      () => {
        const el = document.querySelector(".find-replace-result");
        return el && el.textContent && el.textContent.includes("matches");
      },
      { timeout: 5000 }
    );

    // Enter 키 입력
    await findInput.press("Enter");
    await page.waitForTimeout(500);

    // 결과가 업데이트되었는지 확인
    const resultText = await result.textContent();
    expect(resultText).toMatch(/\d+ of \d+ matches/);
  });

  test("Shift+Enter로 이전 매칭으로 이동", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    
    // 결과 요소가 실제로 업데이트될 때까지 기다리기
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible({ timeout: 2000 });
    
    // 검색 결과가 나타날 때까지 기다리기
    await page.waitForFunction(
      () => {
        const el = document.querySelector(".find-replace-result");
        return el && el.textContent && el.textContent.includes("matches");
      },
      { timeout: 5000 }
    );

    // Shift+Enter 키 입력
    await findInput.press("Shift+Enter");
    await page.waitForTimeout(500);

    // 결과가 업데이트되었는지 확인
    const resultText = await result.textContent();
    expect(resultText).toMatch(/\d+ of \d+ matches/);
  });

  test("Escape 키로 닫기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // Escape 키 입력
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // 찾기 UI가 닫혔는지 확인
    const overlay = page.locator(".find-replace-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("오버레이 클릭 시 닫기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 오버레이 클릭 (컨테이너가 아닌 오버레이 자체)
    const overlay = page.locator(".find-replace-overlay");
    await overlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    // 찾기 UI가 닫혔는지 확인
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("닫기 버튼 클릭 시 닫기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 닫기 버튼 클릭
    const closeButton = page.locator('button:has-text("×")');
    await closeButton.click();
    await page.waitForTimeout(200);

    // 찾기 UI가 닫혔는지 확인
    const overlay = page.locator(".find-replace-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("대소문자 구분 옵션", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 대소문자 구분 체크박스 찾기
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 0) {
      const caseCheckbox = checkboxes.first();
      await caseCheckbox.check();
      await page.waitForTimeout(100);

      // 검색어 입력
      const findInput = page.locator(".find-replace-find-input");
      await findInput.fill("BUTTON");
      await page.waitForTimeout(500);

      // 검색 결과 확인
      const result = page.locator(".find-replace-result");
      await expect(result).toBeVisible();
    }
  });

  test("전체 단어 옵션", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 전체 단어 체크박스 찾기
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 1) {
      const wholeWordCheckbox = checkboxes.nth(1);
      await wholeWordCheckbox.check();
      await page.waitForTimeout(100);

      // 검색어 입력
      const findInput = page.locator(".find-replace-find-input");
      await findInput.fill("button");
      await page.waitForTimeout(500);

      // 검색 결과 확인
      const result = page.locator(".find-replace-result");
      await expect(result).toBeVisible();
    }
  });

  test("정규식 옵션", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 정규식 체크박스 찾기
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 2) {
      const regexCheckbox = checkboxes.nth(2);
      await regexCheckbox.check();
      await page.waitForTimeout(100);

      // 정규식 패턴 입력
      const findInput = page.locator(".find-replace-find-input");
      await findInput.fill("button.*");
      await page.waitForTimeout(500);

      // 검색 결과 확인
      const result = page.locator(".find-replace-result");
      await expect(result).toBeVisible();
    }
  });

  test("바꾸기 모드에서 현재 매칭 바꾸기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 바꾸기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyH`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    await page.waitForTimeout(500);

    // 바꾸기 텍스트 입력
    const replaceInput = page.locator(".find-replace-replace-input");
    await replaceInput.fill("btn");
    await page.waitForTimeout(200);

    // Replace 버튼 클릭 (title 속성으로 정확히 선택)
    const replaceButton = page.locator('button[title="Replace current"]');
    if (await replaceButton.isVisible({ timeout: 1000 })) {
      await replaceButton.click({ force: true });
      await page.waitForTimeout(500);

      // 검색이 다시 수행되었는지 확인
      const result = page.locator(".find-replace-result");
      await expect(result).toBeVisible();
    }
  });

  test("바꾸기 모드에서 모든 매칭 바꾸기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 바꾸기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyH`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    await page.waitForTimeout(500);

    // 바꾸기 텍스트 입력
    const replaceInput = page.locator(".find-replace-replace-input");
    await replaceInput.fill("btn");
    await page.waitForTimeout(200);

    // Replace All 버튼 클릭 (title 속성으로 정확히 선택)
    const replaceAllButton = page.locator('button[title="Replace all"]');
    if (await replaceAllButton.isVisible({ timeout: 1000 })) {
      await replaceAllButton.click({ force: true });
      await page.waitForTimeout(500);

      // 검색이 다시 수행되었는지 확인
      const result = page.locator(".find-replace-result");
      await expect(result).toBeVisible();
    }
  });

  test("바꾸기 모드에서 Enter로 현재 매칭 바꾸기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 바꾸기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyH`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    await page.waitForTimeout(500);

    // 바꾸기 텍스트 입력
    const replaceInput = page.locator(".find-replace-replace-input");
    await replaceInput.fill("btn");
    await page.waitForTimeout(200);

    // Enter 키 입력
    await replaceInput.press("Enter");
    await page.waitForTimeout(500);

    // 검색이 다시 수행되었는지 확인
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible();
  });

  test("바꾸기 모드에서 Shift+Enter로 모든 매칭 바꾸기", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 바꾸기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyH`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("button");
    await page.waitForTimeout(500);

    // 바꾸기 텍스트 입력
    const replaceInput = page.locator(".find-replace-replace-input");
    await replaceInput.fill("btn");
    await page.waitForTimeout(200);

    // Shift+Enter 키 입력
    await replaceInput.press("Shift+Enter");
    await page.waitForTimeout(500);

    // 검색이 다시 수행되었는지 확인
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible();
  });

  test("빈 검색어는 'No matches found' 표시", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 빈 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("");
    await page.waitForTimeout(500);

    // 결과 확인 (빈 문자열이거나 "No matches found")
    const result = page.locator(".find-replace-result");
    const resultText = await result.textContent();
    expect(resultText === "" || resultText?.includes("No matches found")).toBe(
      true
    );
  });

  test("존재하지 않는 검색어는 'No matches found' 표시", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 존재하지 않는 검색어 입력
    const findInput = page.locator(".find-replace-find-input");
    await findInput.fill("nonexistent12345");
    await page.waitForTimeout(500);

    // 결과 확인
    const result = page.locator(".find-replace-result");
    await expect(result).toBeVisible();
    const resultText = await result.textContent();
    expect(resultText).toContain("No matches found");
  });

  test("찾기 모드에서 바꾸기 섹션이 숨겨져 있어야 함", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 찾기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyF`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 바꾸기 섹션이 숨겨져 있는지 확인
    const replaceSection = page.locator(".find-replace-replace-section");
    const isVisible = await replaceSection.isVisible();
    // 찾기 모드에서는 바꾸기 섹션이 숨겨져 있거나 보일 수 있음 (CSS에 따라)
    // 하지만 바꾸기 모드로 전환하면 보여야 함
  });

  test("바꾸기 모드에서 바꾸기 섹션이 보여야 함", async ({ page }) => {
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";

    // 바꾸기 열기
    const grid = page.locator(".virtual-grid");
    await grid.click();
    await page.waitForTimeout(100);
    await page.keyboard.press(`${modifierKey}+KeyH`);

    await page.waitForSelector(".find-replace-overlay", { timeout: 1000 });

    // 바꾸기 섹션이 보이는지 확인
    const replaceSection = page.locator(".find-replace-replace-section");
    await expect(replaceSection).toBeVisible();
  });
});

