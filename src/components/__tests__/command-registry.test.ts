/**
 * CommandRegistry 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CommandRegistry, type Command } from "../command-registry";

describe("CommandRegistry", () => {
  let registry: CommandRegistry;
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registry = new CommandRegistry();
    mockExecute = vi.fn();
  });

  describe("registerCommand", () => {
    it("should register a command", () => {
      const command: Command = {
        id: "test-command",
        label: "Test Command",
        keywords: ["test"],
        category: "other",
        execute: mockExecute,
      };

      registry.registerCommand(command);

      const retrieved = registry.getCommandById("test-command");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("test-command");
      expect(retrieved?.label).toBe("Test Command");
    });

    it("should set default values for optional fields", () => {
      const command: Command = {
        id: "test",
        label: "Test",
        keywords: [],
        category: "other",
        execute: mockExecute,
      };

      registry.registerCommand(command);

      const retrieved = registry.getCommandById("test");
      expect(retrieved?.usageCount).toBe(0);
      expect(retrieved?.availableInModes).toEqual(["all"]);
    });
  });

  describe("getCommands", () => {
    beforeEach(() => {
      registry.registerCommand({
        id: "all-mode",
        label: "All Mode",
        keywords: ["all"],
        category: "other",
        execute: mockExecute,
        availableInModes: ["all"],
      });

      registry.registerCommand({
        id: "excel-only",
        label: "Excel Only",
        keywords: ["excel"],
        category: "other",
        execute: mockExecute,
        availableInModes: ["excel"],
      });

      registry.registerCommand({
        id: "vim-only",
        label: "Vim Only",
        keywords: ["vim"],
        category: "other",
        execute: mockExecute,
        availableInModes: ["vim"],
      });
    });

    it("should return all commands when no mode specified", () => {
      const commands = registry.getCommands();
      expect(commands.length).toBe(3);
    });

    it("should return all commands when mode is 'all'", () => {
      const commands = registry.getCommands("all");
      expect(commands.length).toBe(3);
    });

    it("should filter commands by mode", () => {
      const excelCommands = registry.getCommands("excel");
      expect(excelCommands.length).toBe(2);
      expect(excelCommands.some((c) => c.id === "all-mode")).toBe(true);
      expect(excelCommands.some((c) => c.id === "excel-only")).toBe(true);
      expect(excelCommands.some((c) => c.id === "vim-only")).toBe(false);
    });

    it("should include 'all' mode commands in filtered results", () => {
      const vimCommands = registry.getCommands("vim");
      expect(vimCommands.length).toBe(2);
      expect(vimCommands.some((c) => c.id === "all-mode")).toBe(true);
      expect(vimCommands.some((c) => c.id === "vim-only")).toBe(true);
    });
  });

  describe("incrementUsage", () => {
    it("should increment usage count", () => {
      registry.registerCommand({
        id: "test",
        label: "Test",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      registry.incrementUsage("test");
      registry.incrementUsage("test");

      const command = registry.getCommandById("test");
      expect(command?.usageCount).toBe(2);
    });

    it("should handle non-existent command gracefully", () => {
      expect(() => {
        registry.incrementUsage("non-existent");
      }).not.toThrow();
    });
  });

  describe("getPopularCommands", () => {
    beforeEach(() => {
      registry.registerCommand({
        id: "low-usage",
        label: "Low Usage",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      registry.registerCommand({
        id: "high-usage",
        label: "High Usage",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      registry.registerCommand({
        id: "medium-usage",
        label: "Medium Usage",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      // 사용 횟수 설정
      registry.incrementUsage("high-usage");
      registry.incrementUsage("high-usage");
      registry.incrementUsage("high-usage");
      registry.incrementUsage("medium-usage");
      registry.incrementUsage("medium-usage");
    });

    it("should return commands sorted by usage count", () => {
      const popular = registry.getPopularCommands(10);
      expect(popular[0]?.id).toBe("high-usage");
      expect(popular[1]?.id).toBe("medium-usage");
      expect(popular[2]?.id).toBe("low-usage");
    });

    it("should limit results to specified limit", () => {
      const popular = registry.getPopularCommands(2);
      expect(popular.length).toBe(2);
      expect(popular[0]?.id).toBe("high-usage");
      expect(popular[1]?.id).toBe("medium-usage");
    });

    it("should filter by mode", () => {
      registry.registerCommand({
        id: "excel-popular",
        label: "Excel Popular",
        keywords: [],
        category: "other",
        execute: mockExecute,
        availableInModes: ["excel"],
      });

      registry.incrementUsage("excel-popular");
      registry.incrementUsage("excel-popular");

      const excelPopular = registry.getPopularCommands(10, "excel");
      expect(excelPopular.some((c) => c.id === "excel-popular")).toBe(true);
    });
  });

  describe("usage tracking persistence", () => {
    it("should save usage counts to localStorage", () => {
      // localStorage 초기화
      localStorage.clear();

      registry.registerCommand({
        id: "test",
        label: "Test",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      registry.incrementUsage("test");
      registry.incrementUsage("test");

      // 새 인스턴스 생성하여 로드 확인
      const newRegistry = new CommandRegistry();
      newRegistry.registerCommand({
        id: "test",
        label: "Test",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      const command = newRegistry.getCommandById("test");
      expect(command?.usageCount).toBe(2);

      // 정리
      localStorage.clear();
    });
  });

  describe("callbacks", () => {
    it("should call onCommandExecuted callback", () => {
      const onCommandExecuted = vi.fn();
      const registryWithCallback = new CommandRegistry({
        onCommandExecuted,
      });

      registryWithCallback.registerCommand({
        id: "test",
        label: "Test",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      registryWithCallback.incrementUsage("test");

      expect(onCommandExecuted).toHaveBeenCalledWith("test");
    });
  });

  describe("clear", () => {
    it("should clear all commands and usage counts", () => {
      registry.registerCommand({
        id: "test",
        label: "Test",
        keywords: [],
        category: "other",
        execute: mockExecute,
      });

      registry.incrementUsage("test");
      registry.clear();

      expect(registry.getCommandById("test")).toBeUndefined();
      expect(registry.getPopularCommands(10).length).toBe(0);
    });
  });
});

