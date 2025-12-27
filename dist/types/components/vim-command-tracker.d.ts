/**
 * Vim Command Tracker
 *
 * Vim 모드에서 입력된 키 시퀀스를 추적하고 표시하는 컴포넌트
 * 리팩토링 기조: Effect 기반 에러 처리, Logger 사용, 타입 안정성
 */
import { Effect } from "effect";
import { VimCommandTrackerError } from "@/types/errors";
/**
 * Vim 명령어 타입
 */
export type VimCommandType = "motion" | "operator" | "text-object" | "number" | "complete";
/**
 * Vim 명령어 정보
 */
export interface VimCommand {
    sequence: string;
    type: VimCommandType;
    description?: string;
}
/**
 * Vim Command Tracker 옵션
 */
export interface VimCommandTrackerOptions {
    maxSequenceLength?: number;
    autoClearDelay?: number;
    onCommandUpdate?: (command: VimCommand | null) => void;
}
/**
 * Vim Command Tracker 클래스
 */
export declare class VimCommandTracker {
    private currentSequence;
    private commandType;
    private autoClearTimer;
    private options;
    constructor(options?: VimCommandTrackerOptions);
    /**
     * 키 추가 (Effect 기반)
     */
    addKeyEffect(key: string): Effect.Effect<VimCommand | null, VimCommandTrackerError>;
    /**
     * 키 추가 (동기 버전, 기존 API 호환)
     */
    addKey(key: string): VimCommand | null;
    /**
     * 명령어 완료 (Effect 기반)
     */
    completeCommandEffect(): Effect.Effect<VimCommand, VimCommandTrackerError>;
    /**
     * 명령어 완료 (동기 버전)
     */
    completeCommand(): VimCommand;
    /**
     * 명령어 취소 (Effect 기반)
     */
    cancelCommandEffect(): Effect.Effect<void, never>;
    /**
     * 명령어 취소 (동기 버전)
     */
    cancelCommand(): void;
    /**
     * 현재 명령어 가져오기
     */
    getCurrentCommand(): VimCommand | null;
    /**
     * 명령어 클리어
     */
    clear(): void;
    /**
     * 명령어 타입 업데이트
     */
    private updateCommandType;
    /**
     * 명령어 생성
     */
    private createCommand;
    /**
     * 명령어 설명 가져오기
     */
    private getCommandDescription;
    /**
     * 자동 클리어 타이머 리셋
     */
    private resetAutoClearTimer;
}
//# sourceMappingURL=vim-command-tracker.d.ts.map