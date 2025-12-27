/**
 * VimCommandTracker 유닛 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VimCommandTracker, type VimCommand } from "../vim-command-tracker";
import { VimCommandTrackerError } from "@/types/errors";

describe("VimCommandTracker", () => {
  let tracker: VimCommandTracker;
  let onCommandUpdate: ReturnType<typeof vi.fn<(command: VimCommand | null) => void>>;

  beforeEach(() => {
    onCommandUpdate = vi.fn<(command: VimCommand | null) => void>();
    tracker = new VimCommandTracker({
      onCommandUpdate,
      maxSequenceLength: 20,
      autoClearDelay: 1000,
    });
  });

  describe("키 추가", () => {
    it("단일 키 추가 시 명령어가 생성되어야 함", () => {
      const command = tracker.addKey("j");

      expect(command).not.toBeNull();
      expect(command?.sequence).toBe("j");
      expect(command?.type).toBe("motion");
      expect(onCommandUpdate).toHaveBeenCalledWith(command);
    });

    it("여러 키 추가 시 시퀀스가 누적되어야 함", () => {
      tracker.addKey("1");
      tracker.addKey("0");
      const command = tracker.addKey("j");

      expect(command?.sequence).toBe("10j");
      expect(command?.type).toBe("motion");
    });

    it("숫자만 입력 시 number 타입이어야 함", () => {
      tracker.addKey("1");
      tracker.addKey("0");
      const command = tracker.getCurrentCommand();

      expect(command?.type).toBe("number");
      expect(command?.sequence).toBe("10");
    });

    it("연산자 키 추가 시 operator 타입이어야 함", () => {
      const command = tracker.addKey("d");

      expect(command?.type).toBe("operator");
    });

    it("텍스트 객체 키 추가 시 text-object 타입이어야 함", () => {
      tracker.addKey("c");
      const command = tracker.addKey("w");

      expect(command?.type).toBe("text-object");
    });

    it("최대 길이 초과 시 에러가 발생해야 함", () => {
      const longTracker = new VimCommandTracker({
        maxSequenceLength: 5,
      });

      // 5개까지는 정상
      for (let i = 0; i < 5; i++) {
        const result = longTracker.addKey("j");
        expect(result).not.toBeNull();
      }

      // 6번째는 null 반환 (에러 처리됨)
      const result = longTracker.addKey("j");
      expect(result).toBeNull();
    });
  });

  describe("명령어 완료", () => {
    it("명령어가 있을 때 완료 시 complete 타입이어야 함", () => {
      tracker.addKey("d");
      tracker.addKey("d");

      const command = tracker.completeCommand();

      expect(command.type).toBe("complete");
      expect(command.sequence).toBe("dd");
    });

    it("명령어가 없을 때 완료 시 에러가 발생해야 함", () => {
      expect(() => {
        tracker.completeCommand();
      }).toThrow();
    });

    it("명령어 완료 후 시퀀스가 클리어되어야 함", () => {
      tracker.addKey("j");
      tracker.completeCommand();

      expect(tracker.getCurrentCommand()).toBeNull();
    });
  });

  describe("명령어 취소", () => {
    it("취소 시 시퀀스가 클리어되어야 함", () => {
      tracker.addKey("j");
      tracker.cancelCommand();

      expect(tracker.getCurrentCommand()).toBeNull();
      expect(onCommandUpdate).toHaveBeenCalledWith(null);
    });
  });

  describe("명령어 설명", () => {
    it("일반적인 Vim 명령어에 대한 설명이 제공되어야 함", () => {
      const commands: Array<{ sequence: string; expectedDescription?: string }> = [
        { sequence: "h", expectedDescription: "Move left" },
        { sequence: "j", expectedDescription: "Move down" },
        { sequence: "k", expectedDescription: "Move up" },
        { sequence: "l", expectedDescription: "Move right" },
        { sequence: "gg", expectedDescription: "Go to top" },
        { sequence: "G", expectedDescription: "Go to bottom" },
        { sequence: "dd", expectedDescription: "Delete line" },
        { sequence: "yy", expectedDescription: "Yank line" },
        { sequence: "cw", expectedDescription: "Change word" },
      ];

      commands.forEach(({ sequence, expectedDescription }) => {
        tracker.clear();
        sequence.split("").forEach((key) => {
          tracker.addKey(key);
        });
        const command = tracker.getCurrentCommand();
        if (expectedDescription) {
          expect(command?.description).toBe(expectedDescription);
        }
      });
    });

    it("숫자만 있을 때 반복 횟수 설명이 제공되어야 함", () => {
      tracker.addKey("1");
      tracker.addKey("0");
      const command = tracker.getCurrentCommand();

      expect(command?.description).toBe("Repeat 10 times");
    });
  });

  describe("자동 클리어", () => {
    it("일정 시간 후 자동으로 클리어되어야 함", async () => {
      vi.useFakeTimers();

      tracker.addKey("j");
      expect(tracker.getCurrentCommand()).not.toBeNull();

      // 1초 후
      vi.advanceTimersByTime(1000);

      expect(tracker.getCurrentCommand()).toBeNull();
      expect(onCommandUpdate).toHaveBeenCalledWith(null);

      vi.useRealTimers();
    });

    it("새로운 키 입력 시 타이머가 리셋되어야 함", async () => {
      vi.useFakeTimers();

      tracker.addKey("j");
      vi.advanceTimersByTime(500);

      // 새로운 키 입력
      tracker.addKey("k");
      vi.advanceTimersByTime(500);

      // 아직 클리어되지 않아야 함
      expect(tracker.getCurrentCommand()).not.toBeNull();

      // 추가 1초 후 클리어
      vi.advanceTimersByTime(1000);
      expect(tracker.getCurrentCommand()).toBeNull();

      vi.useRealTimers();
    });
  });
});

