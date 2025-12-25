/**
 * CommandLine 유닛 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CommandLine } from "../command-line";

describe("CommandLine", () => {
  let container: HTMLElement;
  let commandLine: CommandLine;
  let onExecute: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onExecute = vi.fn();
    onCancel = vi.fn();
    commandLine = new CommandLine({
      container,
      onExecute,
      onCancel,
    });
  });

  afterEach(() => {
    commandLine.destroy();
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  describe("표시 및 숨기기", () => {
    it("show() 호출 시 Command Line이 표시되어야 함", () => {
      commandLine.show();

      expect(commandLine.getVisible()).toBe(true);
      const overlay = container.querySelector(".command-line-overlay");
      expect(overlay).not.toBeNull();
    });

    it("show() 호출 시 input이 포커스되어야 함", async () => {
      commandLine.show();

      const input = container.querySelector(".command-line-input") as HTMLInputElement;
      expect(input).not.toBeNull();
      // requestAnimationFrame으로 포커스가 설정되므로 대기
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(document.activeElement).toBe(input);
    });

    it("show() 호출 시 initialValue가 설정되어야 함", () => {
      commandLine.show("goto 10");

      const input = container.querySelector(".command-line-input") as HTMLInputElement;
      expect(input.value).toBe("goto 10");
    });

    it("hide() 호출 시 Command Line이 숨겨져야 함", () => {
      commandLine.show();
      commandLine.hide();

      expect(commandLine.getVisible()).toBe(false);
      const overlay = container.querySelector(".command-line-overlay");
      expect(overlay).toBeNull();
    });

    it("이미 표시된 상태에서 show() 호출 시 중복 생성되지 않아야 함", () => {
      commandLine.show();
      const firstOverlay = container.querySelector(".command-line-overlay");

      commandLine.show();
      const overlays = container.querySelectorAll(".command-line-overlay");

      expect(overlays.length).toBe(1);
      expect(overlays[0]).toBe(firstOverlay);
    });
  });

  describe("명령어 실행", () => {
    it("Enter 키 입력 시 명령어가 실행되어야 함", () => {
      commandLine.show();

      const input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 10";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(onExecute).toHaveBeenCalledWith("goto 10");
      expect(commandLine.getVisible()).toBe(false);
    });

    it("빈 명령어는 실행되지 않고 닫혀야 함", () => {
      commandLine.show();

      const input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "   ";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(onExecute).not.toHaveBeenCalled();
      expect(commandLine.getVisible()).toBe(false);
    });

    it("명령어 실행 후 히스토리에 추가되어야 함", () => {
      commandLine.show();

      const input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 10";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      const history = commandLine.getHistory();
      expect(history).toContain("goto 10");
    });

    it("동일한 명령어는 히스토리에서 중복되지 않아야 함", () => {
      commandLine.show();
      let input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 10";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      commandLine.show();
      input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 10";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      const history = commandLine.getHistory();
      expect(history.filter((cmd) => cmd === "goto 10").length).toBe(1);
    });
  });

  describe("취소", () => {
    it("Escape 키 입력 시 취소되어야 함", () => {
      commandLine.show();

      const input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(onCancel).toHaveBeenCalled();
      expect(commandLine.getVisible()).toBe(false);
    });

    it("오버레이 클릭 시 취소되어야 함", () => {
      commandLine.show();

      const overlay = container.querySelector(".command-line-overlay") as HTMLElement;
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(onCancel).toHaveBeenCalled();
      expect(commandLine.getVisible()).toBe(false);
    });
  });

  describe("히스토리 탐색", () => {
    beforeEach(() => {
      // 히스토리 설정
      commandLine.show();
      let input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 10";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      commandLine.show();
      input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 20";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      commandLine.show();
      input = container.querySelector(".command-line-input") as HTMLInputElement;
    });

    it("ArrowUp 키 입력 시 이전 명령어가 표시되어야 함", () => {
      commandLine.show();
      const input = container.querySelector(".command-line-input") as HTMLInputElement;

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));

      expect(input.value).toBe("goto 20");
    });

    it("ArrowDown 키 입력 시 다음 명령어가 표시되어야 함", () => {
      commandLine.show();
      const input = container.querySelector(".command-line-input") as HTMLInputElement;

      // 위로 이동 (가장 최근 명령어)
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.value).toBe("goto 20");

      // 위로 이동 (더 오래된 명령어)
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(input.value).toBe("goto 10");

      // 아래로 이동 (더 최근 명령어로)
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));

      expect(input.value).toBe("goto 20");
    });

    it("히스토리 끝에서 ArrowDown 입력 시 빈 값이 되어야 함", () => {
      commandLine.show();
      const input = container.querySelector(".command-line-input") as HTMLInputElement;

      // 히스토리 끝으로 이동
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));

      expect(input.value).toBe("");
    });
  });

  describe("히스토리 관리", () => {
    it("getHistory()는 히스토리 복사본을 반환해야 함", () => {
      commandLine.show();
      const input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 10";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      const history1 = commandLine.getHistory();
      const history2 = commandLine.getHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2); // 다른 참조
    });

    it("clearHistory() 호출 시 히스토리가 클리어되어야 함", () => {
      commandLine.show();
      let input = container.querySelector(".command-line-input") as HTMLInputElement;
      input.value = "goto 10";
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      commandLine.clearHistory();

      expect(commandLine.getHistory().length).toBe(0);
    });

    it("최대 히스토리 크기를 초과하면 오래된 항목이 제거되어야 함", () => {
      const smallCommandLine = new CommandLine({
        container,
        maxHistorySize: 3,
      });

      // 5개 명령어 실행
      for (let i = 1; i <= 5; i++) {
        smallCommandLine.show();
        const input = container.querySelector(".command-line-input") as HTMLInputElement;
        input.value = `goto ${i}`;
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      }

      const history = smallCommandLine.getHistory();
      expect(history.length).toBe(3);
      expect(history).toEqual(["goto 5", "goto 4", "goto 3"]);

      smallCommandLine.destroy();
    });
  });

  describe("destroy", () => {
    it("destroy() 호출 시 Command Line이 제거되어야 함", () => {
      commandLine.show();
      commandLine.destroy();

      expect(commandLine.getVisible()).toBe(false);
      const overlay = container.querySelector(".command-line-overlay");
      expect(overlay).toBeNull();
    });
  });
});

