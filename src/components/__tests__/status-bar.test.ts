/**
 * StatusBar 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StatusBar, type StatusBarInfo } from "../status-bar";

describe("StatusBar", () => {
  let container: HTMLElement;
  let statusBar: StatusBar;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    statusBar = new StatusBar(container);
  });

  afterEach(() => {
    if (statusBar) {
      statusBar.destroy();
    }
    if (container && container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  it("should create status bar element", () => {
    statusBar.create();
    expect(statusBar.isVisible()).toBe(true);
    expect(container.querySelector(".status-bar")).not.toBe(null);
  });

  it("should update status information", () => {
    statusBar.create();

    const info: StatusBarInfo = {
      mode: "Normal",
      rowIndex: 5,
      totalRows: 100,
      columnId: "values.en",
      changesCount: 3,
      emptyCount: 2,
      duplicateCount: 1,
    };

    statusBar.update(info);

    const statusBarElement = container.querySelector(".status-bar");
    expect(statusBarElement).not.toBe(null);
    expect(statusBarElement?.textContent).toContain("[Normal]");
    expect(statusBarElement?.textContent).toContain("Row 6/100");
    expect(statusBarElement?.textContent).toContain("Col: EN");
    expect(statusBarElement?.textContent).toContain("3 changes");
    expect(statusBarElement?.textContent).toContain("2 empty");
    expect(statusBarElement?.textContent).toContain("1 duplicate");
  });

  it("should display Editing mode when editing", () => {
    statusBar.create();

    const info: StatusBarInfo = {
      mode: "Editing",
      rowIndex: 0,
      totalRows: 10,
      columnId: "key",
      changesCount: 0,
      emptyCount: 0,
      duplicateCount: 0,
    };

    statusBar.update(info);

    const statusBarElement = container.querySelector(".status-bar");
    expect(statusBarElement?.textContent).toContain("[Editing]");
  });

  it("should handle null rowIndex and columnId", () => {
    statusBar.create();

    const info: StatusBarInfo = {
      mode: "Normal",
      rowIndex: null,
      totalRows: 50,
      columnId: null,
      changesCount: 0,
      emptyCount: 0,
      duplicateCount: 0,
    };

    statusBar.update(info);

    const statusBarElement = container.querySelector(".status-bar");
    expect(statusBarElement?.textContent).toContain("Row -/50");
    expect(statusBarElement?.textContent).not.toContain("Col:");
  });

  it("should handle zero counts", () => {
    statusBar.create();

    const info: StatusBarInfo = {
      mode: "Normal",
      rowIndex: 0,
      totalRows: 10,
      columnId: "key",
      changesCount: 0,
      emptyCount: 0,
      duplicateCount: 0,
    };

    statusBar.update(info);

    const statusBarElement = container.querySelector(".status-bar");
    expect(statusBarElement?.textContent).not.toContain("change");
    expect(statusBarElement?.textContent).not.toContain("empty");
    expect(statusBarElement?.textContent).not.toContain("duplicate");
  });

  it("should display Vim command when provided", () => {
    statusBar.create();

    const info: StatusBarInfo = {
      mode: "Vim Normal",
      rowIndex: 0,
      totalRows: 10,
      columnId: "key",
      changesCount: 0,
      emptyCount: 0,
      duplicateCount: 0,
      command: "10j",
    };

    statusBar.update(info);

    const statusBarElement = container.querySelector(".status-bar");
    const commandElement = statusBarElement?.querySelector(".status-bar-command");
    expect(commandElement?.textContent).toContain("Command: 10j");
  });

  it("should not display command section when command is null", () => {
    statusBar.create();

    const info: StatusBarInfo = {
      mode: "Normal",
      rowIndex: 0,
      totalRows: 10,
      columnId: "key",
      changesCount: 0,
      emptyCount: 0,
      duplicateCount: 0,
      command: null,
    };

    statusBar.update(info);

    const statusBarElement = container.querySelector(".status-bar");
    const commandElement = statusBarElement?.querySelector(".status-bar-command");
    expect(commandElement).toBeNull();
  });

  it("should handle plural forms correctly", () => {
    statusBar.create();

    const info: StatusBarInfo = {
      mode: "Normal",
      rowIndex: 0,
      totalRows: 10,
      columnId: "key",
      changesCount: 1,
      emptyCount: 1,
      duplicateCount: 1,
    };

    statusBar.update(info);

    const statusBarElement = container.querySelector(".status-bar");
    expect(statusBarElement?.textContent).toContain("1 change");
    expect(statusBarElement?.textContent).toContain("1 empty");
    expect(statusBarElement?.textContent).toContain("1 duplicate");

    const info2: StatusBarInfo = {
      mode: "Normal",
      rowIndex: 0,
      totalRows: 10,
      columnId: "key",
      changesCount: 2,
      emptyCount: 2,
      duplicateCount: 2,
    };

    statusBar.update(info2);

    expect(statusBarElement?.textContent).toContain("2 changes");
    expect(statusBarElement?.textContent).toContain("2 empty");
    expect(statusBarElement?.textContent).toContain("2 duplicates");
  });

  it("should convert column IDs to display names", () => {
    statusBar.create();

    const testCases = [
      { columnId: "row-number", expected: "#" },
      { columnId: "key", expected: "Key" },
      { columnId: "context", expected: "Context" },
      { columnId: "values.en", expected: "EN" },
      { columnId: "values.ko", expected: "KO" },
    ];

    testCases.forEach(({ columnId, expected }) => {
      const info: StatusBarInfo = {
        mode: "Normal",
        rowIndex: 0,
        totalRows: 10,
        columnId,
        changesCount: 0,
        emptyCount: 0,
        duplicateCount: 0,
      };

      statusBar.update(info);

      const statusBarElement = container.querySelector(".status-bar");
      expect(statusBarElement?.textContent).toContain(`Col: ${expected}`);
    });
  });

  it("should destroy status bar", () => {
    statusBar.create();
    expect(statusBar.isVisible()).toBe(true);

    statusBar.destroy();
    expect(statusBar.isVisible()).toBe(false);
    expect(container.querySelector(".status-bar")).toBe(null);
  });

  it("should call onStatusUpdate callback", () => {
    let callbackCalled = false;
    let callbackInfo: StatusBarInfo | undefined;

    const statusBarWithCallback = new StatusBar(container, {
      onStatusUpdate: (info) => {
        callbackCalled = true;
        callbackInfo = info;
      },
    });

    statusBarWithCallback.create();

    const info: StatusBarInfo = {
      mode: "Normal",
      rowIndex: 5,
      totalRows: 100,
      columnId: "key",
      changesCount: 3,
      emptyCount: 2,
      duplicateCount: 1,
    };

    statusBarWithCallback.update(info);

    expect(callbackCalled).toBe(true);
    expect(callbackInfo).toEqual(info);

    statusBarWithCallback.destroy();
  });
});



