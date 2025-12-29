import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChangeTracker } from "@/components/change-tracker";

describe("ChangeTracker", () => {
  let tracker: ChangeTracker;

  beforeEach(() => {
    tracker = new ChangeTracker({ enableValidation: true });
  });

  describe("initializeOriginalData", () => {
    it("translations와 languages를 초기화해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello", ko: "안녕" } },
        { id: "row-2", key: "farewell", values: { en: "Goodbye", ko: "안녕히" } },
      ];

      tracker.initializeOriginalData(translations, ["en", "ko"]);

      expect(tracker.getOriginalValue("row-1", "key")).toBe("greeting");
      expect(tracker.getOriginalValue("row-1", "values.en")).toBe("Hello");
      expect(tracker.getOriginalValue("row-1", "values.ko")).toBe("안녕");
      expect(tracker.getOriginalValue("row-2", "key")).toBe("farewell");
    });

    it("context가 있는 경우 저장해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", context: "Home page", values: { en: "Hello" } },
      ];

      tracker.initializeOriginalData(translations, ["en"]);

      expect(tracker.getOriginalValue("row-1", "context")).toBe("Home page");
    });

    it("context가 없는 경우 빈 문자열로 저장해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello" } },
      ];

      tracker.initializeOriginalData(translations, ["en"]);

      expect(tracker.getOriginalValue("row-1", "context")).toBe("");
    });

    it("빈 translations 배열도 처리해야 함", () => {
      tracker.initializeOriginalData([], ["en", "ko"]);

      expect(tracker.getOriginalValue("nonexistent", "key")).toBe("");
    });

    it("빈 languages 배열도 처리해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", values: {} },
      ];

      tracker.initializeOriginalData(translations, []);

      expect(tracker.getOriginalValue("row-1", "key")).toBe("greeting");
    });

    it("기존 데이터를 초기화 시 삭제해야 함", () => {
      const translations1 = [
        { id: "row-1", key: "old", values: { en: "Old" } },
      ];
      tracker.initializeOriginalData(translations1, ["en"]);

      const translations2 = [
        { id: "row-2", key: "new", values: { en: "New" } },
      ];
      tracker.initializeOriginalData(translations2, ["en"]);

      expect(tracker.getOriginalValue("row-1", "key")).toBe("");
      expect(tracker.getOriginalValue("row-2", "key")).toBe("new");
    });

    it("기존 변경사항도 초기화 시 삭제해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello" } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");

      expect(tracker.hasChange("row-1", "values.en")).toBe(true);

      tracker.initializeOriginalData(translations, ["en"]);

      expect(tracker.hasChange("row-1", "values.en")).toBe(false);
      expect(tracker.getChanges()).toHaveLength(0);
    });

    it("translation에 없는 language도 빈 문자열로 저장해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello" } },
      ];

      tracker.initializeOriginalData(translations, ["en", "ko", "ja"]);

      expect(tracker.getOriginalValue("row-1", "values.en")).toBe("Hello");
      expect(tracker.getOriginalValue("row-1", "values.ko")).toBe("");
      expect(tracker.getOriginalValue("row-1", "values.ja")).toBe("");
    });
  });

  describe("getOriginalValue", () => {
    beforeEach(() => {
      const translations = [
        { id: "row-1", key: "greeting", context: "Home", values: { en: "Hello", ko: "안녕" } },
      ];
      tracker.initializeOriginalData(translations, ["en", "ko"]);
    });

    it("존재하는 값을 반환해야 함", () => {
      expect(tracker.getOriginalValue("row-1", "key")).toBe("greeting");
      expect(tracker.getOriginalValue("row-1", "context")).toBe("Home");
      expect(tracker.getOriginalValue("row-1", "values.en")).toBe("Hello");
    });

    it("존재하지 않는 rowId는 빈 문자열 반환", () => {
      expect(tracker.getOriginalValue("nonexistent", "key")).toBe("");
    });

    it("존재하지 않는 field는 빈 문자열 반환", () => {
      expect(tracker.getOriginalValue("row-1", "nonexistent")).toBe("");
    });
  });

  describe("trackChange", () => {
    beforeEach(() => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello", ko: "안녕" } },
        { id: "row-2", key: "farewell", values: { en: "Goodbye", ko: "안녕히" } },
      ];
      tracker.initializeOriginalData(translations, ["en", "ko"]);
    });

    it("변경사항을 추적해야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");

      const changes = tracker.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        id: "row-1",
        key: "greeting",
        lang: "en",
        oldValue: "Hello",
        newValue: "Hi",
      });
    });

    it("같은 값으로 변경 시 변경사항에서 제거해야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");
      expect(tracker.hasChange("row-1", "values.en")).toBe(true);

      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hello", "greeting");
      expect(tracker.hasChange("row-1", "values.en")).toBe(false);
    });

    it("여러 필드의 변경사항을 독립적으로 추적해야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");
      tracker.trackChange("row-1", "values.ko", "ko", "안녕", "안녕하세요", "greeting");
      tracker.trackChange("row-2", "values.en", "en", "Goodbye", "Bye", "farewell");

      expect(tracker.getChanges()).toHaveLength(3);
      expect(tracker.hasChange("row-1", "values.en")).toBe(true);
      expect(tracker.hasChange("row-1", "values.ko")).toBe(true);
      expect(tracker.hasChange("row-2", "values.en")).toBe(true);
    });

    it("동일 필드 재변경 시 마지막 값으로 업데이트해야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hey", "greeting");

      const changes = tracker.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].newValue).toBe("Hey");
    });

    it("updateStyleCallback이 호출되어야 함", () => {
      const callback = vi.fn();

      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting", callback);

      expect(callback).toHaveBeenCalledWith("row-1", "values.en", true);
    });

    it("값이 같으면 updateStyleCallback에 false 전달", () => {
      const callback = vi.fn();

      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hello", "greeting", callback);

      expect(callback).toHaveBeenCalledWith("row-1", "values.en", false);
    });

    it("빈 문자열로 변경해도 추적해야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "", "greeting");

      expect(tracker.hasChange("row-1", "values.en")).toBe(true);
      expect(tracker.getChanges()[0].newValue).toBe("");
    });

    it("빈 문자열에서 값으로 변경해도 추적해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "" } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);

      tracker.trackChange("row-1", "values.en", "en", "", "Hello", "greeting");

      expect(tracker.hasChange("row-1", "values.en")).toBe(true);
      expect(tracker.getChanges()[0].newValue).toBe("Hello");
    });
  });

  describe("hasChange", () => {
    beforeEach(() => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello" } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);
    });

    it("변경사항이 있으면 true 반환", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");
      expect(tracker.hasChange("row-1", "values.en")).toBe(true);
    });

    it("변경사항이 없으면 false 반환", () => {
      expect(tracker.hasChange("row-1", "values.en")).toBe(false);
    });

    it("존재하지 않는 rowId는 false 반환", () => {
      expect(tracker.hasChange("nonexistent", "values.en")).toBe(false);
    });

    it("존재하지 않는 field는 false 반환", () => {
      expect(tracker.hasChange("row-1", "nonexistent")).toBe(false);
    });
  });

  describe("getChanges", () => {
    beforeEach(() => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello", ko: "안녕" } },
        { id: "row-2", key: "farewell", values: { en: "Goodbye" } },
      ];
      tracker.initializeOriginalData(translations, ["en", "ko"]);
    });

    it("모든 변경사항을 배열로 반환해야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");
      tracker.trackChange("row-2", "values.en", "en", "Goodbye", "Bye", "farewell");

      const changes = tracker.getChanges();
      expect(changes).toHaveLength(2);
    });

    it("변경사항이 없으면 빈 배열 반환", () => {
      expect(tracker.getChanges()).toEqual([]);
    });
  });

  describe("clearChanges", () => {
    beforeEach(() => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello" } },
        { id: "row-2", key: "farewell", values: { en: "Goodbye" } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);
    });

    it("모든 변경사항을 삭제해야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");
      tracker.trackChange("row-2", "values.en", "en", "Goodbye", "Bye", "farewell");

      tracker.clearChanges();

      expect(tracker.getChanges()).toHaveLength(0);
      expect(tracker.hasChange("row-1", "values.en")).toBe(false);
      expect(tracker.hasChange("row-2", "values.en")).toBe(false);
    });

    it("updateStyleCallback이 모든 변경된 셀에 대해 호출되어야 함", () => {
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");
      tracker.trackChange("row-2", "values.en", "en", "Goodbye", "Bye", "farewell");

      const callback = vi.fn();
      tracker.clearChanges(callback);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith("row-1", "values.en", false);
      expect(callback).toHaveBeenCalledWith("row-2", "values.en", false);
    });

    it("변경사항이 없어도 에러 없이 동작해야 함", () => {
      expect(() => tracker.clearChanges()).not.toThrow();
    });
  });

  describe("getChangesMap", () => {
    it("읽기 전용 Map을 반환해야 함", () => {
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello" } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);
      tracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");

      const changesMap = tracker.getChangesMap();

      expect(changesMap.size).toBe(1);
      expect(changesMap.get("row-1-values.en")).toEqual({
        id: "row-1",
        key: "greeting",
        lang: "en",
        oldValue: "Hello",
        newValue: "Hi",
      });
    });
  });

  describe("validation disabled", () => {
    let noValidationTracker: ChangeTracker;

    beforeEach(() => {
      noValidationTracker = new ChangeTracker({ enableValidation: false });
      const translations = [
        { id: "row-1", key: "greeting", values: { en: "Hello" } },
      ];
      noValidationTracker.initializeOriginalData(translations, ["en"]);
    });

    it("검증 없이 빠르게 동작해야 함", () => {
      noValidationTracker.trackChange("row-1", "values.en", "en", "Hello", "Hi", "greeting");

      expect(noValidationTracker.hasChange("row-1", "values.en")).toBe(true);
      expect(noValidationTracker.getOriginalValue("row-1", "key")).toBe("greeting");
    });

    it("잘못된 데이터도 저장해야 함 (검증 비활성화)", () => {
      // 검증이 비활성화되어 있으므로 에러 없이 저장됨
      noValidationTracker.trackChange("", "", "", "old", "new", "key");
      expect(noValidationTracker.hasChange("", "")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("특수문자가 포함된 key 처리", () => {
      const translations = [
        { id: "row-1", key: "greeting.welcome.message", values: { en: "Hello" } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);

      expect(tracker.getOriginalValue("row-1", "key")).toBe("greeting.welcome.message");
    });

    it("유니코드 문자 처리", () => {
      const translations = [
        { id: "row-1", key: "emoji", values: { en: "Hello 👋", ko: "안녕 🙏" } },
      ];
      tracker.initializeOriginalData(translations, ["en", "ko"]);

      expect(tracker.getOriginalValue("row-1", "values.en")).toBe("Hello 👋");
      expect(tracker.getOriginalValue("row-1", "values.ko")).toBe("안녕 🙏");
    });

    it("매우 긴 문자열 처리", () => {
      const longString = "a".repeat(10000);
      const translations = [
        { id: "row-1", key: "long", values: { en: longString } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);

      expect(tracker.getOriginalValue("row-1", "values.en")).toBe(longString);
    });

    it("줄바꿈 문자 처리", () => {
      const multilineValue = "Hello\nWorld\n안녕하세요";
      const translations = [
        { id: "row-1", key: "multiline", values: { en: multilineValue } },
      ];
      tracker.initializeOriginalData(translations, ["en"]);

      expect(tracker.getOriginalValue("row-1", "values.en")).toBe(multilineValue);
    });

    it("많은 수의 translations 처리", () => {
      const translations = Array.from({ length: 1000 }, (_, i) => ({
        id: `row-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}` },
      }));

      tracker.initializeOriginalData(translations, ["en"]);

      expect(tracker.getOriginalValue("row-0", "key")).toBe("key.0");
      expect(tracker.getOriginalValue("row-999", "key")).toBe("key.999");
      expect(tracker.getOriginalValue("row-500", "values.en")).toBe("Value 500");
    });
  });
});
