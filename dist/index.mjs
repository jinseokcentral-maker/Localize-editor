import { Data, Effect, Option } from "effect";
import { z } from "zod";
import Fuse from "fuse.js";
function memo(c, I, L) {
	let R = L.initialDeps ?? [], B, V = !0;
	function H() {
		let H;
		L.key && L.debug?.() && (H = Date.now());
		let U = c();
		if (!(U.length !== R.length || U.some((c, I) => R[I] !== c))) return B;
		R = U;
		let W;
		if (L.key && L.debug?.() && (W = Date.now()), B = I(...U), L.key && L.debug?.()) {
			let c = Math.round((Date.now() - H) * 100) / 100, I = Math.round((Date.now() - W) * 100) / 100, R = I / 16, B = (c, I) => {
				for (c = String(c); c.length < I;) c = " " + c;
				return c;
			};
			console.info(`%c⏱ ${B(I, 5)} /${B(c, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * R, 120))}deg 100% 31%);`, L?.key);
		}
		return L?.onChange && !(V && L.skipInitialOnChange) && L.onChange(B), V = !1, B;
	}
	return H.updateDeps = (c) => {
		R = c;
	}, H;
}
function notUndefined(c, I) {
	if (c === void 0) throw Error(`Unexpected undefined${I ? `: ${I}` : ""}`);
	return c;
}
const approxEqual = (c, I) => Math.abs(c - I) < 1.01, debounce = (c, I, L) => {
	let R;
	return function(...B) {
		c.clearTimeout(R), R = c.setTimeout(() => I.apply(this, B), L);
	};
};
var getRect = (c) => {
	let { offsetWidth: I, offsetHeight: L } = c;
	return {
		width: I,
		height: L
	};
};
const defaultKeyExtractor = (c) => c, defaultRangeExtractor = (c) => {
	let I = Math.max(c.startIndex - c.overscan, 0), L = Math.min(c.endIndex + c.overscan, c.count - 1), R = [];
	for (let c = I; c <= L; c++) R.push(c);
	return R;
}, observeElementRect = (c, I) => {
	let L = c.scrollElement;
	if (!L) return;
	let R = c.targetWindow;
	if (!R) return;
	let B = (c) => {
		let { width: L, height: R } = c;
		I({
			width: Math.round(L),
			height: Math.round(R)
		});
	};
	if (B(getRect(L)), !R.ResizeObserver) return () => {};
	let V = new R.ResizeObserver((I) => {
		let R = () => {
			let c = I[0];
			if (c?.borderBoxSize) {
				let I = c.borderBoxSize[0];
				if (I) {
					B({
						width: I.inlineSize,
						height: I.blockSize
					});
					return;
				}
			}
			B(getRect(L));
		};
		c.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(R) : R();
	});
	return V.observe(L, { box: "border-box" }), () => {
		V.unobserve(L);
	};
};
var addEventListenerOptions = { passive: !0 }, supportsScrollend = typeof window > "u" ? !0 : "onscrollend" in window;
const observeElementOffset = (c, I) => {
	let L = c.scrollElement;
	if (!L) return;
	let R = c.targetWindow;
	if (!R) return;
	let B = 0, V = c.options.useScrollendEvent && supportsScrollend ? () => void 0 : debounce(R, () => {
		I(B, !1);
	}, c.options.isScrollingResetDelay), H = (R) => () => {
		let { horizontal: H, isRtl: U } = c.options;
		B = H ? L.scrollLeft * (U && -1 || 1) : L.scrollTop, V(), I(B, R);
	}, U = H(!0), G = H(!1);
	G(), L.addEventListener("scroll", U, addEventListenerOptions);
	let K = c.options.useScrollendEvent && supportsScrollend;
	return K && L.addEventListener("scrollend", G, addEventListenerOptions), () => {
		L.removeEventListener("scroll", U), K && L.removeEventListener("scrollend", G);
	};
}, measureElement = (c, I, L) => {
	if (I?.borderBoxSize) {
		let c = I.borderBoxSize[0];
		if (c) return Math.round(c[L.options.horizontal ? "inlineSize" : "blockSize"]);
	}
	return c[L.options.horizontal ? "offsetWidth" : "offsetHeight"];
}, elementScroll = (c, { adjustments: I = 0, behavior: L }, R) => {
	let B = c + I;
	R.scrollElement?.scrollTo?.({
		[R.options.horizontal ? "left" : "top"]: B,
		behavior: L
	});
};
var Virtualizer = class {
	unsubs = [];
	options;
	scrollElement = null;
	targetWindow = null;
	isScrolling = !1;
	measurementsCache = [];
	itemSizeCache = /* @__PURE__ */ new Map();
	laneAssignments = /* @__PURE__ */ new Map();
	pendingMeasuredCacheIndexes = [];
	prevLanes = void 0;
	lanesChangedFlag = !1;
	lanesSettling = !1;
	scrollRect = null;
	scrollOffset = null;
	scrollDirection = null;
	scrollAdjustments = 0;
	shouldAdjustScrollPositionOnItemSizeChange;
	elementsCache = /* @__PURE__ */ new Map();
	observer = (() => {
		let c = null, I = () => c || (!this.targetWindow || !this.targetWindow.ResizeObserver ? null : c = new this.targetWindow.ResizeObserver((c) => {
			c.forEach((c) => {
				let I = () => {
					this._measureElement(c.target, c);
				};
				this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(I) : I();
			});
		}));
		return {
			disconnect: () => {
				I()?.disconnect(), c = null;
			},
			observe: (c) => I()?.observe(c, { box: "border-box" }),
			unobserve: (c) => I()?.unobserve(c)
		};
	})();
	range = null;
	constructor(c) {
		this.setOptions(c);
	}
	setOptions = (c) => {
		Object.entries(c).forEach(([I, L]) => {
			L === void 0 && delete c[I];
		}), this.options = {
			debug: !1,
			initialOffset: 0,
			overscan: 1,
			paddingStart: 0,
			paddingEnd: 0,
			scrollPaddingStart: 0,
			scrollPaddingEnd: 0,
			horizontal: !1,
			getItemKey: defaultKeyExtractor,
			rangeExtractor: defaultRangeExtractor,
			onChange: () => {},
			measureElement,
			initialRect: {
				width: 0,
				height: 0
			},
			scrollMargin: 0,
			gap: 0,
			indexAttribute: "data-index",
			initialMeasurementsCache: [],
			lanes: 1,
			isScrollingResetDelay: 150,
			enabled: !0,
			isRtl: !1,
			useScrollendEvent: !1,
			useAnimationFrameWithResizeObserver: !1,
			...c
		};
	};
	notify = (c) => {
		this.options.onChange?.(this, c);
	};
	maybeNotify = memo(() => (this.calculateRange(), [
		this.isScrolling,
		this.range ? this.range.startIndex : null,
		this.range ? this.range.endIndex : null
	]), (c) => {
		this.notify(c);
	}, {
		key: !1,
		debug: () => this.options.debug,
		initialDeps: [
			this.isScrolling,
			this.range ? this.range.startIndex : null,
			this.range ? this.range.endIndex : null
		]
	});
	cleanup = () => {
		this.unsubs.filter(Boolean).forEach((c) => c()), this.unsubs = [], this.observer.disconnect(), this.scrollElement = null, this.targetWindow = null;
	};
	_didMount = () => () => {
		this.cleanup();
	};
	_willUpdate = () => {
		let c = this.options.enabled ? this.options.getScrollElement() : null;
		if (this.scrollElement !== c) {
			if (this.cleanup(), !c) {
				this.maybeNotify();
				return;
			}
			this.scrollElement = c, this.scrollElement && "ownerDocument" in this.scrollElement ? this.targetWindow = this.scrollElement.ownerDocument.defaultView : this.targetWindow = this.scrollElement?.window ?? null, this.elementsCache.forEach((c) => {
				this.observer.observe(c);
			}), this._scrollToOffset(this.getScrollOffset(), {
				adjustments: void 0,
				behavior: void 0
			}), this.unsubs.push(this.options.observeElementRect(this, (c) => {
				this.scrollRect = c, this.maybeNotify();
			})), this.unsubs.push(this.options.observeElementOffset(this, (c, I) => {
				this.scrollAdjustments = 0, this.scrollDirection = I ? this.getScrollOffset() < c ? "forward" : "backward" : null, this.scrollOffset = c, this.isScrolling = I, this.maybeNotify();
			}));
		}
	};
	getSize = () => this.options.enabled ? (this.scrollRect = this.scrollRect ?? this.options.initialRect, this.scrollRect[this.options.horizontal ? "width" : "height"]) : (this.scrollRect = null, 0);
	getScrollOffset = () => this.options.enabled ? (this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset == "function" ? this.options.initialOffset() : this.options.initialOffset), this.scrollOffset) : (this.scrollOffset = null, 0);
	getFurthestMeasurement = (c, I) => {
		let L = /* @__PURE__ */ new Map(), R = /* @__PURE__ */ new Map();
		for (let B = I - 1; B >= 0; B--) {
			let I = c[B];
			if (L.has(I.lane)) continue;
			let V = R.get(I.lane);
			if (V == null || I.end > V.end ? R.set(I.lane, I) : I.end < V.end && L.set(I.lane, !0), L.size === this.options.lanes) break;
		}
		return R.size === this.options.lanes ? Array.from(R.values()).sort((c, I) => c.end === I.end ? c.index - I.index : c.end - I.end)[0] : void 0;
	};
	getMeasurementOptions = memo(() => [
		this.options.count,
		this.options.paddingStart,
		this.options.scrollMargin,
		this.options.getItemKey,
		this.options.enabled,
		this.options.lanes
	], (c, I, L, R, B, V) => (this.prevLanes !== void 0 && this.prevLanes !== V && (this.lanesChangedFlag = !0), this.prevLanes = V, this.pendingMeasuredCacheIndexes = [], {
		count: c,
		paddingStart: I,
		scrollMargin: L,
		getItemKey: R,
		enabled: B,
		lanes: V
	}), {
		key: !1,
		skipInitialOnChange: !0,
		onChange: () => {
			this.notify(this.isScrolling);
		}
	});
	getMeasurements = memo(() => [this.getMeasurementOptions(), this.itemSizeCache], ({ count: c, paddingStart: I, scrollMargin: L, getItemKey: R, enabled: B, lanes: V }, H) => {
		if (!B) return this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), [];
		if (this.laneAssignments.size > c) for (let I of this.laneAssignments.keys()) I >= c && this.laneAssignments.delete(I);
		this.lanesChangedFlag && (this.lanesChangedFlag = !1, this.lanesSettling = !0, this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), this.pendingMeasuredCacheIndexes = []), this.measurementsCache.length === 0 && (this.measurementsCache = this.options.initialMeasurementsCache, this.measurementsCache.forEach((c) => {
			this.itemSizeCache.set(c.key, c.size);
		}));
		let U = this.lanesSettling ? 0 : this.pendingMeasuredCacheIndexes.length > 0 ? Math.min(...this.pendingMeasuredCacheIndexes) : 0;
		this.pendingMeasuredCacheIndexes = [], this.lanesSettling && this.measurementsCache.length === c && (this.lanesSettling = !1);
		let W = this.measurementsCache.slice(0, U), G = Array(V).fill(void 0);
		for (let c = 0; c < U; c++) {
			let I = W[c];
			I && (G[I.lane] = c);
		}
		for (let B = U; B < c; B++) {
			let c = R(B), V = this.laneAssignments.get(B), U, K;
			if (V !== void 0 && this.options.lanes > 1) {
				U = V;
				let c = G[U], R = c === void 0 ? void 0 : W[c];
				K = R ? R.end + this.options.gap : I + L;
			} else {
				let c = this.options.lanes === 1 ? W[B - 1] : this.getFurthestMeasurement(W, B);
				K = c ? c.end + this.options.gap : I + L, U = c ? c.lane : B % this.options.lanes, this.options.lanes > 1 && this.laneAssignments.set(B, U);
			}
			let q = H.get(c), J = typeof q == "number" ? q : this.options.estimateSize(B), Y = K + J;
			W[B] = {
				index: B,
				start: K,
				size: J,
				end: Y,
				key: c,
				lane: U
			}, G[U] = B;
		}
		return this.measurementsCache = W, W;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	calculateRange = memo(() => [
		this.getMeasurements(),
		this.getSize(),
		this.getScrollOffset(),
		this.options.lanes
	], (c, I, L, R) => this.range = c.length > 0 && I > 0 ? calculateRange({
		measurements: c,
		outerSize: I,
		scrollOffset: L,
		lanes: R
	}) : null, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualIndexes = memo(() => {
		let c = null, I = null, L = this.calculateRange();
		return L && (c = L.startIndex, I = L.endIndex), this.maybeNotify.updateDeps([
			this.isScrolling,
			c,
			I
		]), [
			this.options.rangeExtractor,
			this.options.overscan,
			this.options.count,
			c,
			I
		];
	}, (c, I, L, R, B) => R === null || B === null ? [] : c({
		startIndex: R,
		endIndex: B,
		overscan: I,
		count: L
	}), {
		key: !1,
		debug: () => this.options.debug
	});
	indexFromElement = (c) => {
		let I = this.options.indexAttribute, L = c.getAttribute(I);
		return L ? parseInt(L, 10) : (console.warn(`Missing attribute name '${I}={index}' on measured element.`), -1);
	};
	_measureElement = (c, I) => {
		let L = this.indexFromElement(c), R = this.measurementsCache[L];
		if (!R) return;
		let B = R.key, V = this.elementsCache.get(B);
		V !== c && (V && this.observer.unobserve(V), this.observer.observe(c), this.elementsCache.set(B, c)), c.isConnected && this.resizeItem(L, this.options.measureElement(c, I, this));
	};
	resizeItem = (c, I) => {
		let L = this.measurementsCache[c];
		if (!L) return;
		let R = I - (this.itemSizeCache.get(L.key) ?? L.size);
		R !== 0 && ((this.shouldAdjustScrollPositionOnItemSizeChange === void 0 ? L.start < this.getScrollOffset() + this.scrollAdjustments : this.shouldAdjustScrollPositionOnItemSizeChange(L, R, this)) && this._scrollToOffset(this.getScrollOffset(), {
			adjustments: this.scrollAdjustments += R,
			behavior: void 0
		}), this.pendingMeasuredCacheIndexes.push(L.index), this.itemSizeCache = new Map(this.itemSizeCache.set(L.key, I)), this.notify(!1));
	};
	measureElement = (c) => {
		if (!c) {
			this.elementsCache.forEach((c, I) => {
				c.isConnected || (this.observer.unobserve(c), this.elementsCache.delete(I));
			});
			return;
		}
		this._measureElement(c, void 0);
	};
	getVirtualItems = memo(() => [this.getVirtualIndexes(), this.getMeasurements()], (c, I) => {
		let L = [];
		for (let R = 0, B = c.length; R < B; R++) {
			let B = I[c[R]];
			L.push(B);
		}
		return L;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualItemForOffset = (c) => {
		let I = this.getMeasurements();
		if (I.length !== 0) return notUndefined(I[findNearestBinarySearch(0, I.length - 1, (c) => notUndefined(I[c]).start, c)]);
	};
	getOffsetForAlignment = (c, I, L = 0) => {
		let R = this.getSize(), B = this.getScrollOffset();
		I === "auto" && (I = c >= B + R ? "end" : "start"), I === "center" ? c += (L - R) / 2 : I === "end" && (c -= R);
		let V = this.getTotalSize() + this.options.scrollMargin - R;
		return Math.max(Math.min(V, c), 0);
	};
	getOffsetForIndex = (c, I = "auto") => {
		c = Math.max(0, Math.min(c, this.options.count - 1));
		let L = this.measurementsCache[c];
		if (!L) return;
		let R = this.getSize(), B = this.getScrollOffset();
		if (I === "auto") if (L.end >= B + R - this.options.scrollPaddingEnd) I = "end";
		else if (L.start <= B + this.options.scrollPaddingStart) I = "start";
		else return [B, I];
		let V = I === "end" ? L.end + this.options.scrollPaddingEnd : L.start - this.options.scrollPaddingStart;
		return [this.getOffsetForAlignment(V, I, L.size), I];
	};
	isDynamicMode = () => this.elementsCache.size > 0;
	scrollToOffset = (c, { align: I = "start", behavior: L } = {}) => {
		L === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getOffsetForAlignment(c, I), {
			adjustments: void 0,
			behavior: L
		});
	};
	scrollToIndex = (c, { align: I = "auto", behavior: L } = {}) => {
		L === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), c = Math.max(0, Math.min(c, this.options.count - 1));
		let R = 0, B = (I) => {
			if (!this.targetWindow) return;
			let R = this.getOffsetForIndex(c, I);
			if (!R) {
				console.warn("Failed to get offset for index:", c);
				return;
			}
			let [B, H] = R;
			this._scrollToOffset(B, {
				adjustments: void 0,
				behavior: L
			}), this.targetWindow.requestAnimationFrame(() => {
				let I = this.getScrollOffset(), L = this.getOffsetForIndex(c, H);
				if (!L) {
					console.warn("Failed to get offset for index:", c);
					return;
				}
				approxEqual(L[0], I) || V(H);
			});
		}, V = (I) => {
			this.targetWindow && (R++, R < 10 ? this.targetWindow.requestAnimationFrame(() => B(I)) : console.warn(`Failed to scroll to index ${c} after 10 attempts.`));
		};
		B(I);
	};
	scrollBy = (c, { behavior: I } = {}) => {
		I === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getScrollOffset() + c, {
			adjustments: void 0,
			behavior: I
		});
	};
	getTotalSize = () => {
		let c = this.getMeasurements(), I;
		if (c.length === 0) I = this.options.paddingStart;
		else if (this.options.lanes === 1) I = c[c.length - 1]?.end ?? 0;
		else {
			let L = Array(this.options.lanes).fill(null), R = c.length - 1;
			for (; R >= 0 && L.some((c) => c === null);) {
				let I = c[R];
				L[I.lane] === null && (L[I.lane] = I.end), R--;
			}
			I = Math.max(...L.filter((c) => c !== null));
		}
		return Math.max(I - this.options.scrollMargin + this.options.paddingEnd, 0);
	};
	_scrollToOffset = (c, { adjustments: I, behavior: L }) => {
		this.options.scrollToFn(c, {
			behavior: L,
			adjustments: I
		}, this);
	};
	measure = () => {
		this.itemSizeCache = /* @__PURE__ */ new Map(), this.laneAssignments = /* @__PURE__ */ new Map(), this.notify(!1);
	};
}, findNearestBinarySearch = (c, I, L, R) => {
	for (; c <= I;) {
		let B = (c + I) / 2 | 0, V = L(B);
		if (V < R) c = B + 1;
		else if (V > R) I = B - 1;
		else return B;
	}
	return c > 0 ? c - 1 : 0;
};
function calculateRange({ measurements: c, outerSize: I, scrollOffset: L, lanes: R }) {
	let B = c.length - 1, V = (I) => c[I].start;
	if (c.length <= R) return {
		startIndex: 0,
		endIndex: B
	};
	let H = findNearestBinarySearch(0, B, V, L), U = H;
	if (R === 1) for (; U < B && c[U].end < L + I;) U++;
	else if (R > 1) {
		let V = Array(R).fill(0);
		for (; U < B && V.some((c) => c < L + I);) {
			let I = c[U];
			V[I.lane] = I.end, U++;
		}
		let W = Array(R).fill(L + I);
		for (; H >= 0 && W.some((c) => c >= L);) {
			let I = c[H];
			W[I.lane] = I.start, H--;
		}
		H = Math.max(0, H - H % R), U = Math.min(B, U + (R - 1 - U % R));
	}
	return {
		startIndex: H,
		endIndex: U
	};
}
var ChangeTrackerError = class extends Data.TaggedError("ChangeTrackerError") {}, ValidationError = class extends Data.TaggedError("ValidationError") {}, CellEditorError = class extends Data.TaggedError("CellEditorError") {}, VimCommandTrackerError = class extends Data.TaggedError("VimCommandTrackerError") {}, CommandLineError = class extends Data.TaggedError("CommandLineError") {};
const RowIdSchema = z.string().min(1, "Row ID must not be empty"), FieldSchema = z.string().refine((c) => c === "key" || c === "context" || c.startsWith("values."), { message: "Field must be 'key', 'context', or start with 'values.'" }), LangSchema = z.string().min(1, "Language code must not be empty");
z.string().regex(/^.+-.+$/, "Change key must be in format 'rowId-field'");
function validateWithEffect(c, L, B) {
	return Effect.try({
		try: () => c.parse(L),
		catch: (c) => c instanceof z.ZodError ? new ValidationError({
			message: B || "Validation failed",
			issues: c.issues.map((c) => ({
				path: c.path.map(String),
				message: c.message
			}))
		}) : new ValidationError({
			message: B || "Validation failed",
			issues: [{
				path: [],
				message: String(c)
			}]
		})
	});
}
const defaultConfig = { enableValidation: !1 }, LogLevel = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3
}, logger = new class {
	level;
	constructor() {
		this.level = LogLevel.WARN;
	}
	setLevel(c) {
		this.level = c;
	}
	getLevel() {
		return this.level;
	}
	debug(...c) {
		this.level <= LogLevel.DEBUG && console.log("[DEBUG]", ...c);
	}
	info(...c) {
		this.level <= LogLevel.INFO && console.log("[INFO]", ...c);
	}
	warn(...c) {
		this.level <= LogLevel.WARN && console.warn("[WARN]", ...c);
	}
	error(...c) {
		this.level <= LogLevel.ERROR && console.error("[ERROR]", ...c);
	}
}();
var ChangeTracker = class {
	config;
	changes = /* @__PURE__ */ new Map();
	originalData = /* @__PURE__ */ new Map();
	constructor(c = defaultConfig) {
		this.config = {
			...defaultConfig,
			...c
		};
	}
	initializeOriginalData(c, L) {
		if (this.config.enableValidation) {
			for (let c of L) {
				let L = validateWithEffect(LangSchema, c, `Invalid language code: ${c}`);
				Effect.runSync(Effect.match(L, {
					onFailure: (c) => {
						throw logger.error("ChangeTracker: Invalid language code", c), c;
					},
					onSuccess: () => {}
				}));
			}
			for (let L of c) {
				let c = validateWithEffect(RowIdSchema, L.id, `Invalid row ID: ${L.id}`);
				if (Effect.runSync(Effect.match(c, {
					onFailure: (c) => {
						throw logger.error("ChangeTracker: Invalid row ID", c), c;
					},
					onSuccess: () => {}
				})), typeof L.key != "string" || L.key.length === 0) {
					let c = new ChangeTrackerError({
						message: `Invalid key for translation ${L.id}`,
						code: "INVALID_CHANGE_DATA"
					});
					Effect.runSync(Effect.match(Effect.fail(c), {
						onFailure: (c) => {
							throw logger.error("ChangeTracker: Invalid translation key", c), c;
						},
						onSuccess: () => {}
					}));
				}
			}
		}
		this.originalData.clear(), this.changes.clear(), c.forEach((c) => {
			let I = /* @__PURE__ */ new Map();
			I.set("key", c.key), I.set("context", c.context || ""), L.forEach((L) => {
				I.set(`values.${L}`, c.values[L] || "");
			}), this.originalData.set(c.id, I);
		});
	}
	getOriginalValueEffect(c, R) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, c, "Invalid row ID"), (c) => Effect.flatMap(validateWithEffect(FieldSchema, R, "Invalid field"), (R) => {
			let B = this.originalData.get(c);
			if (!B) return Effect.fail(new ChangeTrackerError({
				message: `Original data not found for row ID: ${c}`,
				code: "ORIGINAL_DATA_NOT_FOUND"
			}));
			let V = B.get(R);
			return Effect.succeed(Option.fromNullable(V));
		}));
	}
	getOriginalValue(c, R) {
		if (!this.config.enableValidation) return this.originalData.get(c)?.get(R) ?? "";
		let B = this.getOriginalValueEffect(c, R);
		return Effect.runSync(Effect.match(B, {
			onFailure: () => "",
			onSuccess: (c) => Option.getOrElse(c, () => "")
		}));
	}
	trackChangeEffect(c, L, R, B, V, H) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, c, "Invalid row ID"), (c) => Effect.flatMap(validateWithEffect(FieldSchema, L, "Invalid field"), (L) => Effect.flatMap(validateWithEffect(LangSchema, R, "Invalid language code"), (R) => {
			if (typeof H != "string" || H.length === 0) return Effect.fail(new ChangeTrackerError({
				message: "Key must be a non-empty string",
				code: "INVALID_CHANGE_DATA"
			}));
			let U = `${c}-${L}`;
			if (B === V) return this.changes.delete(U), Effect.void;
			let W = {
				id: c,
				key: H,
				lang: R,
				oldValue: B,
				newValue: V
			};
			return this.changes.set(U, W), Effect.void;
		})));
	}
	trackChange(c, L, R, B, V, H, U) {
		if (!this.config.enableValidation) {
			let I = `${c}-${L}`;
			if (B === V) {
				this.changes.delete(I), U && U(c, L, !1);
				return;
			}
			let W = {
				id: c,
				key: H,
				lang: R,
				oldValue: B,
				newValue: V
			};
			this.changes.set(I, W), U && U(c, L, !0);
			return;
		}
		let W = this.trackChangeEffect(c, L, R, B, V, H);
		Effect.runSync(Effect.match(W, {
			onFailure: (c) => {
				logger.warn("ChangeTracker: Failed to track change", c);
			},
			onSuccess: () => {
				U && U(c, L, B !== V);
			}
		}));
	}
	hasChangeEffect(c, L) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, c, "Invalid row ID"), (c) => Effect.flatMap(validateWithEffect(FieldSchema, L, "Invalid field"), (L) => {
			let R = `${c}-${L}`;
			return Effect.succeed(this.changes.has(R));
		}));
	}
	hasChange(c, L) {
		if (!this.config.enableValidation) {
			let I = `${c}-${L}`;
			return this.changes.has(I);
		}
		let R = this.hasChangeEffect(c, L);
		return Effect.runSync(Effect.match(R, {
			onFailure: () => !1,
			onSuccess: (c) => c
		}));
	}
	getChanges() {
		return Array.from(this.changes.values());
	}
	clearChanges(c) {
		let I = Array.from(this.changes.entries());
		if (this.changes.clear(), c) for (let [L, R] of I) {
			let I = R.id;
			c(I, L.slice(I.length + 1), !1);
		}
	}
	getChangesMap() {
		return this.changes;
	}
}, UndoRedoManager = class {
	history = [];
	currentIndex = -1;
	maxHistorySize = 100;
	push(c) {
		this.history = this.history.slice(0, this.currentIndex + 1), this.history.push(c), this.currentIndex++, this.history.length > this.maxHistorySize && (this.history.shift(), this.currentIndex--);
	}
	canUndo() {
		return this.currentIndex >= 0;
	}
	canRedo() {
		return this.currentIndex < this.history.length - 1;
	}
	undo() {
		if (!this.canUndo()) return null;
		let c = this.history[this.currentIndex];
		return this.currentIndex--, {
			type: c.type,
			rowId: c.rowId,
			columnId: c.columnId,
			oldValue: c.newValue,
			newValue: c.oldValue
		};
	}
	redo() {
		return this.canRedo() ? (this.currentIndex++, this.history[this.currentIndex]) : null;
	}
	clear() {
		this.history = [], this.currentIndex = -1;
	}
	getHistoryState() {
		return {
			length: this.history.length,
			currentIndex: this.currentIndex,
			canUndo: this.canUndo(),
			canRedo: this.canRedo()
		};
	}
}, ModifierKeyTracker = class {
	metaKeyPressed = !1;
	ctrlKeyPressed = !1;
	modifierKeyDownHandler = null;
	modifierKeyUpHandler = null;
	attach() {
		this.modifierKeyDownHandler || this.modifierKeyUpHandler || (this.modifierKeyDownHandler = (c) => {
			(c.key === "Meta" || c.key === "MetaLeft" || c.key === "MetaRight") && (this.metaKeyPressed = !0), (c.key === "Control" || c.key === "ControlLeft" || c.key === "ControlRight") && (this.ctrlKeyPressed = !0);
		}, this.modifierKeyUpHandler = (c) => {
			(c.key === "Meta" || c.key === "MetaLeft" || c.key === "MetaRight") && (this.metaKeyPressed = !1), (c.key === "Control" || c.key === "ControlLeft" || c.key === "ControlRight") && (this.ctrlKeyPressed = !1);
		}, window.addEventListener("keydown", this.modifierKeyDownHandler, !0), window.addEventListener("keyup", this.modifierKeyUpHandler, !0));
	}
	detach() {
		this.modifierKeyDownHandler &&= (window.removeEventListener("keydown", this.modifierKeyDownHandler, !0), null), this.modifierKeyUpHandler &&= (window.removeEventListener("keyup", this.modifierKeyUpHandler, !0), null);
	}
	isModifierPressed(c) {
		return navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? this.metaKeyPressed || c.metaKey || this.ctrlKeyPressed || c.ctrlKey : this.ctrlKeyPressed || c.ctrlKey || this.metaKeyPressed || c.metaKey;
	}
	get metaKey() {
		return this.metaKeyPressed;
	}
	get ctrlKey() {
		return this.ctrlKeyPressed;
	}
	reset() {
		this.metaKeyPressed = !1, this.ctrlKeyPressed = !1;
	}
}, FocusManager = class {
	focusedCell = null;
	getFocusedCell() {
		return this.focusedCell;
	}
	focusCell(c, I) {
		this.focusedCell = {
			rowIndex: c,
			columnId: I
		};
	}
	blur() {
		this.focusedCell = null;
	}
	hasFocus() {
		return this.focusedCell !== null;
	}
};
function toMutableTranslation(c) {
	return {
		id: c.id,
		key: c.key,
		context: c.context,
		values: { ...c.values },
		createdAt: c.createdAt,
		updatedAt: c.updatedAt,
		updatedBy: c.updatedBy
	};
}
function getLangFromColumnId(c) {
	return c === "key" ? "key" : c === "context" ? "context" : c.startsWith("values.") ? c.replace("values.", "") : c;
}
function getTranslationKey(c, I, L, R) {
	return L === "key" ? R : c.find((c) => c.id === I)?.key || "";
}
function checkKeyDuplicate(c, I, L) {
	return c.some((c) => c.id !== I && c.key.trim() === L.trim());
}
var CellEditor = class {
	editingCell = null;
	isEscapeKeyPressed = !1;
	isFinishingEdit = !1;
	translations;
	changeTracker;
	undoRedoManager;
	callbacks;
	constructor(c, I, L, R = {}) {
		this.translations = c, this.changeTracker = I, this.undoRedoManager = L, this.callbacks = R;
	}
	getEditingCell() {
		return this.editingCell;
	}
	isEditing() {
		return this.editingCell !== null;
	}
	startEditingEffect(c, L, R, B) {
		this.editingCell && this.stopEditing();
		let V = B.querySelector(".virtual-grid-cell-content");
		if (!V) return Effect.fail(new CellEditorError({
			message: "Cell content not found",
			code: "TRANSLATION_NOT_FOUND"
		}));
		let H = V.textContent || "", U = this.createEditInput(H);
		B.innerHTML = "", B.appendChild(U), requestAnimationFrame(() => {
			U.focus(), U.select();
		}), this.editingCell = {
			rowIndex: c,
			columnId: L,
			rowId: R
		}, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!0);
		let W = !1;
		if (L === "key") {
			let c = () => {
				let c = U.value.trim();
				W = !1, B.classList.remove("cell-duplicate-key"), c && checkKeyDuplicate(this.translations, R, c) && (W = !0, B.classList.add("cell-duplicate-key"));
			};
			U.addEventListener("input", c), c();
		}
		let G = !1;
		return this.attachInputListeners(U, B, (c) => {
			if (G) return;
			G = !0, c && L === "key" && W && (c = !1), c && U.value !== H && this.applyCellChange(R, L, H, U.value).catch((c) => {
				logger.error("Failed to apply cell change:", c);
			});
			let I = c ? U.value : H;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(B, R, L, I), this.editingCell = null, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!1);
		}, c, L, H, R), Effect.void;
	}
	startEditing(c, I, L, R) {
		this.editingCell && this.stopEditing();
		let B = R.querySelector(".virtual-grid-cell-content");
		if (!B) return;
		let V = B.textContent || "", H = this.createEditInput(V);
		R.innerHTML = "", R.appendChild(H), requestAnimationFrame(() => {
			H.focus(), H.select();
		}), this.editingCell = {
			rowIndex: c,
			columnId: I,
			rowId: L
		}, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!0);
		let U = !1;
		if (I === "key") {
			let c = () => {
				let c = H.value.trim();
				U = !1, R.classList.remove("cell-duplicate-key"), c && checkKeyDuplicate(this.translations, L, c) && (U = !0, R.classList.add("cell-duplicate-key"));
			};
			H.addEventListener("input", c), c();
		}
		let W = !1;
		this.attachInputListeners(H, R, (c) => {
			if (W) return;
			W = !0, c && I === "key" && U && (c = !1), c && H.value !== V && this.applyCellChange(L, I, V, H.value).catch((c) => {
				logger.error("Failed to apply cell change:", c);
			});
			let B = c ? H.value : V;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(R, L, I, B), this.editingCell = null, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!1);
		}, c, I, V, L);
	}
	attachInputListeners(c, I, L, R, B, V, H) {
		c.addEventListener("blur", () => {
			c.isConnected && (this.isEscapeKeyPressed ? (L(!1), this.isEscapeKeyPressed = !1) : L(!0));
		}), c.addEventListener("beforeinput", (c) => {
			(c.inputType === "historyUndo" || c.inputType === "historyRedo") && (c.preventDefault(), L(!0));
		}), c.addEventListener("keydown", (I) => {
			if (I.key === "Enter") {
				I.preventDefault(), I.stopPropagation();
				let c = I.shiftKey ? "up" : "down";
				L(!0), B.startsWith("values.") && this.callbacks.onEditFinished && requestAnimationFrame(() => {
					this.callbacks.onEditFinished && this.callbacks.onEditFinished(R, B, c);
				});
			} else I.key === "Escape" ? (I.preventDefault(), I.stopPropagation(), this.isEscapeKeyPressed = !0, c.blur()) : I.key === "Tab" && (I.preventDefault(), I.stopPropagation(), L(!0));
		});
	}
	applyCellChangeEffect(c, L, R, B) {
		let V = this.translations.find((I) => I.id === c);
		if (!V) return Effect.fail(new CellEditorError({
			message: `Translation not found: ${c}`,
			code: "TRANSLATION_NOT_FOUND"
		}));
		let H = toMutableTranslation(V);
		if (L === "key") H.key = B;
		else if (L === "context") H.context = B;
		else if (L.startsWith("values.")) {
			let c = L.replace("values.", "");
			H.values[c] = B;
		} else return Effect.fail(new CellEditorError({
			message: `Invalid column ID: ${L}`,
			code: "INVALID_COLUMN_ID"
		}));
		this.undoRedoManager.push({
			type: "cell-change",
			rowId: c,
			columnId: L,
			oldValue: R,
			newValue: B
		});
		let U = this.changeTracker.getOriginalValue(c, L), W = getLangFromColumnId(L), G = getTranslationKey(this.translations, c, L, B);
		return this.changeTracker.trackChange(c, L, W, U, B, G, () => {
			this.callbacks.updateCellStyle && this.callbacks.updateCellStyle(c, L);
		}), this.callbacks.onCellChange && this.callbacks.onCellChange(c, L, B), Effect.void;
	}
	async applyCellChange(c, L, R, B) {
		let V = this.applyCellChangeEffect(c, L, R, B);
		return Effect.runPromise(V);
	}
	stopEditingEffect(c) {
		return this.editingCell && this.stopEditing(c), Effect.void;
	}
	stopEditing(c) {
		if (!this.editingCell || !c) {
			this.editingCell = null;
			return;
		}
		let I = c.querySelector(`[data-row-index="${this.editingCell.rowIndex}"]`);
		if (I) {
			let c = I.querySelector(`[data-column-id="${this.editingCell.columnId}"]`);
			if (c) {
				let I = c.querySelector("input");
				if (I) {
					let L = c.getAttribute("data-row-id"), R = this.editingCell.columnId, B = I.value;
					this.isFinishingEdit = !0, this.callbacks.updateCellContent && L && this.callbacks.updateCellContent(c, L, R, B), this.isFinishingEdit = !1;
				}
			}
		}
		this.editingCell = null;
	}
	createEditInput(c) {
		let I = document.createElement("input");
		return I.type = "text", I.value = c, I.className = "virtual-grid-cell-input", I.style.width = "100%", I.style.height = "100%", I.style.border = "2px solid #3b82f6", I.style.outline = "none", I.style.padding = "4px 8px", I.style.fontSize = "14px", I.style.fontFamily = "inherit", I.style.backgroundColor = "#fff", I;
	}
	setEscapeKeyPressed(c) {
		this.isEscapeKeyPressed = c;
	}
}, KeyboardHandler = class {
	keyboardHandler = null;
	modifierKeyTracker;
	focusManager;
	callbacks;
	constructor(c, I, L = {}) {
		this.modifierKeyTracker = c, this.focusManager = I, this.callbacks = L;
	}
	attach() {
		this.keyboardHandler || (this.keyboardHandler = (c) => {
			let I = this.modifierKeyTracker.isModifierPressed(c), L = c.target, R = L.tagName === "INPUT" || L.tagName === "TEXTAREA" || L.isContentEditable, B = (c.key === "z" || c.key === "Z" || c.code === "KeyZ") && !c.shiftKey;
			if (I && B) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onUndo && this.callbacks.onUndo();
				return;
			}
			let V = c.key === "y" || c.key === "Y" || c.code === "KeyY" || (c.key === "z" || c.key === "Z" || c.code === "KeyZ") && c.shiftKey;
			if (I && V) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onRedo && this.callbacks.onRedo();
				return;
			}
			if (I && (c.key === "k" || c.code === "KeyK")) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onOpenCommandPalette && this.callbacks.onOpenCommandPalette("excel");
				return;
			}
			if (I && (c.key === "f" || c.code === "KeyF") && !R) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onOpenFind && this.callbacks.onOpenFind();
				return;
			}
			if (I && (c.key === "h" || c.code === "KeyH") && !R) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onOpenReplace && this.callbacks.onOpenReplace();
				return;
			}
			if (I && (c.key === "n" || c.code === "KeyN") && !R) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onAddRow && this.callbacks.onAddRow();
				return;
			}
			if ((c.key === "/" || c.code === "Slash") && !R && (!this.callbacks.isQuickSearchMode || !this.callbacks.isQuickSearchMode())) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onOpenQuickSearch && this.callbacks.onOpenQuickSearch();
				return;
			}
			if (this.callbacks.isQuickSearchMode && this.callbacks.isQuickSearchMode() && !R) {
				if (c.key === "n" && !c.shiftKey) {
					c.preventDefault(), c.stopPropagation(), this.callbacks.onQuickSearchNext && this.callbacks.onQuickSearchNext();
					return;
				}
				if (c.key === "N" || c.key === "n" && c.shiftKey) {
					c.preventDefault(), c.stopPropagation(), this.callbacks.onQuickSearchPrev && this.callbacks.onQuickSearchPrev();
					return;
				}
			}
			if (c.key === "F2" || c.code === "F2") {
				if (this.focusManager.hasFocus() && !R) {
					c.preventDefault(), c.stopPropagation();
					let I = this.focusManager.getFocusedCell();
					if (I && this.callbacks.onStartEditing) {
						if (this.callbacks.isEditableColumn && !this.callbacks.isEditableColumn(I.columnId) || this.callbacks.isReadOnly && this.callbacks.isReadOnly()) return;
						this.callbacks.onStartEditing(I.rowIndex, I.columnId);
					}
				}
				return;
			}
			if (c.key === "Enter" && this.focusManager.hasFocus() && !R && (!this.callbacks.isQuickSearchMode || !this.callbacks.isQuickSearchMode())) {
				let I = this.focusManager.getFocusedCell();
				if (I) {
					let L = I.columnId.startsWith("values.");
					if (c.shiftKey) {
						if (!L) return;
					} else if (!L) {
						if (this.callbacks.isEditableColumn && !this.callbacks.isEditableColumn(I.columnId) || this.callbacks.isReadOnly && this.callbacks.isReadOnly()) return;
						if (this.callbacks.onStartEditing) {
							c.preventDefault(), c.stopPropagation(), this.callbacks.onStartEditing(I.rowIndex, I.columnId);
							return;
						}
					}
				}
			}
			this.focusManager.hasFocus() && !R && this.handleKeyboardNavigation(c);
		}, document.addEventListener("keydown", this.keyboardHandler, !0));
	}
	detach() {
		this.keyboardHandler &&= (document.removeEventListener("keydown", this.keyboardHandler, !0), null);
	}
	handleKeyboardNavigation(c) {
		let I = this.focusManager.getFocusedCell();
		if (!I || !this.callbacks.getAllColumns || !this.callbacks.focusCell) return;
		let { rowIndex: L, columnId: R } = I, B = this.callbacks.getAllColumns(), V = this.callbacks.getMaxRowIndex ? this.callbacks.getMaxRowIndex() : Infinity, H = B.indexOf(R);
		if (H < 0) return;
		let U = L, W = H;
		if (c.key === "Tab" && (c.preventDefault(), c.stopPropagation(), c.shiftKey ? H > 0 ? W = H - 1 : L > 0 ? (U = L - 1, W = B.length - 1) : (U = V, W = B.length - 1) : H < B.length - 1 ? W = H + 1 : L < V ? (U = L + 1, W = 0) : (U = 0, W = 0)), c.key === "Enter" && R.startsWith("values.")) if (c.preventDefault(), c.stopPropagation(), c.shiftKey) if (L > 0) U = L - 1;
		else return;
		else if (L < V) U = L + 1;
		else return;
		c.key.startsWith("Arrow") && (c.preventDefault(), c.stopPropagation(), c.key === "ArrowRight" && H < B.length - 1 ? W = H + 1 : c.key === "ArrowLeft" && H > 0 ? W = H - 1 : c.key === "ArrowDown" && L < V ? U = L + 1 : c.key === "ArrowUp" && L > 0 && (U = L - 1));
		let G = B[W];
		G && (c.shiftKey && c.key.startsWith("Arrow") && this.callbacks.onExtendSelection && this.callbacks.onExtendSelection(U, G), this.focusManager.focusCell(U, G), this.callbacks.focusCell(U, G), this.callbacks.onNavigate && this.callbacks.onNavigate(U, G));
	}
	updateCallbacks(c) {
		this.callbacks = {
			...this.callbacks,
			...c
		};
	}
}, ColumnResizer = class {
	isResizing = !1;
	resizeStartX = 0;
	resizeStartWidth = 0;
	resizeColumnId = null;
	resizeHandler = null;
	resizeEndHandler = null;
	options;
	constructor(c) {
		this.options = c;
	}
	addResizeHandle(c, I) {
		let L = document.createElement("div");
		L.className = "column-resize-handle", L.setAttribute("data-column-id", I), L.style.position = "absolute", L.style.right = "-2px", L.style.top = "0", L.style.bottom = "0", L.style.width = "4px", L.style.cursor = "col-resize", L.style.zIndex = "25", L.style.backgroundColor = "transparent", L.addEventListener("mousedown", (L) => {
			L.preventDefault(), L.stopPropagation(), this.startResize(I, L.clientX, c);
		}), c.appendChild(L);
	}
	startResize(c, I, L) {
		this.isResizing = !0, this.resizeStartX = I, this.resizeStartWidth = L.offsetWidth || L.getBoundingClientRect().width, this.resizeColumnId = c, this.options.callbacks.onResizeStart && this.options.callbacks.onResizeStart(c), this.resizeHandler = (c) => {
			!this.isResizing || !this.resizeColumnId || (c.preventDefault(), this.handleResize(c.clientX));
		}, this.resizeEndHandler = (c) => {
			this.isResizing && (c.preventDefault(), this.endResize());
		}, document.addEventListener("mousemove", this.resizeHandler, !0), document.addEventListener("mouseup", this.resizeEndHandler, !0), document.body.style.cursor = "col-resize", document.body.style.userSelect = "none";
	}
	handleResize(c) {
		if (!this.resizeColumnId) return;
		let I = c - this.resizeStartX, L = this.options.columnMinWidths.get(this.resizeColumnId) || 80, R = Math.max(L, this.resizeStartWidth + I), B = `values.${this.options.languages[this.options.languages.length - 1]}`;
		this.resizeColumnId !== B && this.options.columnWidths.set(this.resizeColumnId, R), this.options.callbacks.onResize && this.options.callbacks.onResize(this.resizeColumnId, R);
	}
	endResize() {
		this.resizeHandler &&= (document.removeEventListener("mousemove", this.resizeHandler, !0), null), this.resizeEndHandler &&= (document.removeEventListener("mouseup", this.resizeEndHandler, !0), null), document.body.style.cursor = "", document.body.style.userSelect = "";
		let c = this.resizeColumnId, I = c && this.options.columnWidths.get(c) || this.resizeStartWidth;
		this.isResizing = !1, this.resizeColumnId = null, c && this.options.callbacks.onResizeEnd && this.options.callbacks.onResizeEnd(c, I);
	}
	isResizingActive() {
		return this.isResizing;
	}
	reset() {
		this.isResizing && this.endResize();
	}
	destroy() {
		this.reset();
	}
}, ColumnWidthCalculator = class {
	defaultKeyWidth;
	defaultContextWidth;
	defaultLangWidth;
	options;
	constructor(c) {
		this.options = c, this.defaultKeyWidth = c.defaultKeyWidth ?? 200, this.defaultContextWidth = c.defaultContextWidth ?? 200, this.defaultLangWidth = c.defaultLangWidth ?? 150;
	}
	getColumnWidthValue(c, I) {
		return this.options.columnWidths.get(c) || I || this.getDefaultWidth(c);
	}
	getDefaultWidth(c) {
		return c === "row-number" ? 50 : c === "key" ? this.defaultKeyWidth : c === "context" ? this.defaultContextWidth : this.defaultLangWidth;
	}
	calculateColumnWidths(c) {
		let I = this.getColumnWidthValue("row-number", 50), L = this.getColumnWidthValue("key", this.defaultKeyWidth), R = this.getColumnWidthValue("context", this.defaultContextWidth), B = this.options.languages.map((c) => this.getColumnWidthValue(`values.${c}`, this.defaultLangWidth)), V = I + L + R + B.slice(0, -1).reduce((c, I) => c + I, 0), H = this.options.languages[this.options.languages.length - 1], U = this.options.columnMinWidths.get(`values.${H}`) || 80, W = Math.max(U, c - V);
		return {
			rowNumber: I,
			key: L,
			context: R,
			languages: [...B.slice(0, -1), W]
		};
	}
	applyColumnWidth(c, I, L) {
		let R = `values.${this.options.languages[this.options.languages.length - 1]}`;
		c !== R && this.options.columnWidths.set(c, I);
		let B = this.getColumnWidthValue("row-number", 50), V = c === "key" ? I : this.getColumnWidthValue("key", this.defaultKeyWidth), H = c === "context" ? I : this.getColumnWidthValue("context", this.defaultContextWidth), U = this.options.languages.slice(0, -1).map((L) => {
			let R = `values.${L}`;
			return c === R ? I : this.getColumnWidthValue(R, this.defaultLangWidth);
		}), W = B + V + H + U.reduce((c, I) => c + I, 0), G = this.options.columnMinWidths.get(R) || 80, K = Math.max(G, L - W);
		return {
			columnWidths: {
				rowNumber: B,
				key: V,
				context: H,
				languages: [...U, K]
			},
			totalWidth: L
		};
	}
}, GridRenderer = class {
	options;
	constructor(c) {
		this.options = c;
	}
	createHeaderCell(c, I, L, R, B) {
		let V = document.createElement("div");
		return V.className = "virtual-grid-header-cell", V.setAttribute("role", "columnheader"), V.textContent = c, B && V.setAttribute("data-column-id", B), V.style.width = `${I}px`, V.style.minWidth = `${I}px`, V.style.maxWidth = `${I}px`, (L > 0 || R > 0) && (V.style.position = "sticky", V.style.left = `${L}px`, V.style.zIndex = R.toString(), V.style.backgroundColor = "#f8fafc"), V.style.overflow = "visible", V;
	}
	createRow(c, I, L) {
		let R = document.createElement("div");
		R.className = "virtual-grid-row", R.setAttribute("role", "row"), R.setAttribute("data-row-index", I.toString()), R.setAttribute("data-row-id", c.id), this.options.callbacks.isNewRow?.(c.id) && R.classList.add("new-row");
		let B = this.createCell(c.id, "row-number", (I + 1).toString(), I, !1, L.rowNumber, 0, 15);
		B.classList.add("row-number-cell"), R.appendChild(B);
		let V = this.createCell(c.id, "key", c.key, I, !this.options.readOnly, L.key, L.rowNumber, 10);
		R.appendChild(V);
		let H = this.createCell(c.id, "context", c.context || "", I, !this.options.readOnly, L.context, L.rowNumber + L.key, 10);
		return R.appendChild(H), this.options.languages.forEach((B, V) => {
			let H = c.values[B] || "", U = L.languages[V], W = L.rowNumber + L.key + L.context, G = this.createCell(c.id, `values.${B}`, H, I, !this.options.readOnly, U, W, 0);
			R.appendChild(G);
		}), R;
	}
	createCell(c, I, L, R, B, V, H, U) {
		let W = document.createElement("div");
		W.className = "virtual-grid-cell", W.setAttribute("role", "gridcell"), W.setAttribute("data-row-id", c), W.setAttribute("data-column-id", I), W.setAttribute("data-row-index", R.toString()), W.setAttribute("tabindex", B ? "0" : "-1"), W.style.width = `${V}px`, W.style.minWidth = `${V}px`, W.style.maxWidth = `${V}px`, (H > 0 || U > 0) && (W.style.position = "sticky", W.style.left = `${H}px`, W.style.zIndex = U.toString(), W.style.backgroundColor = "#fafafa");
		let G = document.createElement("div");
		return G.className = "virtual-grid-cell-content", G.textContent = L, W.appendChild(G), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(c, I, W), W.addEventListener("click", (c) => {
			this.options.callbacks.onCellClick && this.options.callbacks.onCellClick(R, I, W, c);
		}), B && !this.options.readOnly && (W.addEventListener("dblclick", (c) => {
			c.preventDefault(), c.stopPropagation(), this.options.callbacks.onCellDblClick && this.options.callbacks.onCellDblClick(R, I, W);
		}), W.addEventListener("focus", () => {
			this.options.callbacks.onCellFocus && this.options.callbacks.onCellFocus(R, I), W.classList.add("focused");
		}), W.addEventListener("blur", () => {
			W.classList.remove("focused");
		})), W;
	}
	updateCellContent(c, I, L, R, B) {
		let V = c.querySelector(".virtual-grid-cell-input");
		if (V && V.parentNode && c.contains(V)) try {
			V.remove();
		} catch {}
		let H = c.querySelector(".virtual-grid-cell-content");
		H ? H.textContent = R : (H = document.createElement("div"), H.className = "virtual-grid-cell-content", H.textContent = R, c.appendChild(H)), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(I, L, c);
	}
}, CommandRegistry = class {
	commands = /* @__PURE__ */ new Map();
	usageCounts = /* @__PURE__ */ new Map();
	storageKey = "command-palette-usage";
	callbacks;
	constructor(c = {}) {
		this.callbacks = c, this.loadUsageCounts();
	}
	registerCommand(c) {
		let I = {
			...c,
			usageCount: c.usageCount ?? 0,
			availableInModes: c.availableInModes ?? ["all"]
		};
		this.commands.set(c.id, I), this.applySavedUsageCount(c.id);
	}
	getCommandById(c) {
		return this.commands.get(c);
	}
	getCommands(c) {
		let I = Array.from(this.commands.values());
		return !c || c === "all" ? I : I.filter((I) => {
			let L = I.availableInModes ?? ["all"];
			return L.includes("all") || L.includes(c);
		});
	}
	incrementUsage(c) {
		let I = (this.usageCounts.get(c) ?? 0) + 1;
		this.usageCounts.set(c, I);
		let L = this.commands.get(c);
		L && (L.usageCount = I), this.saveUsageCounts(), this.callbacks.onCommandExecuted && this.callbacks.onCommandExecuted(c);
	}
	getPopularCommands(c = 10, I) {
		return this.getCommands(I).sort((c, I) => {
			let L = this.usageCounts.get(c.id) ?? 0;
			return (this.usageCounts.get(I.id) ?? 0) - L;
		}).slice(0, c);
	}
	loadUsageCounts() {
		try {
			let c = localStorage.getItem(this.storageKey);
			if (c) {
				let I = JSON.parse(c);
				this.usageCounts = new Map(Object.entries(I));
			}
		} catch (c) {
			logger.warn("Failed to load command usage counts:", c);
		}
	}
	applySavedUsageCount(c) {
		let I = this.usageCounts.get(c);
		if (I !== void 0) {
			let L = this.commands.get(c);
			L && (L.usageCount = I);
		}
	}
	saveUsageCounts() {
		try {
			let c = Object.fromEntries(this.usageCounts);
			localStorage.setItem(this.storageKey, JSON.stringify(c));
		} catch (c) {
			logger.warn("Failed to save command usage counts:", c);
		}
	}
	clear() {
		this.commands.clear(), this.usageCounts.clear(), localStorage.removeItem(this.storageKey);
	}
};
function searchCommands(c, I) {
	if (!c.trim()) return I.map((c) => ({
		command: c,
		score: 1,
		matchedIndices: []
	}));
	let L = new Fuse(I, {
		keys: [
			{
				name: "label",
				weight: .5
			},
			{
				name: "keywords",
				weight: .3
			},
			{
				name: "id",
				weight: .2
			}
		],
		threshold: .6,
		includeScore: !0,
		includeMatches: !0,
		ignoreLocation: !1,
		minMatchCharLength: 1,
		findAllMatches: !1,
		shouldSort: !0,
		distance: 100
	}).search(c).map((c) => {
		let I = c.score === void 0 ? 0 : 1 - c.score, L = [];
		if (c.matches) {
			for (let I of c.matches) if (I.indices) for (let [c, R] of I.indices) for (let I = c; I <= R; I++) L.push(I);
		}
		return {
			command: c.item,
			score: I,
			matchedIndices: Array.from(new Set(L)).sort((c, I) => c - I)
		};
	});
	return L.sort((c, I) => {
		if (Math.abs(c.score - I.score) < .01) {
			let L = c.command.usageCount ?? 0;
			return (I.command.usageCount ?? 0) - L;
		}
		return I.score - c.score;
	}), L;
}
function parseFuzzyFindInput(c) {
	let I = c.trim();
	if (!I.startsWith("goto ") && !I.startsWith("go to ")) return {
		isFuzzyFindMode: !1,
		fuzzyFindQuery: "",
		quoteChar: null
	};
	let L = I.startsWith("goto ") ? I.slice(5) : I.slice(6), R = null;
	if (L.startsWith("\"")) R = "\"";
	else if (L.startsWith("'")) R = "'";
	else return {
		isFuzzyFindMode: !1,
		fuzzyFindQuery: "",
		quoteChar: null
	};
	let B = L.slice(1), V = B;
	return B.endsWith(R) && (V = B.slice(0, -1)), {
		isFuzzyFindMode: !0,
		fuzzyFindQuery: V,
		quoteChar: R
	};
}
function updateInputStyling(c, I, L) {
	let R = c.parentElement?.querySelector(".command-palette-input-overlay");
	if (R && R.remove(), !L.isFuzzyFindMode || !L.quoteChar) return c.style.color = "", c.style.webkitTextFillColor = "", null;
	c.style.color = "transparent", c.style.webkitTextFillColor = "transparent";
	let B = document.documentElement.classList.contains("dark") ? "#f1f5f9" : "#1e293b", V = document.createElement("div");
	V.className = "command-palette-input-overlay", V.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    padding: 12px 16px;
    font-size: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    white-space: pre;
    overflow: hidden;
    box-sizing: border-box;
    line-height: 1.5;
    border: none;
    background: transparent;
    color: ${B};
  `;
	let H = I.indexOf(L.quoteChar), U = I.substring(0, H), W = L.fuzzyFindQuery;
	if (U) {
		let c = document.createElement("span");
		c.style.color = B, c.textContent = U, V.appendChild(c);
	}
	if (W) {
		let c = document.createElement("span");
		c.style.cssText = `
      font-weight: bold;
      font-style: italic;
      color: ${B};
    `, c.textContent = W, V.appendChild(c);
	}
	return c.parentElement && c.parentElement.appendChild(V), V;
}
function createFuzzyFindList(c, I, L, R, B) {
	if (c.innerHTML = "", !I || I.trim() === "") {
		let I = document.createElement("div");
		I.className = "command-palette-item command-palette-item-empty", I.textContent = "Type to search...", c.appendChild(I);
		return;
	}
	if (L.length === 0) {
		let I = document.createElement("div");
		I.className = "command-palette-item command-palette-item-empty", I.textContent = "No matches found", c.appendChild(I);
		return;
	}
	let V = document.createElement("div");
	V.className = "command-palette-item command-palette-item-empty", V.textContent = `Search Results (${L.length})`, c.appendChild(V), L.forEach((I, L) => {
		let V = document.createElement("div");
		V.className = "command-palette-item", V.setAttribute("role", "option"), V.setAttribute("aria-selected", (L === R).toString()), L === R && V.classList.add("command-palette-item-selected");
		let H = document.createElement("div");
		H.className = "command-palette-item-label";
		let U = I.translation, W = "";
		if (I.matchedFields && I.matchedFields.length > 0) {
			let c = I.matchedFields[0];
			if (c.field === "key") W = `Key: ${U.key}`;
			else if (c.field === "context") W = `Context: ${U.context || ""}`;
			else if (c.field.startsWith("values.")) {
				let I = c.field.replace("values.", "");
				W = `${I.toUpperCase()}: ${U.values?.[I] || ""}`;
			} else W = U.key || "";
		} else W = U.key || "";
		H.textContent = W;
		let G = document.createElement("div");
		G.className = "command-palette-item-description", G.textContent = `Row ${I.rowIndex + 1}`, V.appendChild(G), V.appendChild(H), V.addEventListener("click", () => {
			B(L);
		}), c.appendChild(V);
	});
}
var CommandPalette = class {
	overlay = null;
	container = null;
	input = null;
	list = null;
	footer = null;
	isOpen = !1;
	query = "";
	filteredCommands = [];
	selectedIndex = 0;
	currentMode = "excel";
	commandRegistry;
	callbacks;
	isFuzzyFindMode = !1;
	fuzzyFindQuery = "";
	fuzzyFindQuoteChar = null;
	fuzzyFindResults = [];
	fuzzyFindDebounceTimer = null;
	inputOverlay = null;
	constructor(c, I = {}) {
		this.commandRegistry = c, this.callbacks = I;
	}
	open(c = "excel") {
		this.isOpen || (this.currentMode = c, this.isOpen = !0, this.query = "", this.selectedIndex = 0, this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.fuzzyFindResults = [], this.createUI(), this.updateCommands(), this.attachEventListeners(), requestAnimationFrame(() => {
			this.input?.focus();
		}));
	}
	close() {
		this.isOpen && (this.isOpen = !1, this.query = "", this.selectedIndex = 0, this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.fuzzyFindResults = [], this.fuzzyFindDebounceTimer !== null && (clearTimeout(this.fuzzyFindDebounceTimer), this.fuzzyFindDebounceTimer = null), this.inputOverlay &&= (this.inputOverlay.remove(), null), this.detachEventListeners(), this.removeUI(), this.callbacks.onClose && this.callbacks.onClose());
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "command-palette-overlay", this.overlay.setAttribute("role", "dialog"), this.overlay.setAttribute("aria-label", "Command Palette"), this.overlay.setAttribute("aria-modal", "true"), this.container = document.createElement("div"), this.container.className = "command-palette", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "command-palette-input", this.input.setAttribute("placeholder", "Type a command or search..."), this.input.setAttribute("aria-label", "Command search input"), this.input.setAttribute("autocomplete", "off"), this.input.setAttribute("spellcheck", "false"), this.list = document.createElement("div"), this.list.className = "command-palette-list", this.list.setAttribute("role", "listbox"), this.list.setAttribute("aria-label", "Command list"), this.footer = document.createElement("div"), this.footer.className = "command-palette-footer", this.footer.innerHTML = "\n      <span class=\"command-palette-hint\">\n        <kbd>↑</kbd><kbd>↓</kbd> Navigate\n        <kbd>Enter</kbd> Execute\n        <kbd>Esc</kbd> Close\n      </span>\n    ";
		let c = document.createElement("div");
		c.style.position = "relative", c.appendChild(this.input), this.container.appendChild(c), this.container.appendChild(this.list), this.container.appendChild(this.footer), this.overlay.appendChild(this.container), document.body.appendChild(this.overlay), this.overlay.addEventListener("click", (c) => {
			c.target === this.overlay && this.close();
		});
	}
	removeUI() {
		this.inputOverlay &&= (this.inputOverlay.remove(), null), this.overlay && (document.body.removeChild(this.overlay), this.overlay = null, this.container = null, this.input = null, this.list = null, this.footer = null);
	}
	attachEventListeners() {
		this.input && (this.input.addEventListener("input", (c) => {
			let I = c.target;
			this.handleInput(I.value);
		}), this.input.addEventListener("keydown", (c) => {
			this.handleKeyDown(c);
		}));
	}
	detachEventListeners() {}
	handleInput(c) {
		this.query = c, this.selectedIndex = 0;
		let I = parseFuzzyFindInput(c);
		I.isFuzzyFindMode ? (this.isFuzzyFindMode = !0, this.fuzzyFindQuery = I.fuzzyFindQuery, this.fuzzyFindQuoteChar = I.quoteChar, this.updateInputStyling(c, I), this.updateFuzzyFindResults()) : (this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.updateInputStyling(c, I), this.fuzzyFindResults = [], this.updateCommands());
	}
	updateInputStyling(c, I) {
		this.input && (this.inputOverlay &&= (this.inputOverlay.remove(), null), this.inputOverlay = updateInputStyling(this.input, c, I));
	}
	updateFuzzyFindResults() {
		this.fuzzyFindDebounceTimer !== null && clearTimeout(this.fuzzyFindDebounceTimer), this.fuzzyFindDebounceTimer = window.setTimeout(() => {
			this.callbacks.onFindMatches && this.fuzzyFindQuery && this.fuzzyFindQuery.trim() ? (this.fuzzyFindResults = this.callbacks.onFindMatches(this.fuzzyFindQuery.trim()), this.updateList()) : (this.fuzzyFindResults = [], this.updateList()), this.fuzzyFindDebounceTimer = null;
		}, 150);
	}
	updateFuzzyFindList() {
		this.list && (this.fuzzyFindResults.length > 0 && this.selectedIndex >= this.fuzzyFindResults.length && (this.selectedIndex = 0), createFuzzyFindList(this.list, this.fuzzyFindQuery, this.fuzzyFindResults, this.selectedIndex, (c) => {
			this.selectedIndex = c, this.executeSelectedCommand();
		}));
	}
	handleKeyDown(c) {
		let I = this.isFuzzyFindMode ? this.fuzzyFindResults.length - 1 : this.filteredCommands.length - 1;
		c.key === "ArrowDown" ? (c.preventDefault(), this.selectedIndex = Math.min(this.selectedIndex + 1, I), this.updateList(), this.updateFooter(), this.scrollToSelected()) : c.key === "ArrowUp" ? (c.preventDefault(), this.selectedIndex = Math.max(0, this.selectedIndex - 1), this.updateList(), this.updateFooter(), this.scrollToSelected()) : c.key === "Enter" ? (c.preventDefault(), this.executeSelectedCommand()) : c.key === "Escape" && (c.preventDefault(), this.close());
	}
	updateCommands() {
		let c = this.commandRegistry.getCommands(this.currentMode);
		this.query.trim() ? this.filteredCommands = searchCommands(this.query, c) : this.filteredCommands = this.commandRegistry.getPopularCommands(10, this.currentMode).map((c) => ({
			command: c,
			score: 1,
			matchedIndices: []
		})), this.filteredCommands = this.filteredCommands.slice(0, 50), this.updateList();
	}
	updateFooter() {
		if (this.footer) if (this.isFuzzyFindMode && this.fuzzyFindResults.length > 0) {
			let c = this.selectedIndex + 1, I = this.fuzzyFindResults.length;
			this.footer.innerHTML = `
        <span class="command-palette-hint">
          <kbd>↑</kbd><kbd>↓</kbd> Navigate
          <kbd>Enter</kbd> Go to match
          <kbd>Esc</kbd> Close
        </span>
        <span class="command-palette-match-info">
          ${c}/${I} matches
        </span>
      `;
		} else this.footer.innerHTML = "\n        <span class=\"command-palette-hint\">\n          <kbd>↑</kbd><kbd>↓</kbd> Navigate\n          <kbd>Enter</kbd> Execute\n          <kbd>Esc</kbd> Close\n        </span>\n      ";
	}
	updateList() {
		if (this.list) {
			if (this.list.innerHTML = "", this.isFuzzyFindMode) {
				this.updateFuzzyFindList(), this.updateFooter();
				return;
			}
			if (this.updateFooter(), this.filteredCommands.length === 0) {
				let c = document.createElement("div");
				c.className = "command-palette-item command-palette-item-empty", c.textContent = "No commands found", this.list.appendChild(c);
				return;
			}
			this.filteredCommands.forEach((c, I) => {
				let L = document.createElement("div");
				L.className = "command-palette-item", L.setAttribute("role", "option"), L.setAttribute("aria-selected", (I === this.selectedIndex).toString()), I === this.selectedIndex && L.classList.add("command-palette-item-selected");
				let R = document.createElement("div");
				if (R.className = "command-palette-item-label", R.textContent = c.command.label, c.command.description) {
					let I = document.createElement("div");
					I.className = "command-palette-item-description", I.textContent = c.command.description, L.appendChild(I);
				}
				if (c.command.shortcut) {
					let I = document.createElement("div");
					I.className = "command-palette-item-shortcut", I.textContent = c.command.shortcut, L.appendChild(I);
				}
				L.appendChild(R), L.addEventListener("click", () => {
					this.selectedIndex = I, this.executeSelectedCommand();
				}), this.list && this.list.appendChild(L);
			});
		}
	}
	scrollToSelected() {
		if (!this.list) return;
		let c = this.list.querySelectorAll(".command-palette-item")[this.selectedIndex];
		if (c) {
			if (typeof c.scrollIntoView == "function") try {
				c.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
			} catch {}
			if (this.list && c.offsetTop !== void 0) try {
				let I = c.offsetTop, L = I + (c.offsetHeight || 0), R = this.list.scrollTop || 0, B = this.list.clientHeight || 0, V = R + B;
				I < R ? this.list.scrollTop = I : L > V && (this.list.scrollTop = L - B);
			} catch {}
		}
	}
	executeSelectedCommand() {
		if (this.isFuzzyFindMode) {
			if (this.fuzzyFindResults.length === 0) return;
			let c = this.fuzzyFindResults[this.selectedIndex];
			c && this.callbacks.onGotoMatch && this.callbacks.onGotoMatch(c), this.close();
			return;
		}
		let c = this.filteredCommands[this.selectedIndex];
		if (!c) return;
		let I = c.command;
		this.commandRegistry.incrementUsage(I.id);
		try {
			let c = this.parseCommandArgs(this.query, I.id);
			I.execute(c), this.callbacks.onCommandExecute && this.callbacks.onCommandExecute(I, c);
		} catch (c) {
			logger.error("Error executing command:", c);
		}
		this.close();
	}
	parseCommandArgs(c, I) {
		let L = c.trim().split(/\s+/);
		return I === "goto" && (L[0] === "goto" || L[0] === "go" && L[1] === "to") ? L[0] === "goto" ? L.slice(1) : L.slice(2) : I === "search" && L[0] === "search" || L[0] === I || L[0].startsWith(I) ? L.slice(1) : [];
	}
	isPaletteOpen() {
		return this.isOpen;
	}
	getIsFuzzyFindMode() {
		return this.isFuzzyFindMode;
	}
	getFuzzyFindQuery() {
		return this.fuzzyFindQuery;
	}
	getFuzzyFindResults() {
		return [...this.fuzzyFindResults];
	}
	destroy() {
		this.isOpen && this.close(), this.fuzzyFindDebounceTimer !== null && (clearTimeout(this.fuzzyFindDebounceTimer), this.fuzzyFindDebounceTimer = null), this.inputOverlay &&= (this.inputOverlay.remove(), null), this.removeUI();
	}
}, TextSearchMatcher = class {
	options;
	constructor(c) {
		this.options = c;
	}
	findMatches(c) {
		if (!c.trim()) return [];
		let I = c.toLowerCase().trim(), L = [];
		return this.options.translations.forEach((c, R) => {
			let B = 0, V = [], H = c.key.toLowerCase();
			if (H === I ? (B += 50, V.push({
				field: "key",
				matchedText: c.key,
				matchType: "exact"
			})) : H.includes(I) ? (B += 30, V.push({
				field: "key",
				matchedText: c.key,
				matchType: "contains"
			})) : this.fuzzyMatch(H, I) && (B += 15, V.push({
				field: "key",
				matchedText: c.key,
				matchType: "fuzzy"
			})), c.context) {
				let L = c.context.toLowerCase();
				L === I ? (B += 20, V.push({
					field: "context",
					matchedText: c.context,
					matchType: "exact"
				})) : L.includes(I) ? (B += 20, V.push({
					field: "context",
					matchedText: c.context,
					matchType: "contains"
				})) : this.fuzzyMatch(L, I) && (B += 10, V.push({
					field: "context",
					matchedText: c.context,
					matchType: "fuzzy"
				}));
			}
			this.options.languages.forEach((L) => {
				let R = c.values[L] || "", H = R.toLowerCase();
				H === I ? (B += 10, V.push({
					field: `values.${L}`,
					matchedText: R,
					matchType: "exact"
				})) : H.includes(I) ? (B += 10, V.push({
					field: `values.${L}`,
					matchedText: R,
					matchType: "contains"
				})) : this.fuzzyMatch(H, I) && (B += 5, V.push({
					field: `values.${L}`,
					matchedText: R,
					matchType: "fuzzy"
				}));
			}), B > 0 && L.push({
				rowIndex: R,
				translation: c,
				score: B,
				matchedFields: V
			});
		}), L.sort((c, I) => I.score === c.score ? c.rowIndex - I.rowIndex : I.score - c.score), L;
	}
	fuzzyMatch(c, I) {
		if (I.length === 0) return !0;
		if (I.length > c.length) return !1;
		let L = 0;
		for (let R = 0; R < c.length && L < I.length; R++) c[R] === I[L] && L++;
		return L === I.length;
	}
};
function parseSearchQuery(c) {
	if (!c || !c.trim()) return null;
	let I = c.trim(), L = I.match(/^(\w+):(.+)$/);
	if (L) {
		let [, c, I] = L;
		if (I.trim()) return {
			keyword: I.trim(),
			column: c.toLowerCase()
		};
	}
	return { keyword: I };
}
function findMatchIndices(c, I) {
	if (!c || !I) return [];
	let L = c.toLowerCase(), R = I.toLowerCase(), B = [], V = 0;
	for (;;) {
		let c = L.indexOf(R, V);
		if (c === -1) break;
		for (let I = 0; I < R.length; I++) B.push(c + I);
		V = c + 1;
	}
	return B;
}
var QuickSearch = class {
	options;
	constructor(c) {
		this.options = c;
	}
	findMatches(c) {
		if (!c.keyword) return [];
		let I = [], L = c.keyword.toLowerCase();
		return this.options.translations.forEach((R, B) => {
			if (c.column) {
				let V = this.getColumnIdForSearch(c.column);
				if (V) {
					let H = this.getCellValue(R, V);
					if (H && H.toLowerCase().includes(L)) {
						let L = findMatchIndices(H, c.keyword);
						I.push({
							rowIndex: B,
							columnId: V,
							matchedText: H,
							matchIndices: L
						});
					}
				}
				return;
			}
			[
				"key",
				"context",
				...this.options.languages.map((c) => `values.${c}`)
			].forEach((V) => {
				let H = this.getCellValue(R, V);
				if (H && H.toLowerCase().includes(L)) {
					let L = findMatchIndices(H, c.keyword);
					I.push({
						rowIndex: B,
						columnId: V,
						matchedText: H,
						matchIndices: L
					});
				}
			});
		}), I;
	}
	getColumnIdForSearch(c) {
		let I = c.toLowerCase();
		return I === "key" ? "key" : I === "context" ? "context" : this.options.languages.includes(I) ? `values.${I}` : null;
	}
	getCellValue(c, I) {
		if (I === "key") return c.key || null;
		if (I === "context") return c.context || null;
		if (I.startsWith("values.")) {
			let L = I.replace("values.", "");
			return c.values?.[L] || null;
		}
		return null;
	}
	static highlightText(c, I) {
		if (!c || I.length === 0) return escapeHtml(c);
		let L = [...new Set(I)].sort((c, I) => c - I), R = [], B = 0, V = null;
		if (L.forEach((I, H) => {
			if (!(V !== null && I === L[H - 1] + 1)) {
				if (V !== null) {
					let I = L[H - 1] + 1;
					R.push(`<mark class="quick-search-highlight">${escapeHtml(c.substring(V, I))}</mark>`), B = I;
				}
				I > B && R.push(escapeHtml(c.substring(B, I))), V = I;
			}
		}), V !== null) {
			let I = L[L.length - 1] + 1;
			R.push(`<mark class="quick-search-highlight">${escapeHtml(c.substring(V, I))}</mark>`), B = I;
		}
		return B < c.length && R.push(escapeHtml(c.substring(B))), R.join("");
	}
};
function escapeHtml(c) {
	let I = document.createElement("div");
	return I.textContent = c, I.innerHTML;
}
var QuickSearchUI = class {
	overlay = null;
	input = null;
	statusText = null;
	isOpen = !1;
	callbacks;
	container;
	destroyTimerId = null;
	constructor(c, I = {}) {
		this.container = c, this.callbacks = I;
	}
	open() {
		this.isOpen || (this.isOpen = !0, this.createUI(), requestAnimationFrame(() => {
			this.input && this.input.focus();
		}));
	}
	close() {
		this.isOpen && (this.isOpen = !1, this.destroyUI(), this.callbacks.onClose && this.callbacks.onClose());
	}
	updateStatus(c, I) {
		this.statusText && (I === 0 ? this.statusText.textContent = "No matches" : this.statusText.textContent = `${c + 1}/${I} matches`);
	}
	getQuery() {
		return this.input?.value || "";
	}
	setQuery(c) {
		this.input && (this.input.value = c);
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "quick-search-overlay", this.overlay.setAttribute("role", "dialog"), this.overlay.setAttribute("aria-label", "Quick Search");
		let c = document.createElement("div");
		c.className = "quick-search-bar";
		let I = document.createElement("div");
		I.className = "quick-search-label", I.textContent = "/", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "quick-search-input", this.input.placeholder = "Search... (e.g., keyword, key:keyword, en:keyword)", this.input.setAttribute("aria-label", "Search query"), this.statusText = document.createElement("div"), this.statusText.className = "quick-search-status", this.statusText.textContent = "";
		let L = document.createElement("button");
		L.className = "quick-search-close", L.textContent = "×", L.setAttribute("aria-label", "Close search"), L.addEventListener("click", () => {
			this.close();
		}), this.input.addEventListener("input", () => {
			this.callbacks.onSearch && this.callbacks.onSearch(this.input?.value || "");
		}), this.input.addEventListener("keydown", (c) => {
			c.key === "Escape" ? (c.preventDefault(), c.stopPropagation(), this.close()) : (c.key === "Enter" || c.code === "Enter") && (c.preventDefault(), c.stopPropagation(), this.callbacks.onNextMatch && this.callbacks.onNextMatch());
		}), c.appendChild(I), c.appendChild(this.input), c.appendChild(this.statusText), c.appendChild(L), this.overlay.appendChild(c), this.container.appendChild(this.overlay), requestAnimationFrame(() => {
			this.overlay && this.overlay.classList.add("quick-search-overlay-open");
		});
	}
	destroyUI() {
		this.destroyTimerId !== null && (clearTimeout(this.destroyTimerId), this.destroyTimerId = null), this.overlay && (this.overlay.classList.remove("quick-search-overlay-open"), this.destroyTimerId = window.setTimeout(() => {
			this.overlay && this.overlay.parentElement && this.overlay.parentElement.removeChild(this.overlay), this.overlay = null, this.input = null, this.statusText = null, this.destroyTimerId = null;
		}, 200));
	}
	isSearchMode() {
		return this.isOpen;
	}
	destroy() {
		this.destroyTimerId !== null && (clearTimeout(this.destroyTimerId), this.destroyTimerId = null), this.overlay && this.overlay.parentElement && this.overlay.parentElement.removeChild(this.overlay), this.overlay = null, this.input = null, this.statusText = null, this.isOpen = !1;
	}
}, StatusBar = class {
	statusBarElement = null;
	container;
	callbacks;
	constructor(c, I = {}) {
		this.container = c, this.callbacks = I;
	}
	create() {
		this.statusBarElement || (this.statusBarElement = document.createElement("div"), this.statusBarElement.className = "status-bar", this.statusBarElement.setAttribute("role", "status"), this.statusBarElement.setAttribute("aria-live", "polite"), this.statusBarElement.setAttribute("aria-atomic", "true"), this.container.appendChild(this.statusBarElement));
	}
	update(c) {
		if (this.statusBarElement || this.create(), !this.statusBarElement) return;
		let I = [];
		if (I.push(`[${c.mode}]`), c.rowIndex === null ? I.push(`Row -/${c.totalRows}`) : I.push(`Row ${c.rowIndex + 1}/${c.totalRows}`), c.columnId) {
			let L = this.getColumnDisplayName(c.columnId);
			I.push(`Col: ${L}`);
		}
		c.changesCount > 0 && I.push(`${c.changesCount} change${c.changesCount === 1 ? "" : "s"}`), c.emptyCount > 0 && I.push(`${c.emptyCount} empty`), c.duplicateCount > 0 && I.push(`${c.duplicateCount} duplicate${c.duplicateCount === 1 ? "" : "s"}`);
		let L = "";
		c.filter && c.filter !== "none" && (L = `
        <span class="status-bar-filter">
          <span class="status-bar-filter-label">${this.getFilterLabel(c.filter, c.searchKeyword)}</span>
          <button class="status-bar-filter-clear" title="Clear filter (Cmd+P → clear)">×</button>
        </span>
      `);
		let R = I.join(" | "), B = c.command ? `Command: ${c.command}` : "";
		this.statusBarElement.innerHTML = `
      <span class="status-bar-left">${R}</span>
      ${L}
      ${B ? `<span class="status-bar-command">${B}</span>` : ""}
    `;
		let V = this.statusBarElement.querySelector(".status-bar-filter-clear");
		V && this.callbacks.onClearFilter && V.addEventListener("click", (c) => {
			c.preventDefault(), c.stopPropagation(), this.callbacks.onClearFilter?.();
		}), this.callbacks.onStatusUpdate && this.callbacks.onStatusUpdate(c);
	}
	getFilterLabel(c, I) {
		switch (c) {
			case "empty": return "Filter: Empty";
			case "changed": return "Filter: Changed";
			case "duplicate": return "Filter: Duplicates";
			case "search": return I ? `Search: "${I}"` : "Search";
			default: return "";
		}
	}
	getColumnDisplayName(c) {
		return c === "row-number" ? "#" : c === "key" ? "Key" : c === "context" ? "Context" : c.startsWith("values.") ? c.replace("values.", "").toUpperCase() : c;
	}
	destroy() {
		this.statusBarElement && this.statusBarElement.parentElement && (this.statusBarElement.parentElement.removeChild(this.statusBarElement), this.statusBarElement = null);
	}
	isVisible() {
		return this.statusBarElement !== null;
	}
}, FindReplace = class {
	overlay = null;
	container = null;
	state = {
		searchQuery: "",
		replaceQuery: "",
		isCaseSensitive: !1,
		isWholeWord: !1,
		isRegex: !1,
		matches: [],
		currentMatchIndex: -1,
		scope: "all"
	};
	translations = [];
	languages = [];
	callbacks;
	constructor(c) {
		this.translations = c.translations, this.languages = c.languages, this.callbacks = c;
	}
	open(c = "find") {
		if (this.overlay) {
			this.setMode(c);
			return;
		}
		this.createUI(), this.setMode(c), this.attach();
	}
	close() {
		this.overlay && (this.overlay.remove(), this.overlay = null, this.container = null), this.detach(), this.callbacks.onClose && this.callbacks.onClose();
	}
	setMode(c) {
		if (!this.container) return;
		let I = this.container.querySelector(".find-replace-replace-section");
		if (I && (I.style.display = c === "replace" ? "block" : "none"), c === "replace") {
			let c = this.container.querySelector(".find-replace-replace-input");
			c && setTimeout(() => c.focus(), 0);
		}
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "find-replace-overlay", this.overlay.style.cssText = "\n      position: fixed;\n      top: 0;\n      left: 0;\n      right: 0;\n      background: rgba(0, 0, 0, 0.3);\n      z-index: 10000;\n      display: flex;\n      justify-content: center;\n      padding-top: 20px;\n    ", this.container = document.createElement("div"), this.container.className = "find-replace-container", this.container.style.cssText = "\n      background: white;\n      border-radius: 8px;\n      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n      padding: 16px;\n      padding-top: 48px;\n      min-width: 500px;\n      max-width: 600px;\n      position: relative;\n    ";
		let c = document.createElement("div");
		c.className = "find-replace-find-section", c.style.cssText = "\n      display: flex;\n      gap: 8px;\n      align-items: center;\n      margin-bottom: 12px;\n    ";
		let I = document.createElement("input");
		I.type = "text", I.className = "find-replace-find-input", I.placeholder = "Find", I.style.cssText = "\n      flex: 1;\n      padding: 8px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      font-size: 14px;\n    ", I.value = this.state.searchQuery, I.addEventListener("input", (c) => {
			this.state.searchQuery = c.target.value, this.performSearch();
		}), I.addEventListener("keydown", (c) => {
			c.key === "Escape" ? this.close() : c.key === "Enter" && !c.shiftKey ? (c.preventDefault(), this.goToNextMatch()) : c.key === "Enter" && c.shiftKey && (c.preventDefault(), this.goToPrevMatch());
		});
		let L = document.createElement("div");
		L.style.cssText = "display: flex; gap: 4px;";
		let R = this.createButton("↑", "Previous", () => {
			this.goToPrevMatch();
		}), B = this.createButton("↓", "Next", () => {
			this.goToNextMatch();
		});
		L.appendChild(R), L.appendChild(B), c.appendChild(I), c.appendChild(L);
		let V = document.createElement("div");
		V.className = "find-replace-replace-section", V.style.cssText = "\n      display: none;\n      display: flex;\n      gap: 8px;\n      align-items: center;\n      margin-bottom: 12px;\n    ";
		let H = document.createElement("input");
		H.type = "text", H.className = "find-replace-replace-input", H.placeholder = "Replace", H.style.cssText = "\n      flex: 1;\n      padding: 8px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      font-size: 14px;\n    ", H.value = this.state.replaceQuery, H.addEventListener("input", (c) => {
			let I = c.target.value;
			this.state.replaceQuery = I;
		}), H.addEventListener("keydown", (c) => {
			c.key === "Escape" ? this.close() : c.key === "Enter" && !c.shiftKey ? (c.preventDefault(), this.replaceCurrent()) : c.key === "Enter" && c.shiftKey && (c.preventDefault(), this.replaceAll());
		});
		let U = document.createElement("div");
		U.style.cssText = "display: flex; gap: 4px;";
		let W = this.createButton("Replace", "Replace current", () => {
			this.replaceCurrent();
		}), G = this.createButton("Replace All", "Replace all", () => {
			this.replaceAll();
		});
		U.appendChild(W), U.appendChild(G), V.appendChild(H), V.appendChild(U);
		let K = document.createElement("div");
		K.style.cssText = "\n      display: flex;\n      gap: 16px;\n      align-items: center;\n      margin-bottom: 12px;\n      font-size: 12px;\n    ";
		let q = this.createCheckbox("Aa", "Match case", this.state.isCaseSensitive, (c) => {
			this.state.isCaseSensitive = c, this.performSearch();
		}), J = this.createCheckbox("Ab", "Match whole word", this.state.isWholeWord, (c) => {
			this.state.isWholeWord = c, this.performSearch();
		}), Y = this.createCheckbox(".*", "Use regular expression", this.state.isRegex, (c) => {
			this.state.isRegex = c, this.performSearch();
		});
		K.appendChild(q), K.appendChild(J), K.appendChild(Y);
		let X = document.createElement("div");
		X.className = "find-replace-result", X.style.cssText = "\n      font-size: 12px;\n      color: #666;\n      min-height: 20px;\n    ";
		let Z = document.createElement("button");
		Z.textContent = "×", Z.className = "find-replace-close-button", Z.style.cssText = "\n      position: absolute;\n      top: 8px;\n      right: 8px;\n      background: none;\n      border: none;\n      font-size: 24px;\n      cursor: pointer;\n      color: #666;\n      width: 32px;\n      height: 32px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 10;\n      pointer-events: auto;\n    ", Z.addEventListener("click", (c) => {
			c.stopPropagation(), this.close();
		}), this.container.style.position = "relative", this.container.appendChild(Z), this.container.appendChild(c), this.container.appendChild(V), this.container.appendChild(K), this.container.appendChild(X), this.overlay.appendChild(this.container), document.body.appendChild(this.overlay), this.overlay.addEventListener("click", (c) => {
			c.target === this.overlay && this.close();
		}), setTimeout(() => I.focus(), 0);
	}
	createButton(c, I, L) {
		let R = document.createElement("button");
		return R.textContent = c, R.title = I, R.style.cssText = "\n      padding: 6px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      background: white;\n      cursor: pointer;\n      font-size: 12px;\n    ", R.addEventListener("click", L), R;
	}
	createCheckbox(c, I, L, R) {
		let B = document.createElement("label");
		B.style.cssText = "display: flex; align-items: center; gap: 4px; cursor: pointer;", B.title = I;
		let V = document.createElement("input");
		V.type = "checkbox", V.checked = L, V.style.cssText = "cursor: pointer;", V.addEventListener("change", (c) => {
			R(c.target.checked);
		});
		let H = document.createElement("span");
		return H.textContent = c, B.appendChild(V), B.appendChild(H), B;
	}
	performSearch() {
		if (!this.state.searchQuery.trim()) {
			this.state.matches = [], this.state.currentMatchIndex = -1, this.updateResult(), this.callbacks.onFind && this.callbacks.onFind([]);
			return;
		}
		let c = [], I = this.buildSearchPattern(this.state.searchQuery);
		this.translations.forEach((L, R) => {
			[
				"key",
				"context",
				...this.languages.map((c) => `values.${c}`)
			].forEach((B) => {
				let V = this.getCellValue(L, B);
				V && this.findMatchesInText(V, I).forEach((I) => {
					c.push({
						rowIndex: R,
						columnId: B,
						matchedText: V,
						matchIndex: I.index,
						matchLength: I.length
					});
				});
			});
		}), this.state.matches = c, this.state.currentMatchIndex = c.length > 0 ? 0 : -1, this.updateResult(), this.callbacks.onFind && this.callbacks.onFind(c);
	}
	buildSearchPattern(c) {
		let I = c;
		if (this.state.isRegex) try {
			return new RegExp(I, this.state.isCaseSensitive ? "g" : "gi");
		} catch {
			I = this.escapeRegex(c);
		}
		else I = this.escapeRegex(c);
		return this.state.isWholeWord && (I = `\\b${I}\\b`), new RegExp(I, this.state.isCaseSensitive ? "g" : "gi");
	}
	escapeRegex(c) {
		return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	findMatchesInText(c, I) {
		let L = [], R;
		for (I.lastIndex = 0; (R = I.exec(c)) !== null;) L.push({
			index: R.index,
			length: R[0].length
		}), R.index === I.lastIndex && I.lastIndex++;
		return L;
	}
	getCellValue(c, I) {
		if (I === "key") return c.key;
		if (I === "context") return c.context || null;
		if (I.startsWith("values.")) {
			let L = I.replace("values.", "");
			return c.values[L] || null;
		}
		return null;
	}
	updateResult() {
		let c = this.container?.querySelector(".find-replace-result");
		c && (this.state.matches.length === 0 ? c.textContent = this.state.searchQuery ? "No matches found" : "" : c.textContent = `${this.state.currentMatchIndex + 1} of ${this.state.matches.length} matches`);
	}
	goToNextMatch() {
		this.state.matches.length !== 0 && (this.state.currentMatchIndex = (this.state.currentMatchIndex + 1) % this.state.matches.length, this.updateResult(), this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]));
	}
	goToPrevMatch() {
		this.state.matches.length !== 0 && (this.state.currentMatchIndex = this.state.currentMatchIndex <= 0 ? this.state.matches.length - 1 : this.state.currentMatchIndex - 1, this.updateResult(), this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]));
	}
	navigateToMatch(c) {
		this.callbacks.onFind && this.callbacks.onFind([c]);
	}
	replaceCurrent() {
		if (this.state.currentMatchIndex < 0 || this.state.currentMatchIndex >= this.state.matches.length) return;
		let c = this.container?.querySelector(".find-replace-replace-input"), I = c ? c.value : this.state.replaceQuery, L = this.state.matches[this.state.currentMatchIndex];
		this.callbacks.onReplace && this.callbacks.onReplace(L, I), this.performSearch();
	}
	replaceAll() {
		if (this.state.matches.length === 0) return;
		let c = this.container?.querySelector(".find-replace-replace-input"), I = c ? c.value : this.state.replaceQuery;
		this.callbacks.onReplaceAll && this.callbacks.onReplaceAll(this.state.matches, I), this.performSearch();
	}
	attach() {
		let c = (c) => {
			c.key === "Escape" && this.overlay && this.close();
		};
		document.addEventListener("keydown", c), this.overlay.__escapeHandler = c;
	}
	detach() {
		this.overlay && this.overlay.__escapeHandler && document.removeEventListener("keydown", this.overlay.__escapeHandler);
	}
	isOpen() {
		return this.overlay !== null;
	}
	destroy() {
		this.close();
	}
}, FilterManager = class {
	options;
	constructor(c) {
		this.options = c;
	}
	filterEffect(c, L) {
		let R = this;
		return Effect.gen(function* (B) {
			switch (L.type) {
				case "search": return yield* B(R.applySearchFilterEffect(c, L.keyword || ""));
				case "empty": return yield* B(R.applyEmptyFilterEffect(c));
				case "changed": return yield* B(R.applyChangedFilterEffect(c));
				case "duplicate": return yield* B(R.applyDuplicateFilterEffect(c));
				default: return yield* B(Effect.succeed([...c]));
			}
		});
	}
	filter(c, L) {
		let R = this.filterEffect(c, L);
		return Effect.runSync(Effect.match(R, {
			onFailure: (I) => (logger.warn("Filter failed, returning original translations", I), [...c]),
			onSuccess: (c) => c
		}));
	}
	applySearchFilterEffect(c, L) {
		let R = this;
		return Effect.gen(function* (B) {
			let V = L.toLowerCase().trim();
			if (!V) return yield* B(Effect.succeed([...c]));
			let H = c.filter((c) => c.key.toLowerCase().includes(V) || c.context?.toLowerCase().includes(V) ? !0 : R.options.languages.some((I) => (c.values[I] || "").toLowerCase().includes(V)));
			return yield* B(Effect.succeed(H));
		});
	}
	applySearchFilter(c, L) {
		let R = this.applySearchFilterEffect(c, L);
		return Effect.runSync(Effect.match(R, {
			onFailure: () => [...c],
			onSuccess: (c) => c
		}));
	}
	applyEmptyFilterEffect(c) {
		let L = this;
		return Effect.gen(function* (R) {
			let B = c.filter((c) => L.options.languages.some((I) => (c.values[I] || "").trim() === ""));
			return yield* R(Effect.succeed(B));
		});
	}
	applyEmptyFilter(c) {
		let L = this.applyEmptyFilterEffect(c);
		return Effect.runSync(Effect.match(L, {
			onFailure: () => [...c],
			onSuccess: (c) => c
		}));
	}
	applyChangedFilterEffect(c) {
		let L = this;
		return Effect.gen(function* (R) {
			let B = [];
			for (let I of c) {
				if (L.options.changeTracker.hasChange(I.id, "key")) {
					B.push(I);
					continue;
				}
				if (L.options.changeTracker.hasChange(I.id, "context")) {
					B.push(I);
					continue;
				}
				let c = !1;
				for (let R of L.options.languages) if (L.options.changeTracker.hasChange(I.id, `values.${R}`)) {
					c = !0;
					break;
				}
				c && B.push(I);
			}
			return yield* R(Effect.succeed(B));
		});
	}
	applyChangedFilter(c) {
		let L = this.applyChangedFilterEffect(c);
		return Effect.runSync(Effect.match(L, {
			onFailure: () => [...c],
			onSuccess: (c) => c
		}));
	}
	applyDuplicateFilterEffect(c) {
		return Effect.gen(function* (L) {
			let R = /* @__PURE__ */ new Map();
			c.forEach((c) => {
				let I = R.get(c.key) || 0;
				R.set(c.key, I + 1);
			});
			let B = c.filter((c) => (R.get(c.key) || 0) > 1);
			return yield* L(Effect.succeed(B));
		});
	}
	applyDuplicateFilter(c) {
		let L = this.applyDuplicateFilterEffect(c);
		return Effect.runSync(Effect.match(L, {
			onFailure: () => [...c],
			onSuccess: (c) => c
		}));
	}
}, VimCommandTracker = class {
	currentSequence = "";
	commandType = "motion";
	autoClearTimer = null;
	options;
	constructor(c = {}) {
		this.options = {
			maxSequenceLength: c.maxSequenceLength ?? 20,
			autoClearDelay: c.autoClearDelay ?? 1e3,
			onCommandUpdate: c.onCommandUpdate ?? (() => {})
		};
	}
	addKeyEffect(c) {
		let L = this;
		return Effect.gen(function* (R) {
			if (L.currentSequence.length >= L.options.maxSequenceLength) return yield* R(Effect.fail(new VimCommandTrackerError({
				message: `Maximum sequence length (${L.options.maxSequenceLength}) exceeded`,
				code: "MAX_SEQUENCE_LENGTH_EXCEEDED"
			})));
			L.currentSequence += c, L.updateCommandType();
			let B = L.createCommand();
			return L.options.onCommandUpdate(B), L.resetAutoClearTimer(), B;
		});
	}
	addKey(c) {
		let L = Effect.runSync(Effect.either(this.addKeyEffect(c)));
		if (L._tag === "Left") {
			let c = L.left;
			return c instanceof VimCommandTrackerError || logger.error("VimCommandTracker: Unexpected error in addKey", c), null;
		}
		return L.right;
	}
	completeCommandEffect() {
		let c = this;
		return Effect.gen(function* (L) {
			if (!c.currentSequence) return yield* L(Effect.fail(new VimCommandTrackerError({
				message: "No command sequence to complete",
				code: "INVALID_KEY_SEQUENCE"
			})));
			let R = c.createCommand();
			return R.type = "complete", c.options.onCommandUpdate(R), c.clear(), R;
		});
	}
	completeCommand() {
		return Effect.runSync(Effect.match(this.completeCommandEffect(), {
			onFailure: (c) => {
				throw c instanceof VimCommandTrackerError ? c : (logger.error("VimCommandTracker: Unexpected error in completeCommand", c), new VimCommandTrackerError({
					message: "Failed to complete command",
					code: "INVALID_KEY_SEQUENCE"
				}));
			},
			onSuccess: (c) => c
		}));
	}
	cancelCommandEffect() {
		return Effect.sync(() => {
			this.clear();
		});
	}
	cancelCommand() {
		Effect.runSync(this.cancelCommandEffect());
	}
	getCurrentCommand() {
		return this.currentSequence ? this.createCommand() : null;
	}
	clear() {
		this.currentSequence = "", this.commandType = "motion", this.autoClearTimer !== null && (clearTimeout(this.autoClearTimer), this.autoClearTimer = null), this.options.onCommandUpdate(null);
	}
	updateCommandType() {
		if (!this.currentSequence) {
			this.commandType = "motion";
			return;
		}
		let c = this.currentSequence[this.currentSequence.length - 1];
		if (/^\d+$/.test(this.currentSequence)) {
			this.commandType = "number";
			return;
		}
		if ([
			"d",
			"y",
			"c"
		].includes(c)) {
			this.commandType = "operator";
			return;
		}
		if ([
			"w",
			"b",
			"e"
		].includes(c) && this.currentSequence.length > 1) {
			this.commandType = "text-object";
			return;
		}
		this.commandType = "motion";
	}
	createCommand() {
		return {
			sequence: this.currentSequence,
			type: this.commandType,
			description: this.getCommandDescription()
		};
	}
	getCommandDescription() {
		let c = this.currentSequence;
		if (c) return /^\d+$/.test(c) ? `Repeat ${c} times` : {
			h: "Move left",
			j: "Move down",
			k: "Move up",
			l: "Move right",
			gg: "Go to top",
			G: "Go to bottom",
			0: "Go to line start",
			$: "Go to line end",
			dd: "Delete line",
			yy: "Yank line",
			p: "Paste",
			u: "Undo",
			cw: "Change word",
			dw: "Delete word",
			ciw: "Change inner word",
			diw: "Delete inner word"
		}[c] || void 0;
	}
	resetAutoClearTimer() {
		this.autoClearTimer !== null && clearTimeout(this.autoClearTimer), this.autoClearTimer = window.setTimeout(() => {
			this.clear();
		}, this.options.autoClearDelay);
	}
}, CommandLine = class {
	overlay = null;
	input = null;
	container;
	options;
	history = [];
	historyIndex = -1;
	isVisible = !1;
	constructor(c) {
		this.container = c.container, this.options = {
			container: c.container,
			onExecute: c.onExecute ?? (() => {}),
			onCancel: c.onCancel ?? (() => {}),
			maxHistorySize: c.maxHistorySize ?? 50,
			placeholder: c.placeholder ?? "Enter command..."
		}, this.loadHistory();
	}
	showEffect(c) {
		return Effect.sync(() => {
			this.isVisible ||= (this.historyIndex = -1, this.loadHistory(), this.createUI(), this.input && (this.input.value = c || "", requestAnimationFrame(() => {
				if (this.input) {
					let I = c || "";
					this.input.value !== I && (logger.warn(`CommandLine: Input value was reset during show! Expected: "${I}", Got: "${this.input.value}"`), this.input.value = I), this.input.focus(), this.input.select();
				}
			})), !0);
		}).pipe(Effect.catchAll((c) => (logger.error("CommandLine: Failed to show", c), Effect.fail(c))));
	}
	show(c) {
		Effect.runSync(Effect.match(this.showEffect(c), {
			onFailure: (c) => {
				logger.error("CommandLine: Failed to show", c);
			},
			onSuccess: () => {}
		}));
	}
	hideEffect() {
		return Effect.sync(() => {
			this.hide();
		});
	}
	hide() {
		this.isVisible && (this.overlay && this.overlay.parentElement && this.overlay.parentElement.removeChild(this.overlay), this.overlay = null, this.input = null, this.isVisible = !1, this.historyIndex = -1);
	}
	getVisible() {
		return this.isVisible;
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "command-line-overlay", this.overlay.setAttribute("role", "dialog"), this.overlay.setAttribute("aria-label", "Command Line");
		let c = document.createElement("div");
		c.className = "command-line", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "command-line-input", this.input.setAttribute("placeholder", this.options.placeholder), this.input.setAttribute("aria-label", "Command input"), this.input.setAttribute("autocomplete", "off"), this.input.setAttribute("spellcheck", "false"), this.attachInputListeners(), c.appendChild(this.input), this.overlay.appendChild(c), this.container.appendChild(this.overlay);
	}
	attachInputListeners() {
		if (!this.input) {
			logger.warn("CommandLine: Cannot attach listeners - input is null");
			return;
		}
		this.input.addEventListener("keydown", (c) => {
			c.key === "Enter" ? (c.preventDefault(), c.stopPropagation(), this.executeCommand().catch((c) => {
				logger.error("CommandLine: executeCommand error (outer catch)", c), this.hide();
			})) : c.key === "Escape" ? (c.preventDefault(), c.stopPropagation(), this.cancel()) : c.key === "ArrowUp" ? (c.preventDefault(), c.stopPropagation(), this.navigateHistory(-1), this.input && requestAnimationFrame(() => {
				this.input && this.input.focus();
			})) : c.key === "ArrowDown" && (c.preventDefault(), c.stopPropagation(), this.navigateHistory(1), this.input && requestAnimationFrame(() => {
				this.input && this.input.focus();
			}));
		}), this.overlay && this.overlay.addEventListener("click", (c) => {
			c.target === this.overlay && this.cancel();
		});
	}
	executeCommandEffect() {
		let c = this;
		return Effect.gen(function* (L) {
			if (!c.input) return yield* L(Effect.fail(new CommandLineError({
				message: "Input element not found",
				code: "INVALID_COMMAND"
			})));
			let R = c.input.value.trim();
			if (!R) {
				c.hide();
				return;
			}
			c.addToHistory(R);
			try {
				let B = c.options.onExecute(R);
				if (B instanceof Promise) {
					let R = null, V = new Promise((c, I) => {
						R = window.setTimeout(() => {
							I(/* @__PURE__ */ Error("Command execution timeout (5s)"));
						}, 5e3);
					});
					try {
						yield* L(Effect.promise(() => Promise.race([B.finally(() => {
							R !== null && (window.clearTimeout(R), R = null);
						}), V])));
					} catch (B) {
						return R !== null && (window.clearTimeout(R), R = null), logger.error("CommandLine: Command execution timeout or error", B), c.hide(), yield* L(Effect.fail(new CommandLineError({
							message: `Command execution failed: ${B instanceof Error ? B.message : String(B)}`,
							code: "COMMAND_EXECUTION_FAILED"
						})));
					}
				}
			} catch (R) {
				return logger.error("CommandLine: Command execution failed", R), c.hide(), yield* L(Effect.fail(new CommandLineError({
					message: `Command execution failed: ${R instanceof Error ? R.message : String(R)}`,
					code: "COMMAND_EXECUTION_FAILED"
				})));
			}
			c.hide();
		}).pipe(Effect.catchAll((L) => (logger.error("CommandLine: Failed to execute command", L), c.hide(), Effect.fail(L))));
	}
	async executeCommand() {
		let c = null;
		try {
			let L = new Promise((I, L) => {
				c = window.setTimeout(() => {
					L(/* @__PURE__ */ Error("Command execution timeout (5s)"));
				}, 5e3);
			});
			await Promise.race([Effect.runPromise(this.executeCommandEffect()).finally(() => {
				c !== null && (window.clearTimeout(c), c = null);
			}), L]);
		} catch (I) {
			c !== null && (window.clearTimeout(c), c = null), logger.error("CommandLine: executeCommand failed", I), this.hide();
		}
	}
	cancel() {
		this.options.onCancel(), this.hide();
	}
	navigateHistory(c) {
		if (this.input && (this.loadHistory(), this.history.length !== 0)) {
			if (this.historyIndex === -1) if (c < 0) if (this.history.length > 0) this.historyIndex = 0;
			else return;
			else return;
			else this.historyIndex -= c;
			if (this.historyIndex < 0) {
				this.historyIndex = -1, this.input.value = "";
				return;
			} else if (this.historyIndex >= this.history.length) {
				this.historyIndex = this.history.length, this.input.value = "";
				return;
			}
			if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
				let c = this.history[this.historyIndex];
				c && typeof c == "string" ? this.input ? (this.input.value = c, requestAnimationFrame(() => {
					this.input && (this.input.value !== c && (logger.warn(`CommandLine: Input value was reset in Firefox! Expected: "${c}", Got: "${this.input.value}"`), this.input.value = c), this.input.focus(), this.input.setSelectionRange(0, this.input.value.length));
				})) : logger.warn("CommandLine: Input element is null when setting history value") : this.input && (this.input.value = "");
			} else this.input && (this.input.value = "");
		}
	}
	addToHistory(c) {
		let I = this.history.indexOf(c);
		I !== -1 && this.history.splice(I, 1), this.history.unshift(c), this.history.length > this.options.maxHistorySize && (this.history = this.history.slice(0, this.options.maxHistorySize)), this.saveHistory();
	}
	getHistory() {
		return [...this.history];
	}
	clearHistory() {
		this.history = [], this.historyIndex = -1, this.saveHistory();
	}
	saveHistory() {
		try {
			let c = JSON.stringify(this.history);
			localStorage.setItem("commandLineHistory", c);
		} catch (c) {
			logger.error("Failed to save command line history", c);
		}
	}
	loadHistory() {
		try {
			let c = localStorage.getItem("commandLineHistory");
			if (c) {
				let I = JSON.parse(c);
				Array.isArray(I) ? this.history = I : (logger.warn("CommandLine: Invalid history format in localStorage", I), this.history = []);
			} else this.history = [];
		} catch (c) {
			logger.error("Failed to load command line history", c), this.history = [];
		}
	}
	destroy() {
		this.hide();
	}
}, SelectionManager = class {
	selectedCells = /* @__PURE__ */ new Map();
	anchorCell = null;
	focusCell = null;
	columns;
	onSelectionChange;
	constructor(c) {
		this.columns = c.columns, this.onSelectionChange = c.onSelectionChange;
	}
	setColumns(c) {
		this.columns = c;
	}
	getCellKey(c, I) {
		return `${c}:${I}`;
	}
	selectCell(c, I) {
		this.clearSelection(), this.addCell(c, I), this.anchorCell = {
			rowIndex: c,
			columnId: I
		}, this.focusCell = {
			rowIndex: c,
			columnId: I
		}, this.notifyChange();
	}
	toggleCell(c, I) {
		let L = this.getCellKey(c, I);
		this.selectedCells.has(L) ? this.selectedCells.delete(L) : this.addCell(c, I), this.anchorCell = {
			rowIndex: c,
			columnId: I
		}, this.focusCell = {
			rowIndex: c,
			columnId: I
		}, this.notifyChange();
	}
	selectRange(c, I) {
		if (!this.anchorCell) {
			this.selectCell(c, I);
			return;
		}
		this.clearSelection();
		let L = Math.min(this.anchorCell.rowIndex, c), R = Math.max(this.anchorCell.rowIndex, c), B = this.getColumnIndex(this.anchorCell.columnId), V = this.getColumnIndex(I), H = Math.min(B, V), U = Math.max(B, V);
		for (let c = L; c <= R; c++) for (let I = H; I <= U; I++) {
			let L = this.columns[I];
			L && this.addCell(c, L);
		}
		this.focusCell = {
			rowIndex: c,
			columnId: I
		}, this.notifyChange();
	}
	extendSelection(c, I) {
		if (!this.anchorCell) {
			this.selectCell(c, I);
			return;
		}
		this.clearSelection();
		let L = Math.min(this.anchorCell.rowIndex, c), R = Math.max(this.anchorCell.rowIndex, c), B = this.getColumnIndex(this.anchorCell.columnId), V = this.getColumnIndex(I), H = Math.min(B, V), U = Math.max(B, V);
		for (let c = L; c <= R; c++) for (let I = H; I <= U; I++) {
			let L = this.columns[I];
			L && this.addCell(c, L);
		}
		this.focusCell = {
			rowIndex: c,
			columnId: I
		}, this.notifyChange();
	}
	selectRow(c) {
		this.clearSelection();
		for (let I of this.columns) this.addCell(c, I);
		this.anchorCell = {
			rowIndex: c,
			columnId: this.columns[0] || ""
		}, this.focusCell = {
			rowIndex: c,
			columnId: this.columns[this.columns.length - 1] || ""
		}, this.notifyChange();
	}
	selectRowRange(c, I) {
		this.clearSelection();
		let L = Math.min(c, I), R = Math.max(c, I);
		for (let c = L; c <= R; c++) for (let I of this.columns) this.addCell(c, I);
		this.anchorCell = {
			rowIndex: c,
			columnId: this.columns[0] || ""
		}, this.focusCell = {
			rowIndex: I,
			columnId: this.columns[this.columns.length - 1] || ""
		}, this.notifyChange();
	}
	selectColumn(c, I) {
		this.clearSelection();
		for (let L = 0; L <= I; L++) this.addCell(L, c);
		this.anchorCell = {
			rowIndex: 0,
			columnId: c
		}, this.focusCell = {
			rowIndex: I,
			columnId: c
		}, this.notifyChange();
	}
	clearSelection() {
		this.selectedCells.clear();
	}
	resetSelection() {
		this.clearSelection(), this.anchorCell = null, this.focusCell = null, this.notifyChange();
	}
	addCell(c, I) {
		let L = this.getCellKey(c, I);
		this.selectedCells.set(L, {
			rowIndex: c,
			columnId: I
		});
	}
	isSelected(c, I) {
		let L = this.getCellKey(c, I);
		return this.selectedCells.has(L);
	}
	getSelectedCells() {
		return Array.from(this.selectedCells.values());
	}
	getSelectionCount() {
		return this.selectedCells.size;
	}
	getAnchorCell() {
		return this.anchorCell;
	}
	getFocusCell() {
		return this.focusCell;
	}
	getSelectionRange() {
		if (this.selectedCells.size === 0) return null;
		let c = this.getSelectedCells(), I = c.map((c) => c.rowIndex), L = c.map((c) => this.getColumnIndex(c.columnId)), R = Math.min(...I), B = Math.max(...I), V = Math.min(...L), H = Math.max(...L);
		return {
			startRow: R,
			endRow: B,
			startColumnId: this.columns[V] || "",
			endColumnId: this.columns[H] || ""
		};
	}
	getColumnIndex(c) {
		let I = this.columns.indexOf(c);
		return I >= 0 ? I : 0;
	}
	notifyChange() {
		this.onSelectionChange && this.onSelectionChange(this.getSelectedCells());
	}
	getSelectionAsText(c) {
		let I = this.getSelectionRange();
		if (!I) return "";
		let L = [];
		for (let R = I.startRow; R <= I.endRow; R++) {
			let B = [], V = this.getColumnIndex(I.startColumnId), H = this.getColumnIndex(I.endColumnId);
			for (let I = V; I <= H; I++) {
				let L = this.columns[I];
				L && this.isSelected(R, L) && B.push(c(R, L));
			}
			L.push(B.join("	"));
		}
		return L.join("\n");
	}
}, VirtualTableDiv = class {
	container;
	scrollElement = null;
	gridElement = null;
	headerElement = null;
	bodyElement = null;
	options;
	rowVirtualizer = null;
	virtualizerCleanup = null;
	renderScheduled = !1;
	resizeObserver = null;
	columnWidths = /* @__PURE__ */ new Map();
	editableColumns = /* @__PURE__ */ new Set();
	rowHeight = 40;
	headerHeight = 40;
	changeTracker = new ChangeTracker();
	undoRedoManager = new UndoRedoManager();
	modifierKeyTracker = new ModifierKeyTracker();
	focusManager = new FocusManager();
	selectionManager;
	cellEditor;
	keyboardHandlerModule;
	columnResizer;
	columnWidthCalculator;
	gridRenderer;
	commandRegistry;
	commandPalette;
	columnMinWidths = /* @__PURE__ */ new Map();
	originalTranslations = [];
	currentTranslations = [];
	currentFilter = "none";
	currentSearchKeyword = "";
	filterManager;
	newRows = /* @__PURE__ */ new Map();
	deletedRows = /* @__PURE__ */ new Map();
	addRowPlaceholder = null;
	currentGotoMatches = null;
	quickSearch = null;
	quickSearchUI = null;
	currentQuickSearchMatches = [];
	currentQuickSearchIndex = -1;
	statusBar = null;
	findReplace = null;
	vimCommandTracker = null;
	commandLine = null;
	vimKeyboardHandler = null;
	constructor(c) {
		this.container = c.container, this.options = c, this.columnWidths = c.columnWidths || /* @__PURE__ */ new Map(), this.rowHeight = c.rowHeight || 40, this.headerHeight = c.headerHeight || 40, this.editableColumns = new Set(["key", "context"]), c.languages.forEach((c) => {
			this.editableColumns.add(`values.${c}`);
		}), this.columnMinWidths.set("key", 100), this.columnMinWidths.set("context", 100), c.languages.forEach((c) => {
			this.columnMinWidths.set(`values.${c}`, 80);
		}), this.originalTranslations = [...c.translations], this.currentTranslations = [...c.translations], this.changeTracker.initializeOriginalData(c.translations, c.languages), this.filterManager = new FilterManager({
			translations: c.translations,
			languages: c.languages,
			changeTracker: this.changeTracker
		}), this.selectionManager = new SelectionManager({
			columns: [
				"key",
				"context",
				...c.languages.map((c) => `values.${c}`)
			],
			onSelectionChange: () => {
				this.updateSelectionStyles(), this.updateStatusBar();
			}
		}), this.cellEditor = new CellEditor(c.translations, this.changeTracker, this.undoRedoManager, {
			onCellChange: (I, L, R) => {
				let B = this.currentTranslations.findIndex((c) => c.id === I);
				if (B !== -1) {
					let c = this.currentTranslations[B], V = toMutableTranslation(c);
					if (L === "key") V.key = R;
					else if (L === "context") V.context = R;
					else if (L.startsWith("values.")) {
						let c = L.replace("values.", "");
						V.values[c] = R;
					}
					this.currentTranslations[B] = V;
					let H = this.originalTranslations.findIndex((c) => c.id === I);
					if (H !== -1) {
						let c = this.originalTranslations[H], I = toMutableTranslation(c);
						if (L === "key") I.key = R;
						else if (L === "context") I.context = R;
						else if (L.startsWith("values.")) {
							let c = L.replace("values.", "");
							I.values[c] = R;
						}
						let B = [...this.originalTranslations];
						B[H] = I, this.originalTranslations = B;
					}
				}
				this.updateCellStyle(I, L), this.updateStatusBar(), c.onCellChange && c.onCellChange(I, L, R);
			},
			onEditStateChange: () => {
				this.updateStatusBar();
			},
			onEditFinished: (c, I, L) => {
				let R = this.currentTranslations.length - 1, B = c;
				if (L === "down") if (c < R) B = c + 1;
				else {
					this.focusCell(c, I);
					return;
				}
				else if (c > 0) B = c - 1;
				else {
					this.focusCell(c, I);
					return;
				}
				this.focusCell(B, I), requestAnimationFrame(() => {
					this.startEditingFromKeyboard(B, I);
				});
			},
			updateCellStyle: (c, I) => {
				this.updateCellStyle(c, I);
			},
			updateCellContent: (c, I, L, R) => {
				let B = c.getAttribute("data-row-index"), V = B ? parseInt(B, 10) : 0;
				this.gridRenderer.updateCellContent(c, I, L, R, V);
			}
		}), this.commandRegistry = new CommandRegistry({ onCommandExecuted: () => {} }), this.registerDefaultCommands(), this.quickSearch = new QuickSearch({
			translations: c.translations,
			languages: c.languages
		}), this.quickSearchUI = new QuickSearchUI(this.container, {
			onSearch: (c) => {
				this.handleQuickSearch(c);
			},
			onClose: () => {
				this.closeQuickSearch();
			},
			onNextMatch: () => {
				this.goToNextQuickSearchMatch();
			},
			onPrevMatch: () => {
				this.goToPrevQuickSearchMatch();
			}
		}), this.commandPalette = new CommandPalette(this.commandRegistry, {
			onCommandExecute: () => {},
			onClose: () => {
				if (this.bodyElement) {
					let c = this.focusManager.getFocusedCell();
					c && this.focusCell(c.rowIndex, c.columnId);
				}
			},
			onFindMatches: (c) => this.findMatches(c),
			onGotoMatch: (c) => {
				this.gotoToMatch(c);
				let I = this.commandPalette.getFuzzyFindResults(), L = this.commandPalette.getFuzzyFindQuery(), R = I.map((c) => ({
					rowIndex: c.rowIndex,
					translation: c.translation,
					score: c.score,
					matchedFields: c.matchedFields
				})), B = R.findIndex((I) => I.rowIndex === c.rowIndex);
				this.currentGotoMatches = {
					keyword: L,
					matches: R,
					currentIndex: B === -1 ? 0 : B
				};
			}
		}), this.keyboardHandlerModule = new KeyboardHandler(this.modifierKeyTracker, this.focusManager, {
			onUndo: () => this.handleUndo(),
			onRedo: () => this.handleRedo(),
			onStartEditing: (c, I) => {
				this.startEditingFromKeyboard(c, I);
			},
			getAllColumns: () => [
				"key",
				"context",
				...c.languages.map((c) => `values.${c}`)
			],
			getMaxRowIndex: () => c.translations.length - 1,
			focusCell: (c, I) => {
				this.focusCell(c, I);
			},
			onOpenCommandPalette: (c) => {
				this.commandPalette.open(c);
			},
			onOpenQuickSearch: () => {
				this.openQuickSearch();
			},
			onQuickSearchNext: () => {
				this.goToNextQuickSearchMatch();
			},
			onQuickSearchPrev: () => {
				this.goToPrevQuickSearchMatch();
			},
			isQuickSearchMode: () => this.quickSearchUI?.isSearchMode() || !1,
			isEditableColumn: (c) => this.editableColumns.has(c),
			isReadOnly: () => this.options.readOnly || !1,
			onOpenFind: () => {
				this.openFindReplace("find");
			},
			onOpenReplace: () => {
				this.openFindReplace("replace");
			},
			onExtendSelection: (c, I) => {
				this.selectionManager.extendSelection(c, I);
			},
			onAddRow: () => {
				this.addRow();
			}
		}), this.columnWidthCalculator = new ColumnWidthCalculator({
			columnWidths: this.columnWidths,
			columnMinWidths: this.columnMinWidths,
			languages: c.languages
		}), this.columnResizer = new ColumnResizer({
			columnWidths: this.columnWidths,
			columnMinWidths: this.columnMinWidths,
			languages: c.languages,
			callbacks: {
				onResize: (c, I) => {
					this.applyColumnWidth(c, I);
				},
				onResizeEnd: () => {
					this.rowVirtualizer && this.bodyElement && this.renderVirtualRows();
				}
			}
		}), this.gridRenderer = new GridRenderer({
			languages: c.languages,
			readOnly: c.readOnly,
			editableColumns: this.editableColumns,
			callbacks: {
				onCellClick: (c, I, L, R) => {
					this.handleCellClick(c, I, R);
				},
				onCellDblClick: (c, I, L) => {
					this.startEditing(c, I, L);
				},
				onCellFocus: (c, I) => {
					this.focusManager.focusCell(c, I), this.updateStatusBar();
				},
				updateCellStyle: (c, I, L) => {
					this.updateCellStyle(c, I, L);
				},
				isNewRow: (c) => this.isNewRow(c)
			}
		}), this.findReplace = new FindReplace({
			translations: c.translations,
			languages: c.languages,
			onFind: (c) => {
				if (c.length > 0) {
					let I = c[0];
					this.gotoToFindMatch(I);
				}
			},
			onReplace: (c, I) => {
				this.replaceFindMatch(c, I);
			},
			onReplaceAll: (c, I) => {
				this.replaceAllFindMatches(c, I);
			},
			onClose: () => {}
		}), this.vimCommandTracker = new VimCommandTracker({ onCommandUpdate: (c) => {
			this.updateStatusBar();
		} }), this.commandLine = new CommandLine({
			container: this.container,
			onExecute: async (c) => {
				await this.executeCommandLineCommand(c);
			},
			onCancel: () => {}
		});
	}
	render() {
		this.scrollElement && this.container.contains(this.scrollElement) && this.container.removeChild(this.scrollElement), this.scrollElement = document.createElement("div"), this.scrollElement.className = "virtual-grid-scroll-container", this.scrollElement.style.width = "100%", this.scrollElement.style.height = "100%", this.scrollElement.style.overflow = "auto", this.scrollElement.style.position = "relative", this.gridElement = document.createElement("div"), this.gridElement.className = "virtual-grid", this.gridElement.setAttribute("role", "grid"), this.options.readOnly && this.gridElement.classList.add("readonly"), this.headerElement = document.createElement("div"), this.headerElement.className = "virtual-grid-header", this.renderHeader(), this.gridElement.appendChild(this.headerElement), this.bodyElement = document.createElement("div"), this.bodyElement.className = "virtual-grid-body", this.bodyElement.style.position = "relative", this.gridElement.appendChild(this.bodyElement), this.scrollElement.appendChild(this.gridElement), this.container.appendChild(this.scrollElement), this.observeContainerResize(), requestAnimationFrame(() => {
			this.initVirtualScrolling();
		}), this.attachKeyboardListeners(), this.initStatusBar(), this.renderAddRowPlaceholder();
	}
	observeContainerResize() {
		this.resizeObserver && this.resizeObserver.disconnect(), typeof ResizeObserver < "u" && (this.resizeObserver = new ResizeObserver(() => {
			this.headerElement && (this.headerElement.innerHTML = "", this.renderHeader()), this.rowVirtualizer && this.renderVirtualRows();
		}), this.resizeObserver.observe(this.container));
	}
	initVirtualScrolling() {
		if (!this.scrollElement || !this.bodyElement) {
			logger.error("VirtualTableDiv: scrollElement or bodyElement is null");
			return;
		}
		let c = (() => {
			if (this.scrollElement) {
				let c = this.scrollElement.getBoundingClientRect();
				if (c.width > 0 && c.height > 0) return {
					width: c.width,
					height: c.height
				};
			}
			return {
				width: this.container.clientWidth || 800,
				height: this.container.clientHeight || 600
			};
		})();
		this.rowVirtualizer = new Virtualizer({
			count: this.getFilteredTranslations().length,
			getScrollElement: () => this.scrollElement,
			estimateSize: () => this.rowHeight,
			scrollToFn: elementScroll,
			observeElementRect,
			observeElementOffset,
			initialRect: c,
			onChange: () => {
				this.renderScheduled || (this.renderScheduled = !0, requestAnimationFrame(() => {
					this.renderScheduled = !1, this.renderVirtualRows();
				}));
			}
		}), this.rowVirtualizer._willUpdate(), this.virtualizerCleanup = this.rowVirtualizer._didMount(), requestAnimationFrame(() => {
			this.renderVirtualRows();
		});
	}
	renderVirtualRows() {
		if (!this.rowVirtualizer || !this.bodyElement) return;
		let c = null, I = this.cellEditor.getEditingCell();
		if (I) {
			let L = this.bodyElement.querySelector(`[data-row-index="${I.rowIndex}"]`);
			if (L) {
				let R = L.querySelector(`[data-column-id="${I.columnId}"]`);
				if (R) {
					let L = R.querySelector("input");
					L && (c = {
						rowId: I.rowId,
						columnId: I.columnId,
						value: L.value
					});
				}
			}
		}
		this.bodyElement.innerHTML = "";
		let L = this.rowVirtualizer.getVirtualItems(), R = this.rowVirtualizer.getTotalSize();
		this.bodyElement.style.height = `${R}px`;
		let B, V = this.getContainerWidth();
		if (this.columnResizer.isResizingActive()) B = this.columnWidthCalculator.calculateColumnWidths(V);
		else if (this.columnWidths.size > 0) B = this.columnWidthCalculator.calculateColumnWidths(V);
		else {
			let c = this.getColumnWidthsFromHeader();
			if (c) {
				let I = c.rowNumber + c.key + c.context + c.languages.slice(0, -1).reduce((c, I) => c + I, 0), L = this.columnMinWidths.get(`values.${this.options.languages[this.options.languages.length - 1]}`) || 80, R = Math.max(L, V - I);
				B = {
					rowNumber: c.rowNumber,
					key: c.key,
					context: c.context,
					languages: [...c.languages.slice(0, -1), R]
				};
			} else B = this.columnWidthCalculator.calculateColumnWidths(V);
		}
		L.forEach((I) => {
			let L = this.getFilteredTranslations()[I.index];
			if (!L) return;
			let R = this.gridRenderer.createRow(L, I.index, B), H = V;
			if (R.style.position = "absolute", R.style.top = `${I.start}px`, R.style.left = "0", R.style.width = `${H}px`, R.style.minWidth = `${H}px`, R.style.maxWidth = `${H}px`, R.style.height = `${I.size}px`, R.setAttribute("data-index", I.index.toString()), this.bodyElement.appendChild(R), this.applyQuickSearchHighlight(R, I.index), c && L.id === c.rowId) {
				let L = R.querySelector(`[data-column-id="${c.columnId}"]`);
				L && requestAnimationFrame(() => {
					this.startEditing(I.index, c.columnId, L);
					let R = L.querySelector("input");
					R && (R.value = c.value, R.focus(), R.select());
				});
			}
			this.rowVirtualizer.measureElement(R);
		});
	}
	renderHeader() {
		if (!this.headerElement) return;
		let c = document.createElement("div");
		c.className = "virtual-grid-header-row", c.setAttribute("role", "row");
		let I = this.getContainerWidth(), L;
		this.columnWidths.size > 0 ? L = this.columnWidthCalculator.calculateColumnWidths(I) : (L = this.columnWidthCalculator.calculateColumnWidths(I), this.columnWidths.set("row-number", L.rowNumber), this.columnWidths.set("key", L.key), this.columnWidths.set("context", L.context), this.options.languages.slice(0, -1).forEach((c, I) => {
			let R = L.languages[I];
			this.columnWidths.set(`values.${c}`, R);
		}));
		let R = I;
		c.style.width = `${R}px`, c.style.minWidth = `${R}px`, c.style.maxWidth = `${R}px`;
		let B = this.gridRenderer.createHeaderCell("", L.rowNumber, 0, 15, "row-number");
		B.classList.add("row-number-header"), c.appendChild(B);
		let V = this.gridRenderer.createHeaderCell("Key", L.key, L.rowNumber, 10, "key");
		this.columnResizer.addResizeHandle(V, "key"), c.appendChild(V);
		let H = this.gridRenderer.createHeaderCell("Context", L.context, L.rowNumber + L.key, 10, "context");
		this.columnResizer.addResizeHandle(H, "context"), c.appendChild(H), this.options.languages.forEach((I, R) => {
			let B = L.languages[R], V = `values.${I}`, H = L.rowNumber + L.key + L.context, U = this.gridRenderer.createHeaderCell(I.toUpperCase(), B, H, 0, V);
			this.columnResizer.addResizeHandle(U, V), c.appendChild(U);
		}), this.headerElement.appendChild(c);
	}
	applyColumnWidth(c, I) {
		let L = this.getContainerWidth(), { columnWidths: R, totalWidth: B } = this.columnWidthCalculator.applyColumnWidth(c, I, L);
		if (this.headerElement) {
			let c = this.headerElement.querySelector(".virtual-grid-header-row");
			c && (c.style.width = `${B}px`, c.style.minWidth = `${B}px`, c.style.maxWidth = `${B}px`);
			let I = this.headerElement.querySelector("[data-column-id=\"row-number\"]");
			I && (I.style.width = `${R.rowNumber}px`, I.style.minWidth = `${R.rowNumber}px`, I.style.maxWidth = `${R.rowNumber}px`);
			let L = this.headerElement.querySelector("[data-column-id=\"key\"]");
			L && (L.style.width = `${R.key}px`, L.style.minWidth = `${R.key}px`, L.style.maxWidth = `${R.key}px`, L.style.left = `${R.rowNumber}px`);
			let V = this.headerElement.querySelector("[data-column-id=\"context\"]");
			V && (V.style.width = `${R.context}px`, V.style.minWidth = `${R.context}px`, V.style.maxWidth = `${R.context}px`, V.style.left = `${R.rowNumber + R.key}px`), this.options.languages.forEach((c, I) => {
				let L = this.headerElement.querySelector(`[data-column-id="values.${c}"]`);
				if (L) {
					let c = R.languages[I];
					L.style.width = `${c}px`, L.style.minWidth = `${c}px`, L.style.maxWidth = `${c}px`;
					let B = R.rowNumber + R.key + R.context;
					L.style.left = `${B}px`;
				}
			});
		}
		this.bodyElement && (this.bodyElement.querySelectorAll(".virtual-grid-row").forEach((c) => {
			let I = c;
			I.style.width = `${B}px`, I.style.minWidth = `${B}px`, I.style.maxWidth = `${B}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"row-number\"]").forEach((c) => {
			let I = c;
			I.style.width = `${R.rowNumber}px`, I.style.minWidth = `${R.rowNumber}px`, I.style.maxWidth = `${R.rowNumber}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"key\"]").forEach((c) => {
			let I = c;
			I.style.width = `${R.key}px`, I.style.minWidth = `${R.key}px`, I.style.maxWidth = `${R.key}px`, I.style.left = `${R.rowNumber}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"context\"]").forEach((c) => {
			let I = c;
			I.style.width = `${R.context}px`, I.style.minWidth = `${R.context}px`, I.style.maxWidth = `${R.context}px`, I.style.left = `${R.rowNumber + R.key}px`;
		}), this.options.languages.forEach((c, I) => {
			let L = this.bodyElement.querySelectorAll(`[data-column-id="values.${c}"]`), B = R.languages[I], V = R.rowNumber + R.key + R.context;
			L.forEach((c) => {
				let I = c;
				I.style.width = `${B}px`, I.style.minWidth = `${B}px`, I.style.maxWidth = `${B}px`, I.style.left = `${V}px`;
			});
		}));
	}
	getColumnWidthsFromHeader() {
		if (!this.headerElement) return null;
		let c = this.headerElement.querySelector(".virtual-grid-header-row");
		if (!c) return null;
		let I = c.querySelectorAll(".virtual-grid-header-cell"), L = {
			rowNumber: 0,
			key: 0,
			context: 0,
			languages: []
		};
		return I.forEach((c) => {
			let I = c.getAttribute("data-column-id"), R = c.offsetWidth || c.getBoundingClientRect().width;
			I === "row-number" ? L.rowNumber = R : I === "key" ? L.key = R : I === "context" ? L.context = R : I && I.startsWith("values.") && L.languages.push(R);
		}), L.rowNumber > 0 && L.key > 0 && L.context > 0 && L.languages.length === this.options.languages.length ? L : null;
	}
	startEditing(c, I, L) {
		if (this.options.readOnly) return;
		let R = L.getAttribute("data-row-id");
		R && (this.cellEditor.startEditing(c, I, R, L), this.updateStatusBar());
	}
	startEditingFromKeyboard(c, I) {
		if (!this.bodyElement || !this.editableColumns.has(I) || this.options.readOnly) return;
		let L = this.bodyElement.querySelector(`[data-row-index="${c}"][data-column-id="${I}"]`);
		L && this.startEditing(c, I, L);
	}
	stopEditing() {
		this.cellEditor.stopEditing(this.bodyElement || void 0), this.updateStatusBar();
	}
	updateCellStyle(c, I, L) {
		if (!this.bodyElement) return;
		let R = L || this.bodyElement.querySelector(`[data-row-id="${c}"][data-column-id="${I}"]`);
		if (!R) return;
		let B = `${c}-${I}`;
		if (this.changeTracker.getChangesMap().has(B) ? R.classList.add("cell-dirty") : R.classList.remove("cell-dirty"), I.startsWith("values.")) {
			let L = this.currentTranslations.find((I) => I.id === c);
			if (L) {
				let c = I.replace("values.", ""), B = L.values[c] || "";
				!B || typeof B == "string" && B.trim() === "" ? R.classList.add("cell-empty") : R.classList.remove("cell-empty");
			}
		}
	}
	attachKeyboardListeners() {
		this.modifierKeyTracker.attach(), this.keyboardHandlerModule.attach(), this.vimKeyboardHandler = this.handleVimKeyboardEvent.bind(this), document.addEventListener("keydown", this.vimKeyboardHandler);
	}
	handleVimKeyboardEvent(c) {
		if (this.commandLine?.getVisible() || this.cellEditor.getEditingCell() !== null || this.quickSearchUI?.isSearchMode() || this.commandPalette.isPaletteOpen() || document.querySelector(".find-replace-overlay")) return;
		let I = c.target;
		if (!(I.tagName === "INPUT" || I.tagName === "TEXTAREA" || I.isContentEditable) && !(c.ctrlKey || c.metaKey || c.altKey)) {
			if (c.key === ":" || c.code === "Semicolon") {
				c.preventDefault(), c.stopPropagation(), this.commandLine && (this.vimCommandTracker && (this.vimCommandTracker.clear(), this.updateStatusBar()), this.commandLine.show());
				return;
			}
			if (c.key === "Escape") {
				if (this.commandLine?.getVisible()) {
					c.preventDefault(), c.stopPropagation(), this.commandLine.hide();
					return;
				}
				this.vimCommandTracker && (this.vimCommandTracker.cancelCommand(), this.updateStatusBar());
				return;
			}
			c.key.length === 1 && !c.shiftKey && !c.ctrlKey && !c.metaKey && !c.altKey && this.vimCommandTracker && (this.vimCommandTracker.addKey(c.key), this.updateStatusBar());
		}
	}
	focusCell(c, I) {
		if (!this.bodyElement) return;
		this.focusManager.focusCell(c, I), this.updateStatusBar();
		let L = this.bodyElement.querySelector(`[data-row-index="${c}"][data-column-id="${I}"]`);
		if (!L && this.rowVirtualizer) {
			this.rowVirtualizer.scrollToIndex(c, {
				align: "start",
				behavior: "auto"
			}), this.renderScheduled === !1 && this.renderVirtualRows();
			let R = (B = 0) => {
				if (!(B > 20)) {
					if (L = this.bodyElement.querySelector(`[data-row-index="${c}"][data-column-id="${I}"]`), L) {
						L.focus(), L.dispatchEvent(new FocusEvent("focus", { bubbles: !0 }));
						return;
					}
					requestAnimationFrame(() => {
						R(B + 1);
					});
				}
			};
			R(0);
		} else L && (L.focus(), L.dispatchEvent(new FocusEvent("focus", { bubbles: !0 })));
	}
	handleCellClick(c, I, L) {
		let R = L.ctrlKey || L.metaKey;
		L.shiftKey ? this.selectionManager.selectRange(c, I) : R ? this.selectionManager.toggleCell(c, I) : this.selectionManager.selectCell(c, I), this.focusManager.focusCell(c, I);
	}
	updateSelectionStyles() {
		if (!this.bodyElement) return;
		this.bodyElement.querySelectorAll(".virtual-grid-cell").forEach((c) => {
			c.classList.remove("cell-selected");
		});
		let c = this.selectionManager.getSelectedCells();
		for (let I of c) {
			let c = this.bodyElement.querySelector(`[data-row-index="${I.rowIndex}"][data-column-id="${I.columnId}"]`);
			c && c.classList.add("cell-selected");
		}
	}
	getSelectedValues() {
		return this.selectionManager.getSelectedCells().map((c) => {
			let I = this.currentTranslations[c.rowIndex], L = "";
			if (I) {
				if (c.columnId === "key") L = I.key;
				else if (c.columnId === "context") L = I.context || "";
				else if (c.columnId.startsWith("values.")) {
					let R = c.columnId.replace("values.", "");
					L = I.values[R] || "";
				}
			}
			return {
				...c,
				value: L
			};
		});
	}
	getSelectionCount() {
		return this.selectionManager.getSelectionCount();
	}
	handleUndo() {
		if (!this.undoRedoManager.canUndo()) return;
		let c = this.undoRedoManager.undo();
		c && (this.applyUndoRedoAction(c), this.updateStatusBar());
	}
	handleRedo() {
		if (!this.undoRedoManager.canRedo()) return;
		let c = this.undoRedoManager.redo();
		c && (this.applyUndoRedoAction(c), this.updateStatusBar());
	}
	applyUndoRedoAction(c) {
		if (c.type !== "cell-change") {
			logger.warn("VirtualTableDiv: Invalid action type", c.type);
			return;
		}
		this.cellEditor.isEditing() && this.stopEditing();
		let I = this.currentTranslations.findIndex((I) => I.id === c.rowId);
		if (I === -1) {
			logger.error("VirtualTableDiv: Translation not found", c.rowId);
			return;
		}
		let L = this.currentTranslations[I], R = toMutableTranslation(L);
		if (c.columnId === "key") R.key = c.newValue;
		else if (c.columnId === "context") R.context = c.newValue;
		else if (c.columnId.startsWith("values.")) {
			let I = c.columnId.replace("values.", "");
			R.values[I] = c.newValue;
		} else {
			logger.error("VirtualTableDiv: Invalid columnId", c.columnId);
			return;
		}
		let B = this.originalTranslations.findIndex((I) => I.id === c.rowId);
		if (B !== -1) {
			let I = this.originalTranslations[B], L = toMutableTranslation(I);
			if (c.columnId === "key") L.key = c.newValue;
			else if (c.columnId === "context") L.context = c.newValue;
			else if (c.columnId.startsWith("values.")) {
				let I = c.columnId.replace("values.", "");
				L.values[I] = c.newValue;
			}
			let R = [...this.originalTranslations];
			R[B] = L, this.originalTranslations = R;
		}
		this.currentTranslations[I] = R;
		let V = this.bodyElement?.querySelector(`[data-row-id="${c.rowId}"][data-column-id="${c.columnId}"]`);
		if (V) {
			let I = V.getAttribute("data-row-index"), L = I ? parseInt(I, 10) : 0;
			this.gridRenderer.updateCellContent(V, c.rowId, c.columnId, c.newValue, L);
		} else this.updateCellStyle(c.rowId, c.columnId);
		let H = this.changeTracker.getOriginalValue(c.rowId, c.columnId), U = getLangFromColumnId(c.columnId), W = getTranslationKey(this.currentTranslations, c.rowId, c.columnId, c.newValue);
		this.changeTracker.trackChange(c.rowId, c.columnId, U, H, c.newValue, W, () => {
			this.updateCellStyle(c.rowId, c.columnId);
		}), this.options.onCellChange && this.options.onCellChange(c.rowId, c.columnId, c.newValue), this.rowVirtualizer && this.bodyElement && this.renderVirtualRows();
	}
	getContainerWidth() {
		return this.container && this.container.clientWidth > 0 ? this.container.clientWidth : typeof window < "u" ? window.innerWidth : 1e3;
	}
	setReadOnly(c) {
		this.options = {
			...this.options,
			readOnly: c
		}, this.gridRenderer = new GridRenderer({
			languages: this.options.languages,
			readOnly: c,
			editableColumns: this.editableColumns,
			callbacks: {
				onCellDblClick: (c, I, L) => {
					this.startEditing(c, I, L);
				},
				onCellFocus: (c, I) => {
					this.focusManager.focusCell(c, I);
				},
				updateCellStyle: (c, I, L) => {
					this.updateCellStyle(c, I, L);
				},
				isNewRow: (c) => this.isNewRow(c)
			}
		}), this.gridElement && (c ? this.gridElement.classList.add("readonly") : this.gridElement.classList.remove("readonly")), this.bodyElement && this.bodyElement.querySelectorAll(".virtual-grid-cell").forEach((I) => {
			let L = I.getAttribute("data-column-id"), R = L && this.editableColumns.has(L);
			c ? I.setAttribute("tabindex", "-1") : I.setAttribute("tabindex", R ? "0" : "-1");
		}), this.bodyElement && this.rowVirtualizer && this.renderVirtualRows();
	}
	getChanges() {
		return this.changeTracker.getChanges();
	}
	registerDefaultCommands() {
		this.commandRegistry.registerCommand({
			id: "goto",
			label: "Go to Row",
			keywords: [
				"goto",
				"go",
				"row",
				"line",
				"jump",
				"top",
				"bottom"
			],
			category: "navigation",
			description: "Navigate to a specific row number, or use 'top'/'bottom'",
			execute: (c) => {
				if (c && c.length > 0) {
					let I = c[0].toLowerCase();
					if (I === "top" || I === "first" || I === "1") {
						this.gotoTop();
						return;
					}
					if (I === "bottom" || I === "last") {
						this.gotoBottom();
						return;
					}
					let L = parseInt(c[0], 10);
					!isNaN(L) && L > 0 && this.gotoRow(L - 1);
				}
			}
		}), this.commandRegistry.registerCommand({
			id: "goto-next",
			label: "Go to Next Match",
			keywords: [
				"goto",
				"next",
				"match",
				"forward"
			],
			category: "navigation",
			description: "Navigate to the next search match",
			execute: () => {
				this.gotoToNextMatch();
			}
		}), this.commandRegistry.registerCommand({
			id: "goto-prev",
			label: "Go to Previous Match",
			keywords: [
				"goto",
				"prev",
				"previous",
				"back",
				"backward"
			],
			category: "navigation",
			description: "Navigate to the previous search match",
			execute: () => {
				this.gotoToPrevMatch();
			}
		}), this.commandRegistry.registerCommand({
			id: "search",
			label: "Search",
			keywords: [
				"search",
				"find",
				"query"
			],
			category: "filter",
			description: "Search for keywords in translations",
			execute: (c) => {
				if (c && c.length > 0) {
					let I = c.join(" ");
					this.searchKeyword(I);
				}
			}
		}), this.commandRegistry.registerCommand({
			id: "filter-empty",
			label: "Filter: Empty Translations",
			keywords: [
				"filter",
				"empty",
				"blank",
				"missing"
			],
			category: "filter",
			description: "Show only rows with empty translations",
			execute: () => {
				this.filterEmpty();
			}
		}), this.commandRegistry.registerCommand({
			id: "filter-changed",
			label: "Filter: Changed Cells",
			keywords: [
				"filter",
				"changed",
				"dirty",
				"modified"
			],
			category: "filter",
			description: "Show only rows with changed cells",
			execute: () => {
				this.filterChanged();
			}
		}), this.commandRegistry.registerCommand({
			id: "filter-duplicate",
			label: "Filter: Duplicate Keys",
			keywords: [
				"filter",
				"duplicate",
				"dupe"
			],
			category: "filter",
			description: "Show only rows with duplicate keys",
			execute: () => {
				this.filterDuplicate();
			}
		}), this.commandRegistry.registerCommand({
			id: "clear-filter",
			label: "Clear Filter",
			keywords: [
				"clear",
				"filter",
				"reset",
				"show",
				"all"
			],
			category: "filter",
			description: "Clear all filters and show all rows",
			execute: () => {
				this.clearFilter();
			}
		}), this.commandRegistry.registerCommand({
			id: "undo",
			label: "Undo",
			keywords: ["undo", "revert"],
			shortcut: "Cmd+Z",
			category: "edit",
			description: "Undo last action",
			execute: () => {
				this.handleUndo();
			}
		}), this.commandRegistry.registerCommand({
			id: "redo",
			label: "Redo",
			keywords: ["redo", "repeat"],
			shortcut: "Cmd+Y",
			category: "edit",
			description: "Redo last undone action",
			execute: () => {
				this.handleRedo();
			}
		}), this.commandRegistry.registerCommand({
			id: "readonly",
			label: "Toggle Read Only",
			keywords: [
				"readonly",
				"read",
				"only",
				"lock",
				"unlock"
			],
			category: "edit",
			description: "Toggle read-only mode",
			execute: () => {
				let c = !this.options.readOnly;
				this.setReadOnly(c);
			}
		}), this.commandRegistry.registerCommand({
			id: "help",
			label: "Show Help",
			keywords: [
				"help",
				"?",
				"documentation",
				"docs"
			],
			category: "help",
			description: "Show keyboard shortcuts and help",
			execute: () => {
				this.showHelp();
			}
		}), this.commandRegistry.registerCommand({
			id: "add",
			label: "Add New Row",
			keywords: [
				"add",
				"new",
				"row",
				"create",
				"insert"
			],
			shortcut: "Ctrl+N",
			category: "edit",
			description: "Add a new translation row at the bottom",
			execute: () => {
				this.addRow();
			}
		}), this.commandRegistry.registerCommand({
			id: "add-above",
			label: "Add Row Above",
			keywords: [
				"add",
				"above",
				"insert",
				"before"
			],
			category: "edit",
			description: "Add a new row above the current row",
			execute: () => {
				this.addRowAbove();
			}
		}), this.commandRegistry.registerCommand({
			id: "add-below",
			label: "Add Row Below",
			keywords: [
				"add",
				"below",
				"insert",
				"after"
			],
			category: "edit",
			description: "Add a new row below the current row",
			execute: () => {
				this.addRowBelow();
			}
		}), this.commandRegistry.registerCommand({
			id: "delete",
			label: "Delete Current Row",
			keywords: [
				"delete",
				"remove",
				"row",
				"del"
			],
			category: "edit",
			description: "Delete the currently selected row",
			execute: () => {
				this.deleteCurrentRow();
			}
		});
	}
	gotoRow(c) {
		let I = this.getFilteredTranslations();
		if (c < 0 || c >= I.length) return;
		this.rowVirtualizer && this.rowVirtualizer.scrollToIndex(c, {
			align: "start",
			behavior: "smooth"
		});
		let L = [
			"key",
			"context",
			...this.options.languages.map((c) => `values.${c}`)
		].find((c) => this.editableColumns.has(c));
		L && setTimeout(() => {
			this.focusCell(c, L);
		}, 300);
	}
	gotoTop() {
		this.gotoRow(0);
	}
	gotoBottom() {
		let c = this.getFilteredTranslations();
		if (c.length > 0) {
			let I = c.length - 1;
			this.rowVirtualizer && this.rowVirtualizer.scrollToIndex(I, {
				align: "end",
				behavior: "smooth"
			});
			let L = [
				"key",
				"context",
				...this.options.languages.map((c) => `values.${c}`)
			].find((c) => this.editableColumns.has(c));
			L && setTimeout(() => {
				this.focusCell(I, L);
			}, 300);
		}
	}
	findMatches(c) {
		return new TextSearchMatcher({
			translations: this.getFilteredTranslations(),
			languages: this.options.languages
		}).findMatches(c);
	}
	gotoToMatch(c) {
		if (this.gotoRow(c.rowIndex), this.currentGotoMatches) {
			let I = this.currentGotoMatches.matches.findIndex((I) => I.rowIndex === c.rowIndex);
			I !== -1 && (this.currentGotoMatches.currentIndex = I);
		}
	}
	gotoToNextMatch() {
		if (!this.currentGotoMatches || this.currentGotoMatches.matches.length === 0) return;
		let { matches: c, currentIndex: I } = this.currentGotoMatches, L = (I + 1) % c.length, R = c[L];
		this.currentGotoMatches.currentIndex = L, this.gotoRow(R.rowIndex);
	}
	gotoToPrevMatch() {
		if (!this.currentGotoMatches || this.currentGotoMatches.matches.length === 0) return;
		let { matches: c, currentIndex: I } = this.currentGotoMatches, L = I === 0 ? c.length - 1 : I - 1, R = c[L];
		this.currentGotoMatches.currentIndex = L, this.gotoRow(R.rowIndex);
	}
	openFindReplace(c) {
		this.findReplace && this.findReplace.open(c);
	}
	gotoToFindMatch(c) {
		this.gotoRow(c.rowIndex), this.focusCell(c.rowIndex, c.columnId);
	}
	replaceFindMatch(c, I) {
		let L = this.getFilteredTranslations();
		if (c.rowIndex < 0 || c.rowIndex >= L.length) return;
		let R = L[c.rowIndex], B = null;
		if (c.columnId === "key") B = R.key;
		else if (c.columnId === "context") B = R.context || null;
		else if (c.columnId.startsWith("values.")) {
			let I = c.columnId.replace("values.", "");
			B = R.values[I] || null;
		}
		if (B === null) return;
		let V = B.substring(0, c.matchIndex), H = B.substring(c.matchIndex + c.matchLength), U = V + I + H;
		if (c.columnId !== "key") {
			{
				let I = c.columnId, L = "";
				if (I === "context") L = R.context || "";
				else if (I.startsWith("values.")) {
					let c = I.replace("values.", "");
					L = R.values[c] || "";
				}
				this.cellEditor.applyCellChange(R.id, I, L, U).catch((c) => {
					logger.error("Failed to apply cell change:", c);
				});
			}
			this.updateStatusBar(), this.renderVirtualRows();
		}
	}
	replaceAllFindMatches(c, I) {
		[...c].sort((c, I) => c.rowIndex === I.rowIndex ? I.matchIndex - c.matchIndex : I.rowIndex - c.rowIndex).forEach((c) => {
			this.replaceFindMatch(c, I);
		});
	}
	getCurrentMatchInfo() {
		return !this.currentGotoMatches || this.currentGotoMatches.matches.length === 0 ? null : {
			current: this.currentGotoMatches.currentIndex + 1,
			total: this.currentGotoMatches.matches.length
		};
	}
	getFilteredTranslations() {
		return this.filterManager.filter(this.originalTranslations, {
			type: this.currentFilter,
			keyword: this.currentSearchKeyword
		});
	}
	applyFilter() {
		this.currentTranslations = [...this.getFilteredTranslations()], this.rowVirtualizer && this.initVirtualScrolling(), this.headerElement && (this.headerElement.innerHTML = "", this.renderHeader()), this.renderVirtualRows(), this.updateStatusBar();
	}
	searchKeyword(c) {
		this.currentSearchKeyword = c, this.currentFilter = c.trim() ? "search" : "none", this.applyFilter();
	}
	filterEmpty() {
		this.currentFilter = "empty", this.currentSearchKeyword = "", this.applyFilter();
	}
	filterChanged() {
		this.currentFilter = "changed", this.currentSearchKeyword = "", this.applyFilter();
	}
	filterDuplicate() {
		this.currentFilter = "duplicate", this.currentSearchKeyword = "", this.applyFilter();
	}
	clearFilter() {
		this.currentFilter = "none", this.currentSearchKeyword = "", this.currentTranslations = [...this.originalTranslations], this.applyFilter();
	}
	showHelp() {
		let c = document.querySelector(".help-modal-overlay");
		if (c && c.remove(), !document.querySelector("link[href*=\"help-modal.css\"]")) {
			let c = document.createElement("link");
			c.rel = "stylesheet", c.href = new URL("data:text/css;base64,LyoqCiAqIEhlbHAgTW9kYWwg7Iqk7YOA7J28CiAqIFZTIENvZGUg7Iqk7YOA7J287J2YIOuPhOybgOunkCDrqqjri6wKICovCgouaGVscC1tb2RhbC1vdmVybGF5IHsKICBwb3NpdGlvbjogZml4ZWQ7CiAgdG9wOiAwOwogIGxlZnQ6IDA7CiAgcmlnaHQ6IDA7CiAgYm90dG9tOiAwOwogIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC40KTsKICB6LWluZGV4OiAxMDAxOyAvKiBDb21tYW5kIFBhbGV0dGXrs7Tri6Qg7JyE7JeQIO2RnOyLnCAqLwogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICBhbmltYXRpb246IGZhZGVJbiAwLjE1cyBlYXNlLW91dDsKfQoKQGtleWZyYW1lcyBmYWRlSW4gewogIGZyb20gewogICAgb3BhY2l0eTogMDsKICB9CiAgdG8gewogICAgb3BhY2l0eTogMTsKICB9Cn0KCi5oZWxwLW1vZGFsIHsKICB3aWR0aDogOTAlOwogIG1heC13aWR0aDogNzAwcHg7CiAgbWF4LWhlaWdodDogODB2aDsKICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmOwogIGJvcmRlci1yYWRpdXM6IDhweDsKICBib3gtc2hhZG93OiAwIDhweCAzMnB4IHJnYmEoMCwgMCwgMCwgMC4yKTsKICBkaXNwbGF5OiBmbGV4OwogIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47CiAgYW5pbWF0aW9uOiBzbGlkZURvd24gMC4xNXMgZWFzZS1vdXQ7CiAgb3ZlcmZsb3c6IGhpZGRlbjsKfQoKQGtleWZyYW1lcyBzbGlkZURvd24gewogIGZyb20gewogICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0yMHB4KTsKICAgIG9wYWNpdHk6IDA7CiAgfQogIHRvIHsKICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTsKICAgIG9wYWNpdHk6IDE7CiAgfQp9CgouaGVscC1tb2RhbC1oZWFkZXIgewogIHBhZGRpbmc6IDIwcHggMjRweDsKICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2UyZThmMDsKICBkaXNwbGF5OiBmbGV4OwogIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsKICBhbGlnbi1pdGVtczogY2VudGVyOwogIGJhY2tncm91bmQtY29sb3I6ICNmOGZhZmM7Cn0KCi5oZWxwLW1vZGFsLXRpdGxlIHsKICBmb250LXNpemU6IDIwcHg7CiAgZm9udC13ZWlnaHQ6IDYwMDsKICBjb2xvcjogIzFlMjkzYjsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLWNsb3NlIHsKICBiYWNrZ3JvdW5kOiBub25lOwogIGJvcmRlcjogbm9uZTsKICBmb250LXNpemU6IDI0cHg7CiAgY29sb3I6ICM2NDc0OGI7CiAgY3Vyc29yOiBwb2ludGVyOwogIHBhZGRpbmc6IDA7CiAgd2lkdGg6IDMycHg7CiAgaGVpZ2h0OiAzMnB4OwogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICBib3JkZXItcmFkaXVzOiA0cHg7CiAgdHJhbnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciAwLjFzOwp9CgouaGVscC1tb2RhbC1jbG9zZTpob3ZlciB7CiAgYmFja2dyb3VuZC1jb2xvcjogI2UyZThmMDsKICBjb2xvcjogIzFlMjkzYjsKfQoKLmhlbHAtbW9kYWwtY29udGVudCB7CiAgZmxleDogMTsKICBvdmVyZmxvdy15OiBhdXRvOwogIHBhZGRpbmc6IDI0cHg7Cn0KCi5oZWxwLW1vZGFsLXNlY3Rpb24gewogIG1hcmdpbi1ib3R0b206IDMycHg7Cn0KCi5oZWxwLW1vZGFsLXNlY3Rpb246bGFzdC1jaGlsZCB7CiAgbWFyZ2luLWJvdHRvbTogMDsKfQoKLmhlbHAtbW9kYWwtc2VjdGlvbi10aXRsZSB7CiAgZm9udC1zaXplOiAxNnB4OwogIGZvbnQtd2VpZ2h0OiA2MDA7CiAgY29sb3I6ICMxZTI5M2I7CiAgbWFyZ2luOiAwIDAgMTZweCAwOwogIHBhZGRpbmctYm90dG9tOiA4cHg7CiAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNlMmU4ZjA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWxpc3QgewogIGxpc3Qtc3R5bGU6IG5vbmU7CiAgcGFkZGluZzogMDsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWl0ZW0gewogIGRpc3BsYXk6IGZsZXg7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgcGFkZGluZzogMTJweCAwOwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjFmNWY5Owp9CgouaGVscC1tb2RhbC1zaG9ydGN1dC1pdGVtOmxhc3QtY2hpbGQgewogIGJvcmRlci1ib3R0b206IG5vbmU7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWRlc2NyaXB0aW9uIHsKICBmb250LXNpemU6IDE0cHg7CiAgY29sb3I6ICM0NzU1Njk7CiAgZmxleDogMTsKfQoKLmhlbHAtbW9kYWwtc2hvcnRjdXQta2V5cyB7CiAgZGlzcGxheTogZmxleDsKICBnYXA6IDRweDsKICBhbGlnbi1pdGVtczogY2VudGVyOwp9CgouaGVscC1tb2RhbC1zaG9ydGN1dC1rZXkgewogIHBhZGRpbmc6IDRweCA4cHg7CiAgYmFja2dyb3VuZC1jb2xvcjogI2YxZjVmOTsKICBib3JkZXI6IDFweCBzb2xpZCAjZTJlOGYwOwogIGJvcmRlci1yYWRpdXM6IDRweDsKICBmb250LXNpemU6IDEycHg7CiAgZm9udC1mYW1pbHk6IHN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZjsKICBjb2xvcjogIzFlMjkzYjsKICBib3gtc2hhZG93OiAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjEpOwogIGZvbnQtd2VpZ2h0OiA1MDA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWtleS1zZXBhcmF0b3IgewogIGNvbG9yOiAjOTRhM2I4OwogIGZvbnQtc2l6ZTogMTJweDsKICBtYXJnaW46IDAgMnB4Owp9CgouaGVscC1tb2RhbC1jb21tYW5kLWxpc3QgewogIGxpc3Qtc3R5bGU6IG5vbmU7CiAgcGFkZGluZzogMDsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLWNvbW1hbmQtaXRlbSB7CiAgcGFkZGluZzogMTJweCAwOwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjFmNWY5Owp9CgouaGVscC1tb2RhbC1jb21tYW5kLWl0ZW06bGFzdC1jaGlsZCB7CiAgYm9yZGVyLWJvdHRvbTogbm9uZTsKfQoKLmhlbHAtbW9kYWwtY29tbWFuZC1uYW1lIHsKICBmb250LXNpemU6IDE0cHg7CiAgZm9udC13ZWlnaHQ6IDUwMDsKICBjb2xvcjogIzFlMjkzYjsKICBtYXJnaW4tYm90dG9tOiA0cHg7CiAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTsKICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjFmNWY5OwogIHBhZGRpbmc6IDJweCA2cHg7CiAgYm9yZGVyLXJhZGl1czogNHB4OwogIGRpc3BsYXk6IGlubGluZS1ibG9jazsKfQoKLmhlbHAtbW9kYWwtY29tbWFuZC1kZXNjcmlwdGlvbiB7CiAgZm9udC1zaXplOiAxM3B4OwogIGNvbG9yOiAjNjQ3NDhiOwogIG1hcmdpbi10b3A6IDRweDsKfQoKLyog7Iqk7YGs66Gk67CUIOyKpO2DgOydvCAqLwouaGVscC1tb2RhbC1jb250ZW50Ojotd2Via2l0LXNjcm9sbGJhciB7CiAgd2lkdGg6IDhweDsKfQoKLmhlbHAtbW9kYWwtY29udGVudDo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2sgewogIGJhY2tncm91bmQ6ICNmMWY1Zjk7Cn0KCi5oZWxwLW1vZGFsLWNvbnRlbnQ6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHsKICBiYWNrZ3JvdW5kOiAjY2JkNWUxOwogIGJvcmRlci1yYWRpdXM6IDRweDsKfQoKLmhlbHAtbW9kYWwtY29udGVudDo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWI6aG92ZXIgewogIGJhY2tncm91bmQ6ICM5NGEzYjg7Cn0KCgoKCg==", "" + import.meta.url).href, document.head.appendChild(c);
		}
		let I = document.createElement("div");
		I.className = "help-modal-overlay", I.setAttribute("role", "dialog"), I.setAttribute("aria-label", "Keyboard Shortcuts Help"), I.setAttribute("aria-modal", "true");
		let L = document.createElement("div");
		L.className = "help-modal";
		let R = document.createElement("div");
		R.className = "help-modal-header";
		let B = document.createElement("h2");
		B.className = "help-modal-title", B.textContent = "Keyboard Shortcuts";
		let V = document.createElement("button");
		V.className = "help-modal-close", V.innerHTML = "×", V.setAttribute("aria-label", "Close"), V.onclick = () => I.remove(), R.appendChild(B), R.appendChild(V);
		let H = document.createElement("div");
		H.className = "help-modal-content";
		let U = document.createElement("div");
		U.className = "help-modal-section";
		let W = document.createElement("h3");
		W.className = "help-modal-section-title", W.textContent = "Keyboard Shortcuts", U.appendChild(W);
		let G = document.createElement("ul");
		G.className = "help-modal-shortcut-list";
		let K = navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "Cmd" : "Ctrl";
		[
			{
				description: "Open Command Palette",
				keys: [K, "K"]
			},
			{
				description: "Undo",
				keys: [K, "Z"]
			},
			{
				description: "Redo",
				keys: [K, "Y"]
			},
			{
				description: "Navigate to next cell",
				keys: ["Tab"]
			},
			{
				description: "Navigate to next row (in language columns)",
				keys: ["Enter"]
			},
			{
				description: "Navigate cells",
				keys: ["Arrow", "Keys"]
			},
			{
				description: "Edit cell",
				keys: ["Double", "Click"]
			}
		].forEach((c) => {
			let I = document.createElement("li");
			I.className = "help-modal-shortcut-item";
			let L = document.createElement("span");
			L.className = "help-modal-shortcut-description", L.textContent = c.description;
			let R = document.createElement("div");
			R.className = "help-modal-shortcut-keys", c.keys.forEach((c, I) => {
				if (I > 0) {
					let c = document.createElement("span");
					c.className = "help-modal-shortcut-key-separator", c.textContent = "+", R.appendChild(c);
				}
				let L = document.createElement("kbd");
				L.className = "help-modal-shortcut-key", L.textContent = c, R.appendChild(L);
			}), I.appendChild(L), I.appendChild(R), G.appendChild(I);
		}), U.appendChild(G), H.appendChild(U);
		let q = document.createElement("div");
		q.className = "help-modal-section";
		let J = document.createElement("h3");
		J.className = "help-modal-section-title", J.textContent = "Available Commands", q.appendChild(J);
		let Y = document.createElement("ul");
		Y.className = "help-modal-command-list", [
			{
				name: "goto <number>",
				description: "Navigate to a specific row number"
			},
			{
				name: "goto top",
				description: "Navigate to the first row"
			},
			{
				name: "goto bottom",
				description: "Navigate to the last row"
			},
			{
				name: "search <keyword>",
				description: "Search for keywords in translations"
			},
			{
				name: "filter empty",
				description: "Show only rows with empty translations"
			},
			{
				name: "filter changed",
				description: "Show only rows with changed cells"
			},
			{
				name: "filter duplicate",
				description: "Show only rows with duplicate keys"
			},
			{
				name: "clear filter",
				description: "Clear all filters and show all rows"
			},
			{
				name: "undo",
				description: "Undo last action"
			},
			{
				name: "redo",
				description: "Redo last undone action"
			},
			{
				name: "readonly",
				description: "Toggle read-only mode"
			},
			{
				name: "help",
				description: "Show this help dialog"
			}
		].forEach((c) => {
			let I = document.createElement("li");
			I.className = "help-modal-command-item";
			let L = document.createElement("div");
			L.className = "help-modal-command-name", L.textContent = c.name;
			let R = document.createElement("div");
			R.className = "help-modal-command-description", R.textContent = c.description, I.appendChild(L), I.appendChild(R), Y.appendChild(I);
		}), q.appendChild(Y), H.appendChild(q), L.appendChild(R), L.appendChild(H), I.appendChild(L), document.body.appendChild(I);
		let X = document.body.style.overflow;
		document.body.style.overflow = "hidden", L.addEventListener("click", (c) => {
			c.stopPropagation();
		}), L.addEventListener("wheel", (c) => {
			c.stopPropagation();
		});
		let Z = () => {
			document.body.style.overflow = X, I.remove(), document.removeEventListener("keydown", Q);
		};
		I.addEventListener("click", (c) => {
			c.target === I && Z();
		}), V.onclick = () => Z();
		let Q = (c) => {
			c.key === "Escape" && Z();
		};
		document.addEventListener("keydown", Q);
		let $ = new MutationObserver(() => {
			document.body.contains(I) || (document.body.style.overflow = X, document.removeEventListener("keydown", Q), $.disconnect());
		});
		$.observe(document.body, {
			childList: !0,
			subtree: !0
		});
	}
	clearChanges() {
		this.changeTracker.clearChanges((c, I) => {
			this.updateCellStyle(c, I);
		}), this.renderVirtualRows();
	}
	openQuickSearch() {
		this.quickSearchUI && this.quickSearchUI.open();
	}
	closeQuickSearch() {
		this.quickSearchUI && this.quickSearchUI.close(), this.currentQuickSearchMatches = [], this.currentQuickSearchIndex = -1, this.bodyElement && this.renderVirtualRows();
	}
	handleQuickSearch(c) {
		if (!this.quickSearch || !this.quickSearchUI) return;
		let I = parseSearchQuery(c);
		if (!I) {
			this.currentQuickSearchMatches = [], this.currentQuickSearchIndex = -1, this.quickSearchUI.updateStatus(0, 0), this.bodyElement && this.renderVirtualRows();
			return;
		}
		let L = this.quickSearch.findMatches(I);
		this.currentQuickSearchMatches = L, this.currentQuickSearchIndex = L.length > 0 ? 0 : -1, L.length > 0 ? (this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, L.length), this.goToQuickSearchMatch(L[0])) : this.quickSearchUI.updateStatus(0, 0), this.bodyElement && this.renderVirtualRows();
	}
	goToNextQuickSearchMatch() {
		if (this.currentQuickSearchMatches.length === 0) return;
		(this.currentQuickSearchIndex < 0 || this.currentQuickSearchIndex >= this.currentQuickSearchMatches.length) && (this.currentQuickSearchIndex = 0), this.currentQuickSearchIndex = (this.currentQuickSearchIndex + 1) % this.currentQuickSearchMatches.length;
		let c = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
		this.goToQuickSearchMatch(c), this.quickSearchUI && this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, this.currentQuickSearchMatches.length);
	}
	goToPrevQuickSearchMatch() {
		if (this.currentQuickSearchMatches.length === 0) return;
		this.currentQuickSearchIndex = this.currentQuickSearchIndex <= 0 ? this.currentQuickSearchMatches.length - 1 : this.currentQuickSearchIndex - 1;
		let c = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
		this.goToQuickSearchMatch(c), this.quickSearchUI && this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, this.currentQuickSearchMatches.length);
	}
	goToQuickSearchMatch(c) {
		if (this.rowVirtualizer && this.scrollElement) if (this.rowVirtualizer.getVirtualItems().find((I) => I.index === c.rowIndex) && this.bodyElement) {
			let I = this.bodyElement.querySelector(`[data-index="${c.rowIndex}"]`);
			I && I.scrollIntoView({
				behavior: "auto",
				block: "center"
			});
		} else {
			let I = c.rowIndex * this.rowHeight;
			this.scrollElement.scrollTop = I - this.scrollElement.clientHeight / 2;
		}
		requestAnimationFrame(() => {
			this.focusCell(c.rowIndex, c.columnId), this.bodyElement && this.renderVirtualRows();
		});
	}
	applyQuickSearchHighlight(c, I) {
		this.currentQuickSearchMatches.length !== 0 && (c.querySelectorAll(".virtual-grid-cell").forEach((c) => {
			c.classList.remove("quick-search-matched", "quick-search-current-match");
			let I = c.querySelector(".virtual-grid-cell-content");
			if (I) {
				let c = I.getAttribute("data-original-text");
				c !== null && (I.textContent = c, I.removeAttribute("data-original-text"));
			}
		}), this.currentQuickSearchMatches.forEach((L) => {
			if (L.rowIndex !== I) return;
			let R = c.querySelector(`[data-column-id="${L.columnId}"]`);
			if (!R) return;
			let B = R.querySelector(".virtual-grid-cell-content");
			B && (B.getAttribute("data-original-text") || B.setAttribute("data-original-text", L.matchedText), B.innerHTML = QuickSearch.highlightText(L.matchedText, L.matchIndices), R.classList.add("quick-search-matched"), this.currentQuickSearchIndex >= 0 && this.currentQuickSearchIndex < this.currentQuickSearchMatches.length && this.currentQuickSearchMatches[this.currentQuickSearchIndex].rowIndex === I && this.currentQuickSearchMatches[this.currentQuickSearchIndex].columnId === L.columnId && R.classList.add("quick-search-current-match"));
		}));
	}
	destroy() {
		this.keyboardHandlerModule && this.keyboardHandlerModule.detach(), this.commandPalette && this.commandPalette.destroy(), this.modifierKeyTracker && this.modifierKeyTracker.detach(), this.columnResizer && this.columnResizer.destroy(), this.quickSearchUI &&= (this.quickSearchUI.destroy(), null), this.findReplace &&= (this.findReplace.destroy(), null), this.resizeObserver &&= (this.resizeObserver.disconnect(), null), this.virtualizerCleanup &&= (this.virtualizerCleanup(), null), this.scrollElement && this.container.contains(this.scrollElement) && this.container.removeChild(this.scrollElement), this.scrollElement = null, this.gridElement = null, this.headerElement = null, this.bodyElement = null, this.rowVirtualizer = null, this.statusBar &&= (this.statusBar.destroy(), null), this.vimKeyboardHandler &&= (document.removeEventListener("keydown", this.vimKeyboardHandler), null), this.commandLine &&= (this.commandLine.destroy(), null), this.vimCommandTracker &&= (this.vimCommandTracker.clear(), null);
	}
	initStatusBar() {
		this.statusBar = new StatusBar(this.container, {
			onStatusUpdate: () => {},
			onClearFilter: () => {
				this.clearFilter();
			}
		}), this.statusBar.create(), this.updateStatusBar();
	}
	async executeCommandLineCommand(c) {
		let I = c.trim();
		if (!I) return;
		let L = I.split(/\s+/), R = L[0].toLowerCase(), B = L.slice(1);
		if ((R === "goto" || R === "go") && B.length > 0) {
			let c = B[0].toLowerCase();
			if (c === "top" || c === "first" || c === "1") {
				this.gotoTop();
				return;
			}
			if (c === "bottom" || c === "last") {
				this.gotoBottom();
				return;
			}
			let I = parseInt(B[0], 10);
			if (!isNaN(I) && I > 0) {
				this.gotoRow(I - 1);
				return;
			}
		}
		if (R === "add" || R === "new") {
			if (B.length > 0) {
				let c = B[0].toLowerCase();
				if (c === "above" || c === "before") {
					this.addRowAbove();
					return;
				}
				if (c === "below" || c === "after") {
					this.addRowBelow();
					return;
				}
			}
			this.addRow();
			return;
		}
		if (R === "delete" || R === "del" || R === "remove") {
			this.deleteCurrentRow();
			return;
		}
		let V = this.commandRegistry.getCommands("all").find((c) => {
			let I = c.id.toLowerCase(), L = c.label.toLowerCase();
			return I === R || L.includes(R) || c.keywords?.some((c) => c.toLowerCase() === R);
		});
		V ? V.execute(B) : logger.warn(`CommandLine: Unknown command: ${R}`);
	}
	updateStatusBar() {
		if (!this.statusBar) return;
		let c = this.cellEditor.getEditingCell() === null ? "Normal" : "Editing", I = this.focusManager.getFocusedCell(), L = this.getFilteredTranslations().length, R = I && typeof I.rowIndex == "number" ? I.rowIndex : null;
		L > 0 ? R === null ? R = 0 : R >= L && (R = L - 1) : R = 0;
		let B = I ? I.columnId : null, V = this.changeTracker.getChanges().length, H = this.countEmptyTranslations(), U = this.countDuplicateKeys(), W = this.vimCommandTracker?.getCurrentCommand(), G = W ? W.sequence : null;
		this.statusBar.update({
			mode: c,
			rowIndex: R,
			totalRows: L,
			columnId: B,
			changesCount: V,
			emptyCount: H,
			duplicateCount: U,
			command: G,
			filter: this.currentFilter,
			searchKeyword: this.currentSearchKeyword
		});
	}
	countEmptyTranslations() {
		let c = this.getFilteredTranslations(), I = 0;
		return c.forEach((c) => {
			this.options.languages.forEach((L) => {
				let R = c.values[L] || "";
				(!R || typeof R == "string" && R.trim() === "") && I++;
			});
		}), I;
	}
	countDuplicateKeys() {
		let c = this.getFilteredTranslations(), I = /* @__PURE__ */ new Map();
		c.forEach((c) => {
			let L = c.key.trim();
			L && I.set(L, (I.get(L) || 0) + 1);
		});
		let L = 0;
		return I.forEach((c) => {
			c > 1 && (L += c - 1);
		}), L;
	}
	generateTempId() {
		return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}
	addRow() {
		if (this.options.readOnly) {
			logger.warn("Cannot add row in read-only mode");
			return;
		}
		let c = this.generateTempId(), I = {};
		this.options.languages.forEach((c) => {
			I[c] = "";
		});
		let L = {
			tempId: c,
			key: "",
			values: I,
			isNew: !0
		};
		this.newRows.set(c, L);
		let R = {
			id: c,
			key: `__new_${c}__`,
			values: I
		};
		this.originalTranslations = [...this.originalTranslations, R], this.currentTranslations = [...this.currentTranslations, R], this.changeTracker.initializeOriginalData(this.originalTranslations, Array.from(this.options.languages)), this.updateVirtualizer();
		let B = this.currentTranslations.length - 1;
		this.scrollToRowAndFocus(B, "key"), this.updateStatusBar(), this.options.onRowChange && this.options.onRowChange(), logger.debug(`Added new row with tempId: ${c}`);
	}
	addRowAbove() {
		if (this.options.readOnly) {
			logger.warn("Cannot add row in read-only mode");
			return;
		}
		let c = this.focusManager.getFocusedCell()?.rowIndex ?? 0;
		this.insertRowAt(c);
	}
	addRowBelow() {
		if (this.options.readOnly) {
			logger.warn("Cannot add row in read-only mode");
			return;
		}
		let c = (this.focusManager.getFocusedCell()?.rowIndex ?? -1) + 1;
		this.insertRowAt(c);
	}
	insertRowAt(c) {
		let I = this.generateTempId(), L = {};
		this.options.languages.forEach((c) => {
			L[c] = "";
		});
		let R = {
			tempId: I,
			key: "",
			values: L,
			isNew: !0
		};
		this.newRows.set(I, R);
		let B = {
			id: I,
			key: `__new_${I}__`,
			values: L
		}, V = [...this.originalTranslations], H = [...this.currentTranslations], U = Math.max(0, Math.min(c, H.length));
		V.splice(U, 0, B), H.splice(U, 0, B), this.originalTranslations = V, this.currentTranslations = H, this.changeTracker.initializeOriginalData(this.originalTranslations, Array.from(this.options.languages)), this.updateVirtualizer(), this.scrollToRowAndFocus(U, "key"), this.updateStatusBar(), this.options.onRowChange && this.options.onRowChange(), logger.debug(`Inserted new row at index ${U} with tempId: ${I}`);
	}
	deleteRow(c) {
		if (this.options.readOnly) {
			logger.warn("Cannot delete row in read-only mode");
			return;
		}
		this.newRows.has(c) ? this.newRows.delete(c) : this.deletedRows.set(c, {
			id: c,
			deleted: !0
		}), this.originalTranslations = this.originalTranslations.filter((I) => I.id !== c), this.currentTranslations = this.currentTranslations.filter((I) => I.id !== c), this.changeTracker.initializeOriginalData(this.originalTranslations, Array.from(this.options.languages)), this.updateVirtualizer(), this.updateStatusBar(), this.options.onRowChange && this.options.onRowChange(), logger.debug(`Deleted row with id: ${c}`);
	}
	deleteCurrentRow() {
		let c = this.focusManager.getFocusedCell();
		if (c === null) {
			logger.warn("No row selected to delete");
			return;
		}
		let I = this.currentTranslations[c.rowIndex];
		I && this.deleteRow(I.id);
	}
	updateVirtualizer() {
		this.rowVirtualizer && this.initVirtualScrolling();
	}
	scrollToRowAndFocus(c, I) {
		this.rowVirtualizer && (this.rowVirtualizer.scrollToIndex(c, {
			align: "center",
			behavior: "smooth"
		}), setTimeout(() => {
			this.focusManager.focusCell(c, I);
			let L = this.bodyElement?.querySelector(`[data-row-index="${c}"][data-column-id="${I}"]`);
			L && this.startEditing(c, I, L);
		}, 100));
	}
	getNewRows() {
		return Array.from(this.newRows.values());
	}
	getDeletedRows() {
		return Array.from(this.deletedRows.values());
	}
	isNewRow(c) {
		return this.newRows.has(c);
	}
	renderAddRowPlaceholder() {
		if (this.options.readOnly) {
			this.removeAddRowPlaceholder();
			return;
		}
		this.scrollElement && (this.removeAddRowPlaceholder(), this.addRowPlaceholder = document.createElement("div"), this.addRowPlaceholder.className = "add-row-placeholder", this.addRowPlaceholder.innerHTML = "\n      <div class=\"add-row-placeholder-content\">\n        <span class=\"add-row-icon\">+</span>\n        <span class=\"add-row-text\">Click to add new translation key</span>\n        <span class=\"add-row-shortcut\">or press Ctrl+N</span>\n      </div>\n    ", this.addRowPlaceholder.addEventListener("click", () => {
			this.addRow();
		}), this.scrollElement.appendChild(this.addRowPlaceholder));
	}
	removeAddRowPlaceholder() {
		this.addRowPlaceholder && this.addRowPlaceholder.parentNode && (this.addRowPlaceholder.parentNode.removeChild(this.addRowPlaceholder), this.addRowPlaceholder = null);
	}
	clearRowTracking() {
		this.newRows.clear(), this.deletedRows.clear();
	}
	clearAllChanges() {
		this.clearChanges(), this.clearRowTracking();
	}
};
export { ChangeTracker, VirtualTableDiv };
