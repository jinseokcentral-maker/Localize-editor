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
  onFindMatches?: (keyword: string) => Array<{
    rowIndex: number;
    translation: any;
    score: number;
    matchedFields: Array<{
      field: string;
      matchedText: string;
      matchType: "exact" | "contains" | "fuzzy";
    }>;
  }>;
  onGotoMatch?: (match: {
    rowIndex: number;
    translation: any;
    score: number;
    matchedFields: Array<{
      field: string;
      matchedText: string;
      matchType: "exact" | "contains" | "fuzzy";
    }>;
  }) => void;
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

  // Fuzzy find 모드 관련 상태
  private isFuzzyFindMode: boolean = false;
  private fuzzyFindQuery: string = "";
  private fuzzyFindResults: Array<{
    rowIndex: number;
    translation: any;
    score: number;
    matchedFields: Array<{
      field: string;
      matchedText: string;
      matchType: "exact" | "contains" | "fuzzy";
    }>;
  }> = [];
  private fuzzyFindDebounceTimer: number | null = null;

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
    this.isFuzzyFindMode = false;
    this.fuzzyFindQuery = "";
    this.fuzzyFindQuoteChar = null;
    this.fuzzyFindResults = [];

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
    this.query = "";
    this.selectedIndex = 0;
    this.isFuzzyFindMode = false;
    this.fuzzyFindQuery = "";
    this.fuzzyFindQuoteChar = null;
    this.fuzzyFindResults = [];
    
    // Debounce 타이머 정리
    if (this.fuzzyFindDebounceTimer !== null) {
      clearTimeout(this.fuzzyFindDebounceTimer);
      this.fuzzyFindDebounceTimer = null;
    }

    // 입력 오버레이 제거
    if (this.inputOverlay) {
      this.inputOverlay.remove();
      this.inputOverlay = null;
    }

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
    // input의 텍스트 색상을 투명하게 만들어 오버레이가 보이도록 함
    // placeholder는 여전히 보이도록 함
    this.input.style.color = "transparent";
    this.input.style.caretColor = "#1e293b"; // 커서는 보이도록

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

    // Input을 감싸는 wrapper 생성 (오버레이를 위한 relative positioning)
    const inputWrapper = document.createElement("div");
    inputWrapper.style.position = "relative";
    inputWrapper.appendChild(this.input);
    this.container.appendChild(inputWrapper);
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
    if (this.inputOverlay) {
      this.inputOverlay.remove();
      this.inputOverlay = null;
    }
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

    // Fuzzy find 모드 감지
    const parsed = this.parseInput(query);
    if (parsed.isFuzzyFindMode) {
      this.isFuzzyFindMode = true;
      this.fuzzyFindQuery = parsed.fuzzyFindQuery;
      this.fuzzyFindQuoteChar = parsed.quoteChar;
      this.updateInputStyling(query);
      this.updateFuzzyFindResults();
    } else {
      this.isFuzzyFindMode = false;
      this.fuzzyFindQuery = "";
      this.fuzzyFindQuoteChar = null;
      this.updateInputStyling(query);
      this.fuzzyFindResults = [];
      this.updateCommands();
    }
  }

  /**
   * 입력 필드 스타일링 업데이트 (따옴표 이후 텍스트를 bold/italic로 표시)
   */
  private updateInputStyling(query: string): void {
    if (!this.input) return;

    // 기존 오버레이 제거
    if (this.inputOverlay) {
      this.inputOverlay.remove();
      this.inputOverlay = null;
    }

    const parsed = this.parseInput(query);
    if (!parsed.isFuzzyFindMode || !parsed.quoteChar) {
      // 일반 모드: 스타일링 없음
      return;
    }

    // 오버레이 생성 (input 위에 텍스트 렌더링)
    this.inputOverlay = document.createElement("div");
    this.inputOverlay.className = "command-palette-input-overlay";
    this.inputOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      padding: 12px 16px;
      font-size: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      white-space: pre;
      overflow: hidden;
      box-sizing: border-box;
      line-height: 1.5;
      border: none;
      background: transparent;
    `;

    // 텍스트 파싱 및 스타일링
    const quoteIndex = query.indexOf(parsed.quoteChar!);
    const beforeQuote = query.substring(0, quoteIndex + 1);
    const afterQuote = parsed.fuzzyFindQuery;

    // 따옴표 이전 텍스트 (일반 스타일)
    const beforeText = document.createTextNode(beforeQuote);
    const beforeSpan = document.createElement("span");
    beforeSpan.style.cssText = `color: #1e293b;`;
    beforeSpan.appendChild(beforeText);
    this.inputOverlay.appendChild(beforeSpan);

    // 따옴표 이후 텍스트 (bold + italic)
    if (afterQuote) {
      const styledSpan = document.createElement("span");
      styledSpan.style.cssText = `
        font-weight: bold;
        font-style: italic;
        color: #1e293b;
      `;
      styledSpan.textContent = afterQuote;
      this.inputOverlay.appendChild(styledSpan);
    }

    // input의 부모(wrapper)에 오버레이 추가
    if (this.input.parentElement) {
      this.input.parentElement.appendChild(this.inputOverlay);
    }
  }

  /**
   * 입력 파싱 (fuzzy find 모드 감지)
   * " 또는 ' 이후 텍스트는 검색 키워드로 처리
   * 닫는 따옴표가 있으면 제거 (검색 키워드에는 포함하지 않음)
   */
  private parseInput(query: string): {
    isFuzzyFindMode: boolean;
    fuzzyFindQuery: string;
    quoteChar: '"' | "'" | null;
  } {
    const trimmed = query.trim();

    // "goto "로 시작하는지 확인
    if (!trimmed.startsWith("goto ") && !trimmed.startsWith("go to ")) {
      return { isFuzzyFindMode: false, fuzzyFindQuery: "", quoteChar: null };
    }

    // "goto " 또는 "go to " 이후 부분 추출
    const afterGoto = trimmed.startsWith("goto ")
      ? trimmed.slice(5)
      : trimmed.slice(6);

    // " 또는 '로 시작하는지 확인
    let quoteChar: '"' | "'" | null = null;
    if (afterGoto.startsWith('"')) {
      quoteChar = '"';
    } else if (afterGoto.startsWith("'")) {
      quoteChar = "'";
    } else {
      return { isFuzzyFindMode: false, fuzzyFindQuery: "", quoteChar: null };
    }

    // 따옴표 이후 부분 추출
    const afterQuote = afterGoto.slice(1);

    // 닫는 따옴표가 있으면 제거 (검색 키워드에는 포함하지 않음)
    let searchQuery = afterQuote;
    if (afterQuote.endsWith(quoteChar)) {
      searchQuery = afterQuote.slice(0, -1);
    }

    return {
      isFuzzyFindMode: true,
      fuzzyFindQuery: searchQuery,
      quoteChar,
    };
  }

  /**
   * Fuzzy find 결과 업데이트
   */
  private updateFuzzyFindResults(): void {
    // Debounce: 150ms 후에 검색 실행
    if (this.fuzzyFindDebounceTimer !== null) {
      clearTimeout(this.fuzzyFindDebounceTimer);
    }

    this.fuzzyFindDebounceTimer = window.setTimeout(() => {
      // 따옴표 이후 텍스트가 있으면 검색 실행 (따옴표 닫힘 여부 무관)
      if (this.callbacks.onFindMatches && this.fuzzyFindQuery && this.fuzzyFindQuery.trim()) {
        this.fuzzyFindResults = this.callbacks.onFindMatches(
          this.fuzzyFindQuery.trim()
        );
        this.updateList();
      } else {
        this.fuzzyFindResults = [];
        this.updateList();
      }
      this.fuzzyFindDebounceTimer = null;
    }, 150);
  }

  /**
   * Fuzzy find 결과 리스트 UI 업데이트
   */
  private updateFuzzyFindList(): void {
    if (!this.list) return;

    // 검색 중 표시 (따옴표 이후 텍스트가 없을 때)
    if (!this.fuzzyFindQuery || this.fuzzyFindQuery.trim() === "") {
      const emptyItem = document.createElement("div");
      emptyItem.className = "command-palette-item command-palette-item-empty";
      emptyItem.textContent = "Type to search...";
      this.list.appendChild(emptyItem);
      // selectedIndex 초기화
      this.selectedIndex = 0;
      return;
    }

    // 검색 결과가 없는 경우
    if (this.fuzzyFindResults.length === 0) {
      const emptyItem = document.createElement("div");
      emptyItem.className = "command-palette-item command-palette-item-empty";
      emptyItem.textContent = "No matches found";
      this.list.appendChild(emptyItem);
      // selectedIndex 초기화
      this.selectedIndex = 0;
      return;
    }

    // 검색 결과 헤더
    const headerItem = document.createElement("div");
    headerItem.className = "command-palette-item command-palette-item-empty";
    headerItem.textContent = `Search Results (${this.fuzzyFindResults.length})`;
    this.list.appendChild(headerItem);

    // selectedIndex가 범위를 벗어나면 조정
    if (this.selectedIndex >= this.fuzzyFindResults.length) {
      this.selectedIndex = 0;
    }

    // 검색 결과 항목들
    this.fuzzyFindResults.forEach((result, index) => {
      const item = document.createElement("div");
      item.className = "command-palette-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", (index === this.selectedIndex).toString());

      if (index === this.selectedIndex) {
        item.classList.add("command-palette-item-selected");
      }

      // 매칭된 필드 정보 표시
      const label = document.createElement("div");
      label.className = "command-palette-item-label";
      
      // Key, Context, 또는 Value 중 매칭된 필드 표시
      const translation = result.translation;
      let displayText = "";
      if (result.matchedFields && result.matchedFields.length > 0) {
        const matchedField = result.matchedFields[0];
        if (matchedField.field === "key") {
          displayText = `Key: ${translation.key}`;
        } else if (matchedField.field === "context") {
          displayText = `Context: ${translation.context || ""}`;
        } else if (matchedField.field.startsWith("values.")) {
          const lang = matchedField.field.replace("values.", "");
          displayText = `${lang.toUpperCase()}: ${translation.values?.[lang] || ""}`;
        } else {
          displayText = translation.key || "";
        }
      } else {
        displayText = translation.key || "";
      }

      label.textContent = displayText;

      // Description (Row 번호)
      const desc = document.createElement("div");
      desc.className = "command-palette-item-description";
      desc.textContent = `Row ${result.rowIndex + 1}`;
      item.appendChild(desc);

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
   * 키보드 이벤트 처리
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const maxIndex = this.isFuzzyFindMode
      ? this.fuzzyFindResults.length - 1
      : this.filteredCommands.length - 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, maxIndex);
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

    // Fuzzy find 모드인 경우 검색 결과 표시
    if (this.isFuzzyFindMode) {
      this.updateFuzzyFindList();
      return;
    }

    // 일반 모드: 명령 목록 표시
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
    // Fuzzy find 모드인 경우 검색 결과로 이동
    if (this.isFuzzyFindMode) {
      if (this.fuzzyFindResults.length === 0) {
        return;
      }

      const selectedMatch = this.fuzzyFindResults[this.selectedIndex];
      if (selectedMatch && this.callbacks.onGotoMatch) {
        this.callbacks.onGotoMatch(selectedMatch);
      }
      this.close();
      return;
    }

    // 일반 모드: 명령 실행
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
    
    // commandId가 "search"인 경우
    if (commandId === "search") {
      if (parts[0] === "search") {
        // "search keyword" -> ["keyword"]
        // "search keyword1 keyword2" -> ["keyword1", "keyword2"]
        return parts.slice(1);
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

