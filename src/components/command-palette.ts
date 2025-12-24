/**
 * 명령 팔레트 컴포넌트
 * 
 * VS Code 스타일의 명령 팔레트 UI
 */

import type { Command, EditorMode } from "./command-registry";
import { CommandRegistry } from "./command-registry";
import { searchCommands, type SearchResult } from "./fuzzy-search";
import "@/styles/command-palette.css";

export interface CommandPaletteCallbacks {
  onCommandExecute?: (command: Command, args?: string[]) => void;
  onClose?: () => void;
}

export class CommandPalette {
  private overlay: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLElement | null = null;
  private footer: HTMLElement | null = null;
  private isOpen: boolean = false;
  private query: string = "";
  private filteredCommands: SearchResult[] = [];
  private selectedIndex: number = 0;
  private currentMode: EditorMode = "excel";
  private commandRegistry: CommandRegistry;
  private callbacks: CommandPaletteCallbacks;

  constructor(
    commandRegistry: CommandRegistry,
    callbacks: CommandPaletteCallbacks = {}
  ) {
    this.commandRegistry = commandRegistry;
    this.callbacks = callbacks;
  }

  /**
   * 팔레트 열기
   */
  open(mode: EditorMode = "excel"): void {
    if (this.isOpen) {
      return;
    }

    this.currentMode = mode;
    this.isOpen = true;
    this.query = "";
    this.selectedIndex = 0;

    this.createUI();
    this.updateCommands();
    this.attachEventListeners();

    // 입력 필드에 포커스
    requestAnimationFrame(() => {
      this.input?.focus();
    });
  }

  /**
   * 팔레트 닫기
   */
  close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.detachEventListeners();
    this.removeUI();

    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  }

  /**
   * UI 생성
   */
  private createUI(): void {
    // Overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "command-palette-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-label", "Command Palette");
    this.overlay.setAttribute("aria-modal", "true");

    // Container
    this.container = document.createElement("div");
    this.container.className = "command-palette";

    // Input
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "command-palette-input";
    this.input.setAttribute("placeholder", "Type a command or search...");
    this.input.setAttribute("aria-label", "Command search input");
    this.input.setAttribute("autocomplete", "off");
    this.input.setAttribute("spellcheck", "false");

    // List
    this.list = document.createElement("div");
    this.list.className = "command-palette-list";
    this.list.setAttribute("role", "listbox");
    this.list.setAttribute("aria-label", "Command list");

    // Footer
    this.footer = document.createElement("div");
    this.footer.className = "command-palette-footer";
    this.footer.innerHTML = `
      <span class="command-palette-hint">
        <kbd>↑</kbd><kbd>↓</kbd> Navigate
        <kbd>Enter</kbd> Execute
        <kbd>Esc</kbd> Close
      </span>
    `;

    this.container.appendChild(this.input);
    this.container.appendChild(this.list);
    this.container.appendChild(this.footer);
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);

    // Overlay 클릭 시 닫기
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  }

  /**
   * UI 제거
   */
  private removeUI(): void {
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
      this.container = null;
      this.input = null;
      this.list = null;
      this.footer = null;
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  private attachEventListeners(): void {
    if (!this.input) return;

    // Input 이벤트
    this.input.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      this.handleInput(target.value);
    });

    // 키보드 이벤트
    this.input.addEventListener("keydown", (e) => {
      this.handleKeyDown(e);
    });
  }

  /**
   * 이벤트 리스너 해제
   */
  private detachEventListeners(): void {
    // 이벤트 리스너는 DOM 제거 시 자동으로 해제됨
  }

  /**
   * 입력 처리
   */
  private handleInput(query: string): void {
    this.query = query;
    this.selectedIndex = 0;
    this.updateCommands();
  }

  /**
   * 키보드 이벤트 처리
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selectedIndex = Math.min(
        this.selectedIndex + 1,
        this.filteredCommands.length - 1
      );
      this.updateList();
      this.scrollToSelected();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateList();
      this.scrollToSelected();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.executeSelectedCommand();
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    }
  }

  /**
   * 명령 목록 업데이트
   */
  private updateCommands(): void {
    const commands = this.commandRegistry.getCommands(this.currentMode);
    
    if (this.query.trim()) {
      // 검색 쿼리가 있으면 fuzzy search
      this.filteredCommands = searchCommands(this.query, commands);
    } else {
      // 검색 쿼리가 없으면 자주 사용하는 명령 표시
      const popularCommands = this.commandRegistry.getPopularCommands(
        10,
        this.currentMode
      );
      this.filteredCommands = popularCommands.map((cmd) => ({
        command: cmd,
        score: 1,
        matchedIndices: [],
      }));
    }

    // 최대 50개로 제한
    this.filteredCommands = this.filteredCommands.slice(0, 50);

    this.updateList();
  }

  /**
   * 리스트 UI 업데이트
   */
  private updateList(): void {
    if (!this.list) return;

    this.list.innerHTML = "";

    if (this.filteredCommands.length === 0) {
      const emptyItem = document.createElement("div");
      emptyItem.className = "command-palette-item command-palette-item-empty";
      emptyItem.textContent = "No commands found";
      this.list.appendChild(emptyItem);
      return;
    }

    this.filteredCommands.forEach((result, index) => {
      const item = document.createElement("div");
      item.className = "command-palette-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", (index === this.selectedIndex).toString());

      if (index === this.selectedIndex) {
        item.classList.add("command-palette-item-selected");
      }

      // Label
      const label = document.createElement("div");
      label.className = "command-palette-item-label";
      label.textContent = result.command.label;

      // Description
      if (result.command.description) {
        const desc = document.createElement("div");
        desc.className = "command-palette-item-description";
        desc.textContent = result.command.description;
        item.appendChild(desc);
      }

      // Shortcut
      if (result.command.shortcut) {
        const shortcut = document.createElement("div");
        shortcut.className = "command-palette-item-shortcut";
        shortcut.textContent = result.command.shortcut;
        item.appendChild(shortcut);
      }

      item.appendChild(label);

      // 클릭 이벤트
      item.addEventListener("click", () => {
        this.selectedIndex = index;
        this.executeSelectedCommand();
      });

      this.list.appendChild(item);
    });
  }

  /**
   * 선택된 항목으로 스크롤
   */
  private scrollToSelected(): void {
    if (!this.list) return;

    const items = this.list.querySelectorAll(".command-palette-item");
    const selectedItem = items[this.selectedIndex] as HTMLElement;
    
    if (!selectedItem) return;
    
    // scrollIntoView가 있으면 사용
    if (typeof selectedItem.scrollIntoView === "function") {
      try {
        selectedItem.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      } catch (e) {
        // jsdom 등에서 실패할 수 있으므로 무시
      }
    }
    
    // jsdom 환경 대비: 수동 스크롤 (offsetTop이 있는 경우만)
    if (this.list && typeof selectedItem.offsetTop !== "undefined") {
      try {
        const itemTop = selectedItem.offsetTop;
        const itemHeight = selectedItem.offsetHeight || 0;
        const itemBottom = itemTop + itemHeight;
        const listTop = this.list.scrollTop || 0;
        const listHeight = this.list.clientHeight || 0;
        const listBottom = listTop + listHeight;

        if (itemTop < listTop) {
          this.list.scrollTop = itemTop;
        } else if (itemBottom > listBottom) {
          this.list.scrollTop = itemBottom - listHeight;
        }
      } catch (e) {
        // jsdom에서 offsetTop이 제대로 작동하지 않을 수 있음
      }
    }
  }

  /**
   * 선택된 명령 실행
   */
  private executeSelectedCommand(): void {
    const result = this.filteredCommands[this.selectedIndex];
    if (!result) return;

    const command = result.command;
    
    // 사용 횟수 증가
    this.commandRegistry.incrementUsage(command.id);

    // 명령 실행
    try {
      // 쿼리에서 명령 ID와 인자를 분리
      const args = this.parseCommandArgs(this.query, command.id);
      command.execute(args);
      
      if (this.callbacks.onCommandExecute) {
        this.callbacks.onCommandExecute(command, args);
      }
    } catch (error) {
      console.error("Error executing command:", error);
    }

    this.close();
  }

  /**
   * 명령 인자 파싱
   */
  private parseCommandArgs(query: string, commandId: string): string[] {
    // "goto 100" -> ["100"]
    // "search keyword" -> ["keyword"]
    // "go to 100" -> ["100"] (공백 포함)
    const parts = query.trim().split(/\s+/);
    
    // commandId가 "goto"인 경우 "go"로 시작하는지도 확인
    if (commandId === "goto") {
      if (parts[0] === "goto" || (parts[0] === "go" && parts[1] === "to")) {
        return parts[0] === "goto" ? parts.slice(1) : parts.slice(2);
      }
    }
    
    if (parts[0] === commandId || parts[0].startsWith(commandId)) {
      return parts.slice(1);
    }
    return [];
  }

  /**
   * 팔레트가 열려있는지 확인
   */
  isPaletteOpen(): boolean {
    return this.isOpen;
  }
}

