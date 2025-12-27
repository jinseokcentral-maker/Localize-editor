/**
 * Vim UI E2E 테스트
 * 
 * VimCommandTracker, CommandLine, StatusBar 확장 기능 테스트
 * 
 * 주의: 이 테스트를 실행하려면 VimCommandTracker와 CommandLine이
 * VirtualTableDiv에 통합되어 있어야 합니다.
 */

import { test, expect } from "@playwright/test";

test.describe("Vim UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // 그리드가 렌더링될 때까지 대기
    await page.waitForSelector(".virtual-grid", { timeout: 5000 });
    // StatusBar가 렌더링될 때까지 대기
    await page.waitForSelector(".status-bar", { timeout: 5000 });
  });

  test.describe("StatusBar 명령어 표시", () => {
    test("Vim 모드에서 키 입력 시 StatusBar에 명령어가 표시되어야 함", async ({ page }) => {
      // Vim 모드로 전환 (실제 구현 시 모드 전환 방법에 따라 수정 필요)
      // 일단 키 입력으로 테스트
      
      // 첫 번째 셀 클릭하여 포커스
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // StatusBar 확인
      const statusBar = page.locator(".status-bar");
      await expect(statusBar).toBeVisible();

      // Vim 명령어 입력 시뮬레이션
      // 'j' 키 입력 시 "Command: j" 표시
      await page.keyboard.press("j");
      await page.waitForTimeout(100);
      
      const statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Command: j");
    });

    test("명령어가 완료되면 StatusBar에서 사라져야 함", async ({ page }) => {
      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      const statusBar = page.locator(".status-bar");
      
      // 명령어 입력 후 일정 시간 후 자동 클리어 확인
      await page.keyboard.press("j");
      await page.waitForTimeout(100);
      
      let statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Command: j");
      
      // 1.1초 후 자동 클리어 확인 (autoClearDelay: 1000ms)
      await page.waitForTimeout(1100);
      statusBarText = await statusBar.textContent();
      expect(statusBarText).not.toContain("Command:");
    });
  });

  test.describe("CommandLine (`:` 명령어 입력줄)", () => {
    test("`: 키로 CommandLine이 표시되어야 함", async ({ page }) => {
      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // `:` 키 입력
      await page.keyboard.press(":");
      await page.waitForTimeout(100);
      
      // CommandLine 확인
      const commandLine = page.locator(".command-line-overlay");
      await expect(commandLine).toBeVisible({ timeout: 1000 });
      
      const input = page.locator(".command-line-input");
      await expect(input).toBeVisible();
      await expect(input).toBeFocused();
    });

    test("CommandLine에서 명령어 입력 및 실행", async ({ page }) => {
      // 콘솔 로그 캡처
      const consoleLogs: string[] = [];
      page.on("console", (msg) => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log(`[Browser Console] ${msg.type()}: ${text}`);
      });

      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // `:` 키로 CommandLine 열기
      await page.keyboard.press(":");
      await page.waitForTimeout(100);
      
      const input = page.locator(".command-line-input");
      await input.fill("goto 10");
      await page.keyboard.press("Enter");
      
      // CommandLine이 닫혔는지 확인 (더 긴 타임아웃)
      const commandLine = page.locator(".command-line-overlay");
      await expect(commandLine).not.toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(200);
      
      // 명령어가 실행되었는지 확인 (예: 10번째 행으로 이동)
      // 상태바가 나타날 때까지 기다림 (WebKit에서 더 오래 걸릴 수 있음)
      const statusBar = page.locator(".status-bar");
      
      // 상태바가 존재하는지 먼저 확인 (페이지 로드 시 이미 존재해야 함)
      await page.waitForSelector(".status-bar", { timeout: 5000 });
      
      // 상태바 텍스트가 업데이트될 때까지 대기 (최대 3초)
      await page.waitForFunction(
        () => {
          const statusBar = document.querySelector(".status-bar");
          return statusBar?.textContent?.includes("Row 10/") ?? false;
        },
        { timeout: 3000 }
      );
      
      const statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Row 10/");

      // 디버깅: 콘솔 로그 출력
      console.log("\n=== Browser Console Logs ===");
      consoleLogs.forEach((log, index) => {
        console.log(`[${index + 1}] ${log}`);
      });
      console.log("=== End Console Logs ===\n");

      // 브라우저를 열어둠 (디버깅용 - 필요시 주석 해제)
      // await page.pause();
    });

    test("Escape 키로 CommandLine 취소", async ({ page }) => {
      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // `:` 키로 CommandLine 열기
      await page.keyboard.press(":");
      await page.waitForTimeout(100);
      
      // Escape 키로 닫기
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
      
      // CommandLine이 닫혔는지 확인
      const commandLine = page.locator(".command-line-overlay");
      await expect(commandLine).not.toBeVisible({ timeout: 1000 });
    });

    test("CommandLine 히스토리 탐색 (ArrowUp/ArrowDown)", async ({ page }) => {
      // 콘솔 로그 캡처
      const consoleLogs: string[] = [];
      page.on("console", (msg) => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log(`[Browser Console] ${msg.type()}: ${text}`);
      });

      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // 첫 번째 명령어 실행
      await page.keyboard.press(":");
      await page.waitForTimeout(100);
      let input = page.locator(".command-line-input");
      await input.fill("goto 10");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);

      // 두 번째 명령어 실행
      await page.keyboard.press(":");
      await page.waitForTimeout(100);
      input = page.locator(".command-line-input");
      await input.fill("goto 20");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);

      // 세 번째 CommandLine 열기
      // WebKit에서 키보드 입력이 제대로 처리되도록 셀에 포커스 확인
      // 셀이 존재하는지 먼저 확인
      const currentCell = page.locator(".virtual-grid-cell").first();
      await expect(currentCell).toBeVisible({ timeout: 2000 });
      
      // 클릭으로 포커스 설정 (focus()보다 안정적)
      await currentCell.click();
      await page.waitForTimeout(200);
      
      await page.keyboard.press(":");
      await page.waitForTimeout(300); // WebKit에서 더 긴 대기 시간
      input = page.locator(".command-line-input");
      
      // input이 표시되고 포커스가 설정될 때까지 대기
      await expect(input).toBeVisible({ timeout: 2000 });
      // input에 명시적으로 포커스 설정
      await input.focus();
      await page.waitForTimeout(200); // WebKit에서 더 긴 대기 시간
      
      // input이 비어있는지 확인
      let inputValue = await input.inputValue();
      expect(inputValue).toBe("");
      
      // ArrowUp으로 이전 명령어 탐색 (가장 최근 명령어)
      // input에 포커스가 있는지 확인 후 키 입력
      await input.focus();
      await page.keyboard.press("ArrowUp");
      // input 값이 설정될 때까지 대기 (최대 1초)
      await page.waitForFunction(
        () => {
          const inputEl = document.querySelector(".command-line-input") as HTMLInputElement;
          return inputEl && inputEl.value === "goto 20";
        },
        { timeout: 1000 }
      );
      inputValue = await input.inputValue();
      expect(inputValue).toBe("goto 20");
      
      // ArrowUp으로 더 이전 명령어 탐색
      await page.keyboard.press("ArrowUp");
      // input 값이 설정될 때까지 대기 (최대 1초)
      await page.waitForFunction(
        () => {
          const inputEl = document.querySelector(".command-line-input") as HTMLInputElement;
          return inputEl && inputEl.value === "goto 10";
        },
        { timeout: 1000 }
      );
      inputValue = await input.inputValue();
      expect(inputValue).toBe("goto 10");
      
      // ArrowDown으로 다음 명령어 탐색
      await page.keyboard.press("ArrowDown");
      // input 값이 설정될 때까지 대기 (최대 1초)
      await page.waitForFunction(
        () => {
          const inputEl = document.querySelector(".command-line-input") as HTMLInputElement;
          return inputEl && inputEl.value === "goto 20";
        },
        { timeout: 1000 }
      );
      inputValue = await input.inputValue();
      expect(inputValue).toBe("goto 20");

      // 디버깅: 콘솔 로그 출력
      console.log("\n=== Browser Console Logs ===");
      consoleLogs.forEach((log, index) => {
        console.log(`[${index + 1}] ${log}`);
      });
      console.log("=== End Console Logs ===\n");

      // 브라우저를 열어둠 (디버깅용 - 필요시 주석 해제)
      // await page.pause();
    });
  });

  test.describe("VimCommandTracker 키 시퀀스 추적", () => {
    test("단일 키 입력 시 명령어가 표시되어야 함", async ({ page }) => {
      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // 'j' 키 입력 (아래로 이동)
      await page.keyboard.press("j");
      await page.waitForTimeout(100);
      
      const statusBar = page.locator(".status-bar");
      const statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Command: j");
    });

    test("여러 키 입력 시 시퀀스가 누적되어야 함", async ({ page }) => {
      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // '1', '0', 'j' 키 입력 (10번 아래로 이동)
      await page.keyboard.press("1");
      await page.waitForTimeout(50);
      await page.keyboard.press("0");
      await page.waitForTimeout(50);
      await page.keyboard.press("j");
      await page.waitForTimeout(100);
      
      const statusBar = page.locator(".status-bar");
      const statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Command: 10j");
    });

    test("일정 시간 후 명령어가 자동으로 클리어되어야 함", async ({ page }) => {
      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // 'j' 키 입력
      await page.keyboard.press("j");
      await page.waitForTimeout(100);
      
      const statusBar = page.locator(".status-bar");
      let statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Command: j");
      
      // 1.1초 후 자동 클리어 확인 (autoClearDelay: 1000ms)
      await page.waitForTimeout(1100);
      statusBarText = await statusBar.textContent();
      expect(statusBarText).not.toContain("Command:");
    });
  });

  test.describe("통합 테스트", () => {
    test("Vim 명령어 입력 → StatusBar 표시 → CommandLine 실행", async ({ page }) => {
      // 콘솔 로그 캡처
      const consoleLogs: string[] = [];
      page.on("console", (msg) => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log(`[Browser Console] ${msg.type()}: ${text}`);
      });

      // 첫 번째 셀 클릭
      const firstCell = page.locator(".virtual-grid-cell").first();
      await firstCell.click();
      await page.waitForTimeout(100);

      // 1. Vim 명령어 입력 (예: 'j' 키)
      await page.keyboard.press("j");
      await page.waitForTimeout(100);
      
      // StatusBar에 명령어 표시 확인
      const statusBar = page.locator(".status-bar");
      let statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Command: j");
      
      // 2. CommandLine 열기
      await page.keyboard.press(":");
      await page.waitForTimeout(200);
      
      // CommandLine이 표시되고 StatusBar 명령어는 사라져야 함
      const commandLine = page.locator(".command-line-overlay");
      await expect(commandLine).toBeVisible();
      
      // StatusBar 업데이트 대기
      await page.waitForTimeout(100);
      statusBarText = await statusBar.textContent();
      expect(statusBarText).not.toContain("Command:");
      
      // 3. CommandLine에서 명령어 실행
      const input = page.locator(".command-line-input");
      await input.fill("goto 5");
      await page.keyboard.press("Enter");
      
      // CommandLine이 닫힐 때까지 대기
      await expect(commandLine).not.toBeVisible({ timeout: 3000 });
      
      // StatusBar 업데이트 대기 (스크롤 및 포커스 완료 대기)
      await page.waitForTimeout(800);
      
      // 명령어가 실행되었는지 확인 (StatusBar가 업데이트될 때까지 대기)
      await page.waitForFunction(
        (selector) => {
          const statusBar = document.querySelector(selector) as HTMLElement;
          if (!statusBar) return false;
          const text = statusBar.textContent || "";
          return text.includes("Row 5/");
        },
        ".status-bar",
        { timeout: 5000 }
      );
      
      statusBarText = await statusBar.textContent();
      expect(statusBarText).toContain("Row 5/");

            // 디버깅: 콘솔 로그 출력
            console.log("\n=== Browser Console Logs ===");
            consoleLogs.forEach((log, index) => {
              console.log(`[${index + 1}] ${log}`);
            });
            console.log("=== End Console Logs ===\n");

            // 브라우저를 열어둠 (디버깅용 - 필요시 주석 해제)
            // await page.pause();
          });
        });
      });

