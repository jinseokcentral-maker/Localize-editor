/**
 * 명령어 등록 및 관리 모듈
 *
 * 명령 팔레트에서 사용할 명령어를 등록하고 관리합니다.
 */
export type EditorMode = "excel" | "vim" | "hybrid" | "all";
export interface Command {
    id: string;
    label: string;
    keywords: string[];
    shortcut?: string;
    execute: (args?: string[]) => void | Promise<void>;
    category: "navigation" | "edit" | "filter" | "mode" | "help" | "other";
    usageCount?: number;
    availableInModes?: EditorMode[];
    description?: string;
}
export interface CommandRegistryCallbacks {
    onCommandExecuted?: (commandId: string) => void;
}
export declare class CommandRegistry {
    private commands;
    private usageCounts;
    private storageKey;
    private callbacks;
    constructor(callbacks?: CommandRegistryCallbacks);
    /**
     * 명령어 등록
     */
    registerCommand(command: Command): void;
    /**
     * 명령어 조회
     */
    getCommandById(id: string): Command | undefined;
    /**
     * 모든 명령어 조회 (모드별 필터링)
     */
    getCommands(mode?: EditorMode): Command[];
    /**
     * 명령어 사용 횟수 증가
     */
    incrementUsage(commandId: string): void;
    /**
     * 자주 사용하는 명령어 조회
     */
    getPopularCommands(limit?: number, mode?: EditorMode): Command[];
    /**
     * 사용 횟수 로드 (localStorage)
     */
    private loadUsageCounts;
    /**
     * 명령어 등록 후 저장된 사용 횟수 반영
     */
    private applySavedUsageCount;
    /**
     * 사용 횟수 저장 (localStorage)
     */
    private saveUsageCounts;
    /**
     * 모든 명령어 초기화 (테스트용)
     */
    clear(): void;
}
//# sourceMappingURL=command-registry.d.ts.map