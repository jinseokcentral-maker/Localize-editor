/**
 * grid-utils 단위 테스트
 */

import { describe, it, expect } from "vitest";
import {
  getLangFromColumnId,
  getTranslationKey,
  checkKeyDuplicate,
  checkKeyDuplicateEffect,
} from "../grid-utils";
import { Effect } from "effect";
import { runEffect } from "@/tests/utils/effect-helpers";

describe("grid-utils", () => {
  describe("getLangFromColumnId", () => {
    it("should return 'key' for key column", () => {
      expect(getLangFromColumnId("key")).toBe("key");
    });

    it("should return 'context' for context column", () => {
      expect(getLangFromColumnId("context")).toBe("context");
    });

    it("should extract language from values column", () => {
      expect(getLangFromColumnId("values.en")).toBe("en");
      expect(getLangFromColumnId("values.ko")).toBe("ko");
      expect(getLangFromColumnId("values.ja")).toBe("ja");
    });

    it("should return columnId for unknown format", () => {
      expect(getLangFromColumnId("unknown")).toBe("unknown");
    });
  });

  describe("getTranslationKey", () => {
    const translations = [
      { id: "1", key: "common.submit" },
      { id: "2", key: "common.cancel" },
    ] as const;

    it("should return newValue for key column", () => {
      expect(
        getTranslationKey(translations, "1", "key", "common.save")
      ).toBe("common.save");
    });

    it("should return translation key for other columns", () => {
      expect(
        getTranslationKey(translations, "1", "values.en", "Submit")
      ).toBe("common.submit");
    });

    it("should return empty string if translation not found", () => {
      expect(
        getTranslationKey(translations, "999", "values.en", "Value")
      ).toBe("");
    });
  });

  describe("checkKeyDuplicate", () => {
    const translations = [
      { id: "1", key: "common.submit" },
      { id: "2", key: "common.cancel" },
      { id: "3", key: "common.save" },
    ] as const;

    it("should return true if key is duplicate", () => {
      expect(checkKeyDuplicate(translations, "1", "common.cancel")).toBe(true);
    });

    it("should return false if key is not duplicate", () => {
      expect(checkKeyDuplicate(translations, "1", "common.new")).toBe(false);
    });

    it("should return false if key matches current row", () => {
      expect(checkKeyDuplicate(translations, "1", "common.submit")).toBe(
        false
      );
    });

    it("should trim keys before comparison", () => {
      expect(checkKeyDuplicate(translations, "1", "  common.cancel  ")).toBe(
        true
      );
    });
  });

  describe("checkKeyDuplicateEffect", () => {
    const translations = [
      { id: "1", key: "common.submit" },
      { id: "2", key: "common.cancel" },
    ] as const;

    it("should return Effect with true for duplicate key", async () => {
      const effect = checkKeyDuplicateEffect(translations, "1", "common.cancel");
      const result = await runEffect(effect);
      expect(result).toBe(true);
    });

    it("should return Effect with false for unique key", async () => {
      const effect = checkKeyDuplicateEffect(translations, "1", "common.new");
      const result = await runEffect(effect);
      expect(result).toBe(false);
    });

    it("should fail Effect for invalid key", async () => {
      const effect = checkKeyDuplicateEffect(translations, "1", "");
      await expect(runEffect(effect)).rejects.toThrow();
    });
  });
});

