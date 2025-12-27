/**
 * Command Palette Fuzzy Find 기능 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CommandPalette } from "../command-palette";
import { CommandRegistry } from "../command-registry";
import { parseFuzzyFindInput, type FuzzyFindMatch } from "../command-palette-fuzzy-find";

describe("CommandPalette - Fuzzy Find", () => {
  let registry: CommandRegistry;
  let palette: CommandPalette;
  let mockFindMatches: ReturnType<typeof vi.fn<(keyword: string) => FuzzyFindMatch[]>>;
  let mockGotoMatch: ReturnType<typeof vi.fn<(match: FuzzyFindMatch) => void>>;

  beforeEach(() => {
    registry = new CommandRegistry();
    mockFindMatches = vi.fn<(keyword: string) => FuzzyFindMatch[]>(() => []);
    mockGotoMatch = vi.fn<(match: FuzzyFindMatch) => void>();

    palette = new CommandPalette(registry, {
      onFindMatches: mockFindMatches,
      onGotoMatch: mockGotoMatch,
    });
  });

  describe("parseFuzzyFindInput", () => {
    it("goto \"로 시작하면 fuzzy find 모드로 감지해야 함", () => {
      const parsed = parseFuzzyFindInput('goto "');
      expect(parsed.isFuzzyFindMode).toBe(true);
      expect(parsed.fuzzyFindQuery).toBe("");
      expect(parsed.quoteChar).toBe('"');
    });

    it("goto \"h로 시작하면 fuzzy find 모드로 감지하고 쿼리를 추출해야 함", () => {
      const parsed = parseFuzzyFindInput('goto "h');
      expect(parsed.isFuzzyFindMode).toBe(true);
      expect(parsed.fuzzyFindQuery).toBe("h");
      expect(parsed.quoteChar).toBe('"');
    });

    it("goto \"hell로 시작하면 fuzzy find 모드로 감지하고 쿼리를 추출해야 함", () => {
      const parsed = parseFuzzyFindInput('goto "hell');
      expect(parsed.isFuzzyFindMode).toBe(true);
      expect(parsed.fuzzyFindQuery).toBe("hell");
      expect(parsed.quoteChar).toBe('"');
    });

    it("goto \"hell\"로 완성되면 fuzzy find 모드로 감지하고 쿼리를 추출해야 함", () => {
      const parsed = parseFuzzyFindInput('goto "hell"');
      expect(parsed.isFuzzyFindMode).toBe(true);
      expect(parsed.fuzzyFindQuery).toBe("hell");
      expect(parsed.quoteChar).toBe('"');
    });

    it("go to \"hell\"도 fuzzy find 모드로 감지해야 함", () => {
      const parsed = parseFuzzyFindInput('go to "hell"');
      expect(parsed.isFuzzyFindMode).toBe(true);
      expect(parsed.fuzzyFindQuery).toBe("hell");
      expect(parsed.quoteChar).toBe('"');
    });

    it("goto 10은 fuzzy find 모드가 아니어야 함", () => {
      const parsed = parseFuzzyFindInput("goto 10");
      expect(parsed.isFuzzyFindMode).toBe(false);
      expect(parsed.fuzzyFindQuery).toBe("");
      expect(parsed.quoteChar).toBe(null);
    });

    it("goto top은 fuzzy find 모드가 아니어야 함", () => {
      const parsed = parseFuzzyFindInput("goto top");
      expect(parsed.isFuzzyFindMode).toBe(false);
      expect(parsed.fuzzyFindQuery).toBe("");
      expect(parsed.quoteChar).toBe(null);
    });

    it("다른 명령은 fuzzy find 모드가 아니어야 함", () => {
      const parsed = parseFuzzyFindInput("search keyword");
      expect(parsed.isFuzzyFindMode).toBe(false);
      expect(parsed.fuzzyFindQuery).toBe("");
      expect(parsed.quoteChar).toBe(null);
    });
  });

  describe("handleInput", () => {
    it("goto \"를 입력하면 fuzzy find 모드로 전환해야 함", () => {
      (palette as any).handleInput('goto "');
      expect((palette as any).isFuzzyFindMode).toBe(true);
      expect((palette as any).fuzzyFindQuery).toBe("");
    });

    it("goto \"hell을 입력하면 fuzzy find 모드로 전환하고 쿼리를 저장해야 함", () => {
      (palette as any).handleInput('goto "hell');
      expect((palette as any).isFuzzyFindMode).toBe(true);
      expect((palette as any).fuzzyFindQuery).toBe("hell");
    });

    it("일반 명령 입력 시 fuzzy find 모드를 해제해야 함", () => {
      (palette as any).handleInput('goto "hell');
      expect((palette as any).isFuzzyFindMode).toBe(true);

      (palette as any).handleInput("search keyword");
      expect((palette as any).isFuzzyFindMode).toBe(false);
      expect((palette as any).fuzzyFindQuery).toBe("");
    });
  });

  describe("updateFuzzyFindResults", () => {
    it("검색 쿼리가 있으면 onFindMatches를 호출해야 함", async () => {
      mockFindMatches.mockReturnValue([
        {
          rowIndex: 0,
          translation: { id: "1", key: "test" },
          score: 50,
          matchedFields: [],
        },
      ]);

      (palette as any).fuzzyFindQuery = "test";
      (palette as any).updateFuzzyFindResults();

      // Debounce 대기
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockFindMatches).toHaveBeenCalledWith("test");
    });

    it("검색 쿼리가 없으면 빈 배열을 설정해야 함", async () => {
      (palette as any).fuzzyFindQuery = "";
      (palette as any).updateFuzzyFindResults();

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect((palette as any).fuzzyFindResults).toEqual([]);
    });

    it("debounce가 작동해야 함", async () => {
      (palette as any).fuzzyFindQuery = "test";
      (palette as any).updateFuzzyFindResults();
      (palette as any).updateFuzzyFindResults();
      (palette as any).updateFuzzyFindResults();

      await new Promise((resolve) => setTimeout(resolve, 200));

      // debounce로 인해 한 번만 호출되어야 함
      expect(mockFindMatches).toHaveBeenCalledTimes(1);
    });
  });

  describe("executeSelectedCommand (fuzzy find mode)", () => {
    it("fuzzy find 모드에서 검색 결과가 없으면 아무 동작도 하지 않아야 함", () => {
      (palette as any).isFuzzyFindMode = true;
      (palette as any).fuzzyFindResults = [];
      (palette as any).selectedIndex = 0;

      (palette as any).executeSelectedCommand();

      expect(mockGotoMatch).not.toHaveBeenCalled();
    });

    it("fuzzy find 모드에서 검색 결과가 있으면 onGotoMatch를 호출해야 함", () => {
      const match = {
        rowIndex: 0,
        translation: { id: "1", key: "test" },
        score: 50,
        matchedFields: [],
      };

      (palette as any).isFuzzyFindMode = true;
      (palette as any).fuzzyFindResults = [match];
      (palette as any).selectedIndex = 0;

      (palette as any).executeSelectedCommand();

      expect(mockGotoMatch).toHaveBeenCalledWith(match);
    });

    it("fuzzy find 모드에서 선택된 인덱스의 매치로 이동해야 함", () => {
      const match1 = {
        rowIndex: 0,
        translation: { id: "1", key: "test1" },
        score: 50,
        matchedFields: [],
      };
      const match2 = {
        rowIndex: 1,
        translation: { id: "2", key: "test2" },
        score: 40,
        matchedFields: [],
      };

      (palette as any).isFuzzyFindMode = true;
      (palette as any).fuzzyFindResults = [match1, match2];
      (palette as any).selectedIndex = 1;

      (palette as any).executeSelectedCommand();

      expect(mockGotoMatch).toHaveBeenCalledWith(match2);
    });
  });
});

