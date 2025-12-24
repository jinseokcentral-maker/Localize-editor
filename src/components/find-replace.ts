/**
 * 찾기/바꾸기 모듈
 * 
 * Cmd/Ctrl+F로 찾기, Cmd/Ctrl+H로 바꾸기 기능 제공
 */

import type { Translation } from "@/types/translation";

export interface FindReplaceOptions {
  translations: readonly Translation[];
  languages: readonly string[];
  onFind?: (matches: FindMatch[]) => void;
  onReplace?: (match: FindMatch, replacement: string) => void;
  onReplaceAll?: (matches: FindMatch[], replacement: string) => void;
  onClose?: () => void;
}

export interface FindMatch {
  rowIndex: number;
  columnId: string;
  matchedText: string;
  matchIndex: number; // 텍스트 내 매칭 위치
  matchLength: number; // 매칭된 텍스트 길이
}

export interface FindReplaceState {
  searchQuery: string;
  replaceQuery: string;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  isRegex: boolean;
  matches: FindMatch[];
  currentMatchIndex: number;
  scope: "all" | "current-row" | "selection";
}

export class FindReplace {
  private overlay: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  private state: FindReplaceState = {
    searchQuery: "",
    replaceQuery: "",
    isCaseSensitive: false,
    isWholeWord: false,
    isRegex: false,
    matches: [],
    currentMatchIndex: -1,
    scope: "all",
  };
  private translations: readonly Translation[] = [];
  private languages: readonly string[] = [];
  private callbacks: FindReplaceOptions;

  constructor(private options: FindReplaceOptions) {
    this.translations = options.translations;
    this.languages = options.languages;
    this.callbacks = options;
  }

  /**
   * 찾기/바꾸기 UI 열기
   */
  open(mode: "find" | "replace" = "find"): void {
    if (this.overlay) {
      // 이미 열려있으면 모드만 변경
      this.setMode(mode);
      return;
    }

    this.createUI();
    this.setMode(mode);
    this.attach();
  }

  /**
   * 찾기/바꾸기 UI 닫기
   */
  close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.container = null;
    }
    this.detach();
    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  }

  /**
   * 모드 설정 (찾기/바꾸기)
   */
  private setMode(mode: "find" | "replace"): void {
    if (!this.container) return;

    const replaceSection = this.container.querySelector(
      ".find-replace-replace-section"
    ) as HTMLElement;
    if (replaceSection) {
      replaceSection.style.display = mode === "replace" ? "block" : "none";
    }

    // 바꾸기 모드일 때 replace 입력 필드에 포커스
    if (mode === "replace") {
      const replaceInput = this.container.querySelector(
        ".find-replace-replace-input"
      ) as HTMLInputElement;
      if (replaceInput) {
        setTimeout(() => replaceInput.focus(), 0);
      }
    }
  }

  /**
   * UI 생성
   */
  private createUI(): void {
    this.overlay = document.createElement("div");
    this.overlay.className = "find-replace-overlay";
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 10000;
      display: flex;
      justify-content: center;
      padding-top: 20px;
    `;

    this.container = document.createElement("div");
    this.container.className = "find-replace-container";
    this.container.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
      padding-top: 48px;
      min-width: 500px;
      max-width: 600px;
      position: relative;
    `;

    // 찾기 섹션
    const findSection = document.createElement("div");
    findSection.className = "find-replace-find-section";
    findSection.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    `;

    const findInput = document.createElement("input");
    findInput.type = "text";
    findInput.className = "find-replace-find-input";
    findInput.placeholder = "Find";
    findInput.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    `;
    findInput.value = this.state.searchQuery;
    findInput.addEventListener("input", (e) => {
      this.state.searchQuery = (e.target as HTMLInputElement).value;
      this.performSearch();
    });
    findInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.close();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.goToNextMatch();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        this.goToPrevMatch();
      }
    });

    const findButtons = document.createElement("div");
    findButtons.style.cssText = `display: flex; gap: 4px;`;

    const prevButton = this.createButton("↑", "Previous", () => {
      this.goToPrevMatch();
    });
    const nextButton = this.createButton("↓", "Next", () => {
      this.goToNextMatch();
    });

    findButtons.appendChild(prevButton);
    findButtons.appendChild(nextButton);
    findSection.appendChild(findInput);
    findSection.appendChild(findButtons);

    // 바꾸기 섹션
    const replaceSection = document.createElement("div");
    replaceSection.className = "find-replace-replace-section";
    replaceSection.style.cssText = `
      display: none;
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    `;

    const replaceInput = document.createElement("input");
    replaceInput.type = "text";
    replaceInput.className = "find-replace-replace-input";
    replaceInput.placeholder = "Replace";
    replaceInput.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    `;
    replaceInput.value = this.state.replaceQuery;
    replaceInput.addEventListener("input", (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.state.replaceQuery = value;
    });
    replaceInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.close();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.replaceCurrent();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        this.replaceAll();
      }
    });

    const replaceButtons = document.createElement("div");
    replaceButtons.style.cssText = `display: flex; gap: 4px;`;

    const replaceButton = this.createButton("Replace", "Replace current", () => {
      this.replaceCurrent();
    });
    const replaceAllButton = this.createButton("Replace All", "Replace all", () => {
      this.replaceAll();
    });

    replaceButtons.appendChild(replaceButton);
    replaceButtons.appendChild(replaceAllButton);
    replaceSection.appendChild(replaceInput);
    replaceSection.appendChild(replaceButtons);

    // 옵션 섹션
    const optionsSection = document.createElement("div");
    optionsSection.style.cssText = `
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 12px;
      font-size: 12px;
    `;

    const caseSensitiveCheckbox = this.createCheckbox(
      "Aa",
      "Match case",
      this.state.isCaseSensitive,
      (checked) => {
        this.state.isCaseSensitive = checked;
        this.performSearch();
      }
    );
    const wholeWordCheckbox = this.createCheckbox(
      "Ab",
      "Match whole word",
      this.state.isWholeWord,
      (checked) => {
        this.state.isWholeWord = checked;
        this.performSearch();
      }
    );
    const regexCheckbox = this.createCheckbox(
      ".*",
      "Use regular expression",
      this.state.isRegex,
      (checked) => {
        this.state.isRegex = checked;
        this.performSearch();
      }
    );

    optionsSection.appendChild(caseSensitiveCheckbox);
    optionsSection.appendChild(wholeWordCheckbox);
    optionsSection.appendChild(regexCheckbox);

    // 결과 표시
    const resultSection = document.createElement("div");
    resultSection.className = "find-replace-result";
    resultSection.style.cssText = `
      font-size: 12px;
      color: #666;
      min-height: 20px;
    `;

    // 닫기 버튼
    const closeButton = document.createElement("button");
    closeButton.textContent = "×";
    closeButton.className = "find-replace-close-button";
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      pointer-events: auto;
    `;
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close();
    });

    this.container.style.position = "relative";
    this.container.appendChild(closeButton);
    this.container.appendChild(findSection);
    this.container.appendChild(replaceSection);
    this.container.appendChild(optionsSection);
    this.container.appendChild(resultSection);

    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);

    // 오버레이 클릭 시 닫기
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // 초기 포커스
    setTimeout(() => findInput.focus(), 0);
  }

  /**
   * 버튼 생성
   */
  private createButton(
    text: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.title = title;
    button.style.cssText = `
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 12px;
    `;
    button.addEventListener("click", onClick);
    return button;
  }

  /**
   * 체크박스 생성
   */
  private createCheckbox(
    label: string,
    title: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const container = document.createElement("label");
    container.style.cssText = `display: flex; align-items: center; gap: 4px; cursor: pointer;`;
    container.title = title;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;
    checkbox.style.cssText = `cursor: pointer;`;
    checkbox.addEventListener("change", (e) => {
      onChange((e.target as HTMLInputElement).checked);
    });

    const labelText = document.createElement("span");
    labelText.textContent = label;

    container.appendChild(checkbox);
    container.appendChild(labelText);
    return container;
  }

  /**
   * 검색 수행
   */
  private performSearch(): void {
    if (!this.state.searchQuery.trim()) {
      this.state.matches = [];
      this.state.currentMatchIndex = -1;
      this.updateResult();
      // 빈 검색어일 때도 onFind 콜백 호출 (빈 배열 전달)
      if (this.callbacks.onFind) {
        this.callbacks.onFind([]);
      }
      return;
    }

    const matches: FindMatch[] = [];
    const searchPattern = this.buildSearchPattern(this.state.searchQuery);

    this.translations.forEach((translation, rowIndex) => {
      const columns = [
        "key",
        "context",
        ...this.languages.map((lang) => `values.${lang}`),
      ];

      columns.forEach((columnId) => {
        const value = this.getCellValue(translation, columnId);
        if (!value) return;

        const matchesInText = this.findMatchesInText(value, searchPattern);
        matchesInText.forEach((match) => {
          matches.push({
            rowIndex,
            columnId,
            matchedText: value,
            matchIndex: match.index,
            matchLength: match.length,
          });
        });
      });
    });

    this.state.matches = matches;
    this.state.currentMatchIndex = matches.length > 0 ? 0 : -1;
    this.updateResult();

    if (this.callbacks.onFind) {
      this.callbacks.onFind(matches);
    }
  }

  /**
   * 검색 패턴 빌드
   */
  private buildSearchPattern(query: string): RegExp {
    let pattern = query;

    if (this.state.isRegex) {
      // 정규식 모드
      try {
        return new RegExp(
          pattern,
          this.state.isCaseSensitive ? "g" : "gi"
        );
      } catch (e) {
        // 잘못된 정규식이면 일반 텍스트로 처리
        pattern = this.escapeRegex(query);
      }
    } else {
      // 일반 텍스트 모드
      pattern = this.escapeRegex(query);
    }

    if (this.state.isWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    return new RegExp(
      pattern,
      this.state.isCaseSensitive ? "g" : "gi"
    );
  }

  /**
   * 정규식 특수 문자 이스케이프
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * 텍스트에서 매칭 찾기
   */
  private findMatchesInText(
    text: string,
    pattern: RegExp
  ): Array<{ index: number; length: number }> {
    const matches: Array<{ index: number; length: number }> = [];
    let match;

    // 정규식의 lastIndex를 초기화
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });

      // 무한 루프 방지
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * 셀 값 가져오기
   */
  private getCellValue(
    translation: Translation,
    columnId: string
  ): string | null {
    if (columnId === "key") {
      return translation.key;
    }
    if (columnId === "context") {
      return translation.context || null;
    }
    if (columnId.startsWith("values.")) {
      const lang = columnId.replace("values.", "");
      return translation.values[lang] || null;
    }
    return null;
  }

  /**
   * 결과 업데이트
   */
  private updateResult(): void {
    const resultSection = this.container?.querySelector(
      ".find-replace-result"
    ) as HTMLElement;
    if (!resultSection) return;

    if (this.state.matches.length === 0) {
      resultSection.textContent = this.state.searchQuery
        ? "No matches found"
        : "";
    } else {
      const current = this.state.currentMatchIndex + 1;
      const total = this.state.matches.length;
      resultSection.textContent = `${current} of ${total} matches`;
    }
  }

  /**
   * 다음 매칭으로 이동
   */
  private goToNextMatch(): void {
    if (this.state.matches.length === 0) return;

    this.state.currentMatchIndex =
      (this.state.currentMatchIndex + 1) % this.state.matches.length;
    this.updateResult();
    this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]);
  }

  /**
   * 이전 매칭으로 이동
   */
  private goToPrevMatch(): void {
    if (this.state.matches.length === 0) return;

    this.state.currentMatchIndex =
      this.state.currentMatchIndex <= 0
        ? this.state.matches.length - 1
        : this.state.currentMatchIndex - 1;
    this.updateResult();
    this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]);
  }

  /**
   * 매칭 위치로 이동
   */
  private navigateToMatch(match: FindMatch): void {
    // VirtualTableDiv에 콜백을 통해 전달
    // 실제 구현은 VirtualTableDiv에서 처리
    if (this.callbacks.onFind) {
      this.callbacks.onFind([match]);
    }
  }

  /**
   * 현재 매칭 바꾸기
   */
  private replaceCurrent(): void {
    if (
      this.state.currentMatchIndex < 0 ||
      this.state.currentMatchIndex >= this.state.matches.length
    ) {
      return;
    }

    // replaceInput에서 최신 값 가져오기
    const replaceInput = this.container?.querySelector(
      ".find-replace-replace-input"
    ) as HTMLInputElement;
    const replacement = replaceInput ? replaceInput.value : this.state.replaceQuery;

    const match = this.state.matches[this.state.currentMatchIndex];
    if (this.callbacks.onReplace) {
      this.callbacks.onReplace(match, replacement);
    }

    // 검색 다시 수행 (매칭 목록 업데이트)
    this.performSearch();
  }

  /**
   * 모든 매칭 바꾸기
   */
  private replaceAll(): void {
    if (this.state.matches.length === 0) return;

    // replaceInput에서 최신 값 가져오기
    const replaceInput = this.container?.querySelector(
      ".find-replace-replace-input"
    ) as HTMLInputElement;
    const replacement = replaceInput ? replaceInput.value : this.state.replaceQuery;

    if (this.callbacks.onReplaceAll) {
      this.callbacks.onReplaceAll(this.state.matches, replacement);
    }

    // 검색 다시 수행
    this.performSearch();
  }

  /**
   * 이벤트 리스너 등록
   */
  private attach(): void {
    // Escape 키로 닫기
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.overlay) {
        this.close();
      }
    };
    document.addEventListener("keydown", escapeHandler);
    (this.overlay as any).__escapeHandler = escapeHandler;
  }

  /**
   * 이벤트 리스너 해제
   */
  private detach(): void {
    if (this.overlay && (this.overlay as any).__escapeHandler) {
      document.removeEventListener(
        "keydown",
        (this.overlay as any).__escapeHandler
      );
    }
  }

  /**
   * 열려있는지 확인
   */
  isOpen(): boolean {
    return this.overlay !== null;
  }
}

