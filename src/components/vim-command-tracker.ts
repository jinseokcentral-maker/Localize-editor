/**
 * Vim Command Tracker
 *
 * Vim 모드에서 입력된 키 시퀀스를 추적하고 표시하는 컴포넌트
 * 리팩토링 기조: Effect 기반 에러 처리, Logger 사용, 타입 안정성
 */

import { Effect } from "effect";
import { logger } from "@/utils/logger";
import {
  VimCommandTrackerError,
  type VimCommandTrackerErrorCode,
} from "@/types/errors";

/**
 * Vim 명령어 타입
 */
export type VimCommandType =
  | "motion" // 이동 명령 (hjkl, gg, G, 0, $)
  | "operator" // 연산자 (d, y, c)
  | "text-object" // 텍스트 객체 (w, b, e)
  | "number" // 숫자 (반복 횟수)
  | "complete"; // 완료된 명령

/**
 * Vim 명령어 정보
 */
export interface VimCommand {
  sequence: string; // 입력된 키 시퀀스 (예: "10j", "dd", "cw")
  type: VimCommandType;
  description?: string; // 명령어 설명 (선택적)
}

/**
 * Vim Command Tracker 옵션
 */
export interface VimCommandTrackerOptions {
  maxSequenceLength?: number; // 최대 시퀀스 길이 (기본: 20)
  autoClearDelay?: number; // 자동 클리어 지연 시간 (ms, 기본: 1000)
  onCommandUpdate?: (command: VimCommand | null) => void; // 명령어 업데이트 콜백
}

/**
 * Vim Command Tracker 클래스
 */
export class VimCommandTracker {
  private currentSequence: string = "";
  private commandType: VimCommandType = "motion";
  private autoClearTimer: number | null = null;
  private options: Required<VimCommandTrackerOptions>;

  constructor(options: VimCommandTrackerOptions = {}) {
    this.options = {
      maxSequenceLength: options.maxSequenceLength ?? 20,
      autoClearDelay: options.autoClearDelay ?? 1000,
      onCommandUpdate: options.onCommandUpdate ?? (() => {}),
    };
  }

  /**
   * 키 추가 (Effect 기반)
   */
  addKeyEffect(key: string): Effect.Effect<VimCommand | null, VimCommandTrackerError> {
    const self = this;
    return Effect.gen(function* (_) {
      // 최대 길이 체크
      if (self.currentSequence.length >= self.options.maxSequenceLength) {
        return yield* _(
          Effect.fail(
            new VimCommandTrackerError({
              message: `Maximum sequence length (${self.options.maxSequenceLength}) exceeded`,
              code: "MAX_SEQUENCE_LENGTH_EXCEEDED",
            })
          )
        );
      }

      // 키 추가
      self.currentSequence += key;

      // 명령어 타입 결정
      self.updateCommandType();

      // 명령어 생성
      const command = self.createCommand();

      // 콜백 호출
      self.options.onCommandUpdate(command);

      // 자동 클리어 타이머 리셋
      self.resetAutoClearTimer();

      return command;
    });
  }

  /**
   * 키 추가 (동기 버전, 기존 API 호환)
   */
  addKey(key: string): VimCommand | null {
    return Effect.runSync(
      Effect.match(this.addKeyEffect(key), {
        onFailure: (error) => {
          // VimCommandTrackerError는 그대로 throw
          if (error instanceof VimCommandTrackerError) {
            throw error;
          }
          // 예상치 못한 에러만 로그
          logger.error("VimCommandTracker: Unexpected error in addKey", error);
          return null;
        },
        onSuccess: (command) => command,
      })
    );
  }

  /**
   * 명령어 완료 (Effect 기반)
   */
  completeCommandEffect(): Effect.Effect<VimCommand, VimCommandTrackerError> {
    const self = this;
    return Effect.gen(function* (_) {
      if (!self.currentSequence) {
        return yield* _(
          Effect.fail(
            new VimCommandTrackerError({
              message: "No command sequence to complete",
              code: "INVALID_KEY_SEQUENCE",
            })
          )
        );
      }

      const command = self.createCommand();
      command.type = "complete";

      // 콜백 호출
      self.options.onCommandUpdate(command);

      // 자동 클리어
      self.clear();

      return command;
    });
  }

  /**
   * 명령어 완료 (동기 버전)
   */
  completeCommand(): VimCommand {
    return Effect.runSync(
      Effect.match(this.completeCommandEffect(), {
        onFailure: (error) => {
          // VimCommandTrackerError는 그대로 throw
          if (error instanceof VimCommandTrackerError) {
            throw error;
          }
          // 예상치 못한 에러만 로그
          logger.error("VimCommandTracker: Unexpected error in completeCommand", error);
          throw new VimCommandTrackerError({
            message: "Failed to complete command",
            code: "INVALID_KEY_SEQUENCE",
          });
        },
        onSuccess: (command) => command,
      })
    );
  }

  /**
   * 명령어 취소 (Effect 기반)
   */
  cancelCommandEffect(): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.clear();
    });
  }

  /**
   * 명령어 취소 (동기 버전)
   */
  cancelCommand(): void {
    Effect.runSync(this.cancelCommandEffect());
  }

  /**
   * 현재 명령어 가져오기
   */
  getCurrentCommand(): VimCommand | null {
    if (!this.currentSequence) {
      return null;
    }
    return this.createCommand();
  }

  /**
   * 명령어 클리어
   */
  clear(): void {
    this.currentSequence = "";
    this.commandType = "motion";
    if (this.autoClearTimer !== null) {
      clearTimeout(this.autoClearTimer);
      this.autoClearTimer = null;
    }
    this.options.onCommandUpdate(null);
  }

  /**
   * 명령어 타입 업데이트
   */
  private updateCommandType(): void {
    if (!this.currentSequence) {
      this.commandType = "motion";
      return;
    }

    const lastChar = this.currentSequence[this.currentSequence.length - 1];

    // 숫자로 시작하면 숫자 타입
    if (/^\d+$/.test(this.currentSequence)) {
      this.commandType = "number";
      return;
    }

    // 연산자 (d, y, c)
    if (["d", "y", "c"].includes(lastChar)) {
      this.commandType = "operator";
      return;
    }

    // 텍스트 객체 (w, b, e)
    if (["w", "b", "e"].includes(lastChar) && this.currentSequence.length > 1) {
      this.commandType = "text-object";
      return;
    }

    // 기본: 이동 명령
    this.commandType = "motion";
  }

  /**
   * 명령어 생성
   */
  private createCommand(): VimCommand {
    return {
      sequence: this.currentSequence,
      type: this.commandType,
      description: this.getCommandDescription(),
    };
  }

  /**
   * 명령어 설명 가져오기
   */
  private getCommandDescription(): string | undefined {
    const seq = this.currentSequence;
    if (!seq) {
      return undefined;
    }

    // 숫자만 있으면 반복 횟수
    if (/^\d+$/.test(seq)) {
      return `Repeat ${seq} times`;
    }

    // 일반적인 Vim 명령어 설명
    const descriptions: Record<string, string> = {
      h: "Move left",
      j: "Move down",
      k: "Move up",
      l: "Move right",
      gg: "Go to top",
      G: "Go to bottom",
      "0": "Go to line start",
      $: "Go to line end",
      dd: "Delete line",
      yy: "Yank line",
      p: "Paste",
      u: "Undo",
      "cw": "Change word",
      "dw": "Delete word",
      "ciw": "Change inner word",
      "diw": "Delete inner word",
    };

    return descriptions[seq] || undefined;
  }

  /**
   * 자동 클리어 타이머 리셋
   */
  private resetAutoClearTimer(): void {
    if (this.autoClearTimer !== null) {
      clearTimeout(this.autoClearTimer);
    }

    this.autoClearTimer = window.setTimeout(() => {
      this.clear();
    }, this.options.autoClearDelay);
  }
}

