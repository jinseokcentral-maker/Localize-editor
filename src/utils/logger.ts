/**
 * Logger 유틸리티
 *
 * 프로덕션 코드에서 console.log/error/warn을 대체하는 로깅 시스템
 * 개발 모드에서는 모든 로그를 표시하고, 프로덕션 모드에서는 에러만 표시
 */

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

class Logger {
  private level: LogLevel;

  constructor() {
    // 개발 모드에서는 DEBUG, 프로덕션에서는 WARN
    this.level =
      import.meta.env?.MODE === "production" ? LogLevel.WARN : LogLevel.DEBUG;
  }

  /**
   * 로그 레벨 설정
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 현재 로그 레벨 가져오기
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * DEBUG 레벨 로그
   */
  debug(...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log("[DEBUG]", ...args);
    }
  }

  /**
   * INFO 레벨 로그
   */
  info(...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log("[INFO]", ...args);
    }
  }

  /**
   * WARN 레벨 로그
   */
  warn(...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn("[WARN]", ...args);
    }
  }

  /**
   * ERROR 레벨 로그
   */
  error(...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error("[ERROR]", ...args);
    }
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();
