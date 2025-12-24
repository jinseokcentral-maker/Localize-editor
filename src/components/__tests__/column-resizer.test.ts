/**
 * ColumnResizer 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ColumnResizer } from "../column-resizer";

describe("ColumnResizer", () => {
  let columnResizer: ColumnResizer;
  let columnWidths: Map<string, number>;
  let columnMinWidths: Map<string, number>;
  let callbacks: {
    onResizeStart?: (columnId: string) => void;
    onResize?: (columnId: string, width: number) => void;
    onResizeEnd?: (columnId: string, width: number) => void;
  };

  beforeEach(() => {
    columnWidths = new Map();
    columnMinWidths = new Map([
      ["key", 100],
      ["context", 100],
      ["values.en", 80],
    ]);

    callbacks = {
      onResizeStart: vi.fn(),
      onResize: vi.fn(),
      onResizeEnd: vi.fn(),
    };

    columnResizer = new ColumnResizer({
      columnWidths,
      columnMinWidths,
      languages: ["en", "ko"],
      callbacks,
    });
  });

  it("should add resize handle to header cell", () => {
    const headerCell = document.createElement("div");
    columnResizer.addResizeHandle(headerCell, "key");

    const resizeHandle = headerCell.querySelector(".column-resize-handle");
    expect(resizeHandle).not.toBe(null);
    expect(resizeHandle?.getAttribute("data-column-id")).toBe("key");
  });

  it("should start resize on mousedown", () => {
    const headerCell = document.createElement("div");
    headerCell.style.width = "200px";
    columnResizer.addResizeHandle(headerCell, "key");

    const resizeHandle = headerCell.querySelector(
      ".column-resize-handle"
    ) as HTMLElement;
    const mousedownEvent = new MouseEvent("mousedown", {
      clientX: 100,
      bubbles: true,
    });

    resizeHandle.dispatchEvent(mousedownEvent);

    expect(columnResizer.isResizingActive()).toBe(true);
    expect(callbacks.onResizeStart).toHaveBeenCalledWith("key");
  });

  it("should handle resize during mousemove", () => {
    const headerCell = document.createElement("div");
    headerCell.style.width = "200px";
    // 실제 DOM에 추가하여 offsetWidth가 제대로 계산되도록 함
    document.body.appendChild(headerCell);
    columnResizer.addResizeHandle(headerCell, "key");

    const resizeHandle = headerCell.querySelector(
      ".column-resize-handle"
    ) as HTMLElement;

    // Start resize - startResize는 headerCell의 offsetWidth 또는 getBoundingClientRect().width를 사용
    // jsdom에서는 offsetWidth가 0일 수 있으므로 getBoundingClientRect를 mock
    const mockRect = { width: 200 };
    vi.spyOn(headerCell, "getBoundingClientRect").mockReturnValue(
      mockRect as DOMRect
    );

    const mousedownEvent = new MouseEvent("mousedown", {
      clientX: 100,
      bubbles: true,
    });
    resizeHandle.dispatchEvent(mousedownEvent);

    // Move mouse (150px 오른쪽으로 이동)
    const mousemoveEvent = new MouseEvent("mousemove", {
      clientX: 250, // 150px 더 이동
      bubbles: true,
    });
    document.dispatchEvent(mousemoveEvent);

    expect(callbacks.onResize).toHaveBeenCalled();
    const resizeCall = (callbacks.onResize as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(resizeCall[0]).toBe("key");
    // 200 (초기 너비) + 150 (deltaX) = 350, 최소 너비 100보다 큼
    expect(resizeCall[1]).toBeGreaterThanOrEqual(100); // 최소 너비 보장
    // 실제 값은 200 + (250 - 100) = 350이어야 함
    expect(resizeCall[1]).toBe(350);
  });

  it("should respect minimum width during resize", () => {
    const headerCell = document.createElement("div");
    headerCell.style.width = "200px";
    columnResizer.addResizeHandle(headerCell, "key");

    const resizeHandle = headerCell.querySelector(
      ".column-resize-handle"
    ) as HTMLElement;

    // Start resize
    const mousedownEvent = new MouseEvent("mousedown", {
      clientX: 100,
      bubbles: true,
    });
    resizeHandle.dispatchEvent(mousedownEvent);

    // Move mouse to very small width
    const mousemoveEvent = new MouseEvent("mousemove", {
      clientX: 50, // 너무 작은 너비
      bubbles: true,
    });
    document.dispatchEvent(mousemoveEvent);

    expect(callbacks.onResize).toHaveBeenCalled();
    const resizeCall = (callbacks.onResize as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(resizeCall[1]).toBeGreaterThanOrEqual(100); // 최소 너비 보장
  });

  it("should end resize on mouseup", () => {
    const headerCell = document.createElement("div");
    headerCell.style.width = "200px";
    columnResizer.addResizeHandle(headerCell, "key");

    const resizeHandle = headerCell.querySelector(
      ".column-resize-handle"
    ) as HTMLElement;

    // Start resize
    const mousedownEvent = new MouseEvent("mousedown", {
      clientX: 100,
      bubbles: true,
    });
    resizeHandle.dispatchEvent(mousedownEvent);

    expect(columnResizer.isResizingActive()).toBe(true);

    // End resize
    const mouseupEvent = new MouseEvent("mouseup", {
      bubbles: true,
    });
    document.dispatchEvent(mouseupEvent);

    expect(columnResizer.isResizingActive()).toBe(false);
    expect(callbacks.onResizeEnd).toHaveBeenCalled();
  });

  it("should not save width for last language column", () => {
    const headerCell = document.createElement("div");
    headerCell.style.width = "200px";
    columnResizer.addResizeHandle(headerCell, "values.ko"); // 마지막 언어 컬럼

    const resizeHandle = headerCell.querySelector(
      ".column-resize-handle"
    ) as HTMLElement;

    // Start resize
    const mousedownEvent = new MouseEvent("mousedown", {
      clientX: 100,
      bubbles: true,
    });
    resizeHandle.dispatchEvent(mousedownEvent);

    // Move mouse
    const mousemoveEvent = new MouseEvent("mousemove", {
      clientX: 250,
      bubbles: true,
    });
    document.dispatchEvent(mousemoveEvent);

    // End resize
    const mouseupEvent = new MouseEvent("mouseup", {
      bubbles: true,
    });
    document.dispatchEvent(mouseupEvent);

    // 마지막 컬럼은 저장되지 않아야 함
    expect(columnWidths.has("values.ko")).toBe(false);
  });

  it("should reset resize state", () => {
    const headerCell = document.createElement("div");
    headerCell.style.width = "200px";
    columnResizer.addResizeHandle(headerCell, "key");

    const resizeHandle = headerCell.querySelector(
      ".column-resize-handle"
    ) as HTMLElement;

    // Start resize
    const mousedownEvent = new MouseEvent("mousedown", {
      clientX: 100,
      bubbles: true,
    });
    resizeHandle.dispatchEvent(mousedownEvent);

    expect(columnResizer.isResizingActive()).toBe(true);

    columnResizer.reset();

    expect(columnResizer.isResizingActive()).toBe(false);
  });
});

