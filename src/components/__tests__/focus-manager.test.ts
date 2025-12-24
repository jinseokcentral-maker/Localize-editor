/**
 * FocusManager 단위 테스트
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FocusManager } from "../focus-manager";

describe("FocusManager", () => {
  let focusManager: FocusManager;

  beforeEach(() => {
    focusManager = new FocusManager();
  });

  it("should initialize with no focused cell", () => {
    expect(focusManager.getFocusedCell()).toBe(null);
    expect(focusManager.hasFocus()).toBe(false);
  });

  it("should set and get focused cell", () => {
    focusManager.focusCell(5, "values.en");

    const focusedCell = focusManager.getFocusedCell();
    expect(focusedCell).not.toBe(null);
    expect(focusedCell?.rowIndex).toBe(5);
    expect(focusedCell?.columnId).toBe("values.en");
    expect(focusManager.hasFocus()).toBe(true);
  });

  it("should blur focused cell", () => {
    focusManager.focusCell(3, "key");
    expect(focusManager.hasFocus()).toBe(true);

    focusManager.blur();

    expect(focusManager.getFocusedCell()).toBe(null);
    expect(focusManager.hasFocus()).toBe(false);
  });

  it("should update focused cell when focusing different cell", () => {
    focusManager.focusCell(1, "key");
    focusManager.focusCell(2, "context");

    const focusedCell = focusManager.getFocusedCell();
    expect(focusedCell?.rowIndex).toBe(2);
    expect(focusedCell?.columnId).toBe("context");
  });
});

