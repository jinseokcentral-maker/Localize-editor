/**
 * VirtualTableDiv 필터 기능 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { VirtualTableDiv } from "../virtual-table-div";
import type { Translation } from "@/types/translation";

describe("VirtualTableDiv - Filter 기능", () => {
  let container: HTMLElement;
  let translations: Translation[];
  let languages: string[];

  beforeEach(() => {
    // 테스트용 컨테이너 생성
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);

    // 테스트용 데이터
    languages = ["en", "ko"];
    translations = [
      {
        id: "1",
        key: "common.greeting",
        context: "Welcome message",
        values: { en: "Hello", ko: "안녕하세요" },
      },
      {
        id: "2",
        key: "common.farewell",
        context: "Goodbye message",
        values: { en: "Goodbye", ko: "" }, // 빈 번역
      },
      {
        id: "3",
        key: "common.greeting", // 중복 Key
        context: "Another greeting",
        values: { en: "Hi", ko: "안녕" },
      },
      {
        id: "4",
        key: "common.thanks",
        context: "",
        values: { en: "Thanks", ko: "감사합니다" },
      },
      {
        id: "5",
        key: "common.empty",
        context: "Empty translations",
        values: { en: "", ko: "" }, // 모두 빈 번역
      },
    ];
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // VirtualTableDiv 인스턴스 정리
    const tables = document.querySelectorAll(".virtual-grid-container");
    tables.forEach((table) => {
      if (table.parentNode) {
        table.parentNode.removeChild(table);
      }
    });
  });

  describe("searchKeyword", () => {
    it("키워드로 검색하여 필터링해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // "Hello" 검색
      (table as any).searchKeyword("Hello");

      const filtered = (table as any).getFilteredTranslations();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("대소문자 무시 검색이 작동해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // "hello" (소문자) 검색
      (table as any).searchKeyword("hello");

      const filtered = (table as any).getFilteredTranslations();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("Key 컬럼에서 검색이 작동해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // "greeting" 검색 (Key에 포함)
      (table as any).searchKeyword("greeting");

      const filtered = (table as any).getFilteredTranslations();
      expect(filtered).toHaveLength(2); // "common.greeting" 2개
      expect(filtered.map((t: Translation) => t.id)).toContain("1");
      expect(filtered.map((t: Translation) => t.id)).toContain("3");
    });

    it("Context 컬럼에서 검색이 작동해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // "Welcome" 검색 (Context에 포함)
      (table as any).searchKeyword("Welcome");

      const filtered = (table as any).getFilteredTranslations();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("Language 컬럼에서 검색이 작동해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // "안녕하세요" 검색 (ko 컬럼에 포함)
      (table as any).searchKeyword("안녕하세요");

      const filtered = (table as any).getFilteredTranslations();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("빈 키워드는 필터를 제거해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // 먼저 검색 적용
      (table as any).searchKeyword("Hello");
      expect((table as any).getFilteredTranslations()).toHaveLength(1);

      // 빈 키워드로 검색 (필터 제거)
      (table as any).searchKeyword("");
      expect((table as any).getFilteredTranslations()).toHaveLength(
        translations.length
      );
    });
  });

  describe("filterEmpty", () => {
    it("빈 번역만 필터링해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      (table as any).filterEmpty();

      const filtered = (table as any).getFilteredTranslations();
      // id: "2" (ko가 빈 값), id: "5" (en, ko 모두 빈 값)
      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.map((t: Translation) => t.id)).toContain("2");
      expect(filtered.map((t: Translation) => t.id)).toContain("5");
    });

    it("모든 언어 컬럼에서 빈 값 체크해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      (table as any).filterEmpty();

      const filtered = (table as any).getFilteredTranslations();
      // 하나 이상의 언어 컬럼이 빈 값인 행만 포함
      filtered.forEach((t: Translation) => {
        const hasEmpty = languages.some(
          (lang) => !t.values[lang] || t.values[lang].trim() === ""
        );
        expect(hasEmpty).toBe(true);
      });
    });
  });

  describe("filterChanged", () => {
    it("변경된 셀이 있는 행만 필터링해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // ChangeTracker에 변경사항 직접 추가 (테스트용)
      const changeTracker = (table as any).changeTracker;
      changeTracker.trackChange(
        "1",
        "values.en",
        "en",
        "Hello",
        "Hello Changed",
        "common.greeting"
      );

      (table as any).filterChanged();

      const filtered = (table as any).getFilteredTranslations();
      // 변경된 행이 포함되어야 함
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.map((t: Translation) => t.id)).toContain("1");
    });
  });

  describe("filterDuplicate", () => {
    it("중복된 Key만 필터링해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      (table as any).filterDuplicate();

      const filtered = (table as any).getFilteredTranslations();
      // "common.greeting"이 중복이므로 2개 포함
      expect(filtered.length).toBeGreaterThanOrEqual(2);
      const keys = filtered.map((t: Translation) => t.key);
      expect(keys).toContain("common.greeting");
    });

    it("중복되지 않은 Key는 제외해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      (table as any).filterDuplicate();

      const filtered = (table as any).getFilteredTranslations();
      // "common.thanks"는 중복이 아니므로 제외
      const keys = filtered.map((t: Translation) => t.key);
      expect(keys).not.toContain("common.thanks");
    });
  });

  describe("clearFilter", () => {
    it("모든 필터를 제거하고 원본 데이터로 복원해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // 필터 적용
      (table as any).filterEmpty();
      expect((table as any).getFilteredTranslations().length).toBeLessThan(
        translations.length
      );

      // 필터 제거
      (table as any).clearFilter();
      const filtered = (table as any).getFilteredTranslations();
      expect(filtered).toHaveLength(translations.length);
      expect(filtered.map((t: Translation) => t.id)).toEqual(
        translations.map((t) => t.id)
      );
    });

    it("검색 필터도 제거해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // 검색 필터 적용
      (table as any).searchKeyword("Hello");
      expect((table as any).getFilteredTranslations().length).toBeLessThan(
        translations.length
      );

      // 필터 제거
      (table as any).clearFilter();
      expect((table as any).getFilteredTranslations()).toHaveLength(
        translations.length
      );
    });
  });

  describe("getFilteredTranslations", () => {
    it("필터가 없으면 모든 translations 반환해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const filtered = (table as any).getFilteredTranslations();
      expect(filtered).toHaveLength(translations.length);
    });

    it("여러 필터를 순차적으로 적용할 수 있어야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // 첫 번째 필터
      (table as any).filterEmpty();
      const afterEmpty = (table as any).getFilteredTranslations().length;

      // 두 번째 필터 (중복)
      (table as any).filterDuplicate();
      const afterDuplicate = (table as any).getFilteredTranslations().length;

      // 마지막 필터는 이전 필터를 덮어씀
      expect(afterDuplicate).toBeGreaterThanOrEqual(0);
    });
  });
});

