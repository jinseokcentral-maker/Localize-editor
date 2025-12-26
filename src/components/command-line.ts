/**
 * Command Line 컴포넌트
 *
 * Vim의 `:` 명령어 모드를 위한 입력줄
 * 리팩토링 기조: Effect 기반 에러 처리, Logger 사용, 타입 안정성
 */

import { Effect } from "effect";
import { logger } from "@/utils/logger";
import { CommandLineError } from "@/types/errors";

/**
 * Command Line 옵션
 */
export interface CommandLineOptions {
  container: HTMLElement;
  onExecute?: (command: string) => void | Promise<void>;
  onCancel?: () => void;
  maxHistorySize?: number; // 명령어 히스토리 최대 크기 (기본: 50)
  placeholder?: string; // 플레이스홀더 텍스트
}

/**
 * Command Line 클래스
 */
export class CommandLine {
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private container: HTMLElement;
  private options: Required<Omit<CommandLineOptions, "container">> & {
    container: HTMLElement;
  };
  private history: string[] = [];
  private historyIndex: number = -1;
  private isVisible: boolean = false;

  constructor(options: CommandLineOptions) {
    this.container = options.container;
    this.options = {
      container: options.container,
      onExecute: options.onExecute ?? (() => {}),
      onCancel: options.onCancel ?? (() => {}),
      maxHistorySize: options.maxHistorySize ?? 50,
      placeholder: options.placeholder ?? "Enter command...",
    };
    // 히스토리 로드
    this.loadHistory();
  }

  /**
   * Command Line 표시 (Effect 기반)
   */
  showEffect(initialValue?: string): Effect.Effect<void, CommandLineError> {
    return Effect.sync(() => {
      if (this.isVisible) {
        return;
      }

      // 히스토리 인덱스 리셋
      this.historyIndex = -1;

      // 히스토리 로드 (최신 상태로 업데이트)
      this.loadHistory();

      this.createUI();
      if (this.input) {
        // input 초기화
        this.input.value = initialValue || "";
        // DOM이 렌더링된 후 포커스 설정
        // Firefox에서도 제대로 작동하도록 단일 requestAnimationFrame 사용
        requestAnimationFrame(() => {
          if (this.input) {
            // Firefox에서 input 값이 리셋되지 않도록 확인
            const expectedValue = initialValue || "";
            if (this.input.value !== expectedValue) {
              logger.warn(
                `CommandLine: Input value was reset during show! Expected: "${expectedValue}", Got: "${this.input.value}"`
              );
              this.input.value = expectedValue;
            }
            this.input.focus();
            this.input.select();
          }
        });
      }
      this.isVisible = true;
    }).pipe(
      Effect.catchAll((error) => {
        logger.error("CommandLine: Failed to show", error);
        return Effect.fail(error);
      })
    );
  }

  /**
   * Command Line 표시 (동기 버전)
   */
  show(initialValue?: string): void {
    Effect.runSync(
      Effect.match(this.showEffect(initialValue), {
        onFailure: (error) => {
          logger.error("CommandLine: Failed to show", error);
          // 에러가 발생해도 UI는 표시하지 않음
        },
        onSuccess: () => {},
      })
    );
  }

  /**
   * Command Line 숨기기 (Effect 기반)
   */
  hideEffect(): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.hide();
    });
  }

  /**
   * Command Line 숨기기 (동기 버전)
   */
  hide(): void {
    if (!this.isVisible) {
      return;
    }

    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.overlay = null;
    this.input = null;
    this.isVisible = false;
    // 히스토리 인덱스 리셋
    this.historyIndex = -1;
  }

  /**
   * Command Line 표시 여부
   */
  getVisible(): boolean {
    return this.isVisible;
  }

  /**
   * UI 생성
   */
  private createUI(): void {
    // Overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "command-line-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-label", "Command Line");

    // Container
    const container = document.createElement("div");
    container.className = "command-line";

    // Input
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "command-line-input";
    this.input.setAttribute("placeholder", this.options.placeholder);
    this.input.setAttribute("aria-label", "Command input");
    this.input.setAttribute("autocomplete", "off");
    this.input.setAttribute("spellcheck", "false");

    // 이벤트 리스너
    this.attachInputListeners();

    container.appendChild(this.input);
    this.overlay.appendChild(container);
    this.container.appendChild(this.overlay);
  }

  /**
   * Input 이벤트 리스너 등록
   */
  private attachInputListeners(): void {
    if (!this.input) {
      logger.warn("CommandLine: Cannot attach listeners - input is null");
      return;
    }

    // 디버깅: 이벤트 리스너 등록 확인

    // Enter: 명령어 실행
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        // async 함수이므로 fire-and-forget 방식으로 호출
        // 에러는 executeCommand 내부에서 처리됨
        // 타임아웃과 에러 처리를 위해 명시적으로 catch 추가
        this.executeCommand().catch((error) => {
          logger.error(
            "CommandLine: executeCommand error (outer catch)",
            error
          );
          // 에러가 발생해도 CommandLine은 닫기 (무한 대기 방지)
          this.hide();
        });
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        this.navigateHistory(-1);
        // Firefox에서도 제대로 작동하도록 포커스 설정
        if (this.input) {
          requestAnimationFrame(() => {
            if (this.input) {
              this.input.focus();
            }
          });
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        this.navigateHistory(1);
        // Firefox에서도 제대로 작동하도록 포커스 설정
        if (this.input) {
          requestAnimationFrame(() => {
            if (this.input) {
              this.input.focus();
            }
          });
        }
      }
    });

    // Overlay 클릭 시 닫기
    if (this.overlay) {
      this.overlay.addEventListener("click", (e) => {
        if (e.target === this.overlay) {
          this.cancel();
        }
      });
    }
  }

  /**
   * 명령어 실행 (Effect 기반)
   */
  private executeCommandEffect(): Effect.Effect<void, CommandLineError> {
    const self = this;
    return Effect.gen(function* (_) {
      if (!self.input) {
        return yield* _(
          Effect.fail(
            new CommandLineError({
              message: "Input element not found",
              code: "INVALID_COMMAND",
            })
          )
        );
      }

      const command = self.input.value.trim();

      if (!command) {
        self.hide();
        return;
      }

      // 명령어를 먼저 히스토리에 추가 (실행 전에 추가하여 항상 히스토리에 저장)
      // Vim 스타일: 명령어를 입력하면 히스토리에 추가됨
      self.addToHistory(command);

      // 콜백 실행
      try {
        const result = self.options.onExecute(command);
        if (result instanceof Promise) {
          // Promise가 완료될 때까지 대기
          // 타임아웃을 추가하여 무한 대기 방지 (5초로 단축)
          let timeoutId: number | null = null;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => {
              reject(new Error("Command execution timeout (5s)"));
            }, 5000);
          });

          try {
            // Promise.race로 타임아웃과 실제 Promise를 경쟁시킴
            yield* _(
              Effect.promise(() => {
                return Promise.race([
                  result.finally(() => {
                    // Promise가 완료되면 타임아웃 클리어
                    if (timeoutId !== null) {
                      window.clearTimeout(timeoutId);
                      timeoutId = null;
                    }
                  }),
                  timeoutPromise,
                ]);
              })
            );
          } catch (promiseError) {
            // 타임아웃 클리어
            if (timeoutId !== null) {
              window.clearTimeout(timeoutId);
              timeoutId = null;
            }

            logger.error(
              "CommandLine: Command execution timeout or error",
              promiseError
            );
            // 에러가 발생해도 히스토리는 이미 추가되었으므로 CommandLine만 닫기
            self.hide();
            return yield* _(
              Effect.fail(
                new CommandLineError({
                  message: `Command execution failed: ${
                    promiseError instanceof Error
                      ? promiseError.message
                      : String(promiseError)
                  }`,
                  code: "COMMAND_EXECUTION_FAILED",
                })
              )
            );
          }
        }
      } catch (error) {
        logger.error("CommandLine: Command execution failed", error);
        // 에러가 발생해도 히스토리는 이미 추가되었으므로 CommandLine만 닫기
        self.hide();
        return yield* _(
          Effect.fail(
            new CommandLineError({
              message: `Command execution failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
              code: "COMMAND_EXECUTION_FAILED",
            })
          )
        );
      }

      // Command Line 숨기기
      self.hide();
    }).pipe(
      Effect.catchAll((error) => {
        logger.error("CommandLine: Failed to execute command", error);
        // 에러가 발생해도 CommandLine은 닫기
        self.hide();
        return Effect.fail(error);
      })
    );
  }

  /**
   * 명령어 실행 (비동기 버전)
   * onExecute가 Promise를 반환할 수 있으므로 async로 처리
   */
  private async executeCommand(): Promise<void> {
    let timeoutId: number | null = null;

    try {
      // 타임아웃을 추가하여 무한 대기 방지 (5초로 단축)
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("Command execution timeout (5s)"));
        }, 5000);
      });

      // Effect 실행과 타임아웃을 경쟁시킴
      await Promise.race([
        Effect.runPromise(this.executeCommandEffect()).finally(() => {
          // Effect가 완료되면 타임아웃 클리어
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      // 타임아웃 클리어
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      // 에러는 이미 Effect.catchAll에서 처리됨
      logger.error("CommandLine: executeCommand failed", error);
      // 에러가 발생해도 CommandLine은 닫기 (무한 대기 방지)
      this.hide();
    }
  }

  /**
   * 취소
   */
  private cancel(): void {
    this.options.onCancel();
    this.hide();
  }

  /**
   * 히스토리 탐색
   */
  private navigateHistory(direction: number): void {
    if (!this.input) {
      return;
    }

    // 히스토리 로드 (최신 상태로 업데이트)
    // localStorage에서 최신 히스토리를 가져옴
    this.loadHistory();

    if (this.history.length === 0) {
      return;
    }

    if (this.historyIndex === -1) {
      // 현재 입력값 저장 (히스토리 시작 위치로 이동)
      // 히스토리는 최신이 맨 앞에 있으므로, -1에서 시작
      if (direction < 0) {
        // ArrowUp: 더 오래된 명령어로 이동 (history[0] = 가장 최근)
        // Vim 스타일: ArrowUp은 이전 명령어 (더 오래된)로 이동
        if (this.history.length > 0) {
          this.historyIndex = 0;
        } else {
          return; // 히스토리가 비어있으면 아무것도 하지 않음
        }
      } else {
        // ArrowDown: 이미 히스토리 끝에 있음 (현재 입력값 유지)
        return;
      }
    } else {
      // Vim 스타일 히스토리 탐색:
      // ArrowUp: 이전 명령어 (더 오래된) -> historyIndex 증가 (+1)
      // ArrowDown: 다음 명령어 (더 최근) -> historyIndex 감소 (-1)
      // 하지만 direction은 ArrowUp=-1, ArrowDown=+1로 전달되므로 반대로 처리
      this.historyIndex -= direction; // direction을 반대로 적용
    }

    // 범위 체크 및 조정
    if (this.historyIndex < 0) {
      // 히스토리 시작 위치 (현재 입력값)
      this.historyIndex = -1;
      this.input.value = "";
      return;
    } else if (this.historyIndex >= this.history.length) {
      // 히스토리 끝을 넘어가면 빈 값
      this.historyIndex = this.history.length;
      this.input.value = "";
      return;
    }

    // 히스토리에서 가져오기 (최신이 맨 앞에 있음)
    // historyIndex가 유효한 범위 내에 있는지 확인
    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      const historyValue = this.history[this.historyIndex];
      if (historyValue && typeof historyValue === "string") {
        // input 값 설정
        if (this.input) {
          this.input.value = historyValue;

          // input 값 설정 후 포커스 및 선택
          // Firefox에서도 제대로 작동하도록 단일 requestAnimationFrame 사용
          // Firefox는 이중 requestAnimationFrame에서 값이 리셋될 수 있음
          requestAnimationFrame(() => {
            if (this.input) {
              // Firefox에서 값이 리셋되는 경우를 방지하기 위해 확인 및 재설정
              // Firefox는 다른 브라우저와 다르게 requestAnimationFrame을 처리할 수 있음
              if (this.input.value !== historyValue) {
                logger.warn(
                  `CommandLine: Input value was reset in Firefox! Expected: "${historyValue}", Got: "${this.input.value}"`
                );
                // 다시 설정
                this.input.value = historyValue;
              }
              this.input.focus();
              this.input.setSelectionRange(0, this.input.value.length);
            }
          });
        } else {
          logger.warn(
            "CommandLine: Input element is null when setting history value"
          );
        }
      } else {
        if (this.input) {
          this.input.value = "";
        }
      }
    } else {
      if (this.input) {
        this.input.value = "";
      }
    }
  }

  /**
   * 히스토리에 추가
   */
  private addToHistory(command: string): void {
    // 중복 제거 (최근 것 유지)
    const index = this.history.indexOf(command);
    if (index !== -1) {
      this.history.splice(index, 1);
    }

    // 맨 앞에 추가
    this.history.unshift(command);

    // 최대 크기 제한
    if (this.history.length > this.options.maxHistorySize) {
      this.history = this.history.slice(0, this.options.maxHistorySize);
    }

    // localStorage에 저장
    this.saveHistory();
  }

  /**
   * 히스토리 가져오기
   */
  getHistory(): readonly string[] {
    return [...this.history];
  }

  /**
   * 히스토리 클리어
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
    this.saveHistory();
  }

  /**
   * 히스토리 저장 (localStorage)
   */
  private saveHistory(): void {
    try {
      const historyJson = JSON.stringify(this.history);
      localStorage.setItem("commandLineHistory", historyJson);
    } catch (e) {
      logger.error("Failed to save command line history", e);
    }
  }

  /**
   * 히스토리 로드 (localStorage)
   */
  private loadHistory(): void {
    try {
      const storedHistory = localStorage.getItem("commandLineHistory");
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        // 배열인지 확인
        if (Array.isArray(parsed)) {
          this.history = parsed;
        } else {
          logger.warn(
            "CommandLine: Invalid history format in localStorage",
            parsed
          );
          this.history = [];
        }
      } else {
        this.history = [];
      }
    } catch (e) {
      logger.error("Failed to load command line history", e);
      this.history = [];
    }
  }

  /**
   * Command Line 제거
   */
  destroy(): void {
    this.hide();
  }
}
