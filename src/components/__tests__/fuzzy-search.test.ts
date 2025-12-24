/**
 * FuzzySearch 단위 테스트
 */

import { describe, it, expect } from "vitest";
import { searchCommands } from "../fuzzy-search";
import type { Command } from "../command-registry";

describe("FuzzySearch", () => {
  const createCommand = (
    id: string,
    label: string,
    keywords: string[] = []
  ): Command => ({
    id,
    label,
    keywords,
    category: "other",
    execute: () => {},
  });

  describe("exact match", () => {
    it("should match exact label", () => {
      const commands = [
        createCommand("test", "Test Command"),
        createCommand("other", "Other Command"),
      ];

      const results = searchCommands("Test Command", commands);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.command.id).toBe("test");
      expect(results[0]?.score).toBeGreaterThan(0.8);
    });

    it("should match exact id", () => {
      const commands = [createCommand("goto", "Go to Row")];

      const results = searchCommands("goto", commands);
      expect(results.length).toBe(1);
      expect(results[0]?.command.id).toBe("goto");
    });
  });

  describe("prefix match", () => {
    it("should match prefix", () => {
      const commands = [
        createCommand("goto", "Go to Row"),
        createCommand("search", "Search"),
      ];

      const results = searchCommands("go", commands);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.command.id).toBe("goto");
      expect(results[0]?.score).toBeGreaterThan(0.8);
    });
  });

  describe("partial match", () => {
    it("should match substring", () => {
      const commands = [
        createCommand("filter-empty", "Filter: Empty Translations"),
        createCommand("filter-changed", "Filter: Changed Cells"),
      ];

      const results = searchCommands("empty", commands);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.command.id).toBe("filter-empty");
    });
  });

  describe("fuzzy match", () => {
    it("should match characters in order", () => {
      const commands = [
        createCommand("goto", "Go to Row"),
        createCommand("search", "Search"),
      ];

      const results = searchCommands("gtr", commands);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.command.id).toBe("goto");
    });

    it("should prioritize consecutive matches", () => {
      const commands = [
        createCommand("goto", "Go to Row"),
        createCommand("filter", "Filter"),
      ];

      const results = searchCommands("go", commands);
      expect(results[0]?.command.id).toBe("goto");
    });
  });

  describe("keyword matching", () => {
    it("should match keywords", () => {
      const commands = [
        createCommand("goto", "Go to Row", ["jump", "navigate"]),
        createCommand("search", "Search", ["find", "query"]),
      ];

      const results = searchCommands("jump", commands);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.command.id).toBe("goto");
    });
  });

  describe("case insensitive", () => {
    it("should match regardless of case", () => {
      const commands = [createCommand("goto", "Go to Row")];

      const results1 = searchCommands("GOTO", commands);
      const results2 = searchCommands("goto", commands);
      const results3 = searchCommands("GoTo", commands);

      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      expect(results3.length).toBeGreaterThan(0);
    });
  });

  describe("empty query", () => {
    it("should return all commands with score 1", () => {
      const commands = [
        createCommand("test1", "Test 1"),
        createCommand("test2", "Test 2"),
      ];

      const results = searchCommands("", commands);
      expect(results.length).toBe(2);
      expect(results[0]?.score).toBe(1);
      expect(results[1]?.score).toBe(1);
    });

    it("should return all commands with whitespace-only query", () => {
      const commands = [createCommand("test", "Test")];

      const results = searchCommands("   ", commands);
      expect(results.length).toBe(1);
      expect(results[0]?.score).toBe(1);
    });
  });

  describe("sorting", () => {
    it("should sort by score (highest first)", () => {
      const commands = [
        createCommand("exact", "Exact Match"),
        createCommand("partial", "Partial Match Test"),
        createCommand("fuzzy", "Fuzzy Match Test"),
      ];

      const results = searchCommands("exact", commands);
      expect(results[0]?.command.id).toBe("exact");
    });

    it("should sort by usage count when scores are similar", () => {
      const commands = [
        createCommand("low-usage", "Test Command", []),
        createCommand("high-usage", "Test Command", []),
      ];

      // 사용 횟수 설정 (실제로는 CommandRegistry에서 관리)
      commands[1].usageCount = 10;
      commands[0].usageCount = 1;

      const results = searchCommands("test", commands);
      // 점수가 비슷하면 사용 횟수로 정렬
      if (Math.abs(results[0]?.score - results[1]?.score) < 0.01) {
        expect(results[0]?.command.id).toBe("high-usage");
      }
    });
  });

  describe("no matches", () => {
    it("should return empty array when no matches", () => {
      const commands = [
        createCommand("test", "Test Command"),
        createCommand("other", "Other Command"),
      ];

      const results = searchCommands("xyz", commands);
      expect(results.length).toBe(0);
    });
  });

  describe("special characters", () => {
    it("should handle special characters in query", () => {
      const commands = [
        createCommand("filter-empty", "Filter: Empty"),
        createCommand("filter-changed", "Filter: Changed"),
      ];

      const results = searchCommands("filter:", commands);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

