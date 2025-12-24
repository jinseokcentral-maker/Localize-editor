/**
 * 빠른 검색 UI 컴포넌트
 * 
 * 검색 바, 검색어 입력 필드, 검색 결과 수 표시
 */

export interface QuickSearchUICallbacks {
  onSearch?: (query: string) => void;
  onClose?: () => void;
  onNextMatch?: () => void;
  onPrevMatch?: () => void;
}

export class QuickSearchUI {
  private overlay: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private statusText: HTMLElement | null = null;
  private isOpen: boolean = false;
  private callbacks: QuickSearchUICallbacks;

  constructor(
    private container: HTMLElement,
    callbacks: QuickSearchUICallbacks = {}
  ) {
    this.callbacks = callbacks;
  }

  /**
   * 검색 UI 열기
   */
  open(): void {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.createUI();
    // DOM이 완전히 렌더링된 후 포커스 설정
    requestAnimationFrame(() => {
      if (this.input) {
        this.input.focus();
      }
    });
  }

  /**
   * 검색 UI 닫기
   */
  close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.destroyUI();
    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  }

  /**
   * 검색 결과 수 업데이트
   */
  updateStatus(current: number, total: number): void {
    if (!this.statusText) {
      return;
    }

    if (total === 0) {
      this.statusText.textContent = "No matches";
    } else {
      this.statusText.textContent = `${current + 1}/${total} matches`;
    }
  }

  /**
   * 검색어 가져오기
   */
  getQuery(): string {
    return this.input?.value || "";
  }

  /**
   * 검색어 설정
   */
  setQuery(query: string): void {
    if (this.input) {
      this.input.value = query;
    }
  }

  /**
   * UI 생성
   */
  private createUI(): void {
    // 오버레이 생성
    this.overlay = document.createElement("div");
    this.overlay.className = "quick-search-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-label", "Quick Search");

    // 검색 바 컨테이너
    const searchBar = document.createElement("div");
    searchBar.className = "quick-search-bar";

    // 검색 아이콘/라벨
    const label = document.createElement("div");
    label.className = "quick-search-label";
    label.textContent = "/";

    // 입력 필드
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "quick-search-input";
    this.input.placeholder = "Search... (e.g., keyword, key:keyword, en:keyword)";
    this.input.setAttribute("aria-label", "Search query");

    // 상태 텍스트
    this.statusText = document.createElement("div");
    this.statusText.className = "quick-search-status";
    this.statusText.textContent = "";

    // 닫기 버튼
    const closeButton = document.createElement("button");
    closeButton.className = "quick-search-close";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close search");
    closeButton.addEventListener("click", () => {
      this.close();
    });

    // 이벤트 리스너
    this.input.addEventListener("input", () => {
      if (this.callbacks.onSearch) {
        this.callbacks.onSearch(this.input?.value || "");
      }
    });

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      } else if (e.key === "Enter" || e.code === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        // Enter는 다음 매칭으로 이동
        // stopImmediatePropagation 제거: 다른 핸들러와의 충돌 방지
        if (this.callbacks.onNextMatch) {
          this.callbacks.onNextMatch();
        }
      }
    }); // bubble phase에서 처리 (기본값)

    // 조립
    searchBar.appendChild(label);
    searchBar.appendChild(this.input);
    searchBar.appendChild(this.statusText);
    searchBar.appendChild(closeButton);
    this.overlay.appendChild(searchBar);
    this.container.appendChild(this.overlay);

    // 애니메이션을 위한 약간의 지연
    requestAnimationFrame(() => {
      if (this.overlay) {
        this.overlay.classList.add("quick-search-overlay-open");
      }
    });
  }

  /**
   * UI 제거
   */
  private destroyUI(): void {
    if (this.overlay) {
      this.overlay.classList.remove("quick-search-overlay-open");
      setTimeout(() => {
        if (this.overlay && this.overlay.parentElement) {
          this.overlay.parentElement.removeChild(this.overlay);
        }
        this.overlay = null;
        this.input = null;
        this.statusText = null;
      }, 200); // 애니메이션 시간
    }
  }

  /**
   * 열림 상태 확인
   */
  isSearchMode(): boolean {
    return this.isOpen;
  }
}

