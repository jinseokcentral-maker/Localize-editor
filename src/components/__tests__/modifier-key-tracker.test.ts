/**
 * ModifierKeyTracker 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ModifierKeyTracker } from "../modifier-key-tracker";

describe("ModifierKeyTracker", () => {
  let tracker: ModifierKeyTracker;

  beforeEach(() => {
    tracker = new ModifierKeyTracker();
  });

  it("should track Meta key press and release", () => {
    tracker.attach();

    const metaKeyDown = new KeyboardEvent("keydown", {
      key: "Meta",
      bubbles: true,
    });
    window.dispatchEvent(metaKeyDown);

    expect(tracker.metaKey).toBe(true);

    const metaKeyUp = new KeyboardEvent("keyup", {
      key: "Meta",
      bubbles: true,
    });
    window.dispatchEvent(metaKeyUp);

    expect(tracker.metaKey).toBe(false);
  });

  it("should track Control key press and release", () => {
    tracker.attach();

    const ctrlKeyDown = new KeyboardEvent("keydown", {
      key: "Control",
      bubbles: true,
    });
    window.dispatchEvent(ctrlKeyDown);

    expect(tracker.ctrlKey).toBe(true);

    const ctrlKeyUp = new KeyboardEvent("keyup", {
      key: "Control",
      bubbles: true,
    });
    window.dispatchEvent(ctrlKeyUp);

    expect(tracker.ctrlKey).toBe(false);
  });

  it("should detect modifier key press correctly on Mac", () => {
    // Mock navigator.platform
    Object.defineProperty(navigator, "platform", {
      writable: true,
      value: "MacIntel",
    });

    tracker.attach();

    const metaKeyDown = new KeyboardEvent("keydown", {
      key: "Meta",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(metaKeyDown);

    expect(tracker.isModifierPressed(metaKeyDown)).toBe(true);
  });

  it("should detect modifier key press correctly on Windows", () => {
    // Mock navigator.platform
    Object.defineProperty(navigator, "platform", {
      writable: true,
      value: "Win32",
    });

    tracker.attach();

    const ctrlKeyDown = new KeyboardEvent("keydown", {
      key: "Control",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(ctrlKeyDown);

    expect(tracker.isModifierPressed(ctrlKeyDown)).toBe(true);
  });

  it("should reset state correctly", () => {
    tracker.attach();

    const metaKeyDown = new KeyboardEvent("keydown", {
      key: "Meta",
      bubbles: true,
    });
    window.dispatchEvent(metaKeyDown);

    tracker.reset();

    expect(tracker.metaKey).toBe(false);
    expect(tracker.ctrlKey).toBe(false);
  });

  it("should detach event listeners", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    tracker.attach();
    tracker.detach();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      true
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keyup",
      expect.any(Function),
      true
    );
  });
});

