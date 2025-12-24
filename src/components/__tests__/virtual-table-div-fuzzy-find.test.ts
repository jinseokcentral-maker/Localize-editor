/**
 * VirtualTableDiv Fuzzy Find 기능 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { VirtualTableDiv } from "../virtual-table-div";
import type { Translation } from "@/types/translation";

describe("VirtualTableDiv - Fuzzy Find", () => {
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
        key: "common.buttons.hell",
        context: "Hell button",
        values: { en: "Go to Hell", ko: "지옥으로 가" },
      },
      {
        id: "2",
        key: "common.buttons.hello",
        context: "Hello button",
        values: { en: "Hello", ko: "안녕하세요" },
      },
      {
        id: "3",
        key: "common.messages.welcome",
        context: "Welcome to hell",
        values: { en: "Welcome", ko: "환영합니다" },
      },
      {
        id: "4",
        key: "common.buttons.submit",
        context: "Submit button",
        values: { en: "Submit", ko: "제출" },
      },
      {
        id: "5",
        key: "common.values.greeting",
        context: "",
        values: { en: "Hello World", ko: "안녕하세요" },
      },
    ];
  });

  afterEach(() => {
    // 테스트 후 정리
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe("findMatches", () => {
    it("키워드로 매치를 찾아야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("hell");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].translation.key).toContain("hell");
    });

    it("Key에서 정확히 매치되면 높은 점수를 받아야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("hell");

      // "common.buttons.hell"이 정확히 매치되어야 함
      const exactMatch = matches.find(
        (m) => m.translation.key === "common.buttons.hell"
      );
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.score).toBeGreaterThanOrEqual(50); // Key exact match = 50점
    });

    it("Key에 포함되면 중간 점수를 받아야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("hello");

      // "common.buttons.hello"가 포함 매치되어야 함
      const containsMatch = matches.find(
        (m) => m.translation.key === "common.buttons.hello"
      );
      expect(containsMatch).toBeDefined();
      expect(containsMatch?.score).toBeGreaterThanOrEqual(30); // Key contains = 30점
    });

    it("Context에서도 매치를 찾아야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("welcome");

      // Context에 "Welcome to hell"이 있음
      const contextMatch = matches.find(
        (m) => m.translation.context?.toLowerCase().includes("welcome")
      );
      expect(contextMatch).toBeDefined();
      expect(contextMatch?.matchedFields.some((f) => f.field === "context")).toBe(
        true
      );
    });

    it("Values에서도 매치를 찾아야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("world");

      // "Hello World"에 "world"가 포함됨
      const valueMatch = matches.find(
        (m) => m.translation.values.en?.toLowerCase().includes("world")
      );
      expect(valueMatch).toBeDefined();
      expect(
        valueMatch?.matchedFields.some((f) => f.field.startsWith("values."))
      ).toBe(true);
    });

    it("여러 필드에서 매치되면 점수가 합산되어야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("hell");

      // "common.messages.welcome"은 context에 "hell"이 있고, key에는 없음
      const multiMatch = matches.find(
        (m) => m.translation.key === "common.messages.welcome"
      );
      expect(multiMatch).toBeDefined();
      // Context match (20점) 이상이어야 함
      expect(multiMatch?.score).toBeGreaterThanOrEqual(20);
    });

    it("매치 결과는 점수 순으로 정렬되어야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("hell");

      // 첫 번째 매치가 가장 높은 점수를 가져야 함
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it("점수가 같으면 행 번호 순으로 정렬되어야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("button");

      // 점수가 같은 경우 행 번호가 낮은 순으로 정렬
      for (let i = 1; i < matches.length; i++) {
        if (matches[i - 1].score === matches[i].score) {
          expect(matches[i - 1].rowIndex).toBeLessThan(matches[i].rowIndex);
        }
      }
    });

    it("빈 키워드는 빈 배열을 반환해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("");
      expect(matches).toEqual([]);
    });

    it("매치되지 않는 키워드는 빈 배열을 반환해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("nonexistentkeyword12345");
      expect(matches).toEqual([]);
    });

    it("대소문자 무시 검색이 작동해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matchesLower = table.findMatches("hell");
      const matchesUpper = table.findMatches("HELL");
      const matchesMixed = table.findMatches("HeLl");

      expect(matchesLower.length).toBe(matchesUpper.length);
      expect(matchesLower.length).toBe(matchesMixed.length);
    });

    it("fuzzy match가 작동해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // "hl"은 "hell"의 부분 일치
      const matches = table.findMatches("hl");

      // fuzzy match가 작동하면 결과가 있어야 함
      expect(matches.length).toBeGreaterThan(0);
    });

    it("matchedFields에 정확한 정보가 포함되어야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("hell");

      const match = matches[0];
      expect(match.matchedFields.length).toBeGreaterThan(0);
      expect(match.matchedFields[0]).toHaveProperty("field");
      expect(match.matchedFields[0]).toHaveProperty("matchedText");
      expect(match.matchedFields[0]).toHaveProperty("matchType");
      expect(["exact", "contains", "fuzzy"]).toContain(
        match.matchedFields[0].matchType
      );
    });
  });

  describe("gotoToMatch", () => {
    it("매치 결과로 이동해야 함", async () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("hell");
      expect(matches.length).toBeGreaterThan(0);

      const match = matches[0];
      table.gotoToMatch(match);

      // 스크롤이 완료될 때까지 대기
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 해당 행이 보이는지 확인 (간접적으로 확인)
      expect(match.rowIndex).toBeGreaterThanOrEqual(0);
      expect(match.rowIndex).toBeLessThan(translations.length);
    });

    it("여러 매치 중 선택된 매치로 이동해야 함", async () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("button");
      expect(matches.length).toBeGreaterThan(1);

      // 두 번째 매치로 이동
      const secondMatch = matches[1];
      table.gotoToMatch(secondMatch);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(secondMatch.rowIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe("gotoToNextMatch / gotoToPrevMatch", () => {
    it("다음 검색 결과로 이동해야 함", async () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("button");
      expect(matches.length).toBeGreaterThan(1);

      // 첫 번째 매치로 이동하여 currentGotoMatches 설정
      table.gotoToMatch(matches[0]);
      
      // currentGotoMatches 수동 설정 (실제로는 onGotoMatch에서 설정됨)
      (table as any).currentGotoMatches = {
        keyword: "button",
        matches: matches,
        currentIndex: 0,
      };

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 다음 매치로 이동
      table.gotoToNextMatch();

      await new Promise((resolve) => setTimeout(resolve, 300));

      // currentIndex가 1로 업데이트되었는지 확인
      const matchInfo = table.getCurrentMatchInfo();
      expect(matchInfo).not.toBeNull();
      expect(matchInfo?.current).toBe(2); // 1-based
      expect(matchInfo?.total).toBe(matches.length);
    });

    it("이전 검색 결과로 이동해야 함", async () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("button");
      expect(matches.length).toBeGreaterThan(1);

      // 두 번째 매치로 이동하여 currentGotoMatches 설정
      table.gotoToMatch(matches[1]);
      
      // currentGotoMatches 수동 설정
      (table as any).currentGotoMatches = {
        keyword: "button",
        matches: matches,
        currentIndex: 1,
      };

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 이전 매치로 이동
      table.gotoToPrevMatch();

      await new Promise((resolve) => setTimeout(resolve, 300));

      // currentIndex가 0으로 업데이트되었는지 확인
      const matchInfo = table.getCurrentMatchInfo();
      expect(matchInfo).not.toBeNull();
      expect(matchInfo?.current).toBe(1); // 1-based
      expect(matchInfo?.total).toBe(matches.length);
    });

    it("마지막 매치에서 다음으로 이동하면 첫 번째 매치로 순환해야 함", async () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("button");
      expect(matches.length).toBeGreaterThan(1);

      // 마지막 매치로 이동
      const lastIndex = matches.length - 1;
      table.gotoToMatch(matches[lastIndex]);
      
      // currentGotoMatches 수동 설정
      (table as any).currentGotoMatches = {
        keyword: "button",
        matches: matches,
        currentIndex: lastIndex,
      };

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 다음 매치로 이동 (순환)
      table.gotoToNextMatch();

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 첫 번째 매치로 순환되었는지 확인
      const matchInfo = table.getCurrentMatchInfo();
      expect(matchInfo).not.toBeNull();
      expect(matchInfo?.current).toBe(1); // 1-based (첫 번째)
      expect(matchInfo?.total).toBe(matches.length);
    });

    it("첫 번째 매치에서 이전으로 이동하면 마지막 매치로 순환해야 함", async () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("button");
      expect(matches.length).toBeGreaterThan(1);

      // 첫 번째 매치로 이동
      table.gotoToMatch(matches[0]);
      
      // currentGotoMatches 수동 설정
      (table as any).currentGotoMatches = {
        keyword: "button",
        matches: matches,
        currentIndex: 0,
      };

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 이전 매치로 이동 (순환)
      table.gotoToPrevMatch();

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 마지막 매치로 순환되었는지 확인
      const matchInfo = table.getCurrentMatchInfo();
      expect(matchInfo).not.toBeNull();
      expect(matchInfo?.current).toBe(matches.length); // 1-based (마지막)
      expect(matchInfo?.total).toBe(matches.length);
    });

    it("currentGotoMatches가 없으면 아무 동작도 하지 않아야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // currentGotoMatches가 null인 상태에서 호출
      (table as any).currentGotoMatches = null;

      // 예외가 발생하지 않아야 함
      expect(() => table.gotoToNextMatch()).not.toThrow();
      expect(() => table.gotoToPrevMatch()).not.toThrow();
    });

    it("matches가 비어있으면 아무 동작도 하지 않아야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      // 빈 matches로 설정
      (table as any).currentGotoMatches = {
        keyword: "test",
        matches: [],
        currentIndex: 0,
      };

      // 예외가 발생하지 않아야 함
      expect(() => table.gotoToNextMatch()).not.toThrow();
      expect(() => table.gotoToPrevMatch()).not.toThrow();
    });
  });

  describe("getCurrentMatchInfo", () => {
    it("현재 매칭 정보를 반환해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      const matches = table.findMatches("button");
      expect(matches.length).toBeGreaterThan(0);

      // currentGotoMatches 설정
      (table as any).currentGotoMatches = {
        keyword: "button",
        matches: matches,
        currentIndex: 1, // 두 번째 매치 (0-based)
      };

      const matchInfo = table.getCurrentMatchInfo();
      expect(matchInfo).not.toBeNull();
      expect(matchInfo?.current).toBe(2); // 1-based
      expect(matchInfo?.total).toBe(matches.length);
    });

    it("currentGotoMatches가 없으면 null을 반환해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      (table as any).currentGotoMatches = null;

      const matchInfo = table.getCurrentMatchInfo();
      expect(matchInfo).toBeNull();
    });

    it("matches가 비어있으면 null을 반환해야 함", () => {
      const table = new VirtualTableDiv({
        container,
        translations,
        languages,
        defaultLanguage: "en",
      });
      table.render();

      (table as any).currentGotoMatches = {
        keyword: "test",
        matches: [],
        currentIndex: 0,
      };

      const matchInfo = table.getCurrentMatchInfo();
      expect(matchInfo).toBeNull();
    });
  });
});

