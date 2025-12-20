import { describe, it, expect } from "vitest";
import type { Translation, LocaleEditorOptions } from "@/types/translation";
import { isTranslation, isValidLocaleEditorOptions } from "@/types/translation";

describe("Translation 타입", () => {
  describe("isTranslation 타입 가드", () => {
    it("올바른 Translation 객체를 검증해야 함", () => {
      const validTranslation: Translation = {
        id: "123",
        key: "common.buttons.submit",
        values: { en: "Submit", ko: "제출" },
        context: "Submit button text",
      };

      expect(isTranslation(validTranslation)).toBe(true);
    });

    it("id가 없으면 false를 반환해야 함", () => {
      const invalid = {
        key: "common.buttons.submit",
        values: { en: "Submit" },
      };

      expect(isTranslation(invalid)).toBe(false);
    });

    it("key가 없으면 false를 반환해야 함", () => {
      const invalid = {
        id: "123",
        values: { en: "Submit" },
      };

      expect(isTranslation(invalid)).toBe(false);
    });

    it("values가 없으면 false를 반환해야 함", () => {
      const invalid = {
        id: "123",
        key: "common.buttons.submit",
      };

      expect(isTranslation(invalid)).toBe(false);
    });

    it("values가 빈 객체여도 true를 반환해야 함", () => {
      const valid: Translation = {
        id: "123",
        key: "common.buttons.submit",
        values: {},
      };

      expect(isTranslation(valid)).toBe(true);
    });

    it("context는 선택적이어야 함", () => {
      const withoutContext: Translation = {
        id: "123",
        key: "common.buttons.submit",
        values: { en: "Submit" },
      };

      expect(isTranslation(withoutContext)).toBe(true);
    });
  });

  describe("Translation 인터페이스 구조", () => {
    it("모든 필수 필드를 가져야 함", () => {
      const translation: Translation = {
        id: "uuid-123",
        key: "common.buttons.submit",
        values: { en: "Submit", ko: "제출", ja: "送信" },
        context: "Submit button",
      };

      expect(translation.id).toBe("uuid-123");
      expect(translation.key).toBe("common.buttons.submit");
      expect(translation.values).toEqual({
        en: "Submit",
        ko: "제출",
        ja: "送信",
      });
      expect(translation.context).toBe("Submit button");
    });

    it("values는 Record<string, string> 타입이어야 함", () => {
      const translation: Translation = {
        id: "123",
        key: "test",
        values: {
          en: "English",
          ko: "한국어",
          "zh-CN": "简体中文",
        },
      };

      expect(typeof translation.values).toBe("object");
      expect(translation.values.en).toBe("English");
      expect(translation.values.ko).toBe("한국어");
    });
  });
});

describe("LocaleEditorOptions 타입", () => {
  describe("isValidLocaleEditorOptions 타입 가드", () => {
    it("올바른 LocaleEditorOptions를 검증해야 함", () => {
      const validOptions: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "common.buttons.submit",
            values: { en: "Submit" },
          },
        ],
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: document.createElement("div"),
      };

      expect(isValidLocaleEditorOptions(validOptions)).toBe(true);
    });

    it("translations가 없으면 false를 반환해야 함", () => {
      const invalid = {
        languages: ["en"],
        defaultLanguage: "en",
        container: document.createElement("div"),
      };

      expect(isValidLocaleEditorOptions(invalid)).toBe(false);
    });

    it("languages가 없으면 false를 반환해야 함", () => {
      const invalid = {
        translations: [],
        defaultLanguage: "en",
        container: document.createElement("div"),
      };

      expect(isValidLocaleEditorOptions(invalid)).toBe(false);
    });

    it("defaultLanguage가 없으면 false를 반환해야 함", () => {
      const invalid = {
        translations: [],
        languages: ["en"],
        container: document.createElement("div"),
      };

      expect(isValidLocaleEditorOptions(invalid)).toBe(false);
    });

    it("container가 없으면 false를 반환해야 함", () => {
      const invalid = {
        translations: [],
        languages: ["en"],
        defaultLanguage: "en",
      };

      expect(isValidLocaleEditorOptions(invalid)).toBe(false);
    });

    it("readOnly는 선택적이어야 함", () => {
      const withReadOnly: LocaleEditorOptions = {
        translations: [],
        languages: ["en"],
        defaultLanguage: "en",
        container: document.createElement("div"),
        readOnly: true,
      };

      expect(isValidLocaleEditorOptions(withReadOnly)).toBe(true);
    });
  });

  describe("LocaleEditorOptions 인터페이스 구조", () => {
    it("모든 필수 필드를 가져야 함", () => {
      const container = document.createElement("div");
      const options: LocaleEditorOptions = {
        translations: [
          {
            id: "1",
            key: "test",
            values: { en: "Test" },
          },
        ],
        languages: ["en", "ko", "ja"],
        defaultLanguage: "en",
        container,
      };

      expect(options.translations).toHaveLength(1);
      expect(options.languages).toEqual(["en", "ko", "ja"]);
      expect(options.defaultLanguage).toBe("en");
      expect(options.container).toBe(container);
    });

    it("defaultLanguage가 languages 배열에 포함되어야 함 (검증 로직)", () => {
      const options: LocaleEditorOptions = {
        translations: [],
        languages: ["en", "ko"],
        defaultLanguage: "en",
        container: document.createElement("div"),
      };

      expect(options.languages).toContain(options.defaultLanguage);
    });
  });
});

