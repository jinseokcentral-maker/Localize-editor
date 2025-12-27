/**
 * Logger 유틸리티
 *
 * 프로덕션 코드에서 console.log/error/warn을 대체하는 로깅 시스템
 * 개발 모드에서는 모든 로그를 표시하고, 프로덕션 모드에서는 에러만 표시
 */
export declare const LogLevel: {
    readonly DEBUG: 0;
    readonly INFO: 1;
    readonly WARN: 2;
    readonly ERROR: 3;
};
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
declare class Logger {
    private level;
    constructor();
    /**
     * 로그 레벨 설정
     */
    setLevel(level: LogLevel): void;
    /**
     * 현재 로그 레벨 가져오기
     */
    getLevel(): LogLevel;
    /**
     * DEBUG 레벨 로그
     */
    debug(...args: unknown[]): void;
    /**
     * INFO 레벨 로그
     */
    info(...args: unknown[]): void;
    /**
     * WARN 레벨 로그
     */
    warn(...args: unknown[]): void;
    /**
     * ERROR 레벨 로그
     */
    error(...args: unknown[]): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map