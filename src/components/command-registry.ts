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

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private usageCounts: Map<string, number> = new Map();
  private storageKey = "command-palette-usage";

  constructor(private callbacks: CommandRegistryCallbacks = {}) {
    this.loadUsageCounts();
  }

  /**
   * 명령어 등록
   */
  registerCommand(command: Command): void {
    // 기본값 설정
    const fullCommand: Command = {
      ...command,
      usageCount: command.usageCount ?? 0,
      availableInModes: command.availableInModes ?? ["all"],
    };
    this.commands.set(command.id, fullCommand);
  }

  /**
   * 명령어 조회
   */
  getCommandById(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /**
   * 모든 명령어 조회 (모드별 필터링)
   */
  getCommands(mode?: EditorMode): Command[] {
    const allCommands = Array.from(this.commands.values());
    
    if (!mode || mode === "all") {
      return allCommands;
    }

    return allCommands.filter((cmd) => {
      const availableModes = cmd.availableInModes ?? ["all"];
      return availableModes.includes("all") || availableModes.includes(mode);
    });
  }

  /**
   * 명령어 사용 횟수 증가
   */
  incrementUsage(commandId: string): void {
    const currentCount = this.usageCounts.get(commandId) ?? 0;
    const newCount = currentCount + 1;
    this.usageCounts.set(commandId, newCount);
    
    const command = this.commands.get(commandId);
    if (command) {
      command.usageCount = newCount;
    }

    this.saveUsageCounts();

    if (this.callbacks.onCommandExecuted) {
      this.callbacks.onCommandExecuted(commandId);
    }
  }

  /**
   * 자주 사용하는 명령어 조회
   */
  getPopularCommands(limit: number = 10, mode?: EditorMode): Command[] {
    const commands = this.getCommands(mode);
    
    return commands
      .sort((a, b) => {
        const aCount = this.usageCounts.get(a.id) ?? 0;
        const bCount = this.usageCounts.get(b.id) ?? 0;
        return bCount - aCount;
      })
      .slice(0, limit);
  }

  /**
   * 사용 횟수 로드 (localStorage)
   */
  private loadUsageCounts(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const counts = JSON.parse(stored) as Record<string, number>;
        this.usageCounts = new Map(Object.entries(counts));
        
        // 명령어에 사용 횟수 반영
        this.usageCounts.forEach((count, commandId) => {
          const command = this.commands.get(commandId);
          if (command) {
            command.usageCount = count;
          }
        });
      }
    } catch (error) {
      console.warn("Failed to load command usage counts:", error);
    }
  }

  /**
   * 사용 횟수 저장 (localStorage)
   */
  private saveUsageCounts(): void {
    try {
      const counts = Object.fromEntries(this.usageCounts);
      localStorage.setItem(this.storageKey, JSON.stringify(counts));
    } catch (error) {
      console.warn("Failed to save command usage counts:", error);
    }
  }

  /**
   * 모든 명령어 초기화 (테스트용)
   */
  clear(): void {
    this.commands.clear();
    this.usageCounts.clear();
    localStorage.removeItem(this.storageKey);
  }
}

