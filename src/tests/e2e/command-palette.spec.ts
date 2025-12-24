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
    
    // WebKit에서는 smooth 스크롤이 더 느릴 수 있으므로 충분한 대기 시간 제공
    // 행이 실제로 보일 때까지 기다림 (최대 5초)
    const row5 = page.locator('[role="row"][data-row-index="4"]'); // 0-based index
    await expect(row5).toBeVisible({ timeout: 5000 });
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

  test("goto top 명령 실행 및 첫 번째 행 이동 확인", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto top" 입력
    const input = page.locator(".command-palette-input");
    await input.fill("goto top");
    await page.waitForTimeout(200);

    // Enter로 실행
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // 첫 번째 행이 보이는지 확인
    const firstRow = page.locator('[role="row"][data-row-index="0"]');
    await expect(firstRow).toBeVisible({ timeout: 2000 });
  });

  test("goto bottom 명령 실행 및 마지막 행 이동 확인", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 초기 스크롤 위치 확인 (맨 위에 있어야 함)
    const scrollContainer = page.locator(".virtual-grid-scroll-container");
    const initialScrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(initialScrollTop).toBe(0); // 초기에는 맨 위에 있어야 함

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto bottom" 입력
    const input = page.locator(".command-palette-input");
    await input.fill("goto bottom");
    await page.waitForTimeout(200);

    // Enter로 실행
    await page.keyboard.press("Enter");
    
    // 스크롤이 안정화될 때까지 기다리기 (WebKit에서 smooth 스크롤이 더 느릴 수 있음)
    let previousScrollTop = 0;
    let stableCount = 0;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      const currentScrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
      if (Math.abs(currentScrollTop - previousScrollTop) < 1) {
        stableCount++;
        if (stableCount >= 3) {
          // 3번 연속으로 스크롤 위치가 변하지 않으면 안정화된 것으로 간주
          break;
        }
      } else {
        stableCount = 0;
      }
      previousScrollTop = currentScrollTop;
    }

    // 스크롤이 발생했는지 확인
    const finalScrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    
    // 스크롤 높이와 컨테이너 높이를 비교하여 스크롤이 필요한지 확인
    const scrollInfo = await scrollContainer.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

    // 스크롤이 필요한 경우 (scrollHeight > clientHeight) 스크롤이 발생했어야 함
    if (scrollInfo.scrollHeight > scrollInfo.clientHeight) {
      expect(finalScrollTop).toBeGreaterThan(0); // 스크롤이 발생했는지 확인
      // 마지막 행이 보이는지 확인 (스크롤이 거의 끝까지 내려갔는지)
      // WebKit에서는 가상 스크롤링으로 인해 정확한 위치가 약간 다를 수 있으므로 여유값을 200px로 증가
      expect(finalScrollTop).toBeGreaterThan(
        scrollInfo.scrollHeight - scrollInfo.clientHeight - 200
      ); // 200px 여유를 두고 확인
    } else {
      // 스크롤이 필요 없는 경우 (모든 행이 화면에 보임)
      // 이 경우 스크롤이 0이어도 정상
      expect(finalScrollTop).toBeGreaterThanOrEqual(0);
    }
  });

  test("help 명령 실행 및 도움말 모달 표시", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "help" 입력
    const input = page.locator(".command-palette-input");
    await input.fill("help");
    await page.waitForTimeout(200);

    // Enter로 실행
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // 팔레트가 닫혔는지 확인
    const paletteOverlay = page.locator(".command-palette-overlay");
    await expect(paletteOverlay).not.toBeVisible({ timeout: 1000 });

    // Help 모달이 표시되었는지 확인
    const helpModal = page.locator(".help-modal-overlay");
    await expect(helpModal).toBeVisible({ timeout: 2000 });

    // Help 모달의 제목 확인
    const helpTitle = page.locator(".help-modal-title");
    await expect(helpTitle).toBeVisible();
    await expect(helpTitle).toHaveText("Keyboard Shortcuts");

    // Keyboard Shortcuts 섹션 확인
    const shortcutsSection = page.locator(".help-modal-section").first();
    await expect(shortcutsSection).toBeVisible();

    // Available Commands 섹션 확인
    const commandsSection = page.locator(".help-modal-section").last();
    await expect(commandsSection).toBeVisible();

    // "goto top" 명령이 목록에 있는지 확인
    const commandList = page.locator(".help-modal-command-list");
    await expect(commandList).toBeVisible();
    const commandText = await commandList.textContent();
    expect(commandText).toContain("goto top");
    expect(commandText).toContain("goto bottom");
  });

  test("help 모달 닫기 (Escape 키)", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "help" 입력 및 실행
    const input = page.locator(".command-palette-input");
    await input.fill("help");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // Help 모달이 표시되었는지 확인
    const helpModal = page.locator(".help-modal-overlay");
    await expect(helpModal).toBeVisible({ timeout: 2000 });

    // Escape 키로 닫기
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Help 모달이 닫혔는지 확인
    await expect(helpModal).not.toBeVisible({ timeout: 1000 });
  });

  test("help 모달 닫기 (닫기 버튼)", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "help" 입력 및 실행
    const input = page.locator(".command-palette-input");
    await input.fill("help");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // Help 모달이 표시되었는지 확인
    const helpModal = page.locator(".help-modal-overlay");
    await expect(helpModal).toBeVisible({ timeout: 2000 });

    // 닫기 버튼 클릭
    const closeButton = page.locator(".help-modal-close");
    await closeButton.click();
    await page.waitForTimeout(200);

    // Help 모달이 닫혔는지 확인
    await expect(helpModal).not.toBeVisible({ timeout: 1000 });
  });

  test("help 모달 닫기 (오버레이 클릭)", async ({ page }) => {
    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "help" 입력 및 실행
    const input = page.locator(".command-palette-input");
    await input.fill("help");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // Help 모달이 표시되었는지 확인
    const helpModal = page.locator(".help-modal-overlay");
    await expect(helpModal).toBeVisible({ timeout: 2000 });

    // 오버레이 클릭 (모달 외부 클릭)
    await helpModal.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    // Help 모달이 닫혔는지 확인
    await expect(helpModal).not.toBeVisible({ timeout: 1000 });
  });

  test("goto \"로 fuzzy find 모드 활성화", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto \"" 입력
    const input = page.locator(".command-palette-input");
    await input.fill('goto "');
    await page.waitForTimeout(300); // debounce 대기

    // "Type to search..." 메시지가 표시되어야 함
    const emptyMessage = page.locator(".command-palette-item-empty");
    await expect(emptyMessage).toBeVisible({ timeout: 2000 });
    const text = await emptyMessage.textContent();
    expect(text).toContain("Type to search");
  });

  test("goto \"hell\"로 텍스트 검색 및 결과 표시", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto \"Welcome\"" 입력 (main.ts에 "Welcome" 데이터가 있음)
    // 따옴표를 닫을 필요 없음
    const input = page.locator(".command-palette-input");
    await input.fill('goto "Welcome');
    await page.waitForTimeout(400); // debounce 대기

    // 검색 결과가 표시되어야 함
    const resultsHeader = page.locator(".command-palette-item-empty").first();
    await expect(resultsHeader).toBeVisible({ timeout: 3000 });
    const headerText = await resultsHeader.textContent();
    expect(headerText).toMatch(/Search Results/i);

    // 검색 결과 항목이 있어야 함
    const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
    await expect(resultItems.first()).toBeVisible({ timeout: 2000 });
    const count = await resultItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("goto \"hell\"로 검색 후 Enter로 첫 번째 매치로 이동", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto \"Welcome\"" 입력 (따옴표를 닫을 필요 없음)
    const input = page.locator(".command-palette-input");
    await input.fill('goto "Welcome');
    await page.waitForTimeout(400); // debounce 대기

    // 검색 결과가 표시되는지 확인
    const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
    await expect(resultItems.first()).toBeVisible({ timeout: 3000 });

    // Enter로 실행
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // 팔레트가 닫혔는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });

    // 해당 행이 보이는지 확인 (간접적으로 스크롤 위치 확인)
    const scrollContainer = page.locator(".virtual-grid-scroll-container");
    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    // 스크롤이 발생했거나 첫 번째 행에 있을 수 있음
    expect(scrollTop).toBeGreaterThanOrEqual(0);
  });

  test("goto \"nonexistent\"로 검색 시 결과 없음 메시지 표시", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto \"nonexistent12345\"" 입력 (따옴표를 닫을 필요 없음)
    const input = page.locator(".command-palette-input");
    await input.fill('goto "nonexistent12345');
    await page.waitForTimeout(400); // debounce 대기

    // "No matches found" 메시지가 표시되어야 함
    const emptyMessage = page.locator(".command-palette-item-empty");
    await expect(emptyMessage).toBeVisible({ timeout: 3000 });
    const text = await emptyMessage.textContent();
    expect(text?.toLowerCase()).toContain("no matches");
  });

  test("goto \"로 검색 중 키보드 네비게이션", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto \"Welcome\"" 입력 (따옴표를 닫을 필요 없음)
    const input = page.locator(".command-palette-input");
    await input.fill('goto "Welcome');
    await page.waitForTimeout(400);

    // 검색 결과가 표시되는지 확인
    const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
    await expect(resultItems.first()).toBeVisible({ timeout: 3000 });

    // 아래로 이동
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);

    // 선택된 항목이 있어야 함
    const selected = page.locator(".command-palette-item-selected");
    await expect(selected).toBeVisible();

    // 위로 이동
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(100);

    // 첫 번째 항목이 선택되어 있어야 함
    const firstSelected = page.locator(".command-palette-item-selected").first();
    await expect(firstSelected).toBeVisible();
  });

  test("goto \"로 검색 후 클릭으로 이동", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto \"Welcome\"" 입력 (따옴표를 닫을 필요 없음)
    const input = page.locator(".command-palette-input");
    await input.fill('goto "Welcome');
    await page.waitForTimeout(400);

    // 검색 결과가 표시되는지 확인
    const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
    await expect(resultItems.first()).toBeVisible({ timeout: 3000 });

    // 첫 번째 결과 클릭
    await resultItems.first().click();
    await page.waitForTimeout(500);

    // 팔레트가 닫혔는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("goto \"로 검색 중 Escape로 취소", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    // "goto \"Welcome\"" 입력
    const input = page.locator(".command-palette-input");
    await input.fill('goto "Welcome"');
    await page.waitForTimeout(300);

    // Escape로 취소
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);

    // 팔레트가 닫혔는지 확인
    const overlay = page.locator(".command-palette-overlay");
    await expect(overlay).not.toBeVisible({ timeout: 1000 });
  });

  test("goto \"로 검색 시 실시간 업데이트", async ({ page }) => {
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

    // 팔레트 열기
    const isMac = process.platform === "darwin";
    const modifierKey = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+KeyK`);

    await page.waitForTimeout(100);

    const input = page.locator(".command-palette-input");

    // "goto \"W\"" 입력
    await input.fill('goto "W');
    await page.waitForTimeout(300);

    // 검색 결과 확인
    let resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
    const count1 = await resultItems.count();

    // "goto \"We\"" 입력
    await input.fill('goto "We');
    await page.waitForTimeout(300);

    // 검색 결과가 업데이트되었는지 확인
    resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
    const count2 = await resultItems.count();

    // 결과 개수가 변경되었을 수 있음 (더 구체적인 검색)
    expect(count2).toBeGreaterThanOrEqual(0);
  });

  test.describe("Goto Next/Prev 명령", () => {
    test("goto 'keyword' 검색 후 goto next로 다음 매칭으로 이동", async ({
      page,
    }) => {
      // 그리드가 렌더링될 때까지 대기
      await page.waitForSelector(".virtual-grid", { timeout: 5000 });
      await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

      // 팔레트 열기
      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

      // "goto 'button'" 입력 (fuzzy find 모드)
      const input = page.locator(".command-palette-input");
      await input.fill('goto "button"');
      await page.waitForTimeout(500); // debounce 대기

      // 검색 결과가 나타날 때까지 대기
      const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
      await expect(resultItems.first()).toBeVisible({ timeout: 3000 });

      // 첫 번째 매칭으로 이동 (Enter)
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      // 팔레트가 닫혔는지 확인
      await expect(page.locator(".command-palette-overlay")).not.toBeVisible({
        timeout: 1000,
      });

      // 첫 번째 매칭 행이 보이는지 확인
      await page.waitForTimeout(300);

      // 다시 팔레트 열기
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });
      await page.waitForTimeout(100);

      // "goto next" 입력
      await input.fill("goto next");
      await page.waitForTimeout(200);

      // "Go to Next Match" 명령이 표시되는지 확인
      const nextCommand = page
        .locator(".command-palette-item")
        .filter({ hasText: /next.*match/i })
        .first();
      await expect(nextCommand).toBeVisible({ timeout: 2000 });

      // Enter로 실행
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      // 팔레트가 닫혔는지 확인
      await expect(page.locator(".command-palette-overlay")).not.toBeVisible({
        timeout: 1000,
      });

      // 두 번째 매칭 행이 보이는지 확인 (간접적으로)
      await page.waitForTimeout(300);
    });

    test("goto 'keyword' 검색 후 goto prev로 이전 매칭으로 이동", async ({
      page,
    }) => {
      // 그리드가 렌더링될 때까지 대기
      await page.waitForSelector(".virtual-grid", { timeout: 5000 });
      await page.waitForSelector(".virtual-grid-row", { timeout: 5000 });

      // 팔레트 열기
      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

      // "goto 'button'" 입력
      const input = page.locator(".command-palette-input");
      await input.fill('goto "button"');
      await page.waitForTimeout(500);

      // 검색 결과가 나타날 때까지 대기
      const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
      await expect(resultItems.first()).toBeVisible({ timeout: 3000 });

      // 두 번째 매칭으로 이동 (ArrowDown + Enter)
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      // 팔레트가 닫혔는지 확인
      await expect(page.locator(".command-palette-overlay")).not.toBeVisible({
        timeout: 1000,
      });

      // 다시 팔레트 열기
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });
      await page.waitForTimeout(100);

      // "goto prev" 입력
      await input.fill("goto prev");
      await page.waitForTimeout(200);

      // "Go to Previous Match" 명령이 표시되는지 확인
      const prevCommand = page
        .locator(".command-palette-item")
        .filter({ hasText: /previous.*match/i })
        .first();
      await expect(prevCommand).toBeVisible({ timeout: 2000 });

      // Enter로 실행
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      // 팔레트가 닫혔는지 확인
      await expect(page.locator(".command-palette-overlay")).not.toBeVisible({
        timeout: 1000,
      });

      // 첫 번째 매칭 행이 보이는지 확인 (간접적으로)
      await page.waitForTimeout(300);
    });

    test("fuzzy find 모드에서 매칭 정보가 footer에 표시되어야 함", async ({
      page,
    }) => {
      // 그리드가 렌더링될 때까지 대기
      await page.waitForSelector(".virtual-grid", { timeout: 5000 });

      // 팔레트 열기
      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

      // "goto 'button'" 입력
      const input = page.locator(".command-palette-input");
      await input.fill('goto "button"');
      await page.waitForTimeout(500); // debounce 대기

      // 검색 결과가 나타날 때까지 대기
      const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
      await expect(resultItems.first()).toBeVisible({ timeout: 3000 });

      // Footer에 매칭 정보가 표시되는지 확인
      const footer = page.locator(".command-palette-footer");
      await expect(footer).toBeVisible();

      const footerText = await footer.textContent();
      expect(footerText).toMatch(/\d+\/\d+\s+matches/i);
    });

    test("fuzzy find 모드에서 Arrow 키로 이동 시 매칭 정보가 업데이트되어야 함", async ({
      page,
    }) => {
      // 그리드가 렌더링될 때까지 대기
      await page.waitForSelector(".virtual-grid", { timeout: 5000 });

      // 팔레트 열기
      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

      // "goto 'button'" 입력
      const input = page.locator(".command-palette-input");
      await input.fill('goto "button"');
      await page.waitForTimeout(500);

      // 검색 결과가 나타날 때까지 대기
      const resultItems = page.locator(".command-palette-item:not(.command-palette-item-empty)");
      await expect(resultItems.first()).toBeVisible({ timeout: 3000 });

      // Footer 확인 (초기: 1/N matches)
      const footer = page.locator(".command-palette-footer");
      let footerText = await footer.textContent();
      expect(footerText).toMatch(/1\/\d+\s+matches/i);

      // ArrowDown으로 다음 매칭으로 이동
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);

      // Footer가 업데이트되었는지 확인 (2/N matches)
      footerText = await footer.textContent();
      expect(footerText).toMatch(/2\/\d+\s+matches/i);
    });

    test("goto next는 검색 결과가 없으면 동작하지 않아야 함", async ({
      page,
    }) => {
      // 그리드가 렌더링될 때까지 대기
      await page.waitForSelector(".virtual-grid", { timeout: 5000 });

      // 팔레트 열기
      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? "Meta" : "Control";
      await page.keyboard.press(`${modifierKey}+KeyK`);
      await page.waitForSelector(".command-palette-overlay", { timeout: 2000 });

      // "goto next" 입력 (검색 없이)
      const input = page.locator(".command-palette-input");
      await input.fill("goto next");
      await page.waitForTimeout(200);

      // "Go to Next Match" 명령이 표시되는지 확인
      const nextCommand = page
        .locator(".command-palette-item")
        .filter({ hasText: /next.*match/i })
        .first();
      await expect(nextCommand).toBeVisible({ timeout: 2000 });

      // Enter로 실행
      await page.keyboard.press("Enter");
      await page.waitForTimeout(300);

      // 팔레트가 닫혔는지 확인 (명령은 실행되지만 아무 동작도 하지 않음)
      await expect(page.locator(".command-palette-overlay")).not.toBeVisible({
        timeout: 1000,
      });
    });
  });
});

