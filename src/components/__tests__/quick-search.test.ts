/**
 * QuickSearch 단위 테스트
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  QuickSearch,
  parseSearchQuery,
  findMatchIndices,
  type SearchQuery,
} from "../quick-search";
import type { Translation } from "@/types/translation";

describe("parseSearchQuery", () => {
  it("일반 검색어를 파싱해야 함", () => {
    const result = parseSearchQuery("keyword");
    expect(result).toEqual({ keyword: "keyword" });
  });

  it("공백이 있는 검색어를 트림해야 함", () => {
    const result = parseSearchQuery("  keyword  ");
    expect(result).toEqual({ keyword: "keyword" });
  });

  it("key 컬럼 검색을 파싱해야 함", () => {
    const result = parseSearchQuery("key:keyword");
    expect(result).toEqual({ keyword: "keyword", column: "key" });
  });

  it("context 컬럼 검색을 파싱해야 함", () => {
    const result = parseSearchQuery("context:keyword");
    expect(result).toEqual({ keyword: "keyword", column: "context" });
  });

  it("언어 컬럼 검색을 파싱해야 함", () => {
    const result = parseSearchQuery("en:keyword");
    expect(result).toEqual({ keyword: "keyword", column: "en" });
  });

  it("대소문자 무시하고 컬럼명을 소문자로 변환해야 함", () => {
    const result = parseSearchQuery("KEY:keyword");
    expect(result).toEqual({ keyword: "keyword", column: "key" });
  });

  it("빈 검색어는 null을 반환해야 함", () => {
    const result = parseSearchQuery("");
    expect(result).toBeNull();
  });

  it("공백만 있는 검색어는 null을 반환해야 함", () => {
    const result = parseSearchQuery("   ");
    expect(result).toBeNull();
  });
});

describe("findMatchIndices", () => {
  it("텍스트에서 검색어의 인덱스를 찾아야 함", () => {
    const indices = findMatchIndices("hello world", "world");
    expect(indices).toEqual([6, 7, 8, 9, 10]);
  });

  it("대소문자 무시하고 매칭해야 함", () => {
    const indices = findMatchIndices("Hello World", "world");
    expect(indices).toEqual([6, 7, 8, 9, 10]);
  });

  it("여러 매칭을 모두 찾아야 함", () => {
    const indices = findMatchIndices("hello hello", "hello");
    expect(indices).toEqual([0, 1, 2, 3, 4, 6, 7, 8, 9, 10]);
  });

  it("매칭이 없으면 빈 배열을 반환해야 함", () => {
    const indices = findMatchIndices("hello", "world");
    expect(indices).toEqual([]);
  });

  it("빈 텍스트는 빈 배열을 반환해야 함", () => {
    const indices = findMatchIndices("", "hello");
    expect(indices).toEqual([]);
  });
});

describe("QuickSearch", () => {
  let translations: Translation[];
  let languages: string[];

  beforeEach(() => {
    translations = [
      {
        id: "1",
        key: "button.save",
        context: "Save button",
        values: {
          en: "Save",
          ko: "저장",
        },
      },
      {
        id: "2",
        key: "button.cancel",
        context: "Cancel button",
        values: {
          en: "Cancel",
          ko: "취소",
        },
      },
      {
        id: "3",
        key: "welcome.message",
        context: "Welcome message",
        values: {
          en: "Welcome",
          ko: "환영합니다",
        },
      },
    ];

    languages = ["en", "ko"];
  });

  describe("findMatches", () => {
    it("전체 컬럼에서 검색해야 함", () => {
      const search = new QuickSearch({ translations, languages });
      const query: SearchQuery = { keyword: "save" };
      const matches = search.findMatches(query);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.columnId === "key")).toBe(true);
      expect(matches.some((m) => m.columnId === "values.en")).toBe(true);
    });

    it("key 컬럼만 검색해야 함", () => {
      const search = new QuickSearch({ translations, languages });
      const query: SearchQuery = { keyword: "button", column: "key" };
      const matches = search.findMatches(query);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => m.columnId === "key")).toBe(true);
      expect(matches.every((m) => m.matchedText.includes("button"))).toBe(true);
    });

    it("언어 컬럼만 검색해야 함", () => {
      const search = new QuickSearch({ translations, languages });
      const query: SearchQuery = { keyword: "Save", column: "en" };
      const matches = search.findMatches(query);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => m.columnId === "values.en")).toBe(true);
      expect(matches.every((m) => m.matchedText.includes("Save"))).toBe(true);
    });

    it("대소문자 무시하고 검색해야 함", () => {
      const search = new QuickSearch({ translations, languages });
      const query: SearchQuery = { keyword: "SAVE" };
      const matches = search.findMatches(query);

      expect(matches.length).toBeGreaterThan(0);
    });

    it("부분 일치 검색이 작동해야 함", () => {
      const search = new QuickSearch({ translations, languages });
      const query: SearchQuery = { keyword: "but" };
      const matches = search.findMatches(query);

      expect(matches.length).toBeGreaterThan(0);
    });

    it("빈 검색어는 빈 배열을 반환해야 함", () => {
      const search = new QuickSearch({ translations, languages });
      const query: SearchQuery = { keyword: "" };
      const matches = search.findMatches(query);

      expect(matches).toEqual([]);
    });

    it("존재하지 않는 컬럼 검색은 빈 배열을 반환해야 함", () => {
      const search = new QuickSearch({ translations, languages });
      const query: SearchQuery = { keyword: "test", column: "nonexistent" };
      const matches = search.findMatches(query);

      expect(matches).toEqual([]);
    });
  });

  describe("highlightText", () => {
    it("텍스트에 하이라이트를 적용해야 함", () => {
      const result = QuickSearch.highlightText("hello world", [0, 1, 2, 3, 4]);
      expect(result).toContain("<mark");
      expect(result).toContain("hello");
    });

    it("하이라이트 인덱스가 없으면 원본 텍스트를 반환해야 함", () => {
      const result = QuickSearch.highlightText("hello", []);
      expect(result).toBe("hello");
    });

    it("HTML을 이스케이프해야 함", () => {
      const result = QuickSearch.highlightText("<script>", [0, 1, 2]);
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;");
    });
  });
});




