/**
 * Command Line 컴포넌트
 *
 * Vim의 `:` 명령어 모드를 위한 입력줄
 * 리팩토링 기조: Effect 기반 에러 처리, Logger 사용, 타입 안정성
 */
import { Effect } from "effect";
import { CommandLineError } from "@/types/errors";
/**
 * Command Line 옵션
 */
export interface CommandLineOptions {
    container: HTMLElement;
    onExecute?: (command: string) => void | Promise<void>;
    onCancel?: () => void;
    maxHistorySize?: number;
    placeholder?: string;
}
/**
 * Command Line 클래스
 */
export declare class CommandLine {
    private overlay;
    private input;
    private container;
    private options;
    private history;
    private historyIndex;
    private isVisible;
    constructor(options: CommandLineOptions);
    /**
     * Command Line 표시 (Effect 기반)
     */
    showEffect(initialValue?: string): Effect.Effect<void, CommandLineError>;
    /**
     * Command Line 표시 (동기 버전)
     */
    show(initialValue?: string): void;
    /**
     * Command Line 숨기기 (Effect 기반)
     */
    hideEffect(): Effect.Effect<void, never>;
    /**
     * Command Line 숨기기 (동기 버전)
     */
    hide(): void;
    /**
     * Command Line 표시 여부
     */
    getVisible(): boolean;
    /**
     * UI 생성
     */
    private createUI;
    /**
     * Input 이벤트 리스너 등록
     */
    private attachInputListeners;
    /**
     * 명령어 실행 (Effect 기반)
     */
    private executeCommandEffect;
    /**
     * 명령어 실행 (비동기 버전)
     * onExecute가 Promise를 반환할 수 있으므로 async로 처리
     */
    private executeCommand;
    /**
     * 취소
     */
    private cancel;
    /**
     * 히스토리 탐색
     */
    private navigateHistory;
    /**
     * 히스토리에 추가
     */
    private addToHistory;
    /**
     * 히스토리 가져오기
     */
    getHistory(): readonly string[];
    /**
     * 히스토리 클리어
     */
    clearHistory(): void;
    /**
     * 히스토리 저장 (localStorage)
     */
    private saveHistory;
    /**
     * 히스토리 로드 (localStorage)
     */
    private loadHistory;
    /**
     * Command Line 제거
     */
    destroy(): void;
}
//# sourceMappingURL=command-line.d.ts.map