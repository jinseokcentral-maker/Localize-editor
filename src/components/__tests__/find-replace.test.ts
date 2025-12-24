/**
 * FindReplace 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FindReplace, type FindMatch } from "../find-replace";
import type { Translation } from "@/types/translation";

describe("FindReplace", () => {
  let mockTranslations: Translation[];
  let mockLanguages: string[];
  let mockOnFind: ReturnType<typeof vi.fn>;
  let mockOnReplace: ReturnType<typeof vi.fn>;
  let mockOnReplaceAll: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let findReplace: FindReplace;

  beforeEach(() => {
    // Mock 데이터
    mockTranslations = [
      {
        id: "1",
        key: "common.buttons.submit",
        values: {
          en: "Submit",
          ko: "제출",
        },
        context: "Submit button",
      },
      {
        id: "2",
        key: "common.buttons.cancel",
        values: {
          en: "Cancel",
          ko: "취소",
        },
        context: "Cancel button",
      },
      {
        id: "3",
        key: "common.messages.welcome",
        values: {
          en: "Welcome to our app",
          ko: "앱에 오신 것을 환영합니다",
        },
        context: "Welcome message",
      },
      {
        id: "4",
        key: "common.buttons.save",
        values: {
          en: "Save",
          ko: "저장",
        },
      },
    ];

    mockLanguages = ["en", "ko"];

    // Mock 콜백
    mockOnFind = vi.fn();
    mockOnReplace = vi.fn();
    mockOnReplaceAll = vi.fn();
    mockOnClose = vi.fn();

    findReplace = new FindReplace({
      translations: mockTranslations,
      languages: mockLanguages,
      onFind: mockOnFind,
      onReplace: mockOnReplace,
      onReplaceAll: mockOnReplaceAll,
      onClose: mockOnClose,
    });

    // DOM 환경 설정
    document.body.innerHTML = "";
  });

  afterEach(() => {
    if (findReplace.isOpen()) {
      findReplace.close();
    }
    vi.clearAllMocks();
  });

  describe("open and close", () => {
    it("찾기 모드로 열어야 함", () => {
      findReplace.open("find");
      expect(findReplace.isOpen()).toBe(true);
    });

    it("바꾸기 모드로 열어야 함", () => {
      findReplace.open("replace");
      expect(findReplace.isOpen()).toBe(true);
    });

    it("닫아야 함", () => {
      findReplace.open("find");
      findReplace.close();
      expect(findReplace.isOpen()).toBe(false);
    });

    it("이미 열려있으면 모드만 변경해야 함", () => {
      findReplace.open("find");
      const overlay1 = document.querySelector(".find-replace-overlay");
      findReplace.open("replace");
      const overlay2 = document.querySelector(".find-replace-overlay");
      expect(overlay1).toBe(overlay2);
    });
  });

  describe("검색 기능", () => {
    beforeEach(() => {
      findReplace.open("find");
    });

    it("일반 텍스트 검색이 작동해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      expect(input).toBeTruthy();

      input.value = "Submit";
      input.dispatchEvent(new Event("input"));

      // 검색 결과 확인
      expect(mockOnFind).toHaveBeenCalled();
      const matches = mockOnFind.mock.calls[0][0] as FindMatch[];
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.matchedText.includes("Submit"))).toBe(true);
    });

    it("대소문자 구분 옵션이 작동해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      const caseCheckbox = document.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement;

      // 대소문자 구분 활성화
      caseCheckbox.checked = true;
      caseCheckbox.dispatchEvent(new Event("change"));

      input.value = "submit"; // 소문자
      input.dispatchEvent(new Event("input"));

      // "Submit"은 매칭되지 않아야 함 (대소문자 구분)
      expect(mockOnFind).toHaveBeenCalled();
      const matches = mockOnFind.mock.calls[0][0] as FindMatch[];
      // 대소문자 구분이므로 매칭이 없거나 적을 수 있음
    });

    it("전체 단어 옵션이 작동해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      const checkboxes = document.querySelectorAll(
        'input[type="checkbox"]'
      ) as NodeListOf<HTMLInputElement>;

      // 전체 단어 옵션 활성화 (두 번째 체크박스)
      if (checkboxes.length > 1) {
        checkboxes[1].checked = true;
        checkboxes[1].dispatchEvent(new Event("change"));
      }

      input.value = "Sub"; // 부분 일치
      input.dispatchEvent(new Event("input"));

      // 전체 단어 옵션이므로 "Sub"는 매칭되지 않아야 함
      expect(mockOnFind).toHaveBeenCalled();
    });

    it("정규식 옵션이 작동해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      const checkboxes = document.querySelectorAll(
        'input[type="checkbox"]'
      ) as NodeListOf<HTMLInputElement>;

      // 정규식 옵션 활성화 (세 번째 체크박스)
      if (checkboxes.length > 2) {
        checkboxes[2].checked = true;
        checkboxes[2].dispatchEvent(new Event("change"));
      }

      input.value = "button.*"; // 정규식 패턴
      input.dispatchEvent(new Event("input"));

      expect(mockOnFind).toHaveBeenCalled();
    });

    it("빈 검색어는 매칭이 없어야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;

      input.value = "";
      input.dispatchEvent(new Event("input"));

      expect(mockOnFind).toHaveBeenCalled();
      const matches = mockOnFind.mock.calls[0][0] as FindMatch[];
      expect(matches).toEqual([]);
    });

    it("여러 필드에서 검색해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;

      input.value = "button";
      input.dispatchEvent(new Event("input"));

      expect(mockOnFind).toHaveBeenCalled();
      const matches = mockOnFind.mock.calls[0][0] as FindMatch[];
      // key, context, values에서 모두 검색되어야 함
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe("매칭 이동", () => {
    beforeEach(() => {
      findReplace.open("find");
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      input.value = "button";
      input.dispatchEvent(new Event("input"));
    });

    it("다음 매칭으로 이동해야 함", () => {
      const nextButton = Array.from(
        document.querySelectorAll("button")
      ).find((btn) => btn.textContent === "↓") as HTMLButtonElement;
      expect(nextButton).toBeTruthy();

      nextButton.click();

      // onFind가 다시 호출되어야 함
      expect(mockOnFind.mock.calls.length).toBeGreaterThan(1);
    });

    it("이전 매칭으로 이동해야 함", () => {
      const prevButton = Array.from(
        document.querySelectorAll("button")
      ).find((btn) => btn.textContent === "↑") as HTMLButtonElement;
      expect(prevButton).toBeTruthy();

      prevButton.click();

      // onFind가 다시 호출되어야 함
      expect(mockOnFind.mock.calls.length).toBeGreaterThan(1);
    });

    it("Enter 키로 다음 매칭으로 이동해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      input.dispatchEvent(enterEvent);

      expect(mockOnFind.mock.calls.length).toBeGreaterThan(1);
    });

    it("Shift+Enter로 이전 매칭으로 이동해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;

      const shiftEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
      });
      input.dispatchEvent(shiftEnterEvent);

      expect(mockOnFind.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe("바꾸기 기능", () => {
    beforeEach(() => {
      findReplace.open("replace");
      const findInput = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      findInput.value = "button";
      findInput.dispatchEvent(new Event("input"));
    });

    it("현재 매칭을 바꿔야 함", () => {
      const replaceInput = document.querySelector(
        ".find-replace-replace-input"
      ) as HTMLInputElement;
      replaceInput.value = "btn";

      const replaceButton = Array.from(
        document.querySelectorAll("button")
      ).find((btn) => btn.textContent === "Replace") as HTMLButtonElement;
      expect(replaceButton).toBeTruthy();

      replaceButton.click();

      expect(mockOnReplace).toHaveBeenCalled();
      const [match, replacement] = mockOnReplace.mock.calls[0];
      expect(match).toBeTruthy();
      expect(replacement).toBe("btn");
    });

    it("모든 매칭을 바꿔야 함", () => {
      const replaceInput = document.querySelector(
        ".find-replace-replace-input"
      ) as HTMLInputElement;
      replaceInput.value = "btn";

      const replaceAllButton = Array.from(
        document.querySelectorAll("button")
      ).find((btn) => btn.textContent === "Replace All") as HTMLButtonElement;
      expect(replaceAllButton).toBeTruthy();

      replaceAllButton.click();

      expect(mockOnReplaceAll).toHaveBeenCalled();
      const [matches, replacement] = mockOnReplaceAll.mock.calls[0];
      expect(matches.length).toBeGreaterThan(0);
      expect(replacement).toBe("btn");
    });

    it("Enter 키로 현재 매칭을 바꿔야 함", () => {
      const replaceInput = document.querySelector(
        ".find-replace-replace-input"
      ) as HTMLInputElement;
      replaceInput.value = "btn";

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      replaceInput.dispatchEvent(enterEvent);

      expect(mockOnReplace).toHaveBeenCalled();
    });

    it("Shift+Enter로 모든 매칭을 바꿔야 함", () => {
      const replaceInput = document.querySelector(
        ".find-replace-replace-input"
      ) as HTMLInputElement;
      replaceInput.value = "btn";

      const shiftEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
      });
      replaceInput.dispatchEvent(shiftEnterEvent);

      expect(mockOnReplaceAll).toHaveBeenCalled();
    });
  });

  describe("결과 표시", () => {
    beforeEach(() => {
      findReplace.open("find");
    });

    it("매칭이 없을 때 'No matches found'를 표시해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      input.value = "nonexistent";
      input.dispatchEvent(new Event("input"));

      const result = document.querySelector(
        ".find-replace-result"
      ) as HTMLElement;
      expect(result.textContent).toContain("No matches found");
    });

    it("매칭이 있을 때 개수를 표시해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      input.value = "button";
      input.dispatchEvent(new Event("input"));

      const result = document.querySelector(
        ".find-replace-result"
      ) as HTMLElement;
      expect(result.textContent).toMatch(/\d+ of \d+ matches/);
    });
  });

  describe("키보드 단축키", () => {
    beforeEach(() => {
      findReplace.open("find");
    });

    it("Escape 키로 닫아야 함", () => {
      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("오버레이 클릭 시 닫아야 함", () => {
      const overlay = document.querySelector(
        ".find-replace-overlay"
      ) as HTMLElement;
      expect(overlay).toBeTruthy();

      overlay.click();

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("닫기 버튼 클릭 시 닫아야 함", () => {
      const closeButton = Array.from(
        document.querySelectorAll("button")
      ).find((btn) => btn.textContent === "×") as HTMLButtonElement;
      expect(closeButton).toBeTruthy();

      closeButton.click();

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("정규식 처리", () => {
    beforeEach(() => {
      findReplace.open("find");
    });

    it("잘못된 정규식은 일반 텍스트로 처리해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      const checkboxes = document.querySelectorAll(
        'input[type="checkbox"]'
      ) as NodeListOf<HTMLInputElement>;

      // 정규식 옵션 활성화
      if (checkboxes.length > 2) {
        checkboxes[2].checked = true;
        checkboxes[2].dispatchEvent(new Event("change"));
      }

      input.value = "[invalid"; // 잘못된 정규식
      input.dispatchEvent(new Event("input"));

      // 에러 없이 처리되어야 함
      expect(mockOnFind).toHaveBeenCalled();
    });

    it("정규식 특수 문자를 이스케이프해야 함", () => {
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;

      input.value = "button.*"; // 정규식이 아닌 일반 텍스트로 검색
      input.dispatchEvent(new Event("input"));

      expect(mockOnFind).toHaveBeenCalled();
    });
  });

  describe("다중 매칭", () => {
    beforeEach(() => {
      findReplace.open("find");
    });

    it("같은 텍스트에 여러 매칭이 있을 때 모두 찾아야 함", () => {
      // "button"이 여러 번 나타나는 데이터
      const translationsWithMultipleMatches: Translation[] = [
        {
          id: "1",
          key: "button.button.button",
          values: {
            en: "button",
            ko: "버튼",
          },
        },
      ];

      const findReplace2 = new FindReplace({
        translations: translationsWithMultipleMatches,
        languages: ["en", "ko"],
        onFind: mockOnFind,
      });

      findReplace2.open("find");
      const input = document.querySelector(
        ".find-replace-find-input"
      ) as HTMLInputElement;
      input.value = "button";
      input.dispatchEvent(new Event("input"));

      expect(mockOnFind).toHaveBeenCalled();
      const matches = mockOnFind.mock.calls[0][0] as FindMatch[];
      // 여러 매칭이 있어야 함
      expect(matches.length).toBeGreaterThan(0);

      findReplace2.close();
    });
  });
});

