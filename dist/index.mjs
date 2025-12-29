import { Data, Effect, Option } from "effect";
import { z } from "zod";
import Fuse from "fuse.js";
function memo(u, R, B) {
	let V = B.initialDeps ?? [], H, U = !0;
	function W() {
		let W;
		B.key && B.debug?.() && (W = Date.now());
		let G = u();
		if (!(G.length !== V.length || G.some((u, R) => V[R] !== u))) return H;
		V = G;
		let K;
		if (B.key && B.debug?.() && (K = Date.now()), H = R(...G), B.key && B.debug?.()) {
			let u = Math.round((Date.now() - W) * 100) / 100, R = Math.round((Date.now() - K) * 100) / 100, V = R / 16, H = (u, R) => {
				for (u = String(u); u.length < R;) u = " " + u;
				return u;
			};
			console.info(`%c⏱ ${H(R, 5)} /${H(u, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * V, 120))}deg 100% 31%);`, B?.key);
		}
		return B?.onChange && !(U && B.skipInitialOnChange) && B.onChange(H), U = !1, H;
	}
	return W.updateDeps = (u) => {
		V = u;
	}, W;
}
function notUndefined(u, R) {
	if (u === void 0) throw Error(`Unexpected undefined${R ? `: ${R}` : ""}`);
	return u;
}
const approxEqual = (u, R) => Math.abs(u - R) < 1.01, debounce = (u, R, B) => {
	let V;
	return function(...H) {
		u.clearTimeout(V), V = u.setTimeout(() => R.apply(this, H), B);
	};
};
var getRect = (u) => {
	let { offsetWidth: R, offsetHeight: B } = u;
	return {
		width: R,
		height: B
	};
};
const defaultKeyExtractor = (u) => u, defaultRangeExtractor = (u) => {
	let R = Math.max(u.startIndex - u.overscan, 0), B = Math.min(u.endIndex + u.overscan, u.count - 1), V = [];
	for (let u = R; u <= B; u++) V.push(u);
	return V;
}, observeElementRect = (u, R) => {
	let B = u.scrollElement;
	if (!B) return;
	let V = u.targetWindow;
	if (!V) return;
	let H = (u) => {
		let { width: B, height: V } = u;
		R({
			width: Math.round(B),
			height: Math.round(V)
		});
	};
	if (H(getRect(B)), !V.ResizeObserver) return () => {};
	let U = new V.ResizeObserver((R) => {
		let V = () => {
			let u = R[0];
			if (u?.borderBoxSize) {
				let R = u.borderBoxSize[0];
				if (R) {
					H({
						width: R.inlineSize,
						height: R.blockSize
					});
					return;
				}
			}
			H(getRect(B));
		};
		u.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(V) : V();
	});
	return U.observe(B, { box: "border-box" }), () => {
		U.unobserve(B);
	};
};
var addEventListenerOptions = { passive: !0 }, supportsScrollend = typeof window > "u" ? !0 : "onscrollend" in window;
const observeElementOffset = (u, R) => {
	let B = u.scrollElement;
	if (!B) return;
	let V = u.targetWindow;
	if (!V) return;
	let H = 0, U = u.options.useScrollendEvent && supportsScrollend ? () => void 0 : debounce(V, () => {
		R(H, !1);
	}, u.options.isScrollingResetDelay), W = (V) => () => {
		let { horizontal: W, isRtl: G } = u.options;
		H = W ? B.scrollLeft * (G && -1 || 1) : B.scrollTop, U(), R(H, V);
	}, G = W(!0), q = W(!1);
	q(), B.addEventListener("scroll", G, addEventListenerOptions);
	let J = u.options.useScrollendEvent && supportsScrollend;
	return J && B.addEventListener("scrollend", q, addEventListenerOptions), () => {
		B.removeEventListener("scroll", G), J && B.removeEventListener("scrollend", q);
	};
}, measureElement = (u, R, B) => {
	if (R?.borderBoxSize) {
		let u = R.borderBoxSize[0];
		if (u) return Math.round(u[B.options.horizontal ? "inlineSize" : "blockSize"]);
	}
	return u[B.options.horizontal ? "offsetWidth" : "offsetHeight"];
}, elementScroll = (u, { adjustments: R = 0, behavior: B }, V) => {
	let H = u + R;
	V.scrollElement?.scrollTo?.({
		[V.options.horizontal ? "left" : "top"]: H,
		behavior: B
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
		let u = null, R = () => u || (!this.targetWindow || !this.targetWindow.ResizeObserver ? null : u = new this.targetWindow.ResizeObserver((u) => {
			u.forEach((u) => {
				let R = () => {
					this._measureElement(u.target, u);
				};
				this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(R) : R();
			});
		}));
		return {
			disconnect: () => {
				R()?.disconnect(), u = null;
			},
			observe: (u) => R()?.observe(u, { box: "border-box" }),
			unobserve: (u) => R()?.unobserve(u)
		};
	})();
	range = null;
	constructor(u) {
		this.setOptions(u);
	}
	setOptions = (u) => {
		Object.entries(u).forEach(([R, B]) => {
			B === void 0 && delete u[R];
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
			...u
		};
	};
	notify = (u) => {
		this.options.onChange?.(this, u);
	};
	maybeNotify = memo(() => (this.calculateRange(), [
		this.isScrolling,
		this.range ? this.range.startIndex : null,
		this.range ? this.range.endIndex : null
	]), (u) => {
		this.notify(u);
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
		this.unsubs.filter(Boolean).forEach((u) => u()), this.unsubs = [], this.observer.disconnect(), this.scrollElement = null, this.targetWindow = null;
	};
	_didMount = () => () => {
		this.cleanup();
	};
	_willUpdate = () => {
		let u = this.options.enabled ? this.options.getScrollElement() : null;
		if (this.scrollElement !== u) {
			if (this.cleanup(), !u) {
				this.maybeNotify();
				return;
			}
			this.scrollElement = u, this.scrollElement && "ownerDocument" in this.scrollElement ? this.targetWindow = this.scrollElement.ownerDocument.defaultView : this.targetWindow = this.scrollElement?.window ?? null, this.elementsCache.forEach((u) => {
				this.observer.observe(u);
			}), this._scrollToOffset(this.getScrollOffset(), {
				adjustments: void 0,
				behavior: void 0
			}), this.unsubs.push(this.options.observeElementRect(this, (u) => {
				this.scrollRect = u, this.maybeNotify();
			})), this.unsubs.push(this.options.observeElementOffset(this, (u, R) => {
				this.scrollAdjustments = 0, this.scrollDirection = R ? this.getScrollOffset() < u ? "forward" : "backward" : null, this.scrollOffset = u, this.isScrolling = R, this.maybeNotify();
			}));
		}
	};
	getSize = () => this.options.enabled ? (this.scrollRect = this.scrollRect ?? this.options.initialRect, this.scrollRect[this.options.horizontal ? "width" : "height"]) : (this.scrollRect = null, 0);
	getScrollOffset = () => this.options.enabled ? (this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset == "function" ? this.options.initialOffset() : this.options.initialOffset), this.scrollOffset) : (this.scrollOffset = null, 0);
	getFurthestMeasurement = (u, R) => {
		let B = /* @__PURE__ */ new Map(), V = /* @__PURE__ */ new Map();
		for (let H = R - 1; H >= 0; H--) {
			let R = u[H];
			if (B.has(R.lane)) continue;
			let U = V.get(R.lane);
			if (U == null || R.end > U.end ? V.set(R.lane, R) : R.end < U.end && B.set(R.lane, !0), B.size === this.options.lanes) break;
		}
		return V.size === this.options.lanes ? Array.from(V.values()).sort((u, R) => u.end === R.end ? u.index - R.index : u.end - R.end)[0] : void 0;
	};
	getMeasurementOptions = memo(() => [
		this.options.count,
		this.options.paddingStart,
		this.options.scrollMargin,
		this.options.getItemKey,
		this.options.enabled,
		this.options.lanes
	], (u, R, B, V, H, U) => (this.prevLanes !== void 0 && this.prevLanes !== U && (this.lanesChangedFlag = !0), this.prevLanes = U, this.pendingMeasuredCacheIndexes = [], {
		count: u,
		paddingStart: R,
		scrollMargin: B,
		getItemKey: V,
		enabled: H,
		lanes: U
	}), {
		key: !1,
		skipInitialOnChange: !0,
		onChange: () => {
			this.notify(this.isScrolling);
		}
	});
	getMeasurements = memo(() => [this.getMeasurementOptions(), this.itemSizeCache], ({ count: u, paddingStart: R, scrollMargin: B, getItemKey: V, enabled: H, lanes: U }, W) => {
		if (!H) return this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), [];
		if (this.laneAssignments.size > u) for (let R of this.laneAssignments.keys()) R >= u && this.laneAssignments.delete(R);
		this.lanesChangedFlag && (this.lanesChangedFlag = !1, this.lanesSettling = !0, this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), this.pendingMeasuredCacheIndexes = []), this.measurementsCache.length === 0 && (this.measurementsCache = this.options.initialMeasurementsCache, this.measurementsCache.forEach((u) => {
			this.itemSizeCache.set(u.key, u.size);
		}));
		let G = this.lanesSettling ? 0 : this.pendingMeasuredCacheIndexes.length > 0 ? Math.min(...this.pendingMeasuredCacheIndexes) : 0;
		this.pendingMeasuredCacheIndexes = [], this.lanesSettling && this.measurementsCache.length === u && (this.lanesSettling = !1);
		let K = this.measurementsCache.slice(0, G), q = Array(U).fill(void 0);
		for (let u = 0; u < G; u++) {
			let R = K[u];
			R && (q[R.lane] = u);
		}
		for (let H = G; H < u; H++) {
			let u = V(H), U = this.laneAssignments.get(H), G, J;
			if (U !== void 0 && this.options.lanes > 1) {
				G = U;
				let u = q[G], V = u === void 0 ? void 0 : K[u];
				J = V ? V.end + this.options.gap : R + B;
			} else {
				let u = this.options.lanes === 1 ? K[H - 1] : this.getFurthestMeasurement(K, H);
				J = u ? u.end + this.options.gap : R + B, G = u ? u.lane : H % this.options.lanes, this.options.lanes > 1 && this.laneAssignments.set(H, G);
			}
			let Y = W.get(u), X = typeof Y == "number" ? Y : this.options.estimateSize(H), Z = J + X;
			K[H] = {
				index: H,
				start: J,
				size: X,
				end: Z,
				key: u,
				lane: G
			}, q[G] = H;
		}
		return this.measurementsCache = K, K;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	calculateRange = memo(() => [
		this.getMeasurements(),
		this.getSize(),
		this.getScrollOffset(),
		this.options.lanes
	], (u, R, B, V) => this.range = u.length > 0 && R > 0 ? calculateRange({
		measurements: u,
		outerSize: R,
		scrollOffset: B,
		lanes: V
	}) : null, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualIndexes = memo(() => {
		let u = null, R = null, B = this.calculateRange();
		return B && (u = B.startIndex, R = B.endIndex), this.maybeNotify.updateDeps([
			this.isScrolling,
			u,
			R
		]), [
			this.options.rangeExtractor,
			this.options.overscan,
			this.options.count,
			u,
			R
		];
	}, (u, R, B, V, H) => V === null || H === null ? [] : u({
		startIndex: V,
		endIndex: H,
		overscan: R,
		count: B
	}), {
		key: !1,
		debug: () => this.options.debug
	});
	indexFromElement = (u) => {
		let R = this.options.indexAttribute, B = u.getAttribute(R);
		return B ? parseInt(B, 10) : (console.warn(`Missing attribute name '${R}={index}' on measured element.`), -1);
	};
	_measureElement = (u, R) => {
		let B = this.indexFromElement(u), V = this.measurementsCache[B];
		if (!V) return;
		let H = V.key, U = this.elementsCache.get(H);
		U !== u && (U && this.observer.unobserve(U), this.observer.observe(u), this.elementsCache.set(H, u)), u.isConnected && this.resizeItem(B, this.options.measureElement(u, R, this));
	};
	resizeItem = (u, R) => {
		let B = this.measurementsCache[u];
		if (!B) return;
		let V = R - (this.itemSizeCache.get(B.key) ?? B.size);
		V !== 0 && ((this.shouldAdjustScrollPositionOnItemSizeChange === void 0 ? B.start < this.getScrollOffset() + this.scrollAdjustments : this.shouldAdjustScrollPositionOnItemSizeChange(B, V, this)) && this._scrollToOffset(this.getScrollOffset(), {
			adjustments: this.scrollAdjustments += V,
			behavior: void 0
		}), this.pendingMeasuredCacheIndexes.push(B.index), this.itemSizeCache = new Map(this.itemSizeCache.set(B.key, R)), this.notify(!1));
	};
	measureElement = (u) => {
		if (!u) {
			this.elementsCache.forEach((u, R) => {
				u.isConnected || (this.observer.unobserve(u), this.elementsCache.delete(R));
			});
			return;
		}
		this._measureElement(u, void 0);
	};
	getVirtualItems = memo(() => [this.getVirtualIndexes(), this.getMeasurements()], (u, R) => {
		let B = [];
		for (let V = 0, H = u.length; V < H; V++) {
			let H = R[u[V]];
			B.push(H);
		}
		return B;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualItemForOffset = (u) => {
		let R = this.getMeasurements();
		if (R.length !== 0) return notUndefined(R[findNearestBinarySearch(0, R.length - 1, (u) => notUndefined(R[u]).start, u)]);
	};
	getOffsetForAlignment = (u, R, B = 0) => {
		let V = this.getSize(), H = this.getScrollOffset();
		R === "auto" && (R = u >= H + V ? "end" : "start"), R === "center" ? u += (B - V) / 2 : R === "end" && (u -= V);
		let U = this.getTotalSize() + this.options.scrollMargin - V;
		return Math.max(Math.min(U, u), 0);
	};
	getOffsetForIndex = (u, R = "auto") => {
		u = Math.max(0, Math.min(u, this.options.count - 1));
		let B = this.measurementsCache[u];
		if (!B) return;
		let V = this.getSize(), H = this.getScrollOffset();
		if (R === "auto") if (B.end >= H + V - this.options.scrollPaddingEnd) R = "end";
		else if (B.start <= H + this.options.scrollPaddingStart) R = "start";
		else return [H, R];
		let U = R === "end" ? B.end + this.options.scrollPaddingEnd : B.start - this.options.scrollPaddingStart;
		return [this.getOffsetForAlignment(U, R, B.size), R];
	};
	isDynamicMode = () => this.elementsCache.size > 0;
	scrollToOffset = (u, { align: R = "start", behavior: B } = {}) => {
		B === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getOffsetForAlignment(u, R), {
			adjustments: void 0,
			behavior: B
		});
	};
	scrollToIndex = (u, { align: R = "auto", behavior: B } = {}) => {
		B === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), u = Math.max(0, Math.min(u, this.options.count - 1));
		let V = 0, H = (R) => {
			if (!this.targetWindow) return;
			let V = this.getOffsetForIndex(u, R);
			if (!V) {
				console.warn("Failed to get offset for index:", u);
				return;
			}
			let [H, W] = V;
			this._scrollToOffset(H, {
				adjustments: void 0,
				behavior: B
			}), this.targetWindow.requestAnimationFrame(() => {
				let R = this.getScrollOffset(), B = this.getOffsetForIndex(u, W);
				if (!B) {
					console.warn("Failed to get offset for index:", u);
					return;
				}
				approxEqual(B[0], R) || U(W);
			});
		}, U = (R) => {
			this.targetWindow && (V++, V < 10 ? this.targetWindow.requestAnimationFrame(() => H(R)) : console.warn(`Failed to scroll to index ${u} after 10 attempts.`));
		};
		H(R);
	};
	scrollBy = (u, { behavior: R } = {}) => {
		R === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getScrollOffset() + u, {
			adjustments: void 0,
			behavior: R
		});
	};
	getTotalSize = () => {
		let u = this.getMeasurements(), R;
		if (u.length === 0) R = this.options.paddingStart;
		else if (this.options.lanes === 1) R = u[u.length - 1]?.end ?? 0;
		else {
			let B = Array(this.options.lanes).fill(null), V = u.length - 1;
			for (; V >= 0 && B.some((u) => u === null);) {
				let R = u[V];
				B[R.lane] === null && (B[R.lane] = R.end), V--;
			}
			R = Math.max(...B.filter((u) => u !== null));
		}
		return Math.max(R - this.options.scrollMargin + this.options.paddingEnd, 0);
	};
	_scrollToOffset = (u, { adjustments: R, behavior: B }) => {
		this.options.scrollToFn(u, {
			behavior: B,
			adjustments: R
		}, this);
	};
	measure = () => {
		this.itemSizeCache = /* @__PURE__ */ new Map(), this.laneAssignments = /* @__PURE__ */ new Map(), this.notify(!1);
	};
}, findNearestBinarySearch = (u, R, B, V) => {
	for (; u <= R;) {
		let H = (u + R) / 2 | 0, U = B(H);
		if (U < V) u = H + 1;
		else if (U > V) R = H - 1;
		else return H;
	}
	return u > 0 ? u - 1 : 0;
};
function calculateRange({ measurements: u, outerSize: R, scrollOffset: B, lanes: V }) {
	let H = u.length - 1, U = (R) => u[R].start;
	if (u.length <= V) return {
		startIndex: 0,
		endIndex: H
	};
	let W = findNearestBinarySearch(0, H, U, B), G = W;
	if (V === 1) for (; G < H && u[G].end < B + R;) G++;
	else if (V > 1) {
		let U = Array(V).fill(0);
		for (; G < H && U.some((u) => u < B + R);) {
			let R = u[G];
			U[R.lane] = R.end, G++;
		}
		let K = Array(V).fill(B + R);
		for (; W >= 0 && K.some((u) => u >= B);) {
			let R = u[W];
			K[R.lane] = R.start, W--;
		}
		W = Math.max(0, W - W % V), G = Math.min(H, G + (V - 1 - G % V));
	}
	return {
		startIndex: W,
		endIndex: G
	};
}
var ChangeTrackerError = class extends Data.TaggedError("ChangeTrackerError") {}, ValidationError = class extends Data.TaggedError("ValidationError") {}, CellEditorError = class extends Data.TaggedError("CellEditorError") {}, VimCommandTrackerError = class extends Data.TaggedError("VimCommandTrackerError") {}, CommandLineError = class extends Data.TaggedError("CommandLineError") {};
const RowIdSchema = z.string().min(1, "Row ID must not be empty"), FieldSchema = z.string().refine((u) => u === "key" || u === "context" || u.startsWith("values."), { message: "Field must be 'key', 'context', or start with 'values.'" }), LangSchema = z.string().min(1, "Language code must not be empty");
z.string().regex(/^.+-.+$/, "Change key must be in format 'rowId-field'");
function validateWithEffect(u, B, H) {
	return Effect.try({
		try: () => u.parse(B),
		catch: (u) => u instanceof z.ZodError ? new ValidationError({
			message: H || "Validation failed",
			issues: u.issues.map((u) => ({
				path: u.path.map(String),
				message: u.message
			}))
		}) : new ValidationError({
			message: H || "Validation failed",
			issues: [{
				path: [],
				message: String(u)
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
	setLevel(u) {
		this.level = u;
	}
	getLevel() {
		return this.level;
	}
	debug(...u) {
		this.level <= LogLevel.DEBUG && console.log("[DEBUG]", ...u);
	}
	info(...u) {
		this.level <= LogLevel.INFO && console.log("[INFO]", ...u);
	}
	warn(...u) {
		this.level <= LogLevel.WARN && console.warn("[WARN]", ...u);
	}
	error(...u) {
		this.level <= LogLevel.ERROR && console.error("[ERROR]", ...u);
	}
}();
var ChangeTracker = class {
	config;
	changes = /* @__PURE__ */ new Map();
	originalData = /* @__PURE__ */ new Map();
	constructor(u = defaultConfig) {
		this.config = {
			...defaultConfig,
			...u
		};
	}
	initializeOriginalData(u, B) {
		if (this.config.enableValidation) {
			for (let u of B) {
				let B = validateWithEffect(LangSchema, u, `Invalid language code: ${u}`);
				Effect.runSync(Effect.match(B, {
					onFailure: (u) => {
						throw logger.error("ChangeTracker: Invalid language code", u), u;
					},
					onSuccess: () => {}
				}));
			}
			for (let B of u) {
				let u = validateWithEffect(RowIdSchema, B.id, `Invalid row ID: ${B.id}`);
				if (Effect.runSync(Effect.match(u, {
					onFailure: (u) => {
						throw logger.error("ChangeTracker: Invalid row ID", u), u;
					},
					onSuccess: () => {}
				})), typeof B.key != "string" || B.key.length === 0) {
					let u = new ChangeTrackerError({
						message: `Invalid key for translation ${B.id}`,
						code: "INVALID_CHANGE_DATA"
					});
					Effect.runSync(Effect.match(Effect.fail(u), {
						onFailure: (u) => {
							throw logger.error("ChangeTracker: Invalid translation key", u), u;
						},
						onSuccess: () => {}
					}));
				}
			}
		}
		this.originalData.clear(), this.changes.clear(), u.forEach((u) => {
			let R = /* @__PURE__ */ new Map();
			R.set("key", u.key), R.set("context", u.context || ""), B.forEach((B) => {
				R.set(`values.${B}`, u.values[B] || "");
			}), this.originalData.set(u.id, R);
		});
	}
	getOriginalValueEffect(u, V) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, u, "Invalid row ID"), (u) => Effect.flatMap(validateWithEffect(FieldSchema, V, "Invalid field"), (V) => {
			let H = this.originalData.get(u);
			if (!H) return Effect.fail(new ChangeTrackerError({
				message: `Original data not found for row ID: ${u}`,
				code: "ORIGINAL_DATA_NOT_FOUND"
			}));
			let U = H.get(V);
			return Effect.succeed(Option.fromNullable(U));
		}));
	}
	getOriginalValue(u, V) {
		if (!this.config.enableValidation) return this.originalData.get(u)?.get(V) ?? "";
		let H = this.getOriginalValueEffect(u, V);
		return Effect.runSync(Effect.match(H, {
			onFailure: () => "",
			onSuccess: (u) => Option.getOrElse(u, () => "")
		}));
	}
	trackChangeEffect(u, B, V, H, U, W) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, u, "Invalid row ID"), (u) => Effect.flatMap(validateWithEffect(FieldSchema, B, "Invalid field"), (B) => Effect.flatMap(validateWithEffect(LangSchema, V, "Invalid language code"), (V) => {
			if (typeof W != "string" || W.length === 0) return Effect.fail(new ChangeTrackerError({
				message: "Key must be a non-empty string",
				code: "INVALID_CHANGE_DATA"
			}));
			let G = `${u}-${B}`;
			if (H === U) return this.changes.delete(G), Effect.void;
			let K = {
				id: u,
				key: W,
				lang: V,
				oldValue: H,
				newValue: U
			};
			return this.changes.set(G, K), Effect.void;
		})));
	}
	trackChange(u, B, V, H, U, W, G) {
		if (!this.config.enableValidation) {
			let R = `${u}-${B}`;
			if (H === U) {
				this.changes.delete(R), G && G(u, B, !1);
				return;
			}
			let K = {
				id: u,
				key: W,
				lang: V,
				oldValue: H,
				newValue: U
			};
			this.changes.set(R, K), G && G(u, B, !0);
			return;
		}
		let K = this.trackChangeEffect(u, B, V, H, U, W);
		Effect.runSync(Effect.match(K, {
			onFailure: (u) => {
				logger.warn("ChangeTracker: Failed to track change", u);
			},
			onSuccess: () => {
				G && G(u, B, H !== U);
			}
		}));
	}
	hasChangeEffect(u, B) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, u, "Invalid row ID"), (u) => Effect.flatMap(validateWithEffect(FieldSchema, B, "Invalid field"), (B) => {
			let V = `${u}-${B}`;
			return Effect.succeed(this.changes.has(V));
		}));
	}
	hasChange(u, B) {
		if (!this.config.enableValidation) {
			let R = `${u}-${B}`;
			return this.changes.has(R);
		}
		let V = this.hasChangeEffect(u, B);
		return Effect.runSync(Effect.match(V, {
			onFailure: () => !1,
			onSuccess: (u) => u
		}));
	}
	getChanges() {
		return Array.from(this.changes.values());
	}
	clearChanges(u) {
		u && this.changes.forEach((R, B) => {
			let V = R.id;
			u(V, B.slice(V.length + 1), !1);
		}), this.changes.clear();
	}
	getChangesMap() {
		return this.changes;
	}
}, UndoRedoManager = class {
	history = [];
	currentIndex = -1;
	maxHistorySize = 100;
	push(u) {
		this.history = this.history.slice(0, this.currentIndex + 1), this.history.push(u), this.currentIndex++, this.history.length > this.maxHistorySize && (this.history.shift(), this.currentIndex--);
	}
	canUndo() {
		return this.currentIndex >= 0;
	}
	canRedo() {
		return this.currentIndex < this.history.length - 1;
	}
	undo() {
		if (!this.canUndo()) return null;
		let u = this.history[this.currentIndex];
		return this.currentIndex--, {
			type: u.type,
			rowId: u.rowId,
			columnId: u.columnId,
			oldValue: u.newValue,
			newValue: u.oldValue
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
		this.modifierKeyDownHandler || this.modifierKeyUpHandler || (this.modifierKeyDownHandler = (u) => {
			(u.key === "Meta" || u.key === "MetaLeft" || u.key === "MetaRight") && (this.metaKeyPressed = !0), (u.key === "Control" || u.key === "ControlLeft" || u.key === "ControlRight") && (this.ctrlKeyPressed = !0);
		}, this.modifierKeyUpHandler = (u) => {
			(u.key === "Meta" || u.key === "MetaLeft" || u.key === "MetaRight") && (this.metaKeyPressed = !1), (u.key === "Control" || u.key === "ControlLeft" || u.key === "ControlRight") && (this.ctrlKeyPressed = !1);
		}, window.addEventListener("keydown", this.modifierKeyDownHandler, !0), window.addEventListener("keyup", this.modifierKeyUpHandler, !0));
	}
	detach() {
		this.modifierKeyDownHandler &&= (window.removeEventListener("keydown", this.modifierKeyDownHandler, !0), null), this.modifierKeyUpHandler &&= (window.removeEventListener("keyup", this.modifierKeyUpHandler, !0), null);
	}
	isModifierPressed(u) {
		return navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? this.metaKeyPressed || u.metaKey || this.ctrlKeyPressed || u.ctrlKey : this.ctrlKeyPressed || u.ctrlKey || this.metaKeyPressed || u.metaKey;
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
	focusCell(u, R) {
		this.focusedCell = {
			rowIndex: u,
			columnId: R
		};
	}
	blur() {
		this.focusedCell = null;
	}
	hasFocus() {
		return this.focusedCell !== null;
	}
};
function toMutableTranslation(u) {
	return {
		id: u.id,
		key: u.key,
		context: u.context,
		values: { ...u.values },
		createdAt: u.createdAt,
		updatedAt: u.updatedAt,
		updatedBy: u.updatedBy
	};
}
function getLangFromColumnId(u) {
	return u === "key" ? "key" : u === "context" ? "context" : u.startsWith("values.") ? u.replace("values.", "") : u;
}
function getTranslationKey(u, R, B, V) {
	return B === "key" ? V : u.find((u) => u.id === R)?.key || "";
}
function checkKeyDuplicate(u, R, B) {
	return u.some((u) => u.id !== R && u.key.trim() === B.trim());
}
var CellEditor = class {
	editingCell = null;
	isEscapeKeyPressed = !1;
	isFinishingEdit = !1;
	translations;
	changeTracker;
	undoRedoManager;
	callbacks;
	constructor(u, R, B, V = {}) {
		this.translations = u, this.changeTracker = R, this.undoRedoManager = B, this.callbacks = V;
	}
	getEditingCell() {
		return this.editingCell;
	}
	isEditing() {
		return this.editingCell !== null;
	}
	startEditingEffect(u, B, V, H) {
		this.editingCell && this.stopEditing();
		let U = H.querySelector(".virtual-grid-cell-content");
		if (!U) return Effect.fail(new CellEditorError({
			message: "Cell content not found",
			code: "TRANSLATION_NOT_FOUND"
		}));
		let W = U.textContent || "", G = this.createEditInput(W);
		H.innerHTML = "", H.appendChild(G), requestAnimationFrame(() => {
			G.focus(), G.select();
		}), this.editingCell = {
			rowIndex: u,
			columnId: B,
			rowId: V
		}, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!0);
		let K = !1;
		if (B === "key") {
			let u = () => {
				let u = G.value.trim();
				K = !1, H.classList.remove("cell-duplicate-key"), u && checkKeyDuplicate(this.translations, V, u) && (K = !0, H.classList.add("cell-duplicate-key"));
			};
			G.addEventListener("input", u), u();
		}
		return this.attachInputListeners(G, H, (u) => {
			if (this.isFinishingEdit) return;
			this.isFinishingEdit = !0, u && B === "key" && K && (u = !1), u && G.value !== W && this.applyCellChange(V, B, W, G.value).catch((u) => {
				logger.error("Failed to apply cell change:", u);
			});
			let R = u ? G.value : W;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(H, V, B, R), this.editingCell = null, this.isFinishingEdit = !1, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!1);
		}, u, B, W, V), Effect.void;
	}
	startEditing(u, R, B, V) {
		this.editingCell && this.stopEditing();
		let H = V.querySelector(".virtual-grid-cell-content");
		if (!H) return;
		let U = H.textContent || "", W = this.createEditInput(U);
		V.innerHTML = "", V.appendChild(W), requestAnimationFrame(() => {
			W.focus(), W.select();
		}), this.editingCell = {
			rowIndex: u,
			columnId: R,
			rowId: B
		}, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!0);
		let G = !1;
		if (R === "key") {
			let u = () => {
				let u = W.value.trim();
				G = !1, V.classList.remove("cell-duplicate-key"), u && checkKeyDuplicate(this.translations, B, u) && (G = !0, V.classList.add("cell-duplicate-key"));
			};
			W.addEventListener("input", u), u();
		}
		this.attachInputListeners(W, V, (u) => {
			if (this.isFinishingEdit) return;
			this.isFinishingEdit = !0, u && R === "key" && G && (u = !1), u && W.value !== U && this.applyCellChange(B, R, U, W.value).catch((u) => {
				logger.error("Failed to apply cell change:", u);
			});
			let H = u ? W.value : U;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(V, B, R, H), this.editingCell = null, this.isFinishingEdit = !1, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!1);
		}, u, R, U, B);
	}
	attachInputListeners(u, R, B, V, H, U, W) {
		u.addEventListener("blur", () => {
			this.isFinishingEdit || (this.isEscapeKeyPressed ? (B(!1), this.isEscapeKeyPressed = !1) : B(!0));
		}), u.addEventListener("beforeinput", (u) => {
			(u.inputType === "historyUndo" || u.inputType === "historyRedo") && (u.preventDefault(), B(!0));
		}), u.addEventListener("keydown", (R) => {
			if (R.key === "Enter") {
				R.preventDefault(), R.stopPropagation();
				let U = R.shiftKey ? "up" : "down";
				B(!0), u.blur(), H.startsWith("values.") && this.callbacks.onEditFinished && requestAnimationFrame(() => {
					this.callbacks.onEditFinished && this.callbacks.onEditFinished(V, H, U);
				});
			} else R.key === "Escape" ? (R.preventDefault(), R.stopPropagation(), this.isEscapeKeyPressed = !0, u.blur()) : R.key === "Tab" && (R.preventDefault(), R.stopPropagation(), B(!0), u.blur());
		});
	}
	applyCellChangeEffect(u, B, V, H) {
		let U = this.translations.find((R) => R.id === u);
		if (!U) return Effect.fail(new CellEditorError({
			message: `Translation not found: ${u}`,
			code: "TRANSLATION_NOT_FOUND"
		}));
		let W = toMutableTranslation(U);
		if (B === "key") W.key = H;
		else if (B === "context") W.context = H;
		else if (B.startsWith("values.")) {
			let u = B.replace("values.", "");
			W.values[u] = H;
		} else return Effect.fail(new CellEditorError({
			message: `Invalid column ID: ${B}`,
			code: "INVALID_COLUMN_ID"
		}));
		this.undoRedoManager.push({
			type: "cell-change",
			rowId: u,
			columnId: B,
			oldValue: V,
			newValue: H
		});
		let G = this.changeTracker.getOriginalValue(u, B), K = getLangFromColumnId(B), q = getTranslationKey(this.translations, u, B, H);
		return this.changeTracker.trackChange(u, B, K, G, H, q, () => {
			this.callbacks.updateCellStyle && this.callbacks.updateCellStyle(u, B);
		}), this.callbacks.onCellChange && this.callbacks.onCellChange(u, B, H), Effect.void;
	}
	async applyCellChange(u, B, V, H) {
		let U = this.applyCellChangeEffect(u, B, V, H);
		return Effect.runPromise(U);
	}
	stopEditingEffect(u) {
		return this.editingCell && this.stopEditing(u), Effect.void;
	}
	stopEditing(u) {
		if (!this.editingCell || !u) {
			this.editingCell = null;
			return;
		}
		let R = u.querySelector(`[data-row-index="${this.editingCell.rowIndex}"]`);
		if (R) {
			let u = R.querySelector(`[data-column-id="${this.editingCell.columnId}"]`);
			if (u) {
				let R = u.querySelector("input");
				if (R) {
					let B = u.getAttribute("data-row-id"), V = this.editingCell.columnId, H = R.value;
					this.isFinishingEdit = !0, this.callbacks.updateCellContent && B && this.callbacks.updateCellContent(u, B, V, H), this.isFinishingEdit = !1;
				}
			}
		}
		this.editingCell = null;
	}
	createEditInput(u) {
		let R = document.createElement("input");
		return R.type = "text", R.value = u, R.className = "virtual-grid-cell-input", R.style.width = "100%", R.style.height = "100%", R.style.border = "2px solid #3b82f6", R.style.outline = "none", R.style.padding = "4px 8px", R.style.fontSize = "14px", R.style.fontFamily = "inherit", R.style.backgroundColor = "#fff", R;
	}
	setEscapeKeyPressed(u) {
		this.isEscapeKeyPressed = u;
	}
}, KeyboardHandler = class {
	keyboardHandler = null;
	modifierKeyTracker;
	focusManager;
	callbacks;
	constructor(u, R, B = {}) {
		this.modifierKeyTracker = u, this.focusManager = R, this.callbacks = B;
	}
	attach() {
		this.keyboardHandler || (this.keyboardHandler = (u) => {
			let R = this.modifierKeyTracker.isModifierPressed(u), B = u.target, V = B.tagName === "INPUT" || B.tagName === "TEXTAREA" || B.isContentEditable, H = (u.key === "z" || u.key === "Z" || u.code === "KeyZ") && !u.shiftKey;
			if (R && H) {
				u.preventDefault(), u.stopPropagation(), this.callbacks.onUndo && this.callbacks.onUndo();
				return;
			}
			let U = u.key === "y" || u.key === "Y" || u.code === "KeyY" || (u.key === "z" || u.key === "Z" || u.code === "KeyZ") && u.shiftKey;
			if (R && U) {
				u.preventDefault(), u.stopPropagation(), this.callbacks.onRedo && this.callbacks.onRedo();
				return;
			}
			if (R && (u.key === "k" || u.code === "KeyK")) {
				u.preventDefault(), u.stopPropagation(), this.callbacks.onOpenCommandPalette && this.callbacks.onOpenCommandPalette("excel");
				return;
			}
			if (R && (u.key === "f" || u.code === "KeyF") && !V) {
				u.preventDefault(), u.stopPropagation(), this.callbacks.onOpenFind && this.callbacks.onOpenFind();
				return;
			}
			if (R && (u.key === "h" || u.code === "KeyH") && !V) {
				u.preventDefault(), u.stopPropagation(), this.callbacks.onOpenReplace && this.callbacks.onOpenReplace();
				return;
			}
			if ((u.key === "/" || u.code === "Slash") && !V && (!this.callbacks.isQuickSearchMode || !this.callbacks.isQuickSearchMode())) {
				u.preventDefault(), u.stopPropagation(), this.callbacks.onOpenQuickSearch && this.callbacks.onOpenQuickSearch();
				return;
			}
			if (this.callbacks.isQuickSearchMode && this.callbacks.isQuickSearchMode() && !V) {
				if (u.key === "n" && !u.shiftKey) {
					u.preventDefault(), u.stopPropagation(), this.callbacks.onQuickSearchNext && this.callbacks.onQuickSearchNext();
					return;
				}
				if (u.key === "N" || u.key === "n" && u.shiftKey) {
					u.preventDefault(), u.stopPropagation(), this.callbacks.onQuickSearchPrev && this.callbacks.onQuickSearchPrev();
					return;
				}
			}
			if (u.key === "F2" || u.code === "F2") {
				if (this.focusManager.hasFocus() && !V) {
					u.preventDefault(), u.stopPropagation();
					let R = this.focusManager.getFocusedCell();
					if (R && this.callbacks.onStartEditing) {
						if (this.callbacks.isEditableColumn && !this.callbacks.isEditableColumn(R.columnId) || this.callbacks.isReadOnly && this.callbacks.isReadOnly()) return;
						this.callbacks.onStartEditing(R.rowIndex, R.columnId);
					}
				}
				return;
			}
			if (u.key === "Enter" && this.focusManager.hasFocus() && !V && (!this.callbacks.isQuickSearchMode || !this.callbacks.isQuickSearchMode())) {
				let R = this.focusManager.getFocusedCell();
				if (R) {
					let B = R.columnId.startsWith("values.");
					if (u.shiftKey) {
						if (!B) return;
					} else if (!B) {
						if (this.callbacks.isEditableColumn && !this.callbacks.isEditableColumn(R.columnId) || this.callbacks.isReadOnly && this.callbacks.isReadOnly()) return;
						if (this.callbacks.onStartEditing) {
							u.preventDefault(), u.stopPropagation(), this.callbacks.onStartEditing(R.rowIndex, R.columnId);
							return;
						}
					}
				}
			}
			this.focusManager.hasFocus() && !V && this.handleKeyboardNavigation(u);
		}, document.addEventListener("keydown", this.keyboardHandler, !0));
	}
	detach() {
		this.keyboardHandler &&= (document.removeEventListener("keydown", this.keyboardHandler, !0), null);
	}
	handleKeyboardNavigation(u) {
		let R = this.focusManager.getFocusedCell();
		if (!R || !this.callbacks.getAllColumns || !this.callbacks.focusCell) return;
		let { rowIndex: B, columnId: V } = R, H = this.callbacks.getAllColumns(), U = this.callbacks.getMaxRowIndex ? this.callbacks.getMaxRowIndex() : Infinity, W = H.indexOf(V);
		if (W < 0) return;
		let G = B, K = W;
		if (u.key === "Tab" && (u.preventDefault(), u.stopPropagation(), u.shiftKey ? W > 0 ? K = W - 1 : B > 0 ? (G = B - 1, K = H.length - 1) : (G = U, K = H.length - 1) : W < H.length - 1 ? K = W + 1 : B < U ? (G = B + 1, K = 0) : (G = 0, K = 0)), u.key === "Enter" && V.startsWith("values.")) if (u.preventDefault(), u.stopPropagation(), u.shiftKey) if (B > 0) G = B - 1;
		else return;
		else if (B < U) G = B + 1;
		else return;
		u.key.startsWith("Arrow") && (u.preventDefault(), u.stopPropagation(), u.key === "ArrowRight" && W < H.length - 1 ? K = W + 1 : u.key === "ArrowLeft" && W > 0 ? K = W - 1 : u.key === "ArrowDown" && B < U ? G = B + 1 : u.key === "ArrowUp" && B > 0 && (G = B - 1));
		let q = H[K];
		q && (this.focusManager.focusCell(G, q), this.callbacks.focusCell(G, q), this.callbacks.onNavigate && this.callbacks.onNavigate(G, q));
	}
	updateCallbacks(u) {
		this.callbacks = {
			...this.callbacks,
			...u
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
	constructor(u) {
		this.options = u;
	}
	addResizeHandle(u, R) {
		let B = document.createElement("div");
		B.className = "column-resize-handle", B.setAttribute("data-column-id", R), B.style.position = "absolute", B.style.right = "-2px", B.style.top = "0", B.style.bottom = "0", B.style.width = "4px", B.style.cursor = "col-resize", B.style.zIndex = "25", B.style.backgroundColor = "transparent", B.addEventListener("mousedown", (B) => {
			B.preventDefault(), B.stopPropagation(), this.startResize(R, B.clientX, u);
		}), u.appendChild(B);
	}
	startResize(u, R, B) {
		this.isResizing = !0, this.resizeStartX = R, this.resizeStartWidth = B.offsetWidth || B.getBoundingClientRect().width, this.resizeColumnId = u, this.options.callbacks.onResizeStart && this.options.callbacks.onResizeStart(u), this.resizeHandler = (u) => {
			!this.isResizing || !this.resizeColumnId || (u.preventDefault(), this.handleResize(u.clientX));
		}, this.resizeEndHandler = (u) => {
			this.isResizing && (u.preventDefault(), this.endResize());
		}, document.addEventListener("mousemove", this.resizeHandler, !0), document.addEventListener("mouseup", this.resizeEndHandler, !0), document.body.style.cursor = "col-resize", document.body.style.userSelect = "none";
	}
	handleResize(u) {
		if (!this.resizeColumnId) return;
		let R = u - this.resizeStartX, B = this.options.columnMinWidths.get(this.resizeColumnId) || 80, V = Math.max(B, this.resizeStartWidth + R), H = `values.${this.options.languages[this.options.languages.length - 1]}`;
		this.resizeColumnId !== H && this.options.columnWidths.set(this.resizeColumnId, V), this.options.callbacks.onResize && this.options.callbacks.onResize(this.resizeColumnId, V);
	}
	endResize() {
		this.resizeHandler &&= (document.removeEventListener("mousemove", this.resizeHandler, !0), null), this.resizeEndHandler &&= (document.removeEventListener("mouseup", this.resizeEndHandler, !0), null), document.body.style.cursor = "", document.body.style.userSelect = "";
		let u = this.resizeColumnId, R = u && this.options.columnWidths.get(u) || this.resizeStartWidth;
		this.isResizing = !1, this.resizeColumnId = null, u && this.options.callbacks.onResizeEnd && this.options.callbacks.onResizeEnd(u, R);
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
	constructor(u) {
		this.options = u, this.defaultKeyWidth = u.defaultKeyWidth ?? 200, this.defaultContextWidth = u.defaultContextWidth ?? 200, this.defaultLangWidth = u.defaultLangWidth ?? 150;
	}
	getColumnWidthValue(u, R) {
		return this.options.columnWidths.get(u) || R || this.getDefaultWidth(u);
	}
	getDefaultWidth(u) {
		return u === "row-number" ? 50 : u === "key" ? this.defaultKeyWidth : u === "context" ? this.defaultContextWidth : this.defaultLangWidth;
	}
	calculateColumnWidths(u) {
		let R = this.getColumnWidthValue("row-number", 50), B = this.getColumnWidthValue("key", this.defaultKeyWidth), V = this.getColumnWidthValue("context", this.defaultContextWidth), H = this.options.languages.map((u) => this.getColumnWidthValue(`values.${u}`, this.defaultLangWidth)), U = R + B + V + H.slice(0, -1).reduce((u, R) => u + R, 0), W = this.options.languages[this.options.languages.length - 1], G = this.options.columnMinWidths.get(`values.${W}`) || 80, K = Math.max(G, u - U);
		return {
			rowNumber: R,
			key: B,
			context: V,
			languages: [...H.slice(0, -1), K]
		};
	}
	applyColumnWidth(u, R, B) {
		let V = `values.${this.options.languages[this.options.languages.length - 1]}`;
		u !== V && this.options.columnWidths.set(u, R);
		let H = this.getColumnWidthValue("row-number", 50), U = u === "key" ? R : this.getColumnWidthValue("key", this.defaultKeyWidth), W = u === "context" ? R : this.getColumnWidthValue("context", this.defaultContextWidth), G = this.options.languages.slice(0, -1).map((B) => {
			let V = `values.${B}`;
			return u === V ? R : this.getColumnWidthValue(V, this.defaultLangWidth);
		}), K = H + U + W + G.reduce((u, R) => u + R, 0), q = this.options.columnMinWidths.get(V) || 80, J = Math.max(q, B - K);
		return {
			columnWidths: {
				rowNumber: H,
				key: U,
				context: W,
				languages: [...G, J]
			},
			totalWidth: B
		};
	}
}, GridRenderer = class {
	options;
	constructor(u) {
		this.options = u;
	}
	createHeaderCell(u, R, B, V, H) {
		let U = document.createElement("div");
		return U.className = "virtual-grid-header-cell", U.setAttribute("role", "columnheader"), U.textContent = u, H && U.setAttribute("data-column-id", H), U.style.width = `${R}px`, U.style.minWidth = `${R}px`, U.style.maxWidth = `${R}px`, (B > 0 || V > 0) && (U.style.position = "sticky", U.style.left = `${B}px`, U.style.zIndex = V.toString(), U.style.backgroundColor = "#f8fafc"), U.style.overflow = "visible", U;
	}
	createRow(u, R, B) {
		let V = document.createElement("div");
		V.className = "virtual-grid-row", V.setAttribute("role", "row"), V.setAttribute("data-row-index", R.toString()), V.setAttribute("data-row-id", u.id);
		let H = this.createCell(u.id, "row-number", (R + 1).toString(), R, !1, B.rowNumber, 0, 15);
		H.classList.add("row-number-cell"), V.appendChild(H);
		let U = this.createCell(u.id, "key", u.key, R, !this.options.readOnly, B.key, B.rowNumber, 10);
		V.appendChild(U);
		let W = this.createCell(u.id, "context", u.context || "", R, !this.options.readOnly, B.context, B.rowNumber + B.key, 10);
		return V.appendChild(W), this.options.languages.forEach((H, U) => {
			let W = u.values[H] || "", G = B.languages[U], K = B.rowNumber + B.key + B.context, q = this.createCell(u.id, `values.${H}`, W, R, !this.options.readOnly, G, K, 0);
			V.appendChild(q);
		}), V;
	}
	createCell(u, R, B, V, H, U, W, G) {
		let K = document.createElement("div");
		K.className = "virtual-grid-cell", K.setAttribute("role", "gridcell"), K.setAttribute("data-row-id", u), K.setAttribute("data-column-id", R), K.setAttribute("data-row-index", V.toString()), K.setAttribute("tabindex", H ? "0" : "-1"), K.style.width = `${U}px`, K.style.minWidth = `${U}px`, K.style.maxWidth = `${U}px`, (W > 0 || G > 0) && (K.style.position = "sticky", K.style.left = `${W}px`, K.style.zIndex = G.toString(), K.style.backgroundColor = "#fafafa");
		let q = document.createElement("div");
		return q.className = "virtual-grid-cell-content", q.textContent = B, K.appendChild(q), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(u, R, K), H && !this.options.readOnly && (K.addEventListener("dblclick", (u) => {
			u.preventDefault(), u.stopPropagation(), this.options.callbacks.onCellDblClick && this.options.callbacks.onCellDblClick(V, R, K);
		}), K.addEventListener("focus", () => {
			this.options.callbacks.onCellFocus && this.options.callbacks.onCellFocus(V, R), K.classList.add("focused");
		}), K.addEventListener("blur", () => {
			K.classList.remove("focused");
		})), K;
	}
	updateCellContent(u, R, B, V, H) {
		let U = u.querySelector(".virtual-grid-cell-content");
		U ? U.textContent = V : (U = document.createElement("div"), U.className = "virtual-grid-cell-content", U.textContent = V, u.appendChild(U)), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(R, B, u);
	}
}, CommandRegistry = class {
	commands = /* @__PURE__ */ new Map();
	usageCounts = /* @__PURE__ */ new Map();
	storageKey = "command-palette-usage";
	callbacks;
	constructor(u = {}) {
		this.callbacks = u, this.loadUsageCounts();
	}
	registerCommand(u) {
		let R = {
			...u,
			usageCount: u.usageCount ?? 0,
			availableInModes: u.availableInModes ?? ["all"]
		};
		this.commands.set(u.id, R), this.applySavedUsageCount(u.id);
	}
	getCommandById(u) {
		return this.commands.get(u);
	}
	getCommands(u) {
		let R = Array.from(this.commands.values());
		return !u || u === "all" ? R : R.filter((R) => {
			let B = R.availableInModes ?? ["all"];
			return B.includes("all") || B.includes(u);
		});
	}
	incrementUsage(u) {
		let R = (this.usageCounts.get(u) ?? 0) + 1;
		this.usageCounts.set(u, R);
		let B = this.commands.get(u);
		B && (B.usageCount = R), this.saveUsageCounts(), this.callbacks.onCommandExecuted && this.callbacks.onCommandExecuted(u);
	}
	getPopularCommands(u = 10, R) {
		return this.getCommands(R).sort((u, R) => {
			let B = this.usageCounts.get(u.id) ?? 0;
			return (this.usageCounts.get(R.id) ?? 0) - B;
		}).slice(0, u);
	}
	loadUsageCounts() {
		try {
			let u = localStorage.getItem(this.storageKey);
			if (u) {
				let R = JSON.parse(u);
				this.usageCounts = new Map(Object.entries(R));
			}
		} catch (u) {
			logger.warn("Failed to load command usage counts:", u);
		}
	}
	applySavedUsageCount(u) {
		let R = this.usageCounts.get(u);
		if (R !== void 0) {
			let B = this.commands.get(u);
			B && (B.usageCount = R);
		}
	}
	saveUsageCounts() {
		try {
			let u = Object.fromEntries(this.usageCounts);
			localStorage.setItem(this.storageKey, JSON.stringify(u));
		} catch (u) {
			logger.warn("Failed to save command usage counts:", u);
		}
	}
	clear() {
		this.commands.clear(), this.usageCounts.clear(), localStorage.removeItem(this.storageKey);
	}
};
function searchCommands(u, R) {
	if (!u.trim()) return R.map((u) => ({
		command: u,
		score: 1,
		matchedIndices: []
	}));
	let B = new Fuse(R, {
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
	}).search(u).map((u) => {
		let R = u.score === void 0 ? 0 : 1 - u.score, B = [];
		if (u.matches) {
			for (let R of u.matches) if (R.indices) for (let [u, V] of R.indices) for (let R = u; R <= V; R++) B.push(R);
		}
		return {
			command: u.item,
			score: R,
			matchedIndices: Array.from(new Set(B)).sort((u, R) => u - R)
		};
	});
	return B.sort((u, R) => {
		if (Math.abs(u.score - R.score) < .01) {
			let B = u.command.usageCount ?? 0;
			return (R.command.usageCount ?? 0) - B;
		}
		return R.score - u.score;
	}), B;
}
function parseFuzzyFindInput(u) {
	let R = u.trim();
	if (!R.startsWith("goto ") && !R.startsWith("go to ")) return {
		isFuzzyFindMode: !1,
		fuzzyFindQuery: "",
		quoteChar: null
	};
	let B = R.startsWith("goto ") ? R.slice(5) : R.slice(6), V = null;
	if (B.startsWith("\"")) V = "\"";
	else if (B.startsWith("'")) V = "'";
	else return {
		isFuzzyFindMode: !1,
		fuzzyFindQuery: "",
		quoteChar: null
	};
	let H = B.slice(1), U = H;
	return H.endsWith(V) && (U = H.slice(0, -1)), {
		isFuzzyFindMode: !0,
		fuzzyFindQuery: U,
		quoteChar: V
	};
}
function updateInputStyling(u, R, B) {
	let V = u.parentElement?.querySelector(".command-palette-input-overlay");
	if (V && V.remove(), !B.isFuzzyFindMode || !B.quoteChar) return null;
	let H = document.createElement("div");
	H.className = "command-palette-input-overlay", H.style.cssText = "\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    pointer-events: none;\n    padding: 12px 16px;\n    font-size: 16px;\n    font-family: system-ui, -apple-system, sans-serif;\n    white-space: pre;\n    overflow: hidden;\n    box-sizing: border-box;\n    line-height: 1.5;\n    border: none;\n    background: transparent;\n  ";
	let U = R.indexOf(B.quoteChar), W = R.substring(0, U + 1), G = B.fuzzyFindQuery, K = document.createTextNode(W), q = document.createElement("span");
	if (q.style.cssText = "color: #1e293b;", q.appendChild(K), H.appendChild(q), G) {
		let u = document.createElement("span");
		u.style.cssText = "\n      font-weight: bold;\n      font-style: italic;\n      color: #1e293b;\n    ", u.textContent = G, H.appendChild(u);
	}
	return u.parentElement && u.parentElement.appendChild(H), H;
}
function createFuzzyFindList(u, R, B, V, H) {
	if (u.innerHTML = "", !R || R.trim() === "") {
		let R = document.createElement("div");
		R.className = "command-palette-item command-palette-item-empty", R.textContent = "Type to search...", u.appendChild(R);
		return;
	}
	if (B.length === 0) {
		let R = document.createElement("div");
		R.className = "command-palette-item command-palette-item-empty", R.textContent = "No matches found", u.appendChild(R);
		return;
	}
	let U = document.createElement("div");
	U.className = "command-palette-item command-palette-item-empty", U.textContent = `Search Results (${B.length})`, u.appendChild(U), B.forEach((R, B) => {
		let U = document.createElement("div");
		U.className = "command-palette-item", U.setAttribute("role", "option"), U.setAttribute("aria-selected", (B === V).toString()), B === V && U.classList.add("command-palette-item-selected");
		let W = document.createElement("div");
		W.className = "command-palette-item-label";
		let G = R.translation, K = "";
		if (R.matchedFields && R.matchedFields.length > 0) {
			let u = R.matchedFields[0];
			if (u.field === "key") K = `Key: ${G.key}`;
			else if (u.field === "context") K = `Context: ${G.context || ""}`;
			else if (u.field.startsWith("values.")) {
				let R = u.field.replace("values.", "");
				K = `${R.toUpperCase()}: ${G.values?.[R] || ""}`;
			} else K = G.key || "";
		} else K = G.key || "";
		W.textContent = K;
		let q = document.createElement("div");
		q.className = "command-palette-item-description", q.textContent = `Row ${R.rowIndex + 1}`, U.appendChild(q), U.appendChild(W), U.addEventListener("click", () => {
			H(B);
		}), u.appendChild(U);
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
	constructor(u, R = {}) {
		this.commandRegistry = u, this.callbacks = R;
	}
	open(u = "excel") {
		this.isOpen || (this.currentMode = u, this.isOpen = !0, this.query = "", this.selectedIndex = 0, this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.fuzzyFindResults = [], this.createUI(), this.updateCommands(), this.attachEventListeners(), requestAnimationFrame(() => {
			this.input?.focus();
		}));
	}
	close() {
		this.isOpen && (this.isOpen = !1, this.query = "", this.selectedIndex = 0, this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.fuzzyFindResults = [], this.fuzzyFindDebounceTimer !== null && (clearTimeout(this.fuzzyFindDebounceTimer), this.fuzzyFindDebounceTimer = null), this.inputOverlay &&= (this.inputOverlay.remove(), null), this.detachEventListeners(), this.removeUI(), this.callbacks.onClose && this.callbacks.onClose());
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "command-palette-overlay", this.overlay.setAttribute("role", "dialog"), this.overlay.setAttribute("aria-label", "Command Palette"), this.overlay.setAttribute("aria-modal", "true"), this.container = document.createElement("div"), this.container.className = "command-palette", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "command-palette-input", this.input.setAttribute("placeholder", "Type a command or search..."), this.input.setAttribute("aria-label", "Command search input"), this.input.setAttribute("autocomplete", "off"), this.input.setAttribute("spellcheck", "false"), this.input.style.color = "transparent", this.input.style.caretColor = "#1e293b", this.list = document.createElement("div"), this.list.className = "command-palette-list", this.list.setAttribute("role", "listbox"), this.list.setAttribute("aria-label", "Command list"), this.footer = document.createElement("div"), this.footer.className = "command-palette-footer", this.footer.innerHTML = "\n      <span class=\"command-palette-hint\">\n        <kbd>↑</kbd><kbd>↓</kbd> Navigate\n        <kbd>Enter</kbd> Execute\n        <kbd>Esc</kbd> Close\n      </span>\n    ";
		let u = document.createElement("div");
		u.style.position = "relative", u.appendChild(this.input), this.container.appendChild(u), this.container.appendChild(this.list), this.container.appendChild(this.footer), this.overlay.appendChild(this.container), document.body.appendChild(this.overlay), this.overlay.addEventListener("click", (u) => {
			u.target === this.overlay && this.close();
		});
	}
	removeUI() {
		this.inputOverlay &&= (this.inputOverlay.remove(), null), this.overlay && (document.body.removeChild(this.overlay), this.overlay = null, this.container = null, this.input = null, this.list = null, this.footer = null);
	}
	attachEventListeners() {
		this.input && (this.input.addEventListener("input", (u) => {
			let R = u.target;
			this.handleInput(R.value);
		}), this.input.addEventListener("keydown", (u) => {
			this.handleKeyDown(u);
		}));
	}
	detachEventListeners() {}
	handleInput(u) {
		this.query = u, this.selectedIndex = 0;
		let R = parseFuzzyFindInput(u);
		R.isFuzzyFindMode ? (this.isFuzzyFindMode = !0, this.fuzzyFindQuery = R.fuzzyFindQuery, this.fuzzyFindQuoteChar = R.quoteChar, this.updateInputStyling(u, R), this.updateFuzzyFindResults()) : (this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.updateInputStyling(u, R), this.fuzzyFindResults = [], this.updateCommands());
	}
	updateInputStyling(u, R) {
		this.input && (this.inputOverlay &&= (this.inputOverlay.remove(), null), this.inputOverlay = updateInputStyling(this.input, u, R));
	}
	updateFuzzyFindResults() {
		this.fuzzyFindDebounceTimer !== null && clearTimeout(this.fuzzyFindDebounceTimer), this.fuzzyFindDebounceTimer = window.setTimeout(() => {
			this.callbacks.onFindMatches && this.fuzzyFindQuery && this.fuzzyFindQuery.trim() ? (this.fuzzyFindResults = this.callbacks.onFindMatches(this.fuzzyFindQuery.trim()), this.updateList()) : (this.fuzzyFindResults = [], this.updateList()), this.fuzzyFindDebounceTimer = null;
		}, 150);
	}
	updateFuzzyFindList() {
		this.list && (this.fuzzyFindResults.length > 0 && this.selectedIndex >= this.fuzzyFindResults.length && (this.selectedIndex = 0), createFuzzyFindList(this.list, this.fuzzyFindQuery, this.fuzzyFindResults, this.selectedIndex, (u) => {
			this.selectedIndex = u, this.executeSelectedCommand();
		}));
	}
	handleKeyDown(u) {
		let R = this.isFuzzyFindMode ? this.fuzzyFindResults.length - 1 : this.filteredCommands.length - 1;
		u.key === "ArrowDown" ? (u.preventDefault(), this.selectedIndex = Math.min(this.selectedIndex + 1, R), this.updateList(), this.updateFooter(), this.scrollToSelected()) : u.key === "ArrowUp" ? (u.preventDefault(), this.selectedIndex = Math.max(0, this.selectedIndex - 1), this.updateList(), this.updateFooter(), this.scrollToSelected()) : u.key === "Enter" ? (u.preventDefault(), this.executeSelectedCommand()) : u.key === "Escape" && (u.preventDefault(), this.close());
	}
	updateCommands() {
		let u = this.commandRegistry.getCommands(this.currentMode);
		this.query.trim() ? this.filteredCommands = searchCommands(this.query, u) : this.filteredCommands = this.commandRegistry.getPopularCommands(10, this.currentMode).map((u) => ({
			command: u,
			score: 1,
			matchedIndices: []
		})), this.filteredCommands = this.filteredCommands.slice(0, 50), this.updateList();
	}
	updateFooter() {
		if (this.footer) if (this.isFuzzyFindMode && this.fuzzyFindResults.length > 0) {
			let u = this.selectedIndex + 1, R = this.fuzzyFindResults.length;
			this.footer.innerHTML = `
        <span class="command-palette-hint">
          <kbd>↑</kbd><kbd>↓</kbd> Navigate
          <kbd>Enter</kbd> Go to match
          <kbd>Esc</kbd> Close
        </span>
        <span class="command-palette-match-info">
          ${u}/${R} matches
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
				let u = document.createElement("div");
				u.className = "command-palette-item command-palette-item-empty", u.textContent = "No commands found", this.list.appendChild(u);
				return;
			}
			this.filteredCommands.forEach((u, R) => {
				let B = document.createElement("div");
				B.className = "command-palette-item", B.setAttribute("role", "option"), B.setAttribute("aria-selected", (R === this.selectedIndex).toString()), R === this.selectedIndex && B.classList.add("command-palette-item-selected");
				let V = document.createElement("div");
				if (V.className = "command-palette-item-label", V.textContent = u.command.label, u.command.description) {
					let R = document.createElement("div");
					R.className = "command-palette-item-description", R.textContent = u.command.description, B.appendChild(R);
				}
				if (u.command.shortcut) {
					let R = document.createElement("div");
					R.className = "command-palette-item-shortcut", R.textContent = u.command.shortcut, B.appendChild(R);
				}
				B.appendChild(V), B.addEventListener("click", () => {
					this.selectedIndex = R, this.executeSelectedCommand();
				}), this.list && this.list.appendChild(B);
			});
		}
	}
	scrollToSelected() {
		if (!this.list) return;
		let u = this.list.querySelectorAll(".command-palette-item")[this.selectedIndex];
		if (u) {
			if (typeof u.scrollIntoView == "function") try {
				u.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
			} catch {}
			if (this.list && u.offsetTop !== void 0) try {
				let R = u.offsetTop, B = R + (u.offsetHeight || 0), V = this.list.scrollTop || 0, H = this.list.clientHeight || 0, U = V + H;
				R < V ? this.list.scrollTop = R : B > U && (this.list.scrollTop = B - H);
			} catch {}
		}
	}
	executeSelectedCommand() {
		if (this.isFuzzyFindMode) {
			if (this.fuzzyFindResults.length === 0) return;
			let u = this.fuzzyFindResults[this.selectedIndex];
			u && this.callbacks.onGotoMatch && this.callbacks.onGotoMatch(u), this.close();
			return;
		}
		let u = this.filteredCommands[this.selectedIndex];
		if (!u) return;
		let R = u.command;
		this.commandRegistry.incrementUsage(R.id);
		try {
			let u = this.parseCommandArgs(this.query, R.id);
			R.execute(u), this.callbacks.onCommandExecute && this.callbacks.onCommandExecute(R, u);
		} catch (u) {
			logger.error("Error executing command:", u);
		}
		this.close();
	}
	parseCommandArgs(u, R) {
		let B = u.trim().split(/\s+/);
		return R === "goto" && (B[0] === "goto" || B[0] === "go" && B[1] === "to") ? B[0] === "goto" ? B.slice(1) : B.slice(2) : R === "search" && B[0] === "search" || B[0] === R || B[0].startsWith(R) ? B.slice(1) : [];
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
	constructor(u) {
		this.options = u;
	}
	findMatches(u) {
		if (!u.trim()) return [];
		let R = u.toLowerCase().trim(), B = [];
		return this.options.translations.forEach((u, V) => {
			let H = 0, U = [], W = u.key.toLowerCase();
			if (W === R ? (H += 50, U.push({
				field: "key",
				matchedText: u.key,
				matchType: "exact"
			})) : W.includes(R) ? (H += 30, U.push({
				field: "key",
				matchedText: u.key,
				matchType: "contains"
			})) : this.fuzzyMatch(W, R) && (H += 15, U.push({
				field: "key",
				matchedText: u.key,
				matchType: "fuzzy"
			})), u.context) {
				let B = u.context.toLowerCase();
				B === R ? (H += 20, U.push({
					field: "context",
					matchedText: u.context,
					matchType: "exact"
				})) : B.includes(R) ? (H += 20, U.push({
					field: "context",
					matchedText: u.context,
					matchType: "contains"
				})) : this.fuzzyMatch(B, R) && (H += 10, U.push({
					field: "context",
					matchedText: u.context,
					matchType: "fuzzy"
				}));
			}
			this.options.languages.forEach((B) => {
				let V = u.values[B] || "", W = V.toLowerCase();
				W === R ? (H += 10, U.push({
					field: `values.${B}`,
					matchedText: V,
					matchType: "exact"
				})) : W.includes(R) ? (H += 10, U.push({
					field: `values.${B}`,
					matchedText: V,
					matchType: "contains"
				})) : this.fuzzyMatch(W, R) && (H += 5, U.push({
					field: `values.${B}`,
					matchedText: V,
					matchType: "fuzzy"
				}));
			}), H > 0 && B.push({
				rowIndex: V,
				translation: u,
				score: H,
				matchedFields: U
			});
		}), B.sort((u, R) => R.score === u.score ? u.rowIndex - R.rowIndex : R.score - u.score), B;
	}
	fuzzyMatch(u, R) {
		if (R.length === 0) return !0;
		if (R.length > u.length) return !1;
		let B = 0;
		for (let V = 0; V < u.length && B < R.length; V++) u[V] === R[B] && B++;
		return B === R.length;
	}
};
function parseSearchQuery(u) {
	if (!u || !u.trim()) return null;
	let R = u.trim(), B = R.match(/^(\w+):(.+)$/);
	if (B) {
		let [, u, R] = B;
		if (R.trim()) return {
			keyword: R.trim(),
			column: u.toLowerCase()
		};
	}
	return { keyword: R };
}
function findMatchIndices(u, R) {
	if (!u || !R) return [];
	let B = u.toLowerCase(), V = R.toLowerCase(), H = [], U = 0;
	for (;;) {
		let u = B.indexOf(V, U);
		if (u === -1) break;
		for (let R = 0; R < V.length; R++) H.push(u + R);
		U = u + 1;
	}
	return H;
}
var QuickSearch = class {
	options;
	constructor(u) {
		this.options = u;
	}
	findMatches(u) {
		if (!u.keyword) return [];
		let R = [], B = u.keyword.toLowerCase();
		return this.options.translations.forEach((V, H) => {
			if (u.column) {
				let U = this.getColumnIdForSearch(u.column);
				if (U) {
					let W = this.getCellValue(V, U);
					if (W && W.toLowerCase().includes(B)) {
						let B = findMatchIndices(W, u.keyword);
						R.push({
							rowIndex: H,
							columnId: U,
							matchedText: W,
							matchIndices: B
						});
					}
				}
				return;
			}
			[
				"key",
				"context",
				...this.options.languages.map((u) => `values.${u}`)
			].forEach((U) => {
				let W = this.getCellValue(V, U);
				if (W && W.toLowerCase().includes(B)) {
					let B = findMatchIndices(W, u.keyword);
					R.push({
						rowIndex: H,
						columnId: U,
						matchedText: W,
						matchIndices: B
					});
				}
			});
		}), R;
	}
	getColumnIdForSearch(u) {
		let R = u.toLowerCase();
		return R === "key" ? "key" : R === "context" ? "context" : this.options.languages.includes(R) ? `values.${R}` : null;
	}
	getCellValue(u, R) {
		if (R === "key") return u.key || null;
		if (R === "context") return u.context || null;
		if (R.startsWith("values.")) {
			let B = R.replace("values.", "");
			return u.values?.[B] || null;
		}
		return null;
	}
	static highlightText(u, R) {
		if (!u || R.length === 0) return escapeHtml(u);
		let B = [...new Set(R)].sort((u, R) => u - R), V = [], H = 0, U = null;
		if (B.forEach((R, W) => {
			if (!(U !== null && R === B[W - 1] + 1)) {
				if (U !== null) {
					let R = B[W - 1] + 1;
					V.push(`<mark class="quick-search-highlight">${escapeHtml(u.substring(U, R))}</mark>`), H = R;
				}
				R > H && V.push(escapeHtml(u.substring(H, R))), U = R;
			}
		}), U !== null) {
			let R = B[B.length - 1] + 1;
			V.push(`<mark class="quick-search-highlight">${escapeHtml(u.substring(U, R))}</mark>`), H = R;
		}
		return H < u.length && V.push(escapeHtml(u.substring(H))), V.join("");
	}
};
function escapeHtml(u) {
	let R = document.createElement("div");
	return R.textContent = u, R.innerHTML;
}
var QuickSearchUI = class {
	overlay = null;
	input = null;
	statusText = null;
	isOpen = !1;
	callbacks;
	container;
	destroyTimerId = null;
	constructor(u, R = {}) {
		this.container = u, this.callbacks = R;
	}
	open() {
		this.isOpen || (this.isOpen = !0, this.createUI(), requestAnimationFrame(() => {
			this.input && this.input.focus();
		}));
	}
	close() {
		this.isOpen && (this.isOpen = !1, this.destroyUI(), this.callbacks.onClose && this.callbacks.onClose());
	}
	updateStatus(u, R) {
		this.statusText && (R === 0 ? this.statusText.textContent = "No matches" : this.statusText.textContent = `${u + 1}/${R} matches`);
	}
	getQuery() {
		return this.input?.value || "";
	}
	setQuery(u) {
		this.input && (this.input.value = u);
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "quick-search-overlay", this.overlay.setAttribute("role", "dialog"), this.overlay.setAttribute("aria-label", "Quick Search");
		let u = document.createElement("div");
		u.className = "quick-search-bar";
		let R = document.createElement("div");
		R.className = "quick-search-label", R.textContent = "/", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "quick-search-input", this.input.placeholder = "Search... (e.g., keyword, key:keyword, en:keyword)", this.input.setAttribute("aria-label", "Search query"), this.statusText = document.createElement("div"), this.statusText.className = "quick-search-status", this.statusText.textContent = "";
		let B = document.createElement("button");
		B.className = "quick-search-close", B.textContent = "×", B.setAttribute("aria-label", "Close search"), B.addEventListener("click", () => {
			this.close();
		}), this.input.addEventListener("input", () => {
			this.callbacks.onSearch && this.callbacks.onSearch(this.input?.value || "");
		}), this.input.addEventListener("keydown", (u) => {
			u.key === "Escape" ? (u.preventDefault(), u.stopPropagation(), this.close()) : (u.key === "Enter" || u.code === "Enter") && (u.preventDefault(), u.stopPropagation(), this.callbacks.onNextMatch && this.callbacks.onNextMatch());
		}), u.appendChild(R), u.appendChild(this.input), u.appendChild(this.statusText), u.appendChild(B), this.overlay.appendChild(u), this.container.appendChild(this.overlay), requestAnimationFrame(() => {
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
	constructor(u, R = {}) {
		this.container = u, this.callbacks = R;
	}
	create() {
		this.statusBarElement || (this.statusBarElement = document.createElement("div"), this.statusBarElement.className = "status-bar", this.statusBarElement.setAttribute("role", "status"), this.statusBarElement.setAttribute("aria-live", "polite"), this.statusBarElement.setAttribute("aria-atomic", "true"), this.container.appendChild(this.statusBarElement));
	}
	update(u) {
		if (this.statusBarElement || this.create(), !this.statusBarElement) return;
		let R = [];
		if (R.push(`[${u.mode}]`), u.rowIndex === null ? R.push(`Row -/${u.totalRows}`) : R.push(`Row ${u.rowIndex + 1}/${u.totalRows}`), u.columnId) {
			let B = this.getColumnDisplayName(u.columnId);
			R.push(`Col: ${B}`);
		}
		u.changesCount > 0 && R.push(`${u.changesCount} change${u.changesCount === 1 ? "" : "s"}`), u.emptyCount > 0 && R.push(`${u.emptyCount} empty`), u.duplicateCount > 0 && R.push(`${u.duplicateCount} duplicate${u.duplicateCount === 1 ? "" : "s"}`);
		let B = R.join(" | "), V = u.command ? `Command: ${u.command}` : "";
		this.statusBarElement.innerHTML = `
      <span class="status-bar-left">${B}</span>
      ${V ? `<span class="status-bar-command">${V}</span>` : ""}
    `, this.callbacks.onStatusUpdate && this.callbacks.onStatusUpdate(u);
	}
	getColumnDisplayName(u) {
		return u === "row-number" ? "#" : u === "key" ? "Key" : u === "context" ? "Context" : u.startsWith("values.") ? u.replace("values.", "").toUpperCase() : u;
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
	constructor(u) {
		this.translations = u.translations, this.languages = u.languages, this.callbacks = u;
	}
	open(u = "find") {
		if (this.overlay) {
			this.setMode(u);
			return;
		}
		this.createUI(), this.setMode(u), this.attach();
	}
	close() {
		this.overlay && (this.overlay.remove(), this.overlay = null, this.container = null), this.detach(), this.callbacks.onClose && this.callbacks.onClose();
	}
	setMode(u) {
		if (!this.container) return;
		let R = this.container.querySelector(".find-replace-replace-section");
		if (R && (R.style.display = u === "replace" ? "block" : "none"), u === "replace") {
			let u = this.container.querySelector(".find-replace-replace-input");
			u && setTimeout(() => u.focus(), 0);
		}
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "find-replace-overlay", this.overlay.style.cssText = "\n      position: fixed;\n      top: 0;\n      left: 0;\n      right: 0;\n      background: rgba(0, 0, 0, 0.3);\n      z-index: 10000;\n      display: flex;\n      justify-content: center;\n      padding-top: 20px;\n    ", this.container = document.createElement("div"), this.container.className = "find-replace-container", this.container.style.cssText = "\n      background: white;\n      border-radius: 8px;\n      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n      padding: 16px;\n      padding-top: 48px;\n      min-width: 500px;\n      max-width: 600px;\n      position: relative;\n    ";
		let u = document.createElement("div");
		u.className = "find-replace-find-section", u.style.cssText = "\n      display: flex;\n      gap: 8px;\n      align-items: center;\n      margin-bottom: 12px;\n    ";
		let R = document.createElement("input");
		R.type = "text", R.className = "find-replace-find-input", R.placeholder = "Find", R.style.cssText = "\n      flex: 1;\n      padding: 8px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      font-size: 14px;\n    ", R.value = this.state.searchQuery, R.addEventListener("input", (u) => {
			this.state.searchQuery = u.target.value, this.performSearch();
		}), R.addEventListener("keydown", (u) => {
			u.key === "Escape" ? this.close() : u.key === "Enter" && !u.shiftKey ? (u.preventDefault(), this.goToNextMatch()) : u.key === "Enter" && u.shiftKey && (u.preventDefault(), this.goToPrevMatch());
		});
		let B = document.createElement("div");
		B.style.cssText = "display: flex; gap: 4px;";
		let V = this.createButton("↑", "Previous", () => {
			this.goToPrevMatch();
		}), H = this.createButton("↓", "Next", () => {
			this.goToNextMatch();
		});
		B.appendChild(V), B.appendChild(H), u.appendChild(R), u.appendChild(B);
		let U = document.createElement("div");
		U.className = "find-replace-replace-section", U.style.cssText = "\n      display: none;\n      display: flex;\n      gap: 8px;\n      align-items: center;\n      margin-bottom: 12px;\n    ";
		let W = document.createElement("input");
		W.type = "text", W.className = "find-replace-replace-input", W.placeholder = "Replace", W.style.cssText = "\n      flex: 1;\n      padding: 8px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      font-size: 14px;\n    ", W.value = this.state.replaceQuery, W.addEventListener("input", (u) => {
			let R = u.target.value;
			this.state.replaceQuery = R;
		}), W.addEventListener("keydown", (u) => {
			u.key === "Escape" ? this.close() : u.key === "Enter" && !u.shiftKey ? (u.preventDefault(), this.replaceCurrent()) : u.key === "Enter" && u.shiftKey && (u.preventDefault(), this.replaceAll());
		});
		let G = document.createElement("div");
		G.style.cssText = "display: flex; gap: 4px;";
		let K = this.createButton("Replace", "Replace current", () => {
			this.replaceCurrent();
		}), q = this.createButton("Replace All", "Replace all", () => {
			this.replaceAll();
		});
		G.appendChild(K), G.appendChild(q), U.appendChild(W), U.appendChild(G);
		let J = document.createElement("div");
		J.style.cssText = "\n      display: flex;\n      gap: 16px;\n      align-items: center;\n      margin-bottom: 12px;\n      font-size: 12px;\n    ";
		let Y = this.createCheckbox("Aa", "Match case", this.state.isCaseSensitive, (u) => {
			this.state.isCaseSensitive = u, this.performSearch();
		}), X = this.createCheckbox("Ab", "Match whole word", this.state.isWholeWord, (u) => {
			this.state.isWholeWord = u, this.performSearch();
		}), Z = this.createCheckbox(".*", "Use regular expression", this.state.isRegex, (u) => {
			this.state.isRegex = u, this.performSearch();
		});
		J.appendChild(Y), J.appendChild(X), J.appendChild(Z);
		let Q = document.createElement("div");
		Q.className = "find-replace-result", Q.style.cssText = "\n      font-size: 12px;\n      color: #666;\n      min-height: 20px;\n    ";
		let $ = document.createElement("button");
		$.textContent = "×", $.className = "find-replace-close-button", $.style.cssText = "\n      position: absolute;\n      top: 8px;\n      right: 8px;\n      background: none;\n      border: none;\n      font-size: 24px;\n      cursor: pointer;\n      color: #666;\n      width: 32px;\n      height: 32px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 10;\n      pointer-events: auto;\n    ", $.addEventListener("click", (u) => {
			u.stopPropagation(), this.close();
		}), this.container.style.position = "relative", this.container.appendChild($), this.container.appendChild(u), this.container.appendChild(U), this.container.appendChild(J), this.container.appendChild(Q), this.overlay.appendChild(this.container), document.body.appendChild(this.overlay), this.overlay.addEventListener("click", (u) => {
			u.target === this.overlay && this.close();
		}), setTimeout(() => R.focus(), 0);
	}
	createButton(u, R, B) {
		let V = document.createElement("button");
		return V.textContent = u, V.title = R, V.style.cssText = "\n      padding: 6px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      background: white;\n      cursor: pointer;\n      font-size: 12px;\n    ", V.addEventListener("click", B), V;
	}
	createCheckbox(u, R, B, V) {
		let H = document.createElement("label");
		H.style.cssText = "display: flex; align-items: center; gap: 4px; cursor: pointer;", H.title = R;
		let U = document.createElement("input");
		U.type = "checkbox", U.checked = B, U.style.cssText = "cursor: pointer;", U.addEventListener("change", (u) => {
			V(u.target.checked);
		});
		let W = document.createElement("span");
		return W.textContent = u, H.appendChild(U), H.appendChild(W), H;
	}
	performSearch() {
		if (!this.state.searchQuery.trim()) {
			this.state.matches = [], this.state.currentMatchIndex = -1, this.updateResult(), this.callbacks.onFind && this.callbacks.onFind([]);
			return;
		}
		let u = [], R = this.buildSearchPattern(this.state.searchQuery);
		this.translations.forEach((B, V) => {
			[
				"key",
				"context",
				...this.languages.map((u) => `values.${u}`)
			].forEach((H) => {
				let U = this.getCellValue(B, H);
				U && this.findMatchesInText(U, R).forEach((R) => {
					u.push({
						rowIndex: V,
						columnId: H,
						matchedText: U,
						matchIndex: R.index,
						matchLength: R.length
					});
				});
			});
		}), this.state.matches = u, this.state.currentMatchIndex = u.length > 0 ? 0 : -1, this.updateResult(), this.callbacks.onFind && this.callbacks.onFind(u);
	}
	buildSearchPattern(u) {
		let R = u;
		if (this.state.isRegex) try {
			return new RegExp(R, this.state.isCaseSensitive ? "g" : "gi");
		} catch {
			R = this.escapeRegex(u);
		}
		else R = this.escapeRegex(u);
		return this.state.isWholeWord && (R = `\\b${R}\\b`), new RegExp(R, this.state.isCaseSensitive ? "g" : "gi");
	}
	escapeRegex(u) {
		return u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	findMatchesInText(u, R) {
		let B = [], V;
		for (R.lastIndex = 0; (V = R.exec(u)) !== null;) B.push({
			index: V.index,
			length: V[0].length
		}), V.index === R.lastIndex && R.lastIndex++;
		return B;
	}
	getCellValue(u, R) {
		if (R === "key") return u.key;
		if (R === "context") return u.context || null;
		if (R.startsWith("values.")) {
			let B = R.replace("values.", "");
			return u.values[B] || null;
		}
		return null;
	}
	updateResult() {
		let u = this.container?.querySelector(".find-replace-result");
		u && (this.state.matches.length === 0 ? u.textContent = this.state.searchQuery ? "No matches found" : "" : u.textContent = `${this.state.currentMatchIndex + 1} of ${this.state.matches.length} matches`);
	}
	goToNextMatch() {
		this.state.matches.length !== 0 && (this.state.currentMatchIndex = (this.state.currentMatchIndex + 1) % this.state.matches.length, this.updateResult(), this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]));
	}
	goToPrevMatch() {
		this.state.matches.length !== 0 && (this.state.currentMatchIndex = this.state.currentMatchIndex <= 0 ? this.state.matches.length - 1 : this.state.currentMatchIndex - 1, this.updateResult(), this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]));
	}
	navigateToMatch(u) {
		this.callbacks.onFind && this.callbacks.onFind([u]);
	}
	replaceCurrent() {
		if (this.state.currentMatchIndex < 0 || this.state.currentMatchIndex >= this.state.matches.length) return;
		let u = this.container?.querySelector(".find-replace-replace-input"), R = u ? u.value : this.state.replaceQuery, B = this.state.matches[this.state.currentMatchIndex];
		this.callbacks.onReplace && this.callbacks.onReplace(B, R), this.performSearch();
	}
	replaceAll() {
		if (this.state.matches.length === 0) return;
		let u = this.container?.querySelector(".find-replace-replace-input"), R = u ? u.value : this.state.replaceQuery;
		this.callbacks.onReplaceAll && this.callbacks.onReplaceAll(this.state.matches, R), this.performSearch();
	}
	attach() {
		let u = (u) => {
			u.key === "Escape" && this.overlay && this.close();
		};
		document.addEventListener("keydown", u), this.overlay.__escapeHandler = u;
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
	constructor(u) {
		this.options = u;
	}
	filterEffect(u, B) {
		let V = this;
		return Effect.gen(function* (H) {
			switch (B.type) {
				case "search": return yield* H(V.applySearchFilterEffect(u, B.keyword || ""));
				case "empty": return yield* H(V.applyEmptyFilterEffect(u));
				case "changed": return yield* H(V.applyChangedFilterEffect(u));
				case "duplicate": return yield* H(V.applyDuplicateFilterEffect(u));
				default: return yield* H(Effect.succeed([...u]));
			}
		});
	}
	filter(u, B) {
		let V = this.filterEffect(u, B);
		return Effect.runSync(Effect.match(V, {
			onFailure: (R) => (logger.warn("Filter failed, returning original translations", R), [...u]),
			onSuccess: (u) => u
		}));
	}
	applySearchFilterEffect(u, B) {
		let V = this;
		return Effect.gen(function* (H) {
			let U = B.toLowerCase().trim();
			if (!U) return yield* H(Effect.succeed([...u]));
			let W = u.filter((u) => u.key.toLowerCase().includes(U) || u.context?.toLowerCase().includes(U) ? !0 : V.options.languages.some((R) => (u.values[R] || "").toLowerCase().includes(U)));
			return yield* H(Effect.succeed(W));
		});
	}
	applySearchFilter(u, B) {
		let V = this.applySearchFilterEffect(u, B);
		return Effect.runSync(Effect.match(V, {
			onFailure: () => [...u],
			onSuccess: (u) => u
		}));
	}
	applyEmptyFilterEffect(u) {
		let B = this;
		return Effect.gen(function* (V) {
			let H = u.filter((u) => B.options.languages.some((R) => (u.values[R] || "").trim() === ""));
			return yield* V(Effect.succeed(H));
		});
	}
	applyEmptyFilter(u) {
		let B = this.applyEmptyFilterEffect(u);
		return Effect.runSync(Effect.match(B, {
			onFailure: () => [...u],
			onSuccess: (u) => u
		}));
	}
	applyChangedFilterEffect(u) {
		let B = this;
		return Effect.gen(function* (V) {
			let H = [];
			for (let R of u) {
				if (B.options.changeTracker.hasChange(R.id, "key")) {
					H.push(R);
					continue;
				}
				if (B.options.changeTracker.hasChange(R.id, "context")) {
					H.push(R);
					continue;
				}
				let u = !1;
				for (let V of B.options.languages) if (B.options.changeTracker.hasChange(R.id, `values.${V}`)) {
					u = !0;
					break;
				}
				u && H.push(R);
			}
			return yield* V(Effect.succeed(H));
		});
	}
	applyChangedFilter(u) {
		let B = this.applyChangedFilterEffect(u);
		return Effect.runSync(Effect.match(B, {
			onFailure: () => [...u],
			onSuccess: (u) => u
		}));
	}
	applyDuplicateFilterEffect(u) {
		return Effect.gen(function* (B) {
			let V = /* @__PURE__ */ new Map();
			u.forEach((u) => {
				let R = V.get(u.key) || 0;
				V.set(u.key, R + 1);
			});
			let H = u.filter((u) => (V.get(u.key) || 0) > 1);
			return yield* B(Effect.succeed(H));
		});
	}
	applyDuplicateFilter(u) {
		let B = this.applyDuplicateFilterEffect(u);
		return Effect.runSync(Effect.match(B, {
			onFailure: () => [...u],
			onSuccess: (u) => u
		}));
	}
}, VimCommandTracker = class {
	currentSequence = "";
	commandType = "motion";
	autoClearTimer = null;
	options;
	constructor(u = {}) {
		this.options = {
			maxSequenceLength: u.maxSequenceLength ?? 20,
			autoClearDelay: u.autoClearDelay ?? 1e3,
			onCommandUpdate: u.onCommandUpdate ?? (() => {})
		};
	}
	addKeyEffect(u) {
		let B = this;
		return Effect.gen(function* (V) {
			if (B.currentSequence.length >= B.options.maxSequenceLength) return yield* V(Effect.fail(new VimCommandTrackerError({
				message: `Maximum sequence length (${B.options.maxSequenceLength}) exceeded`,
				code: "MAX_SEQUENCE_LENGTH_EXCEEDED"
			})));
			B.currentSequence += u, B.updateCommandType();
			let H = B.createCommand();
			return B.options.onCommandUpdate(H), B.resetAutoClearTimer(), H;
		});
	}
	addKey(u) {
		let B = Effect.runSync(Effect.either(this.addKeyEffect(u)));
		if (B._tag === "Left") {
			let u = B.left;
			return u instanceof VimCommandTrackerError || logger.error("VimCommandTracker: Unexpected error in addKey", u), null;
		}
		return B.right;
	}
	completeCommandEffect() {
		let u = this;
		return Effect.gen(function* (B) {
			if (!u.currentSequence) return yield* B(Effect.fail(new VimCommandTrackerError({
				message: "No command sequence to complete",
				code: "INVALID_KEY_SEQUENCE"
			})));
			let V = u.createCommand();
			return V.type = "complete", u.options.onCommandUpdate(V), u.clear(), V;
		});
	}
	completeCommand() {
		return Effect.runSync(Effect.match(this.completeCommandEffect(), {
			onFailure: (u) => {
				throw u instanceof VimCommandTrackerError ? u : (logger.error("VimCommandTracker: Unexpected error in completeCommand", u), new VimCommandTrackerError({
					message: "Failed to complete command",
					code: "INVALID_KEY_SEQUENCE"
				}));
			},
			onSuccess: (u) => u
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
		let u = this.currentSequence[this.currentSequence.length - 1];
		if (/^\d+$/.test(this.currentSequence)) {
			this.commandType = "number";
			return;
		}
		if ([
			"d",
			"y",
			"c"
		].includes(u)) {
			this.commandType = "operator";
			return;
		}
		if ([
			"w",
			"b",
			"e"
		].includes(u) && this.currentSequence.length > 1) {
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
		let u = this.currentSequence;
		if (u) return /^\d+$/.test(u) ? `Repeat ${u} times` : {
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
		}[u] || void 0;
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
	constructor(u) {
		this.container = u.container, this.options = {
			container: u.container,
			onExecute: u.onExecute ?? (() => {}),
			onCancel: u.onCancel ?? (() => {}),
			maxHistorySize: u.maxHistorySize ?? 50,
			placeholder: u.placeholder ?? "Enter command..."
		}, this.loadHistory();
	}
	showEffect(u) {
		return Effect.sync(() => {
			this.isVisible ||= (this.historyIndex = -1, this.loadHistory(), this.createUI(), this.input && (this.input.value = u || "", requestAnimationFrame(() => {
				if (this.input) {
					let R = u || "";
					this.input.value !== R && (logger.warn(`CommandLine: Input value was reset during show! Expected: "${R}", Got: "${this.input.value}"`), this.input.value = R), this.input.focus(), this.input.select();
				}
			})), !0);
		}).pipe(Effect.catchAll((u) => (logger.error("CommandLine: Failed to show", u), Effect.fail(u))));
	}
	show(u) {
		Effect.runSync(Effect.match(this.showEffect(u), {
			onFailure: (u) => {
				logger.error("CommandLine: Failed to show", u);
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
		let u = document.createElement("div");
		u.className = "command-line", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "command-line-input", this.input.setAttribute("placeholder", this.options.placeholder), this.input.setAttribute("aria-label", "Command input"), this.input.setAttribute("autocomplete", "off"), this.input.setAttribute("spellcheck", "false"), this.attachInputListeners(), u.appendChild(this.input), this.overlay.appendChild(u), this.container.appendChild(this.overlay);
	}
	attachInputListeners() {
		if (!this.input) {
			logger.warn("CommandLine: Cannot attach listeners - input is null");
			return;
		}
		this.input.addEventListener("keydown", (u) => {
			u.key === "Enter" ? (u.preventDefault(), u.stopPropagation(), this.executeCommand().catch((u) => {
				logger.error("CommandLine: executeCommand error (outer catch)", u), this.hide();
			})) : u.key === "Escape" ? (u.preventDefault(), u.stopPropagation(), this.cancel()) : u.key === "ArrowUp" ? (u.preventDefault(), u.stopPropagation(), this.navigateHistory(-1), this.input && requestAnimationFrame(() => {
				this.input && this.input.focus();
			})) : u.key === "ArrowDown" && (u.preventDefault(), u.stopPropagation(), this.navigateHistory(1), this.input && requestAnimationFrame(() => {
				this.input && this.input.focus();
			}));
		}), this.overlay && this.overlay.addEventListener("click", (u) => {
			u.target === this.overlay && this.cancel();
		});
	}
	executeCommandEffect() {
		let u = this;
		return Effect.gen(function* (B) {
			if (!u.input) return yield* B(Effect.fail(new CommandLineError({
				message: "Input element not found",
				code: "INVALID_COMMAND"
			})));
			let V = u.input.value.trim();
			if (!V) {
				u.hide();
				return;
			}
			u.addToHistory(V);
			try {
				let H = u.options.onExecute(V);
				if (H instanceof Promise) {
					let V = null, U = new Promise((u, R) => {
						V = window.setTimeout(() => {
							R(/* @__PURE__ */ Error("Command execution timeout (5s)"));
						}, 5e3);
					});
					try {
						yield* B(Effect.promise(() => Promise.race([H.finally(() => {
							V !== null && (window.clearTimeout(V), V = null);
						}), U])));
					} catch (H) {
						return V !== null && (window.clearTimeout(V), V = null), logger.error("CommandLine: Command execution timeout or error", H), u.hide(), yield* B(Effect.fail(new CommandLineError({
							message: `Command execution failed: ${H instanceof Error ? H.message : String(H)}`,
							code: "COMMAND_EXECUTION_FAILED"
						})));
					}
				}
			} catch (V) {
				return logger.error("CommandLine: Command execution failed", V), u.hide(), yield* B(Effect.fail(new CommandLineError({
					message: `Command execution failed: ${V instanceof Error ? V.message : String(V)}`,
					code: "COMMAND_EXECUTION_FAILED"
				})));
			}
			u.hide();
		}).pipe(Effect.catchAll((B) => (logger.error("CommandLine: Failed to execute command", B), u.hide(), Effect.fail(B))));
	}
	async executeCommand() {
		let u = null;
		try {
			let B = new Promise((R, B) => {
				u = window.setTimeout(() => {
					B(/* @__PURE__ */ Error("Command execution timeout (5s)"));
				}, 5e3);
			});
			await Promise.race([Effect.runPromise(this.executeCommandEffect()).finally(() => {
				u !== null && (window.clearTimeout(u), u = null);
			}), B]);
		} catch (R) {
			u !== null && (window.clearTimeout(u), u = null), logger.error("CommandLine: executeCommand failed", R), this.hide();
		}
	}
	cancel() {
		this.options.onCancel(), this.hide();
	}
	navigateHistory(u) {
		if (this.input && (this.loadHistory(), this.history.length !== 0)) {
			if (this.historyIndex === -1) if (u < 0) if (this.history.length > 0) this.historyIndex = 0;
			else return;
			else return;
			else this.historyIndex -= u;
			if (this.historyIndex < 0) {
				this.historyIndex = -1, this.input.value = "";
				return;
			} else if (this.historyIndex >= this.history.length) {
				this.historyIndex = this.history.length, this.input.value = "";
				return;
			}
			if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
				let u = this.history[this.historyIndex];
				u && typeof u == "string" ? this.input ? (this.input.value = u, requestAnimationFrame(() => {
					this.input && (this.input.value !== u && (logger.warn(`CommandLine: Input value was reset in Firefox! Expected: "${u}", Got: "${this.input.value}"`), this.input.value = u), this.input.focus(), this.input.setSelectionRange(0, this.input.value.length));
				})) : logger.warn("CommandLine: Input element is null when setting history value") : this.input && (this.input.value = "");
			} else this.input && (this.input.value = "");
		}
	}
	addToHistory(u) {
		let R = this.history.indexOf(u);
		R !== -1 && this.history.splice(R, 1), this.history.unshift(u), this.history.length > this.options.maxHistorySize && (this.history = this.history.slice(0, this.options.maxHistorySize)), this.saveHistory();
	}
	getHistory() {
		return [...this.history];
	}
	clearHistory() {
		this.history = [], this.historyIndex = -1, this.saveHistory();
	}
	saveHistory() {
		try {
			let u = JSON.stringify(this.history);
			localStorage.setItem("commandLineHistory", u);
		} catch (u) {
			logger.error("Failed to save command line history", u);
		}
	}
	loadHistory() {
		try {
			let u = localStorage.getItem("commandLineHistory");
			if (u) {
				let R = JSON.parse(u);
				Array.isArray(R) ? this.history = R : (logger.warn("CommandLine: Invalid history format in localStorage", R), this.history = []);
			} else this.history = [];
		} catch (u) {
			logger.error("Failed to load command line history", u), this.history = [];
		}
	}
	destroy() {
		this.hide();
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
	constructor(u) {
		this.container = u.container, this.options = u, this.columnWidths = u.columnWidths || /* @__PURE__ */ new Map(), this.rowHeight = u.rowHeight || 40, this.headerHeight = u.headerHeight || 40, this.editableColumns = new Set(["key", "context"]), u.languages.forEach((u) => {
			this.editableColumns.add(`values.${u}`);
		}), this.columnMinWidths.set("key", 100), this.columnMinWidths.set("context", 100), u.languages.forEach((u) => {
			this.columnMinWidths.set(`values.${u}`, 80);
		}), this.originalTranslations = [...u.translations], this.currentTranslations = [...u.translations], this.changeTracker.initializeOriginalData(u.translations, u.languages), this.filterManager = new FilterManager({
			translations: u.translations,
			languages: u.languages,
			changeTracker: this.changeTracker
		}), this.cellEditor = new CellEditor(u.translations, this.changeTracker, this.undoRedoManager, {
			onCellChange: (R, B, V) => {
				let H = this.currentTranslations.findIndex((u) => u.id === R);
				if (H !== -1) {
					let u = this.currentTranslations[H], U = toMutableTranslation(u);
					if (B === "key") U.key = V;
					else if (B === "context") U.context = V;
					else if (B.startsWith("values.")) {
						let u = B.replace("values.", "");
						U.values[u] = V;
					}
					this.currentTranslations[H] = U;
					let W = this.originalTranslations.findIndex((u) => u.id === R);
					if (W !== -1) {
						let u = this.originalTranslations[W], R = toMutableTranslation(u);
						if (B === "key") R.key = V;
						else if (B === "context") R.context = V;
						else if (B.startsWith("values.")) {
							let u = B.replace("values.", "");
							R.values[u] = V;
						}
						let H = [...this.originalTranslations];
						H[W] = R, this.originalTranslations = H;
					}
				}
				this.updateCellStyle(R, B), this.updateStatusBar(), u.onCellChange && u.onCellChange(R, B, V);
			},
			onEditStateChange: () => {
				this.updateStatusBar();
			},
			onEditFinished: (u, R, B) => {
				let V = this.currentTranslations.length - 1, H = u;
				if (B === "down") if (u < V) H = u + 1;
				else {
					this.focusCell(u, R);
					return;
				}
				else if (u > 0) H = u - 1;
				else {
					this.focusCell(u, R);
					return;
				}
				this.focusCell(H, R), requestAnimationFrame(() => {
					this.startEditingFromKeyboard(H, R);
				});
			},
			updateCellStyle: (u, R) => {
				this.updateCellStyle(u, R);
			},
			updateCellContent: (u, R, B, V) => {
				let H = u.getAttribute("data-row-index"), U = H ? parseInt(H, 10) : 0;
				this.gridRenderer.updateCellContent(u, R, B, V, U);
			}
		}), this.commandRegistry = new CommandRegistry({ onCommandExecuted: () => {} }), this.registerDefaultCommands(), this.quickSearch = new QuickSearch({
			translations: u.translations,
			languages: u.languages
		}), this.quickSearchUI = new QuickSearchUI(this.container, {
			onSearch: (u) => {
				this.handleQuickSearch(u);
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
					let u = this.focusManager.getFocusedCell();
					u && this.focusCell(u.rowIndex, u.columnId);
				}
			},
			onFindMatches: (u) => this.findMatches(u),
			onGotoMatch: (u) => {
				this.gotoToMatch(u);
				let R = this.commandPalette.getFuzzyFindResults(), B = this.commandPalette.getFuzzyFindQuery(), V = R.map((u) => ({
					rowIndex: u.rowIndex,
					translation: u.translation,
					score: u.score,
					matchedFields: u.matchedFields
				})), H = V.findIndex((R) => R.rowIndex === u.rowIndex);
				this.currentGotoMatches = {
					keyword: B,
					matches: V,
					currentIndex: H === -1 ? 0 : H
				};
			}
		}), this.keyboardHandlerModule = new KeyboardHandler(this.modifierKeyTracker, this.focusManager, {
			onUndo: () => this.handleUndo(),
			onRedo: () => this.handleRedo(),
			onStartEditing: (u, R) => {
				this.startEditingFromKeyboard(u, R);
			},
			getAllColumns: () => [
				"key",
				"context",
				...u.languages.map((u) => `values.${u}`)
			],
			getMaxRowIndex: () => u.translations.length - 1,
			focusCell: (u, R) => {
				this.focusCell(u, R);
			},
			onOpenCommandPalette: (u) => {
				this.commandPalette.open(u);
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
			isEditableColumn: (u) => this.editableColumns.has(u),
			isReadOnly: () => this.options.readOnly || !1,
			onOpenFind: () => {
				this.openFindReplace("find");
			},
			onOpenReplace: () => {
				this.openFindReplace("replace");
			}
		}), this.columnWidthCalculator = new ColumnWidthCalculator({
			columnWidths: this.columnWidths,
			columnMinWidths: this.columnMinWidths,
			languages: u.languages
		}), this.columnResizer = new ColumnResizer({
			columnWidths: this.columnWidths,
			columnMinWidths: this.columnMinWidths,
			languages: u.languages,
			callbacks: {
				onResize: (u, R) => {
					this.applyColumnWidth(u, R);
				},
				onResizeEnd: () => {
					this.rowVirtualizer && this.bodyElement && this.renderVirtualRows();
				}
			}
		}), this.gridRenderer = new GridRenderer({
			languages: u.languages,
			readOnly: u.readOnly,
			editableColumns: this.editableColumns,
			callbacks: {
				onCellDblClick: (u, R, B) => {
					this.startEditing(u, R, B);
				},
				onCellFocus: (u, R) => {
					this.focusManager.focusCell(u, R), this.updateStatusBar();
				},
				updateCellStyle: (u, R, B) => {
					this.updateCellStyle(u, R, B);
				}
			}
		}), this.findReplace = new FindReplace({
			translations: u.translations,
			languages: u.languages,
			onFind: (u) => {
				if (u.length > 0) {
					let R = u[0];
					this.gotoToFindMatch(R);
				}
			},
			onReplace: (u, R) => {
				this.replaceFindMatch(u, R);
			},
			onReplaceAll: (u, R) => {
				this.replaceAllFindMatches(u, R);
			},
			onClose: () => {}
		}), this.vimCommandTracker = new VimCommandTracker({ onCommandUpdate: (u) => {
			this.updateStatusBar();
		} }), this.commandLine = new CommandLine({
			container: this.container,
			onExecute: async (u) => {
				await this.executeCommandLineCommand(u);
			},
			onCancel: () => {}
		});
	}
	render() {
		this.scrollElement && this.container.contains(this.scrollElement) && this.container.removeChild(this.scrollElement), this.scrollElement = document.createElement("div"), this.scrollElement.className = "virtual-grid-scroll-container", this.scrollElement.style.width = "100%", this.scrollElement.style.height = "100%", this.scrollElement.style.overflow = "auto", this.scrollElement.style.position = "relative", this.gridElement = document.createElement("div"), this.gridElement.className = "virtual-grid", this.gridElement.setAttribute("role", "grid"), this.options.readOnly && this.gridElement.classList.add("readonly"), this.headerElement = document.createElement("div"), this.headerElement.className = "virtual-grid-header", this.renderHeader(), this.gridElement.appendChild(this.headerElement), this.bodyElement = document.createElement("div"), this.bodyElement.className = "virtual-grid-body", this.bodyElement.style.position = "relative", this.gridElement.appendChild(this.bodyElement), this.scrollElement.appendChild(this.gridElement), this.container.appendChild(this.scrollElement), this.observeContainerResize(), requestAnimationFrame(() => {
			this.initVirtualScrolling();
		}), this.attachKeyboardListeners(), this.initStatusBar();
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
		let u = (() => {
			if (this.scrollElement) {
				let u = this.scrollElement.getBoundingClientRect();
				if (u.width > 0 && u.height > 0) return {
					width: u.width,
					height: u.height
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
			initialRect: u,
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
		let u = null, R = this.cellEditor.getEditingCell();
		if (R) {
			let B = this.bodyElement.querySelector(`[data-row-index="${R.rowIndex}"]`);
			if (B) {
				let V = B.querySelector(`[data-column-id="${R.columnId}"]`);
				if (V) {
					let B = V.querySelector("input");
					B && (u = {
						rowId: R.rowId,
						columnId: R.columnId,
						value: B.value
					});
				}
			}
		}
		this.bodyElement.innerHTML = "";
		let B = this.rowVirtualizer.getVirtualItems(), V = this.rowVirtualizer.getTotalSize();
		this.bodyElement.style.height = `${V}px`;
		let H, U = this.getContainerWidth();
		if (this.columnResizer.isResizingActive()) H = this.columnWidthCalculator.calculateColumnWidths(U);
		else if (this.columnWidths.size > 0) H = this.columnWidthCalculator.calculateColumnWidths(U);
		else {
			let u = this.getColumnWidthsFromHeader();
			if (u) {
				let R = u.rowNumber + u.key + u.context + u.languages.slice(0, -1).reduce((u, R) => u + R, 0), B = this.columnMinWidths.get(`values.${this.options.languages[this.options.languages.length - 1]}`) || 80, V = Math.max(B, U - R);
				H = {
					rowNumber: u.rowNumber,
					key: u.key,
					context: u.context,
					languages: [...u.languages.slice(0, -1), V]
				};
			} else H = this.columnWidthCalculator.calculateColumnWidths(U);
		}
		B.forEach((R) => {
			let B = this.getFilteredTranslations()[R.index];
			if (!B) return;
			let V = this.gridRenderer.createRow(B, R.index, H), W = U;
			if (V.style.position = "absolute", V.style.top = `${R.start}px`, V.style.left = "0", V.style.width = `${W}px`, V.style.minWidth = `${W}px`, V.style.maxWidth = `${W}px`, V.style.height = `${R.size}px`, V.setAttribute("data-index", R.index.toString()), this.bodyElement.appendChild(V), this.applyQuickSearchHighlight(V, R.index), u && B.id === u.rowId) {
				let B = V.querySelector(`[data-column-id="${u.columnId}"]`);
				B && requestAnimationFrame(() => {
					this.startEditing(R.index, u.columnId, B);
					let V = B.querySelector("input");
					V && (V.value = u.value, V.focus(), V.select());
				});
			}
			this.rowVirtualizer.measureElement(V);
		});
	}
	renderHeader() {
		if (!this.headerElement) return;
		let u = document.createElement("div");
		u.className = "virtual-grid-header-row", u.setAttribute("role", "row");
		let R = this.getContainerWidth(), B;
		this.columnWidths.size > 0 ? B = this.columnWidthCalculator.calculateColumnWidths(R) : (B = this.columnWidthCalculator.calculateColumnWidths(R), this.columnWidths.set("row-number", B.rowNumber), this.columnWidths.set("key", B.key), this.columnWidths.set("context", B.context), this.options.languages.slice(0, -1).forEach((u, R) => {
			let V = B.languages[R];
			this.columnWidths.set(`values.${u}`, V);
		}));
		let V = R;
		u.style.width = `${V}px`, u.style.minWidth = `${V}px`, u.style.maxWidth = `${V}px`;
		let H = this.gridRenderer.createHeaderCell("", B.rowNumber, 0, 15, "row-number");
		H.classList.add("row-number-header"), u.appendChild(H);
		let U = this.gridRenderer.createHeaderCell("Key", B.key, B.rowNumber, 10, "key");
		this.columnResizer.addResizeHandle(U, "key"), u.appendChild(U);
		let W = this.gridRenderer.createHeaderCell("Context", B.context, B.rowNumber + B.key, 10, "context");
		this.columnResizer.addResizeHandle(W, "context"), u.appendChild(W), this.options.languages.forEach((R, V) => {
			let H = B.languages[V], U = `values.${R}`, W = B.rowNumber + B.key + B.context, G = this.gridRenderer.createHeaderCell(R.toUpperCase(), H, W, 0, U);
			this.columnResizer.addResizeHandle(G, U), u.appendChild(G);
		}), this.headerElement.appendChild(u);
	}
	applyColumnWidth(u, R) {
		let B = this.getContainerWidth(), { columnWidths: V, totalWidth: H } = this.columnWidthCalculator.applyColumnWidth(u, R, B);
		if (this.headerElement) {
			let u = this.headerElement.querySelector(".virtual-grid-header-row");
			u && (u.style.width = `${H}px`, u.style.minWidth = `${H}px`, u.style.maxWidth = `${H}px`);
			let R = this.headerElement.querySelector("[data-column-id=\"row-number\"]");
			R && (R.style.width = `${V.rowNumber}px`, R.style.minWidth = `${V.rowNumber}px`, R.style.maxWidth = `${V.rowNumber}px`);
			let B = this.headerElement.querySelector("[data-column-id=\"key\"]");
			B && (B.style.width = `${V.key}px`, B.style.minWidth = `${V.key}px`, B.style.maxWidth = `${V.key}px`, B.style.left = `${V.rowNumber}px`);
			let U = this.headerElement.querySelector("[data-column-id=\"context\"]");
			U && (U.style.width = `${V.context}px`, U.style.minWidth = `${V.context}px`, U.style.maxWidth = `${V.context}px`, U.style.left = `${V.rowNumber + V.key}px`), this.options.languages.forEach((u, R) => {
				let B = this.headerElement.querySelector(`[data-column-id="values.${u}"]`);
				if (B) {
					let u = V.languages[R];
					B.style.width = `${u}px`, B.style.minWidth = `${u}px`, B.style.maxWidth = `${u}px`;
					let H = V.rowNumber + V.key + V.context;
					B.style.left = `${H}px`;
				}
			});
		}
		this.bodyElement && (this.bodyElement.querySelectorAll(".virtual-grid-row").forEach((u) => {
			let R = u;
			R.style.width = `${H}px`, R.style.minWidth = `${H}px`, R.style.maxWidth = `${H}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"row-number\"]").forEach((u) => {
			let R = u;
			R.style.width = `${V.rowNumber}px`, R.style.minWidth = `${V.rowNumber}px`, R.style.maxWidth = `${V.rowNumber}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"key\"]").forEach((u) => {
			let R = u;
			R.style.width = `${V.key}px`, R.style.minWidth = `${V.key}px`, R.style.maxWidth = `${V.key}px`, R.style.left = `${V.rowNumber}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"context\"]").forEach((u) => {
			let R = u;
			R.style.width = `${V.context}px`, R.style.minWidth = `${V.context}px`, R.style.maxWidth = `${V.context}px`, R.style.left = `${V.rowNumber + V.key}px`;
		}), this.options.languages.forEach((u, R) => {
			let B = this.bodyElement.querySelectorAll(`[data-column-id="values.${u}"]`), H = V.languages[R], U = V.rowNumber + V.key + V.context;
			B.forEach((u) => {
				let R = u;
				R.style.width = `${H}px`, R.style.minWidth = `${H}px`, R.style.maxWidth = `${H}px`, R.style.left = `${U}px`;
			});
		}));
	}
	getColumnWidthsFromHeader() {
		if (!this.headerElement) return null;
		let u = this.headerElement.querySelector(".virtual-grid-header-row");
		if (!u) return null;
		let R = u.querySelectorAll(".virtual-grid-header-cell"), B = {
			rowNumber: 0,
			key: 0,
			context: 0,
			languages: []
		};
		return R.forEach((u) => {
			let R = u.getAttribute("data-column-id"), V = u.offsetWidth || u.getBoundingClientRect().width;
			R === "row-number" ? B.rowNumber = V : R === "key" ? B.key = V : R === "context" ? B.context = V : R && R.startsWith("values.") && B.languages.push(V);
		}), B.rowNumber > 0 && B.key > 0 && B.context > 0 && B.languages.length === this.options.languages.length ? B : null;
	}
	startEditing(u, R, B) {
		if (this.options.readOnly) return;
		let V = B.getAttribute("data-row-id");
		V && (this.cellEditor.startEditing(u, R, V, B), this.updateStatusBar());
	}
	startEditingFromKeyboard(u, R) {
		if (!this.bodyElement || !this.editableColumns.has(R) || this.options.readOnly) return;
		let B = this.bodyElement.querySelector(`[data-row-index="${u}"][data-column-id="${R}"]`);
		B && this.startEditing(u, R, B);
	}
	stopEditing() {
		this.cellEditor.stopEditing(this.bodyElement || void 0), this.updateStatusBar();
	}
	updateCellStyle(u, R, B) {
		if (!this.bodyElement) return;
		let V = B || this.bodyElement.querySelector(`[data-row-id="${u}"][data-column-id="${R}"]`);
		if (!V) return;
		let H = `${u}-${R}`;
		if (this.changeTracker.getChangesMap().has(H) ? V.classList.add("cell-dirty") : V.classList.remove("cell-dirty"), R.startsWith("values.")) {
			let B = this.currentTranslations.find((R) => R.id === u);
			if (B) {
				let u = R.replace("values.", ""), H = B.values[u] || "";
				!H || typeof H == "string" && H.trim() === "" ? V.classList.add("cell-empty") : V.classList.remove("cell-empty");
			}
		}
	}
	attachKeyboardListeners() {
		this.modifierKeyTracker.attach(), this.keyboardHandlerModule.attach(), this.vimKeyboardHandler = this.handleVimKeyboardEvent.bind(this), document.addEventListener("keydown", this.vimKeyboardHandler);
	}
	handleVimKeyboardEvent(u) {
		if (this.commandLine?.getVisible() || this.cellEditor.getEditingCell() !== null || this.quickSearchUI?.isSearchMode() || this.commandPalette.isPaletteOpen() || document.querySelector(".find-replace-overlay")) return;
		let R = u.target;
		if (!(R.tagName === "INPUT" || R.tagName === "TEXTAREA" || R.isContentEditable) && !(u.ctrlKey || u.metaKey || u.altKey)) {
			if (u.key === ":" || u.code === "Semicolon") {
				u.preventDefault(), u.stopPropagation(), this.commandLine && (this.vimCommandTracker && (this.vimCommandTracker.clear(), this.updateStatusBar()), this.commandLine.show());
				return;
			}
			if (u.key === "Escape") {
				if (this.commandLine?.getVisible()) {
					u.preventDefault(), u.stopPropagation(), this.commandLine.hide();
					return;
				}
				this.vimCommandTracker && (this.vimCommandTracker.cancelCommand(), this.updateStatusBar());
				return;
			}
			u.key.length === 1 && !u.shiftKey && !u.ctrlKey && !u.metaKey && !u.altKey && this.vimCommandTracker && (this.vimCommandTracker.addKey(u.key), this.updateStatusBar());
		}
	}
	focusCell(u, R) {
		if (!this.bodyElement) return;
		this.focusManager.focusCell(u, R), this.updateStatusBar();
		let B = this.bodyElement.querySelector(`[data-row-index="${u}"][data-column-id="${R}"]`);
		if (!B && this.rowVirtualizer) {
			this.rowVirtualizer.scrollToIndex(u, {
				align: "start",
				behavior: "auto"
			}), this.renderScheduled === !1 && this.renderVirtualRows();
			let V = (H = 0) => {
				if (!(H > 20)) {
					if (B = this.bodyElement.querySelector(`[data-row-index="${u}"][data-column-id="${R}"]`), B) {
						B.focus(), B.dispatchEvent(new FocusEvent("focus", { bubbles: !0 }));
						return;
					}
					requestAnimationFrame(() => {
						V(H + 1);
					});
				}
			};
			V(0);
		} else B && (B.focus(), B.dispatchEvent(new FocusEvent("focus", { bubbles: !0 })));
	}
	handleUndo() {
		if (!this.undoRedoManager.canUndo()) return;
		let u = this.undoRedoManager.undo();
		u && (this.applyUndoRedoAction(u), this.updateStatusBar());
	}
	handleRedo() {
		if (!this.undoRedoManager.canRedo()) return;
		let u = this.undoRedoManager.redo();
		u && (this.applyUndoRedoAction(u), this.updateStatusBar());
	}
	applyUndoRedoAction(u) {
		if (u.type !== "cell-change") {
			logger.warn("VirtualTableDiv: Invalid action type", u.type);
			return;
		}
		this.cellEditor.isEditing() && this.stopEditing();
		let R = this.currentTranslations.findIndex((R) => R.id === u.rowId);
		if (R === -1) {
			logger.error("VirtualTableDiv: Translation not found", u.rowId);
			return;
		}
		let B = this.currentTranslations[R], V = toMutableTranslation(B);
		if (u.columnId === "key") V.key = u.newValue;
		else if (u.columnId === "context") V.context = u.newValue;
		else if (u.columnId.startsWith("values.")) {
			let R = u.columnId.replace("values.", "");
			V.values[R] = u.newValue;
		} else {
			logger.error("VirtualTableDiv: Invalid columnId", u.columnId);
			return;
		}
		let H = this.originalTranslations.findIndex((R) => R.id === u.rowId);
		if (H !== -1) {
			let R = this.originalTranslations[H], B = toMutableTranslation(R);
			if (u.columnId === "key") B.key = u.newValue;
			else if (u.columnId === "context") B.context = u.newValue;
			else if (u.columnId.startsWith("values.")) {
				let R = u.columnId.replace("values.", "");
				B.values[R] = u.newValue;
			}
			let V = [...this.originalTranslations];
			V[H] = B, this.originalTranslations = V;
		}
		this.currentTranslations[R] = V;
		let U = this.bodyElement?.querySelector(`[data-row-id="${u.rowId}"][data-column-id="${u.columnId}"]`);
		if (U) {
			let R = U.getAttribute("data-row-index"), B = R ? parseInt(R, 10) : 0;
			this.gridRenderer.updateCellContent(U, u.rowId, u.columnId, u.newValue, B);
		} else this.updateCellStyle(u.rowId, u.columnId);
		let W = this.changeTracker.getOriginalValue(u.rowId, u.columnId), G = getLangFromColumnId(u.columnId), K = getTranslationKey(this.currentTranslations, u.rowId, u.columnId, u.newValue);
		this.changeTracker.trackChange(u.rowId, u.columnId, G, W, u.newValue, K, () => {
			this.updateCellStyle(u.rowId, u.columnId);
		}), this.options.onCellChange && this.options.onCellChange(u.rowId, u.columnId, u.newValue), this.rowVirtualizer && this.bodyElement && this.renderVirtualRows();
	}
	getContainerWidth() {
		return this.container && this.container.clientWidth > 0 ? this.container.clientWidth : typeof window < "u" ? window.innerWidth : 1e3;
	}
	setReadOnly(u) {
		this.options = {
			...this.options,
			readOnly: u
		}, this.gridRenderer = new GridRenderer({
			languages: this.options.languages,
			readOnly: u,
			editableColumns: this.editableColumns,
			callbacks: {
				onCellDblClick: (u, R, B) => {
					this.startEditing(u, R, B);
				},
				onCellFocus: (u, R) => {
					this.focusManager.focusCell(u, R);
				},
				updateCellStyle: (u, R, B) => {
					this.updateCellStyle(u, R, B);
				}
			}
		}), this.gridElement && (u ? this.gridElement.classList.add("readonly") : this.gridElement.classList.remove("readonly")), this.bodyElement && this.bodyElement.querySelectorAll(".virtual-grid-cell").forEach((R) => {
			let B = R.getAttribute("data-column-id"), V = B && this.editableColumns.has(B);
			u ? R.setAttribute("tabindex", "-1") : R.setAttribute("tabindex", V ? "0" : "-1");
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
			execute: (u) => {
				if (u && u.length > 0) {
					let R = u[0].toLowerCase();
					if (R === "top" || R === "first" || R === "1") {
						this.gotoTop();
						return;
					}
					if (R === "bottom" || R === "last") {
						this.gotoBottom();
						return;
					}
					let B = parseInt(u[0], 10);
					!isNaN(B) && B > 0 && this.gotoRow(B - 1);
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
			execute: (u) => {
				if (u && u.length > 0) {
					let R = u.join(" ");
					this.searchKeyword(R);
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
				let u = !this.options.readOnly;
				this.setReadOnly(u);
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
		});
	}
	gotoRow(u) {
		let R = this.getFilteredTranslations();
		if (u < 0 || u >= R.length) return;
		this.rowVirtualizer && this.rowVirtualizer.scrollToIndex(u, {
			align: "start",
			behavior: "smooth"
		});
		let B = [
			"key",
			"context",
			...this.options.languages.map((u) => `values.${u}`)
		].find((u) => this.editableColumns.has(u));
		B && setTimeout(() => {
			this.focusCell(u, B);
		}, 300);
	}
	gotoTop() {
		this.gotoRow(0);
	}
	gotoBottom() {
		let u = this.getFilteredTranslations();
		if (u.length > 0) {
			let R = u.length - 1;
			this.rowVirtualizer && this.rowVirtualizer.scrollToIndex(R, {
				align: "end",
				behavior: "smooth"
			});
			let B = [
				"key",
				"context",
				...this.options.languages.map((u) => `values.${u}`)
			].find((u) => this.editableColumns.has(u));
			B && setTimeout(() => {
				this.focusCell(R, B);
			}, 300);
		}
	}
	findMatches(u) {
		return new TextSearchMatcher({
			translations: this.getFilteredTranslations(),
			languages: this.options.languages
		}).findMatches(u);
	}
	gotoToMatch(u) {
		if (this.gotoRow(u.rowIndex), this.currentGotoMatches) {
			let R = this.currentGotoMatches.matches.findIndex((R) => R.rowIndex === u.rowIndex);
			R !== -1 && (this.currentGotoMatches.currentIndex = R);
		}
	}
	gotoToNextMatch() {
		if (!this.currentGotoMatches || this.currentGotoMatches.matches.length === 0) return;
		let { matches: u, currentIndex: R } = this.currentGotoMatches, B = (R + 1) % u.length, V = u[B];
		this.currentGotoMatches.currentIndex = B, this.gotoRow(V.rowIndex);
	}
	gotoToPrevMatch() {
		if (!this.currentGotoMatches || this.currentGotoMatches.matches.length === 0) return;
		let { matches: u, currentIndex: R } = this.currentGotoMatches, B = R === 0 ? u.length - 1 : R - 1, V = u[B];
		this.currentGotoMatches.currentIndex = B, this.gotoRow(V.rowIndex);
	}
	openFindReplace(u) {
		this.findReplace && this.findReplace.open(u);
	}
	gotoToFindMatch(u) {
		this.gotoRow(u.rowIndex), this.focusCell(u.rowIndex, u.columnId);
	}
	replaceFindMatch(u, R) {
		let B = this.getFilteredTranslations();
		if (u.rowIndex < 0 || u.rowIndex >= B.length) return;
		let V = B[u.rowIndex], H = null;
		if (u.columnId === "key") H = V.key;
		else if (u.columnId === "context") H = V.context || null;
		else if (u.columnId.startsWith("values.")) {
			let R = u.columnId.replace("values.", "");
			H = V.values[R] || null;
		}
		if (H === null) return;
		let U = H.substring(0, u.matchIndex), W = H.substring(u.matchIndex + u.matchLength), G = U + R + W;
		if (u.columnId !== "key") {
			{
				let R = u.columnId, B = "";
				if (R === "context") B = V.context || "";
				else if (R.startsWith("values.")) {
					let u = R.replace("values.", "");
					B = V.values[u] || "";
				}
				this.cellEditor.applyCellChange(V.id, R, B, G).catch((u) => {
					logger.error("Failed to apply cell change:", u);
				});
			}
			this.updateStatusBar(), this.renderVirtualRows();
		}
	}
	replaceAllFindMatches(u, R) {
		[...u].sort((u, R) => u.rowIndex === R.rowIndex ? R.matchIndex - u.matchIndex : R.rowIndex - u.rowIndex).forEach((u) => {
			this.replaceFindMatch(u, R);
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
	searchKeyword(u) {
		this.currentSearchKeyword = u, this.currentFilter = u.trim() ? "search" : "none", this.applyFilter();
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
		let u = document.querySelector(".help-modal-overlay");
		if (u && u.remove(), !document.querySelector("link[href*=\"help-modal.css\"]")) {
			let u = document.createElement("link");
			u.rel = "stylesheet", u.href = new URL("data:text/css;base64,LyoqCiAqIEhlbHAgTW9kYWwg7Iqk7YOA7J28CiAqIFZTIENvZGUg7Iqk7YOA7J287J2YIOuPhOybgOunkCDrqqjri6wKICovCgouaGVscC1tb2RhbC1vdmVybGF5IHsKICBwb3NpdGlvbjogZml4ZWQ7CiAgdG9wOiAwOwogIGxlZnQ6IDA7CiAgcmlnaHQ6IDA7CiAgYm90dG9tOiAwOwogIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC40KTsKICB6LWluZGV4OiAxMDAxOyAvKiBDb21tYW5kIFBhbGV0dGXrs7Tri6Qg7JyE7JeQIO2RnOyLnCAqLwogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICBhbmltYXRpb246IGZhZGVJbiAwLjE1cyBlYXNlLW91dDsKfQoKQGtleWZyYW1lcyBmYWRlSW4gewogIGZyb20gewogICAgb3BhY2l0eTogMDsKICB9CiAgdG8gewogICAgb3BhY2l0eTogMTsKICB9Cn0KCi5oZWxwLW1vZGFsIHsKICB3aWR0aDogOTAlOwogIG1heC13aWR0aDogNzAwcHg7CiAgbWF4LWhlaWdodDogODB2aDsKICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmOwogIGJvcmRlci1yYWRpdXM6IDhweDsKICBib3gtc2hhZG93OiAwIDhweCAzMnB4IHJnYmEoMCwgMCwgMCwgMC4yKTsKICBkaXNwbGF5OiBmbGV4OwogIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47CiAgYW5pbWF0aW9uOiBzbGlkZURvd24gMC4xNXMgZWFzZS1vdXQ7CiAgb3ZlcmZsb3c6IGhpZGRlbjsKfQoKQGtleWZyYW1lcyBzbGlkZURvd24gewogIGZyb20gewogICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0yMHB4KTsKICAgIG9wYWNpdHk6IDA7CiAgfQogIHRvIHsKICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTsKICAgIG9wYWNpdHk6IDE7CiAgfQp9CgouaGVscC1tb2RhbC1oZWFkZXIgewogIHBhZGRpbmc6IDIwcHggMjRweDsKICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2UyZThmMDsKICBkaXNwbGF5OiBmbGV4OwogIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsKICBhbGlnbi1pdGVtczogY2VudGVyOwogIGJhY2tncm91bmQtY29sb3I6ICNmOGZhZmM7Cn0KCi5oZWxwLW1vZGFsLXRpdGxlIHsKICBmb250LXNpemU6IDIwcHg7CiAgZm9udC13ZWlnaHQ6IDYwMDsKICBjb2xvcjogIzFlMjkzYjsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLWNsb3NlIHsKICBiYWNrZ3JvdW5kOiBub25lOwogIGJvcmRlcjogbm9uZTsKICBmb250LXNpemU6IDI0cHg7CiAgY29sb3I6ICM2NDc0OGI7CiAgY3Vyc29yOiBwb2ludGVyOwogIHBhZGRpbmc6IDA7CiAgd2lkdGg6IDMycHg7CiAgaGVpZ2h0OiAzMnB4OwogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICBib3JkZXItcmFkaXVzOiA0cHg7CiAgdHJhbnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciAwLjFzOwp9CgouaGVscC1tb2RhbC1jbG9zZTpob3ZlciB7CiAgYmFja2dyb3VuZC1jb2xvcjogI2UyZThmMDsKICBjb2xvcjogIzFlMjkzYjsKfQoKLmhlbHAtbW9kYWwtY29udGVudCB7CiAgZmxleDogMTsKICBvdmVyZmxvdy15OiBhdXRvOwogIHBhZGRpbmc6IDI0cHg7Cn0KCi5oZWxwLW1vZGFsLXNlY3Rpb24gewogIG1hcmdpbi1ib3R0b206IDMycHg7Cn0KCi5oZWxwLW1vZGFsLXNlY3Rpb246bGFzdC1jaGlsZCB7CiAgbWFyZ2luLWJvdHRvbTogMDsKfQoKLmhlbHAtbW9kYWwtc2VjdGlvbi10aXRsZSB7CiAgZm9udC1zaXplOiAxNnB4OwogIGZvbnQtd2VpZ2h0OiA2MDA7CiAgY29sb3I6ICMxZTI5M2I7CiAgbWFyZ2luOiAwIDAgMTZweCAwOwogIHBhZGRpbmctYm90dG9tOiA4cHg7CiAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNlMmU4ZjA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWxpc3QgewogIGxpc3Qtc3R5bGU6IG5vbmU7CiAgcGFkZGluZzogMDsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWl0ZW0gewogIGRpc3BsYXk6IGZsZXg7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgcGFkZGluZzogMTJweCAwOwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjFmNWY5Owp9CgouaGVscC1tb2RhbC1zaG9ydGN1dC1pdGVtOmxhc3QtY2hpbGQgewogIGJvcmRlci1ib3R0b206IG5vbmU7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWRlc2NyaXB0aW9uIHsKICBmb250LXNpemU6IDE0cHg7CiAgY29sb3I6ICM0NzU1Njk7CiAgZmxleDogMTsKfQoKLmhlbHAtbW9kYWwtc2hvcnRjdXQta2V5cyB7CiAgZGlzcGxheTogZmxleDsKICBnYXA6IDRweDsKICBhbGlnbi1pdGVtczogY2VudGVyOwp9CgouaGVscC1tb2RhbC1zaG9ydGN1dC1rZXkgewogIHBhZGRpbmc6IDRweCA4cHg7CiAgYmFja2dyb3VuZC1jb2xvcjogI2YxZjVmOTsKICBib3JkZXI6IDFweCBzb2xpZCAjZTJlOGYwOwogIGJvcmRlci1yYWRpdXM6IDRweDsKICBmb250LXNpemU6IDEycHg7CiAgZm9udC1mYW1pbHk6IHN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZjsKICBjb2xvcjogIzFlMjkzYjsKICBib3gtc2hhZG93OiAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjEpOwogIGZvbnQtd2VpZ2h0OiA1MDA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWtleS1zZXBhcmF0b3IgewogIGNvbG9yOiAjOTRhM2I4OwogIGZvbnQtc2l6ZTogMTJweDsKICBtYXJnaW46IDAgMnB4Owp9CgouaGVscC1tb2RhbC1jb21tYW5kLWxpc3QgewogIGxpc3Qtc3R5bGU6IG5vbmU7CiAgcGFkZGluZzogMDsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLWNvbW1hbmQtaXRlbSB7CiAgcGFkZGluZzogMTJweCAwOwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjFmNWY5Owp9CgouaGVscC1tb2RhbC1jb21tYW5kLWl0ZW06bGFzdC1jaGlsZCB7CiAgYm9yZGVyLWJvdHRvbTogbm9uZTsKfQoKLmhlbHAtbW9kYWwtY29tbWFuZC1uYW1lIHsKICBmb250LXNpemU6IDE0cHg7CiAgZm9udC13ZWlnaHQ6IDUwMDsKICBjb2xvcjogIzFlMjkzYjsKICBtYXJnaW4tYm90dG9tOiA0cHg7CiAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTsKICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjFmNWY5OwogIHBhZGRpbmc6IDJweCA2cHg7CiAgYm9yZGVyLXJhZGl1czogNHB4OwogIGRpc3BsYXk6IGlubGluZS1ibG9jazsKfQoKLmhlbHAtbW9kYWwtY29tbWFuZC1kZXNjcmlwdGlvbiB7CiAgZm9udC1zaXplOiAxM3B4OwogIGNvbG9yOiAjNjQ3NDhiOwogIG1hcmdpbi10b3A6IDRweDsKfQoKLyog7Iqk7YGs66Gk67CUIOyKpO2DgOydvCAqLwouaGVscC1tb2RhbC1jb250ZW50Ojotd2Via2l0LXNjcm9sbGJhciB7CiAgd2lkdGg6IDhweDsKfQoKLmhlbHAtbW9kYWwtY29udGVudDo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2sgewogIGJhY2tncm91bmQ6ICNmMWY1Zjk7Cn0KCi5oZWxwLW1vZGFsLWNvbnRlbnQ6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHsKICBiYWNrZ3JvdW5kOiAjY2JkNWUxOwogIGJvcmRlci1yYWRpdXM6IDRweDsKfQoKLmhlbHAtbW9kYWwtY29udGVudDo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWI6aG92ZXIgewogIGJhY2tncm91bmQ6ICM5NGEzYjg7Cn0KCgoKCg==", "" + import.meta.url).href, document.head.appendChild(u);
		}
		let R = document.createElement("div");
		R.className = "help-modal-overlay", R.setAttribute("role", "dialog"), R.setAttribute("aria-label", "Keyboard Shortcuts Help"), R.setAttribute("aria-modal", "true");
		let B = document.createElement("div");
		B.className = "help-modal";
		let V = document.createElement("div");
		V.className = "help-modal-header";
		let H = document.createElement("h2");
		H.className = "help-modal-title", H.textContent = "Keyboard Shortcuts";
		let U = document.createElement("button");
		U.className = "help-modal-close", U.innerHTML = "×", U.setAttribute("aria-label", "Close"), U.onclick = () => R.remove(), V.appendChild(H), V.appendChild(U);
		let W = document.createElement("div");
		W.className = "help-modal-content";
		let G = document.createElement("div");
		G.className = "help-modal-section";
		let K = document.createElement("h3");
		K.className = "help-modal-section-title", K.textContent = "Keyboard Shortcuts", G.appendChild(K);
		let q = document.createElement("ul");
		q.className = "help-modal-shortcut-list";
		let J = navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "Cmd" : "Ctrl";
		[
			{
				description: "Open Command Palette",
				keys: [J, "K"]
			},
			{
				description: "Undo",
				keys: [J, "Z"]
			},
			{
				description: "Redo",
				keys: [J, "Y"]
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
		].forEach((u) => {
			let R = document.createElement("li");
			R.className = "help-modal-shortcut-item";
			let B = document.createElement("span");
			B.className = "help-modal-shortcut-description", B.textContent = u.description;
			let V = document.createElement("div");
			V.className = "help-modal-shortcut-keys", u.keys.forEach((u, R) => {
				if (R > 0) {
					let u = document.createElement("span");
					u.className = "help-modal-shortcut-key-separator", u.textContent = "+", V.appendChild(u);
				}
				let B = document.createElement("kbd");
				B.className = "help-modal-shortcut-key", B.textContent = u, V.appendChild(B);
			}), R.appendChild(B), R.appendChild(V), q.appendChild(R);
		}), G.appendChild(q), W.appendChild(G);
		let Y = document.createElement("div");
		Y.className = "help-modal-section";
		let X = document.createElement("h3");
		X.className = "help-modal-section-title", X.textContent = "Available Commands", Y.appendChild(X);
		let Z = document.createElement("ul");
		Z.className = "help-modal-command-list", [
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
		].forEach((u) => {
			let R = document.createElement("li");
			R.className = "help-modal-command-item";
			let B = document.createElement("div");
			B.className = "help-modal-command-name", B.textContent = u.name;
			let V = document.createElement("div");
			V.className = "help-modal-command-description", V.textContent = u.description, R.appendChild(B), R.appendChild(V), Z.appendChild(R);
		}), Y.appendChild(Z), W.appendChild(Y), B.appendChild(V), B.appendChild(W), R.appendChild(B), document.body.appendChild(R), R.addEventListener("click", (u) => {
			u.target === R && R.remove();
		});
		let Q = (u) => {
			u.key === "Escape" && (R.remove(), document.removeEventListener("keydown", Q));
		};
		document.addEventListener("keydown", Q);
		let $ = new MutationObserver(() => {
			document.body.contains(R) || (document.removeEventListener("keydown", Q), $.disconnect());
		});
		$.observe(document.body, {
			childList: !0,
			subtree: !0
		});
	}
	clearChanges() {
		this.changeTracker.clearChanges((u, R) => {
			this.updateCellStyle(u, R);
		});
	}
	openQuickSearch() {
		this.quickSearchUI && this.quickSearchUI.open();
	}
	closeQuickSearch() {
		this.quickSearchUI && this.quickSearchUI.close(), this.currentQuickSearchMatches = [], this.currentQuickSearchIndex = -1, this.bodyElement && this.renderVirtualRows();
	}
	handleQuickSearch(u) {
		if (!this.quickSearch || !this.quickSearchUI) return;
		let R = parseSearchQuery(u);
		if (!R) {
			this.currentQuickSearchMatches = [], this.currentQuickSearchIndex = -1, this.quickSearchUI.updateStatus(0, 0), this.bodyElement && this.renderVirtualRows();
			return;
		}
		let B = this.quickSearch.findMatches(R);
		this.currentQuickSearchMatches = B, this.currentQuickSearchIndex = B.length > 0 ? 0 : -1, B.length > 0 ? (this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, B.length), this.goToQuickSearchMatch(B[0])) : this.quickSearchUI.updateStatus(0, 0), this.bodyElement && this.renderVirtualRows();
	}
	goToNextQuickSearchMatch() {
		if (this.currentQuickSearchMatches.length === 0) return;
		(this.currentQuickSearchIndex < 0 || this.currentQuickSearchIndex >= this.currentQuickSearchMatches.length) && (this.currentQuickSearchIndex = 0), this.currentQuickSearchIndex = (this.currentQuickSearchIndex + 1) % this.currentQuickSearchMatches.length;
		let u = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
		this.goToQuickSearchMatch(u), this.quickSearchUI && this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, this.currentQuickSearchMatches.length);
	}
	goToPrevQuickSearchMatch() {
		if (this.currentQuickSearchMatches.length === 0) return;
		this.currentQuickSearchIndex = this.currentQuickSearchIndex <= 0 ? this.currentQuickSearchMatches.length - 1 : this.currentQuickSearchIndex - 1;
		let u = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
		this.goToQuickSearchMatch(u), this.quickSearchUI && this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, this.currentQuickSearchMatches.length);
	}
	goToQuickSearchMatch(u) {
		if (this.rowVirtualizer && this.scrollElement) if (this.rowVirtualizer.getVirtualItems().find((R) => R.index === u.rowIndex) && this.bodyElement) {
			let R = this.bodyElement.querySelector(`[data-index="${u.rowIndex}"]`);
			R && R.scrollIntoView({
				behavior: "auto",
				block: "center"
			});
		} else {
			let R = u.rowIndex * this.rowHeight;
			this.scrollElement.scrollTop = R - this.scrollElement.clientHeight / 2;
		}
		requestAnimationFrame(() => {
			this.focusCell(u.rowIndex, u.columnId), this.bodyElement && this.renderVirtualRows();
		});
	}
	applyQuickSearchHighlight(u, R) {
		this.currentQuickSearchMatches.length !== 0 && (u.querySelectorAll(".virtual-grid-cell").forEach((u) => {
			u.classList.remove("quick-search-matched", "quick-search-current-match");
			let R = u.querySelector(".virtual-grid-cell-content");
			if (R) {
				let u = R.getAttribute("data-original-text");
				u !== null && (R.textContent = u, R.removeAttribute("data-original-text"));
			}
		}), this.currentQuickSearchMatches.forEach((B) => {
			if (B.rowIndex !== R) return;
			let V = u.querySelector(`[data-column-id="${B.columnId}"]`);
			if (!V) return;
			let H = V.querySelector(".virtual-grid-cell-content");
			H && (H.getAttribute("data-original-text") || H.setAttribute("data-original-text", B.matchedText), H.innerHTML = QuickSearch.highlightText(B.matchedText, B.matchIndices), V.classList.add("quick-search-matched"), this.currentQuickSearchIndex >= 0 && this.currentQuickSearchIndex < this.currentQuickSearchMatches.length && this.currentQuickSearchMatches[this.currentQuickSearchIndex].rowIndex === R && this.currentQuickSearchMatches[this.currentQuickSearchIndex].columnId === B.columnId && V.classList.add("quick-search-current-match"));
		}));
	}
	destroy() {
		this.keyboardHandlerModule && this.keyboardHandlerModule.detach(), this.commandPalette && this.commandPalette.destroy(), this.modifierKeyTracker && this.modifierKeyTracker.detach(), this.columnResizer && this.columnResizer.destroy(), this.quickSearchUI &&= (this.quickSearchUI.destroy(), null), this.findReplace &&= (this.findReplace.destroy(), null), this.resizeObserver &&= (this.resizeObserver.disconnect(), null), this.virtualizerCleanup &&= (this.virtualizerCleanup(), null), this.scrollElement && this.container.contains(this.scrollElement) && this.container.removeChild(this.scrollElement), this.scrollElement = null, this.gridElement = null, this.headerElement = null, this.bodyElement = null, this.rowVirtualizer = null, this.statusBar &&= (this.statusBar.destroy(), null), this.vimKeyboardHandler &&= (document.removeEventListener("keydown", this.vimKeyboardHandler), null), this.commandLine &&= (this.commandLine.destroy(), null), this.vimCommandTracker &&= (this.vimCommandTracker.clear(), null);
	}
	initStatusBar() {
		this.statusBar = new StatusBar(this.container, { onStatusUpdate: () => {} }), this.statusBar.create(), this.updateStatusBar();
	}
	async executeCommandLineCommand(u) {
		let R = u.trim();
		if (!R) return;
		let B = R.split(/\s+/), V = B[0].toLowerCase(), H = B.slice(1);
		if ((V === "goto" || V === "go") && H.length > 0) {
			let u = H[0].toLowerCase();
			if (u === "top" || u === "first" || u === "1") {
				this.gotoTop();
				return;
			}
			if (u === "bottom" || u === "last") {
				this.gotoBottom();
				return;
			}
			let R = parseInt(H[0], 10);
			if (!isNaN(R) && R > 0) {
				this.gotoRow(R - 1);
				return;
			}
		}
		let U = this.commandRegistry.getCommands("all").find((u) => {
			let R = u.id.toLowerCase(), B = u.label.toLowerCase();
			return R === V || B.includes(V) || u.keywords?.some((u) => u.toLowerCase() === V);
		});
		U ? U.execute(H) : logger.warn(`CommandLine: Unknown command: ${V}`);
	}
	updateStatusBar() {
		if (!this.statusBar) return;
		let u = this.cellEditor.getEditingCell() === null ? "Normal" : "Editing", R = this.focusManager.getFocusedCell(), B = this.getFilteredTranslations().length, V = R && typeof R.rowIndex == "number" ? R.rowIndex : null;
		B > 0 ? V === null ? V = 0 : V >= B && (V = B - 1) : V = 0;
		let H = R ? R.columnId : null, U = this.changeTracker.getChanges().length, W = this.countEmptyTranslations(), G = this.countDuplicateKeys(), K = this.vimCommandTracker?.getCurrentCommand(), q = K ? K.sequence : null;
		this.statusBar.update({
			mode: u,
			rowIndex: V,
			totalRows: B,
			columnId: H,
			changesCount: U,
			emptyCount: W,
			duplicateCount: G,
			command: q
		});
	}
	countEmptyTranslations() {
		let u = this.getFilteredTranslations(), R = 0;
		return u.forEach((u) => {
			this.options.languages.forEach((B) => {
				let V = u.values[B] || "";
				(!V || typeof V == "string" && V.trim() === "") && R++;
			});
		}), R;
	}
	countDuplicateKeys() {
		let u = this.getFilteredTranslations(), R = /* @__PURE__ */ new Map();
		u.forEach((u) => {
			let B = u.key.trim();
			B && R.set(B, (R.get(B) || 0) + 1);
		});
		let B = 0;
		return R.forEach((u) => {
			u > 1 && (B += u - 1);
		}), B;
	}
};
export { ChangeTracker, VirtualTableDiv };
