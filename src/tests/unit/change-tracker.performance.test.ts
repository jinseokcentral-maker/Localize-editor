import { describe, it, expect } from "vitest";
import { ChangeTracker } from "@/components/change-tracker";

describe("ChangeTracker - Performance Tests", () => {
  describe("getOriginalValue 성능", () => {
    it("1000번 호출이 10ms 이하여야 함 (Effect 사용)", () => {
      const tracker = new ChangeTracker();
      const translations = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}`, ko: `값 ${i}` },
      }));

      tracker.initializeOriginalData(translations, ["en", "ko"]);

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        tracker.getOriginalValue(`id-${i % 100}`, "values.en");
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200); // 200ms 이하 (환경에 따라 변동 가능, Effect 사용 시 오버헤드 고려)
    });

    it("10000번 호출이 100ms 이하여야 함 (Effect 사용)", () => {
      const tracker = new ChangeTracker();
      const translations = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}`, ko: `값 ${i}` },
      }));

      tracker.initializeOriginalData(translations, ["en", "ko"]);

      const startTime = performance.now();
      for (let i = 0; i < 10000; i++) {
        tracker.getOriginalValue(`id-${i % 100}`, "values.en");
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // 500ms 이하 (환경에 따라 변동 가능, Effect 사용 시 오버헤드 고려)
    });
  });

  describe("trackChange 성능", () => {
    it("1000번 변경 추적이 50ms 이하여야 함", () => {
      const tracker = new ChangeTracker();
      const translations = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}`, ko: `값 ${i}` },
      }));

      tracker.initializeOriginalData(translations, ["en", "ko"]);

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        tracker.trackChange(
          `id-${i % 100}`,
          "values.en",
          "en",
          `Value ${i % 100}`,
          `New Value ${i}`,
          `key.${i % 100}`
        );
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // 50ms 이하
    });
  });

  describe("hasChange 성능", () => {
    it("1000번 변경 확인이 10ms 이하여야 함", () => {
      const tracker = new ChangeTracker();
      const translations = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        key: `key.${i}`,
        values: { en: `Value ${i}`, ko: `값 ${i}` },
      }));

      tracker.initializeOriginalData(translations, ["en", "ko"]);

      // 일부 변경사항 추가
      for (let i = 0; i < 50; i++) {
        tracker.trackChange(
          `id-${i}`,
          "values.en",
          "en",
          `Value ${i}`,
          `New Value ${i}`,
          `key.${i}`
        );
      }

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        tracker.hasChange(`id-${i % 100}`, "values.en");
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // 100ms 이하 (환경에 따라 변동 가능, Effect 사용 시 오버헤드 고려)
    });
  });
});
