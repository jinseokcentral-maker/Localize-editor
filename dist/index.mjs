import { Data, Effect, Option } from "effect";
import { z } from "zod";
function memo(c, O, k) {
	let A = k.initialDeps ?? [], j, M = !0;
	function N() {
		let N;
		k.key && k.debug?.() && (N = Date.now());
		let P = c();
		if (!(P.length !== A.length || P.some((c, O) => A[O] !== c))) return j;
		A = P;
		let F;
		if (k.key && k.debug?.() && (F = Date.now()), j = O(...P), k.key && k.debug?.()) {
			let c = Math.round((Date.now() - N) * 100) / 100, O = Math.round((Date.now() - F) * 100) / 100, A = O / 16, j = (c, O) => {
				for (c = String(c); c.length < O;) c = " " + c;
				return c;
			};
			console.info(`%c⏱ ${j(O, 5)} /${j(c, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * A, 120))}deg 100% 31%);`, k?.key);
		}
		return k?.onChange && !(M && k.skipInitialOnChange) && k.onChange(j), M = !1, j;
	}
	return N.updateDeps = (c) => {
		A = c;
	}, N;
}
function notUndefined(c, O) {
	if (c === void 0) throw Error(`Unexpected undefined${O ? `: ${O}` : ""}`);
	return c;
}
const approxEqual = (c, O) => Math.abs(c - O) < 1.01, debounce = (c, O, k) => {
	let A;
	return function(...j) {
		c.clearTimeout(A), A = c.setTimeout(() => O.apply(this, j), k);
	};
};
var getRect = (c) => {
	let { offsetWidth: O, offsetHeight: k } = c;
	return {
		width: O,
		height: k
	};
};
const defaultKeyExtractor = (c) => c, defaultRangeExtractor = (c) => {
	let O = Math.max(c.startIndex - c.overscan, 0), k = Math.min(c.endIndex + c.overscan, c.count - 1), A = [];
	for (let c = O; c <= k; c++) A.push(c);
	return A;
}, observeElementRect = (c, O) => {
	let k = c.scrollElement;
	if (!k) return;
	let A = c.targetWindow;
	if (!A) return;
	let j = (c) => {
		let { width: k, height: A } = c;
		O({
			width: Math.round(k),
			height: Math.round(A)
		});
	};
	if (j(getRect(k)), !A.ResizeObserver) return () => {};
	let M = new A.ResizeObserver((O) => {
		let A = () => {
			let c = O[0];
			if (c?.borderBoxSize) {
				let O = c.borderBoxSize[0];
				if (O) {
					j({
						width: O.inlineSize,
						height: O.blockSize
					});
					return;
				}
			}
			j(getRect(k));
		};
		c.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(A) : A();
	});
	return M.observe(k, { box: "border-box" }), () => {
		M.unobserve(k);
	};
};
var addEventListenerOptions = { passive: !0 }, supportsScrollend = typeof window > "u" ? !0 : "onscrollend" in window;
const observeElementOffset = (c, O) => {
	let k = c.scrollElement;
	if (!k) return;
	let A = c.targetWindow;
	if (!A) return;
	let j = 0, M = c.options.useScrollendEvent && supportsScrollend ? () => void 0 : debounce(A, () => {
		O(j, !1);
	}, c.options.isScrollingResetDelay), N = (A) => () => {
		let { horizontal: N, isRtl: P } = c.options;
		j = N ? k.scrollLeft * (P && -1 || 1) : k.scrollTop, M(), O(j, A);
	}, F = N(!0), I = N(!1);
	I(), k.addEventListener("scroll", F, addEventListenerOptions);
	let L = c.options.useScrollendEvent && supportsScrollend;
	return L && k.addEventListener("scrollend", I, addEventListenerOptions), () => {
		k.removeEventListener("scroll", F), L && k.removeEventListener("scrollend", I);
	};
}, measureElement = (c, O, k) => {
	if (O?.borderBoxSize) {
		let c = O.borderBoxSize[0];
		if (c) return Math.round(c[k.options.horizontal ? "inlineSize" : "blockSize"]);
	}
	return c[k.options.horizontal ? "offsetWidth" : "offsetHeight"];
}, elementScroll = (c, { adjustments: O = 0, behavior: k }, A) => {
	let j = c + O;
	A.scrollElement?.scrollTo?.({
		[A.options.horizontal ? "left" : "top"]: j,
		behavior: k
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
		let c = null, O = () => c || (!this.targetWindow || !this.targetWindow.ResizeObserver ? null : c = new this.targetWindow.ResizeObserver((c) => {
			c.forEach((c) => {
				let O = () => {
					this._measureElement(c.target, c);
				};
				this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(O) : O();
			});
		}));
		return {
			disconnect: () => {
				O()?.disconnect(), c = null;
			},
			observe: (c) => O()?.observe(c, { box: "border-box" }),
			unobserve: (c) => O()?.unobserve(c)
		};
	})();
	range = null;
	constructor(c) {
		this.setOptions(c);
	}
	setOptions = (c) => {
		Object.entries(c).forEach(([O, k]) => {
			k === void 0 && delete c[O];
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
			})), this.unsubs.push(this.options.observeElementOffset(this, (c, O) => {
				this.scrollAdjustments = 0, this.scrollDirection = O ? this.getScrollOffset() < c ? "forward" : "backward" : null, this.scrollOffset = c, this.isScrolling = O, this.maybeNotify();
			}));
		}
	};
	getSize = () => this.options.enabled ? (this.scrollRect = this.scrollRect ?? this.options.initialRect, this.scrollRect[this.options.horizontal ? "width" : "height"]) : (this.scrollRect = null, 0);
	getScrollOffset = () => this.options.enabled ? (this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset == "function" ? this.options.initialOffset() : this.options.initialOffset), this.scrollOffset) : (this.scrollOffset = null, 0);
	getFurthestMeasurement = (c, O) => {
		let k = /* @__PURE__ */ new Map(), A = /* @__PURE__ */ new Map();
		for (let j = O - 1; j >= 0; j--) {
			let O = c[j];
			if (k.has(O.lane)) continue;
			let M = A.get(O.lane);
			if (M == null || O.end > M.end ? A.set(O.lane, O) : O.end < M.end && k.set(O.lane, !0), k.size === this.options.lanes) break;
		}
		return A.size === this.options.lanes ? Array.from(A.values()).sort((c, O) => c.end === O.end ? c.index - O.index : c.end - O.end)[0] : void 0;
	};
	getMeasurementOptions = memo(() => [
		this.options.count,
		this.options.paddingStart,
		this.options.scrollMargin,
		this.options.getItemKey,
		this.options.enabled,
		this.options.lanes
	], (c, O, k, A, j, M) => (this.prevLanes !== void 0 && this.prevLanes !== M && (this.lanesChangedFlag = !0), this.prevLanes = M, this.pendingMeasuredCacheIndexes = [], {
		count: c,
		paddingStart: O,
		scrollMargin: k,
		getItemKey: A,
		enabled: j,
		lanes: M
	}), {
		key: !1,
		skipInitialOnChange: !0,
		onChange: () => {
			this.notify(this.isScrolling);
		}
	});
	getMeasurements = memo(() => [this.getMeasurementOptions(), this.itemSizeCache], ({ count: c, paddingStart: O, scrollMargin: k, getItemKey: A, enabled: j, lanes: M }, N) => {
		if (!j) return this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), [];
		if (this.laneAssignments.size > c) for (let O of this.laneAssignments.keys()) O >= c && this.laneAssignments.delete(O);
		this.lanesChangedFlag && (this.lanesChangedFlag = !1, this.lanesSettling = !0, this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), this.pendingMeasuredCacheIndexes = []), this.measurementsCache.length === 0 && (this.measurementsCache = this.options.initialMeasurementsCache, this.measurementsCache.forEach((c) => {
			this.itemSizeCache.set(c.key, c.size);
		}));
		let P = this.lanesSettling ? 0 : this.pendingMeasuredCacheIndexes.length > 0 ? Math.min(...this.pendingMeasuredCacheIndexes) : 0;
		this.pendingMeasuredCacheIndexes = [], this.lanesSettling && this.measurementsCache.length === c && (this.lanesSettling = !1);
		let F = this.measurementsCache.slice(0, P), I = Array(M).fill(void 0);
		for (let c = 0; c < P; c++) {
			let O = F[c];
			O && (I[O.lane] = c);
		}
		for (let j = P; j < c; j++) {
			let c = A(j), M = this.laneAssignments.get(j), P, L;
			if (M !== void 0 && this.options.lanes > 1) {
				P = M;
				let c = I[P], A = c === void 0 ? void 0 : F[c];
				L = A ? A.end + this.options.gap : O + k;
			} else {
				let c = this.options.lanes === 1 ? F[j - 1] : this.getFurthestMeasurement(F, j);
				L = c ? c.end + this.options.gap : O + k, P = c ? c.lane : j % this.options.lanes, this.options.lanes > 1 && this.laneAssignments.set(j, P);
			}
			let R = N.get(c), B = typeof R == "number" ? R : this.options.estimateSize(j), V = L + B;
			F[j] = {
				index: j,
				start: L,
				size: B,
				end: V,
				key: c,
				lane: P
			}, I[P] = j;
		}
		return this.measurementsCache = F, F;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	calculateRange = memo(() => [
		this.getMeasurements(),
		this.getSize(),
		this.getScrollOffset(),
		this.options.lanes
	], (c, O, k, A) => this.range = c.length > 0 && O > 0 ? calculateRange({
		measurements: c,
		outerSize: O,
		scrollOffset: k,
		lanes: A
	}) : null, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualIndexes = memo(() => {
		let c = null, O = null, k = this.calculateRange();
		return k && (c = k.startIndex, O = k.endIndex), this.maybeNotify.updateDeps([
			this.isScrolling,
			c,
			O
		]), [
			this.options.rangeExtractor,
			this.options.overscan,
			this.options.count,
			c,
			O
		];
	}, (c, O, k, A, j) => A === null || j === null ? [] : c({
		startIndex: A,
		endIndex: j,
		overscan: O,
		count: k
	}), {
		key: !1,
		debug: () => this.options.debug
	});
	indexFromElement = (c) => {
		let O = this.options.indexAttribute, k = c.getAttribute(O);
		return k ? parseInt(k, 10) : (console.warn(`Missing attribute name '${O}={index}' on measured element.`), -1);
	};
	_measureElement = (c, O) => {
		let k = this.indexFromElement(c), A = this.measurementsCache[k];
		if (!A) return;
		let j = A.key, M = this.elementsCache.get(j);
		M !== c && (M && this.observer.unobserve(M), this.observer.observe(c), this.elementsCache.set(j, c)), c.isConnected && this.resizeItem(k, this.options.measureElement(c, O, this));
	};
	resizeItem = (c, O) => {
		let k = this.measurementsCache[c];
		if (!k) return;
		let A = O - (this.itemSizeCache.get(k.key) ?? k.size);
		A !== 0 && ((this.shouldAdjustScrollPositionOnItemSizeChange === void 0 ? k.start < this.getScrollOffset() + this.scrollAdjustments : this.shouldAdjustScrollPositionOnItemSizeChange(k, A, this)) && this._scrollToOffset(this.getScrollOffset(), {
			adjustments: this.scrollAdjustments += A,
			behavior: void 0
		}), this.pendingMeasuredCacheIndexes.push(k.index), this.itemSizeCache = new Map(this.itemSizeCache.set(k.key, O)), this.notify(!1));
	};
	measureElement = (c) => {
		if (!c) {
			this.elementsCache.forEach((c, O) => {
				c.isConnected || (this.observer.unobserve(c), this.elementsCache.delete(O));
			});
			return;
		}
		this._measureElement(c, void 0);
	};
	getVirtualItems = memo(() => [this.getVirtualIndexes(), this.getMeasurements()], (c, O) => {
		let k = [];
		for (let A = 0, j = c.length; A < j; A++) {
			let j = O[c[A]];
			k.push(j);
		}
		return k;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualItemForOffset = (c) => {
		let O = this.getMeasurements();
		if (O.length !== 0) return notUndefined(O[findNearestBinarySearch(0, O.length - 1, (c) => notUndefined(O[c]).start, c)]);
	};
	getOffsetForAlignment = (c, O, k = 0) => {
		let A = this.getSize(), j = this.getScrollOffset();
		O === "auto" && (O = c >= j + A ? "end" : "start"), O === "center" ? c += (k - A) / 2 : O === "end" && (c -= A);
		let M = this.getTotalSize() + this.options.scrollMargin - A;
		return Math.max(Math.min(M, c), 0);
	};
	getOffsetForIndex = (c, O = "auto") => {
		c = Math.max(0, Math.min(c, this.options.count - 1));
		let k = this.measurementsCache[c];
		if (!k) return;
		let A = this.getSize(), j = this.getScrollOffset();
		if (O === "auto") if (k.end >= j + A - this.options.scrollPaddingEnd) O = "end";
		else if (k.start <= j + this.options.scrollPaddingStart) O = "start";
		else return [j, O];
		let M = O === "end" ? k.end + this.options.scrollPaddingEnd : k.start - this.options.scrollPaddingStart;
		return [this.getOffsetForAlignment(M, O, k.size), O];
	};
	isDynamicMode = () => this.elementsCache.size > 0;
	scrollToOffset = (c, { align: O = "start", behavior: k } = {}) => {
		k === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getOffsetForAlignment(c, O), {
			adjustments: void 0,
			behavior: k
		});
	};
	scrollToIndex = (c, { align: O = "auto", behavior: k } = {}) => {
		k === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), c = Math.max(0, Math.min(c, this.options.count - 1));
		let A = 0, j = (O) => {
			if (!this.targetWindow) return;
			let A = this.getOffsetForIndex(c, O);
			if (!A) {
				console.warn("Failed to get offset for index:", c);
				return;
			}
			let [j, P] = A;
			this._scrollToOffset(j, {
				adjustments: void 0,
				behavior: k
			}), this.targetWindow.requestAnimationFrame(() => {
				let O = this.getScrollOffset(), k = this.getOffsetForIndex(c, P);
				if (!k) {
					console.warn("Failed to get offset for index:", c);
					return;
				}
				approxEqual(k[0], O) || M(P);
			});
		}, M = (O) => {
			this.targetWindow && (A++, A < 10 ? this.targetWindow.requestAnimationFrame(() => j(O)) : console.warn(`Failed to scroll to index ${c} after 10 attempts.`));
		};
		j(O);
	};
	scrollBy = (c, { behavior: O } = {}) => {
		O === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getScrollOffset() + c, {
			adjustments: void 0,
			behavior: O
		});
	};
	getTotalSize = () => {
		let c = this.getMeasurements(), O;
		if (c.length === 0) O = this.options.paddingStart;
		else if (this.options.lanes === 1) O = c[c.length - 1]?.end ?? 0;
		else {
			let k = Array(this.options.lanes).fill(null), A = c.length - 1;
			for (; A >= 0 && k.some((c) => c === null);) {
				let O = c[A];
				k[O.lane] === null && (k[O.lane] = O.end), A--;
			}
			O = Math.max(...k.filter((c) => c !== null));
		}
		return Math.max(O - this.options.scrollMargin + this.options.paddingEnd, 0);
	};
	_scrollToOffset = (c, { adjustments: O, behavior: k }) => {
		this.options.scrollToFn(c, {
			behavior: k,
			adjustments: O
		}, this);
	};
	measure = () => {
		this.itemSizeCache = /* @__PURE__ */ new Map(), this.laneAssignments = /* @__PURE__ */ new Map(), this.notify(!1);
	};
}, findNearestBinarySearch = (c, O, k, A) => {
	for (; c <= O;) {
		let j = (c + O) / 2 | 0, M = k(j);
		if (M < A) c = j + 1;
		else if (M > A) O = j - 1;
		else return j;
	}
	return c > 0 ? c - 1 : 0;
};
function calculateRange({ measurements: c, outerSize: O, scrollOffset: k, lanes: A }) {
	let j = c.length - 1, M = (O) => c[O].start;
	if (c.length <= A) return {
		startIndex: 0,
		endIndex: j
	};
	let N = findNearestBinarySearch(0, j, M, k), P = N;
	if (A === 1) for (; P < j && c[P].end < k + O;) P++;
	else if (A > 1) {
		let M = Array(A).fill(0);
		for (; P < j && M.some((c) => c < k + O);) {
			let O = c[P];
			M[O.lane] = O.end, P++;
		}
		let F = Array(A).fill(k + O);
		for (; N >= 0 && F.some((c) => c >= k);) {
			let O = c[N];
			F[O.lane] = O.start, N--;
		}
		N = Math.max(0, N - N % A), P = Math.min(j, P + (A - 1 - P % A));
	}
	return {
		startIndex: N,
		endIndex: P
	};
}
var ChangeTrackerError = class extends Data.TaggedError("ChangeTrackerError") {}, ValidationError = class extends Data.TaggedError("ValidationError") {};
const RowIdSchema = z.string().min(1, "Row ID must not be empty"), FieldSchema = z.string().refine((c) => c === "key" || c === "context" || c.startsWith("values."), { message: "Field must be 'key', 'context', or start with 'values.'" }), LangSchema = z.string().min(1, "Language code must not be empty");
z.string().regex(/^.+-.+$/, "Change key must be in format 'rowId-field'");
function validateWithEffect(c, k, j) {
	return Effect.try({
		try: () => c.parse(k),
		catch: (c) => c instanceof z.ZodError ? new ValidationError({
			message: j || "Validation failed",
			issues: c.issues.map((c) => ({
				path: c.path.map(String),
				message: c.message
			}))
		}) : new ValidationError({
			message: j || "Validation failed",
			issues: [{
				path: [],
				message: String(c)
			}]
		})
	});
}
const defaultConfig = { enableValidation: !1 };
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
	initializeOriginalData(c, k) {
		if (this.config.enableValidation) {
			for (let c of k) {
				let k = validateWithEffect(LangSchema, c, `Invalid language code: ${c}`);
				Effect.runSync(k);
			}
			for (let k of c) {
				let c = validateWithEffect(RowIdSchema, k.id, `Invalid row ID: ${k.id}`);
				Effect.runSync(c), (typeof k.key != "string" || k.key.length === 0) && Effect.runSync(Effect.fail(new ChangeTrackerError({
					message: `Invalid key for translation ${k.id}`,
					code: "INVALID_CHANGE_DATA"
				})));
			}
		}
		this.originalData.clear(), this.changes.clear(), c.forEach((c) => {
			let O = /* @__PURE__ */ new Map();
			O.set("key", c.key), O.set("context", c.context || ""), k.forEach((k) => {
				O.set(`values.${k}`, c.values[k] || "");
			}), this.originalData.set(c.id, O);
		});
	}
	getOriginalValueEffect(c, A) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, c, "Invalid row ID"), (c) => Effect.flatMap(validateWithEffect(FieldSchema, A, "Invalid field"), (A) => {
			let j = this.originalData.get(c);
			if (!j) return Effect.fail(new ChangeTrackerError({
				message: `Original data not found for row ID: ${c}`,
				code: "ORIGINAL_DATA_NOT_FOUND"
			}));
			let M = j.get(A);
			return Effect.succeed(Option.fromNullable(M));
		}));
	}
	getOriginalValue(c, A) {
		if (!this.config.enableValidation) return this.originalData.get(c)?.get(A) ?? "";
		let j = this.getOriginalValueEffect(c, A);
		return Effect.runSync(Effect.match(j, {
			onFailure: () => "",
			onSuccess: (c) => Option.getOrElse(c, () => "")
		}));
	}
	trackChangeEffect(c, k, A, j, M, N) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, c, "Invalid row ID"), (c) => Effect.flatMap(validateWithEffect(FieldSchema, k, "Invalid field"), (k) => Effect.flatMap(validateWithEffect(LangSchema, A, "Invalid language code"), (A) => {
			if (typeof N != "string" || N.length === 0) return Effect.fail(new ChangeTrackerError({
				message: "Key must be a non-empty string",
				code: "INVALID_CHANGE_DATA"
			}));
			let P = `${c}-${k}`;
			if (j === M) return this.changes.delete(P), Effect.void;
			let F = {
				id: c,
				key: N,
				lang: A,
				oldValue: j,
				newValue: M
			};
			return this.changes.set(P, F), Effect.void;
		})));
	}
	trackChange(c, k, A, j, M, N, P) {
		if (!this.config.enableValidation) {
			let O = `${c}-${k}`;
			if (j === M) {
				this.changes.delete(O), P && P(c, k, !1);
				return;
			}
			let F = {
				id: c,
				key: N,
				lang: A,
				oldValue: j,
				newValue: M
			};
			this.changes.set(O, F), P && P(c, k, !0);
			return;
		}
		let F = this.trackChangeEffect(c, k, A, j, M, N);
		Effect.runSync(Effect.either(F))._tag === "Right" && P && P(c, k, j !== M);
	}
	hasChangeEffect(c, k) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, c, "Invalid row ID"), (c) => Effect.flatMap(validateWithEffect(FieldSchema, k, "Invalid field"), (k) => {
			let A = `${c}-${k}`;
			return Effect.succeed(this.changes.has(A));
		}));
	}
	hasChange(c, k) {
		if (!this.config.enableValidation) {
			let O = `${c}-${k}`;
			return this.changes.has(O);
		}
		let A = this.hasChangeEffect(c, k);
		return Effect.runSync(Effect.match(A, {
			onFailure: () => !1,
			onSuccess: (c) => c
		}));
	}
	getChanges() {
		return Array.from(this.changes.values());
	}
	clearChanges(c) {
		c && this.changes.forEach((O, k) => {
			let [A, j] = k.split("-", 2);
			c(A, j, !1);
		}), this.changes.clear();
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
	focusCell(c, O) {
		this.focusedCell = {
			rowIndex: c,
			columnId: O
		};
	}
	blur() {
		this.focusedCell = null;
	}
	hasFocus() {
		return this.focusedCell !== null;
	}
};
function getLangFromColumnId(c) {
	return c === "key" ? "key" : c === "context" ? "context" : c.startsWith("values.") ? c.replace("values.", "") : c;
}
function getTranslationKey(c, O, k, A) {
	return k === "key" ? A : c.find((c) => c.id === O)?.key || "";
}
function checkKeyDuplicate(c, O, k) {
	return c.some((c) => c.id !== O && c.key.trim() === k.trim());
}
var CellEditorError = class extends Error {
	constructor(c, O) {
		super(c), this.code = O, this.name = "CellEditorError";
	}
}, CellEditor = class {
	editingCell = null;
	isEscapeKeyPressed = !1;
	isFinishingEdit = !1;
	constructor(c, O, k, A = {}) {
		this.translations = c, this.changeTracker = O, this.undoRedoManager = k, this.callbacks = A;
	}
	getEditingCell() {
		return this.editingCell;
	}
	isEditing() {
		return this.editingCell !== null;
	}
	startEditingEffect(c, k, A, j) {
		this.editingCell && this.stopEditing();
		let M = j.querySelector(".virtual-grid-cell-content");
		if (!M) return Effect.fail(new CellEditorError("Cell content not found", "TRANSLATION_NOT_FOUND"));
		let N = M.textContent || "", P = this.createEditInput(N);
		j.innerHTML = "", j.appendChild(P), requestAnimationFrame(() => {
			P.focus(), P.select();
		}), this.editingCell = {
			rowIndex: c,
			columnId: k,
			rowId: A
		};
		let F = !1;
		if (k === "key") {
			let c = () => {
				let c = P.value.trim();
				F = !1, j.classList.remove("cell-duplicate-key"), c && checkKeyDuplicate(this.translations, A, c) && (F = !0, j.classList.add("cell-duplicate-key"));
			};
			P.addEventListener("input", c), c();
		}
		return this.attachInputListeners(P, j, (c) => {
			if (this.isFinishingEdit) return;
			this.isFinishingEdit = !0, c && k === "key" && F && (c = !1), c && P.value !== N && this.applyCellChange(A, k, N, P.value).catch((c) => {
				console.error("Failed to apply cell change:", c);
			});
			let O = c ? P.value : N;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(j, A, k, O), this.editingCell = null, this.isFinishingEdit = !1;
		}, k, N, A), Effect.void;
	}
	startEditing(c, O, k, A) {
		this.editingCell && this.stopEditing();
		let j = A.querySelector(".virtual-grid-cell-content");
		if (!j) return;
		let M = j.textContent || "", N = this.createEditInput(M);
		A.innerHTML = "", A.appendChild(N), requestAnimationFrame(() => {
			N.focus(), N.select();
		}), this.editingCell = {
			rowIndex: c,
			columnId: O,
			rowId: k
		};
		let P = !1;
		if (O === "key") {
			let c = () => {
				let c = N.value.trim();
				P = !1, A.classList.remove("cell-duplicate-key"), c && checkKeyDuplicate(this.translations, k, c) && (P = !0, A.classList.add("cell-duplicate-key"));
			};
			N.addEventListener("input", c), c();
		}
		this.attachInputListeners(N, A, (c) => {
			if (this.isFinishingEdit) return;
			this.isFinishingEdit = !0, c && O === "key" && P && (c = !1), c && N.value !== M && this.applyCellChange(k, O, M, N.value).catch((c) => {
				console.error("Failed to apply cell change:", c);
			});
			let j = c ? N.value : M;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(A, k, O, j), this.editingCell = null, this.isFinishingEdit = !1;
		}, O, M, k);
	}
	attachInputListeners(c, O, k, A, j, M) {
		c.addEventListener("blur", () => {
			this.isFinishingEdit || (this.isEscapeKeyPressed ? (k(!1), this.isEscapeKeyPressed = !1) : k(!0));
		}), c.addEventListener("beforeinput", (c) => {
			(c.inputType === "historyUndo" || c.inputType === "historyRedo") && (c.preventDefault(), k(!0));
		}), c.addEventListener("keydown", (O) => {
			O.key === "Enter" ? (O.preventDefault(), O.stopPropagation(), k(!0), c.blur()) : O.key === "Escape" ? (O.preventDefault(), O.stopPropagation(), this.isEscapeKeyPressed = !0, c.blur()) : O.key === "Tab" && (O.preventDefault(), O.stopPropagation(), k(!0), c.blur());
		});
	}
	applyCellChangeEffect(c, k, A, j) {
		let M = this.translations.find((O) => O.id === c);
		if (!M) return Effect.fail(new CellEditorError(`Translation not found: ${c}`, "TRANSLATION_NOT_FOUND"));
		let N = M;
		if (k === "key") N.key = j;
		else if (k === "context") N.context = j;
		else if (k.startsWith("values.")) {
			let c = k.replace("values.", "");
			N.values[c] = j;
		} else return Effect.fail(new CellEditorError(`Invalid column ID: ${k}`, "INVALID_COLUMN_ID"));
		this.undoRedoManager.push({
			type: "cell-change",
			rowId: c,
			columnId: k,
			oldValue: A,
			newValue: j
		});
		let P = this.changeTracker.getOriginalValue(c, k), F = getLangFromColumnId(k), I = getTranslationKey(this.translations, c, k, j);
		return this.changeTracker.trackChange(c, k, F, P, j, I, () => {
			this.callbacks.updateCellStyle && this.callbacks.updateCellStyle(c, k);
		}), this.callbacks.onCellChange && this.callbacks.onCellChange(c, k, j), Effect.void;
	}
	async applyCellChange(c, k, A, j) {
		let M = this.applyCellChangeEffect(c, k, A, j);
		return Effect.runPromise(M);
	}
	stopEditingEffect(c) {
		return this.editingCell && this.stopEditing(c), Effect.void;
	}
	stopEditing(c) {
		if (!this.editingCell || !c) {
			this.editingCell = null;
			return;
		}
		let O = c.querySelector(`[data-row-index="${this.editingCell.rowIndex}"]`);
		if (O) {
			let c = O.querySelector(`[data-column-id="${this.editingCell.columnId}"]`);
			if (c) {
				let O = c.querySelector("input");
				if (O) {
					let k = c.getAttribute("data-row-id"), A = this.editingCell.columnId, j = O.value;
					this.isFinishingEdit = !0, this.callbacks.updateCellContent && k && this.callbacks.updateCellContent(c, k, A, j), this.isFinishingEdit = !1;
				}
			}
		}
		this.editingCell = null;
	}
	createEditInput(c) {
		let O = document.createElement("input");
		return O.type = "text", O.value = c, O.className = "virtual-grid-cell-input", O.style.width = "100%", O.style.height = "100%", O.style.border = "2px solid #3b82f6", O.style.outline = "none", O.style.padding = "4px 8px", O.style.fontSize = "14px", O.style.fontFamily = "inherit", O.style.backgroundColor = "#fff", O;
	}
	setEscapeKeyPressed(c) {
		this.isEscapeKeyPressed = c;
	}
}, KeyboardHandler = class {
	keyboardHandler = null;
	modifierKeyTracker;
	focusManager;
	constructor(c, O, k = {}) {
		this.callbacks = k, this.modifierKeyTracker = c, this.focusManager = O;
	}
	attach() {
		this.keyboardHandler || (this.keyboardHandler = (c) => {
			let O = this.modifierKeyTracker.isModifierPressed(c), k = c.target, A = k.tagName === "INPUT" || k.tagName === "TEXTAREA" || k.isContentEditable, j = (c.key === "z" || c.key === "Z" || c.code === "KeyZ") && !c.shiftKey;
			if (O && j) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onUndo && this.callbacks.onUndo();
				return;
			}
			let M = c.key === "y" || c.key === "Y" || c.code === "KeyY" || (c.key === "z" || c.key === "Z" || c.code === "KeyZ") && c.shiftKey;
			if (O && M) {
				c.preventDefault(), c.stopPropagation(), this.callbacks.onRedo && this.callbacks.onRedo();
				return;
			}
			this.focusManager.hasFocus() && !A && this.handleKeyboardNavigation(c);
		}, document.addEventListener("keydown", this.keyboardHandler, !0));
	}
	detach() {
		this.keyboardHandler &&= (document.removeEventListener("keydown", this.keyboardHandler, !0), null);
	}
	handleKeyboardNavigation(c) {
		let O = this.focusManager.getFocusedCell();
		if (!O || !this.callbacks.getAllColumns || !this.callbacks.focusCell) return;
		let { rowIndex: k, columnId: A } = O, j = this.callbacks.getAllColumns(), M = this.callbacks.getMaxRowIndex ? this.callbacks.getMaxRowIndex() : Infinity, N = j.indexOf(A);
		if (N < 0) return;
		let P = k, F = N;
		c.key === "Tab" && (c.preventDefault(), c.stopPropagation(), c.shiftKey ? N > 0 ? F = N - 1 : k > 0 ? (P = k - 1, F = j.length - 1) : (P = M, F = j.length - 1) : N < j.length - 1 ? F = N + 1 : k < M ? (P = k + 1, F = 0) : (P = 0, F = 0)), c.key === "Enter" && A.startsWith("values.") && (c.preventDefault(), c.stopPropagation(), c.shiftKey ? k > 0 && (P = k - 1) : k < M && (P = k + 1)), c.key.startsWith("Arrow") && (c.preventDefault(), c.stopPropagation(), c.key === "ArrowRight" && N < j.length - 1 ? F = N + 1 : c.key === "ArrowLeft" && N > 0 ? F = N - 1 : c.key === "ArrowDown" && k < M ? P = k + 1 : c.key === "ArrowUp" && k > 0 && (P = k - 1));
		let I = j[F];
		I && (this.focusManager.focusCell(P, I), this.callbacks.focusCell(P, I), this.callbacks.onNavigate && this.callbacks.onNavigate(P, I));
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
	constructor(c) {
		this.options = c;
	}
	addResizeHandle(c, O) {
		let k = document.createElement("div");
		k.className = "column-resize-handle", k.setAttribute("data-column-id", O), k.style.position = "absolute", k.style.right = "-2px", k.style.top = "0", k.style.bottom = "0", k.style.width = "4px", k.style.cursor = "col-resize", k.style.zIndex = "25", k.style.backgroundColor = "transparent", k.addEventListener("mousedown", (k) => {
			k.preventDefault(), k.stopPropagation(), this.startResize(O, k.clientX, c);
		}), c.appendChild(k);
	}
	startResize(c, O, k) {
		this.isResizing = !0, this.resizeStartX = O, this.resizeStartWidth = k.offsetWidth || k.getBoundingClientRect().width, this.resizeColumnId = c, this.options.callbacks.onResizeStart && this.options.callbacks.onResizeStart(c), this.resizeHandler = (c) => {
			!this.isResizing || !this.resizeColumnId || (c.preventDefault(), this.handleResize(c.clientX));
		}, this.resizeEndHandler = (c) => {
			this.isResizing && (c.preventDefault(), this.endResize());
		}, document.addEventListener("mousemove", this.resizeHandler, !0), document.addEventListener("mouseup", this.resizeEndHandler, !0), document.body.style.cursor = "col-resize", document.body.style.userSelect = "none";
	}
	handleResize(c) {
		if (!this.resizeColumnId) return;
		let O = c - this.resizeStartX, k = this.options.columnMinWidths.get(this.resizeColumnId) || 80, A = Math.max(k, this.resizeStartWidth + O), j = `values.${this.options.languages[this.options.languages.length - 1]}`;
		this.resizeColumnId !== j && this.options.columnWidths.set(this.resizeColumnId, A), this.options.callbacks.onResize && this.options.callbacks.onResize(this.resizeColumnId, A);
	}
	endResize() {
		this.resizeHandler &&= (document.removeEventListener("mousemove", this.resizeHandler, !0), null), this.resizeEndHandler &&= (document.removeEventListener("mouseup", this.resizeEndHandler, !0), null), document.body.style.cursor = "", document.body.style.userSelect = "";
		let c = this.resizeColumnId, O = c && this.options.columnWidths.get(c) || this.resizeStartWidth;
		this.isResizing = !1, this.resizeColumnId = null, c && this.options.callbacks.onResizeEnd && this.options.callbacks.onResizeEnd(c, O);
	}
	isResizingActive() {
		return this.isResizing;
	}
	reset() {
		this.isResizing && this.endResize();
	}
}, ColumnWidthCalculator = class {
	defaultKeyWidth;
	defaultContextWidth;
	defaultLangWidth;
	constructor(c) {
		this.options = c, this.defaultKeyWidth = c.defaultKeyWidth ?? 200, this.defaultContextWidth = c.defaultContextWidth ?? 200, this.defaultLangWidth = c.defaultLangWidth ?? 150;
	}
	getColumnWidthValue(c, O) {
		return this.options.columnWidths.get(c) || O || this.getDefaultWidth(c);
	}
	getDefaultWidth(c) {
		return c === "key" ? this.defaultKeyWidth : c === "context" ? this.defaultContextWidth : this.defaultLangWidth;
	}
	calculateColumnWidths(c) {
		let O = this.getColumnWidthValue("key", this.defaultKeyWidth), k = this.getColumnWidthValue("context", this.defaultContextWidth), A = this.options.languages.map((c) => this.getColumnWidthValue(`values.${c}`, this.defaultLangWidth)), j = O + k + A.slice(0, -1).reduce((c, O) => c + O, 0), M = this.options.languages[this.options.languages.length - 1], N = this.options.columnMinWidths.get(`values.${M}`) || 80, P = Math.max(N, c - j);
		return {
			key: O,
			context: k,
			languages: [...A.slice(0, -1), P]
		};
	}
	applyColumnWidth(c, O, k) {
		let A = `values.${this.options.languages[this.options.languages.length - 1]}`;
		c !== A && this.options.columnWidths.set(c, O);
		let j = c === "key" ? O : this.getColumnWidthValue("key", this.defaultKeyWidth), M = c === "context" ? O : this.getColumnWidthValue("context", this.defaultContextWidth), N = this.options.languages.slice(0, -1).map((k) => {
			let A = `values.${k}`;
			return c === A ? O : this.getColumnWidthValue(A, this.defaultLangWidth);
		}), P = j + M + N.reduce((c, O) => c + O, 0), F = this.options.columnMinWidths.get(A) || 80, I = Math.max(F, k - P);
		return {
			columnWidths: {
				key: j,
				context: M,
				languages: [...N, I]
			},
			totalWidth: k
		};
	}
}, GridRenderer = class {
	constructor(c) {
		this.options = c;
	}
	createHeaderCell(c, O, k, A, j) {
		let M = document.createElement("div");
		return M.className = "virtual-grid-header-cell", M.setAttribute("role", "columnheader"), M.textContent = c, j && M.setAttribute("data-column-id", j), M.style.width = `${O}px`, M.style.minWidth = `${O}px`, M.style.maxWidth = `${O}px`, (k > 0 || A > 0) && (M.style.position = "sticky", M.style.left = `${k}px`, M.style.zIndex = A.toString(), M.style.backgroundColor = "#f8fafc"), M.style.overflow = "visible", M;
	}
	createRow(c, O, k) {
		let A = document.createElement("div");
		A.className = "virtual-grid-row", A.setAttribute("role", "row"), A.setAttribute("data-row-index", O.toString()), A.setAttribute("data-row-id", c.id);
		let j = this.createCell(c.id, "key", c.key, O, !0, k.key, 0, 10);
		A.appendChild(j);
		let M = this.createCell(c.id, "context", c.context || "", O, !0, k.context, k.key, 10);
		return A.appendChild(M), this.options.languages.forEach((j, M) => {
			let N = c.values[j] || "", P = k.languages[M], F = this.createCell(c.id, `values.${j}`, N, O, !this.options.readOnly, P, 0, 0);
			A.appendChild(F);
		}), A;
	}
	createCell(c, O, k, A, j, M, N, P) {
		let F = document.createElement("div");
		F.className = "virtual-grid-cell", F.setAttribute("role", "gridcell"), F.setAttribute("data-row-id", c), F.setAttribute("data-column-id", O), F.setAttribute("data-row-index", A.toString()), F.setAttribute("tabindex", j ? "0" : "-1"), F.style.width = `${M}px`, F.style.minWidth = `${M}px`, F.style.maxWidth = `${M}px`, (N > 0 || P > 0) && (F.style.position = "sticky", F.style.left = `${N}px`, F.style.zIndex = P.toString(), F.style.backgroundColor = "#fafafa");
		let I = document.createElement("div");
		return I.className = "virtual-grid-cell-content", I.textContent = k, F.appendChild(I), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(c, O, F), j && !this.options.readOnly && (F.addEventListener("dblclick", (c) => {
			c.preventDefault(), c.stopPropagation(), this.options.callbacks.onCellDblClick && this.options.callbacks.onCellDblClick(A, O, F);
		}), F.addEventListener("focus", () => {
			this.options.callbacks.onCellFocus && this.options.callbacks.onCellFocus(A, O), F.classList.add("focused");
		}), F.addEventListener("blur", () => {
			F.classList.remove("focused");
		})), F;
	}
	updateCellContent(c, O, k, A, j) {
		c.innerHTML = "";
		let M = document.createElement("div");
		M.className = "virtual-grid-cell-content", M.textContent = A, c.appendChild(M), !this.options.readOnly && this.options.editableColumns.has(k) && c.addEventListener("dblclick", (O) => {
			O.preventDefault(), O.stopPropagation(), this.options.callbacks.onCellDblClick && this.options.callbacks.onCellDblClick(j, k, c);
		}), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(O, k, c);
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
	columnMinWidths = /* @__PURE__ */ new Map();
	constructor(c) {
		this.container = c.container, this.options = c, this.columnWidths = c.columnWidths || /* @__PURE__ */ new Map(), this.rowHeight = c.rowHeight || 40, this.headerHeight = c.headerHeight || 40, this.editableColumns = new Set(["key", "context"]), c.languages.forEach((c) => {
			this.editableColumns.add(`values.${c}`);
		}), this.columnMinWidths.set("key", 100), this.columnMinWidths.set("context", 100), c.languages.forEach((c) => {
			this.columnMinWidths.set(`values.${c}`, 80);
		}), this.changeTracker.initializeOriginalData(c.translations, c.languages), this.cellEditor = new CellEditor(c.translations, this.changeTracker, this.undoRedoManager, {
			onCellChange: c.onCellChange,
			updateCellStyle: (c, O) => {
				this.updateCellStyle(c, O);
			},
			updateCellContent: (c, O, k, A) => {
				let j = c.getAttribute("data-row-index"), M = j ? parseInt(j, 10) : 0;
				this.gridRenderer.updateCellContent(c, O, k, A, M);
			}
		}), this.keyboardHandlerModule = new KeyboardHandler(this.modifierKeyTracker, this.focusManager, {
			onUndo: () => this.handleUndo(),
			onRedo: () => this.handleRedo(),
			getAllColumns: () => [
				"key",
				"context",
				...c.languages.map((c) => `values.${c}`)
			],
			getMaxRowIndex: () => c.translations.length - 1,
			focusCell: (c, O) => {
				this.focusCell(c, O);
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
				onResize: (c, O) => {
					this.applyColumnWidth(c, O);
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
				onCellDblClick: (c, O, k) => {
					this.startEditing(c, O, k);
				},
				onCellFocus: (c, O) => {
					this.focusManager.focusCell(c, O);
				},
				updateCellStyle: (c, O, k) => {
					this.updateCellStyle(c, O, k);
				}
			}
		});
	}
	render() {
		this.scrollElement && this.container.contains(this.scrollElement) && this.container.removeChild(this.scrollElement), this.scrollElement = document.createElement("div"), this.scrollElement.className = "virtual-grid-scroll-container", this.scrollElement.style.width = "100%", this.scrollElement.style.height = "100%", this.scrollElement.style.overflow = "auto", this.scrollElement.style.position = "relative", this.gridElement = document.createElement("div"), this.gridElement.className = "virtual-grid", this.gridElement.setAttribute("role", "grid"), this.options.readOnly && this.gridElement.classList.add("readonly"), this.headerElement = document.createElement("div"), this.headerElement.className = "virtual-grid-header", this.renderHeader(), this.gridElement.appendChild(this.headerElement), this.bodyElement = document.createElement("div"), this.bodyElement.className = "virtual-grid-body", this.bodyElement.style.position = "relative", this.gridElement.appendChild(this.bodyElement), this.scrollElement.appendChild(this.gridElement), this.container.appendChild(this.scrollElement), this.observeContainerResize(), requestAnimationFrame(() => {
			this.initVirtualScrolling();
		}), this.attachKeyboardListeners();
	}
	observeContainerResize() {
		this.resizeObserver && this.resizeObserver.disconnect(), typeof ResizeObserver < "u" && (this.resizeObserver = new ResizeObserver(() => {
			this.headerElement && (this.headerElement.innerHTML = "", this.renderHeader()), this.rowVirtualizer && this.renderVirtualRows();
		}), this.resizeObserver.observe(this.container));
	}
	initVirtualScrolling() {
		if (!this.scrollElement || !this.bodyElement) {
			console.error("VirtualTableDiv: scrollElement or bodyElement is null");
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
			count: this.options.translations.length,
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
		let c = null, O = this.cellEditor.getEditingCell();
		if (O) {
			let k = this.bodyElement.querySelector(`[data-row-index="${O.rowIndex}"]`);
			if (k) {
				let A = k.querySelector(`[data-column-id="${O.columnId}"]`);
				if (A) {
					let k = A.querySelector("input");
					k && (c = {
						rowId: O.rowId,
						columnId: O.columnId,
						value: k.value
					});
				}
			}
		}
		this.bodyElement.innerHTML = "";
		let k = this.rowVirtualizer.getVirtualItems(), A = this.rowVirtualizer.getTotalSize();
		this.bodyElement.style.height = `${A}px`;
		let j, M = this.getContainerWidth();
		if (this.columnResizer.isResizingActive()) j = this.columnWidthCalculator.calculateColumnWidths(M);
		else if (this.columnWidths.size > 0) j = this.columnWidthCalculator.calculateColumnWidths(M);
		else {
			let c = this.getColumnWidthsFromHeader();
			if (c) {
				let O = c.key + c.context + c.languages.slice(0, -1).reduce((c, O) => c + O, 0), k = this.columnMinWidths.get(`values.${this.options.languages[this.options.languages.length - 1]}`) || 80, A = Math.max(k, M - O);
				j = {
					key: c.key,
					context: c.context,
					languages: [...c.languages.slice(0, -1), A]
				};
			} else j = this.columnWidthCalculator.calculateColumnWidths(M);
		}
		k.forEach((O) => {
			let k = this.options.translations[O.index];
			if (!k) return;
			let A = this.gridRenderer.createRow(k, O.index, j), N = M;
			if (A.style.position = "absolute", A.style.top = `${O.start}px`, A.style.left = "0", A.style.width = `${N}px`, A.style.minWidth = `${N}px`, A.style.maxWidth = `${N}px`, A.style.height = `${O.size}px`, A.setAttribute("data-index", O.index.toString()), this.bodyElement.appendChild(A), c && k.id === c.rowId) {
				let k = A.querySelector(`[data-column-id="${c.columnId}"]`);
				k && requestAnimationFrame(() => {
					this.startEditing(O.index, c.columnId, k);
					let A = k.querySelector("input");
					A && (A.value = c.value, A.focus(), A.select());
				});
			}
			this.rowVirtualizer.measureElement(A);
		});
	}
	renderHeader() {
		if (!this.headerElement) return;
		let c = document.createElement("div");
		c.className = "virtual-grid-header-row", c.setAttribute("role", "row");
		let O = this.getContainerWidth(), k;
		this.columnWidths.size > 0 ? k = this.columnWidthCalculator.calculateColumnWidths(O) : (k = this.columnWidthCalculator.calculateColumnWidths(O), this.columnWidths.set("key", k.key), this.columnWidths.set("context", k.context), this.options.languages.slice(0, -1).forEach((c, O) => {
			let A = k.languages[O];
			this.columnWidths.set(`values.${c}`, A);
		}));
		let A = O;
		c.style.width = `${A}px`, c.style.minWidth = `${A}px`, c.style.maxWidth = `${A}px`;
		let j = this.gridRenderer.createHeaderCell("Key", k.key, 0, 10, "key");
		this.columnResizer.addResizeHandle(j, "key"), c.appendChild(j);
		let M = this.gridRenderer.createHeaderCell("Context", k.context, k.key, 10, "context");
		this.columnResizer.addResizeHandle(M, "context"), c.appendChild(M), this.options.languages.forEach((O, A) => {
			let j = k.languages[A], M = `values.${O}`, N = this.gridRenderer.createHeaderCell(O.toUpperCase(), j, 0, 0, M);
			this.columnResizer.addResizeHandle(N, M), c.appendChild(N);
		}), this.headerElement.appendChild(c);
	}
	applyColumnWidth(c, O) {
		let k = this.getContainerWidth(), { columnWidths: A, totalWidth: j } = this.columnWidthCalculator.applyColumnWidth(c, O, k);
		if (this.headerElement) {
			let c = this.headerElement.querySelector(".virtual-grid-header-row");
			c && (c.style.width = `${j}px`, c.style.minWidth = `${j}px`, c.style.maxWidth = `${j}px`);
			let O = this.headerElement.querySelector("[data-column-id=\"key\"]");
			O && (O.style.width = `${A.key}px`, O.style.minWidth = `${A.key}px`, O.style.maxWidth = `${A.key}px`);
			let k = this.headerElement.querySelector("[data-column-id=\"context\"]");
			k && (k.style.width = `${A.context}px`, k.style.minWidth = `${A.context}px`, k.style.maxWidth = `${A.context}px`, k.style.left = `${A.key}px`), this.options.languages.forEach((c, O) => {
				let k = this.headerElement.querySelector(`[data-column-id="values.${c}"]`);
				if (k) {
					let c = A.languages[O];
					k.style.width = `${c}px`, k.style.minWidth = `${c}px`, k.style.maxWidth = `${c}px`;
				}
			});
		}
		this.bodyElement && (this.bodyElement.querySelectorAll(".virtual-grid-row").forEach((c) => {
			let O = c;
			O.style.width = `${j}px`, O.style.minWidth = `${j}px`, O.style.maxWidth = `${j}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"key\"]").forEach((c) => {
			let O = c;
			O.style.width = `${A.key}px`, O.style.minWidth = `${A.key}px`, O.style.maxWidth = `${A.key}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"context\"]").forEach((c) => {
			let O = c;
			O.style.width = `${A.context}px`, O.style.minWidth = `${A.context}px`, O.style.maxWidth = `${A.context}px`, O.style.left = `${A.key}px`;
		}), this.options.languages.forEach((c, O) => {
			let k = this.bodyElement.querySelectorAll(`[data-column-id="values.${c}"]`), j = A.languages[O];
			k.forEach((c) => {
				let O = c;
				O.style.width = `${j}px`, O.style.minWidth = `${j}px`, O.style.maxWidth = `${j}px`;
			});
		}));
	}
	getColumnWidthsFromHeader() {
		if (!this.headerElement) return null;
		let c = this.headerElement.querySelector(".virtual-grid-header-row");
		if (!c) return null;
		let O = c.querySelectorAll(".virtual-grid-header-cell"), k = {
			key: 0,
			context: 0,
			languages: []
		};
		return O.forEach((c) => {
			let O = c.getAttribute("data-column-id"), A = c.offsetWidth || c.getBoundingClientRect().width;
			O === "key" ? k.key = A : O === "context" ? k.context = A : O && O.startsWith("values.") && k.languages.push(A);
		}), k.key > 0 && k.context > 0 && k.languages.length === this.options.languages.length ? k : null;
	}
	startEditing(c, O, k) {
		let A = k.getAttribute("data-row-id");
		A && this.cellEditor.startEditing(c, O, A, k);
	}
	stopEditing() {
		this.cellEditor.stopEditing(this.bodyElement || void 0);
	}
	updateCellStyle(c, O, k) {
		if (!this.bodyElement) return;
		let A = k || this.bodyElement.querySelector(`[data-row-id="${c}"][data-column-id="${O}"]`);
		if (!A) return;
		let j = `${c}-${O}`;
		if (this.changeTracker.getChangesMap().has(j) ? A.classList.add("cell-dirty") : A.classList.remove("cell-dirty"), O.startsWith("values.")) {
			let k = this.options.translations.find((O) => O.id === c);
			if (k) {
				let c = O.replace("values.", ""), j = k.values[c] || "";
				!j || typeof j == "string" && j.trim() === "" ? A.classList.add("cell-empty") : A.classList.remove("cell-empty");
			}
		}
	}
	attachKeyboardListeners() {
		this.modifierKeyTracker.attach(), this.keyboardHandlerModule.attach();
	}
	focusCell(c, O) {
		if (!this.bodyElement) return;
		let k = this.bodyElement.querySelector(`[data-row-index="${c}"][data-column-id="${O}"]`);
		k && (k.focus(), this.focusManager.focusCell(c, O));
	}
	handleUndo() {
		if (!this.undoRedoManager.canUndo()) {
			console.log("VirtualTableDiv: Cannot undo - no history");
			return;
		}
		let c = this.undoRedoManager.undo();
		if (!c) {
			console.log("VirtualTableDiv: Undo returned null");
			return;
		}
		this.applyUndoRedoAction(c);
	}
	handleRedo() {
		if (!this.undoRedoManager.canRedo()) {
			console.log("VirtualTableDiv: Cannot redo - no future history");
			return;
		}
		let c = this.undoRedoManager.redo();
		if (!c) {
			console.log("VirtualTableDiv: Redo returned null");
			return;
		}
		this.applyUndoRedoAction(c);
	}
	applyUndoRedoAction(c) {
		if (c.type !== "cell-change") {
			console.log("VirtualTableDiv: Invalid action type", c.type);
			return;
		}
		this.cellEditor.isEditing() && this.stopEditing();
		let O = this.options.translations.find((O) => O.id === c.rowId);
		if (!O) {
			console.error("VirtualTableDiv: Translation not found", c.rowId);
			return;
		}
		let k = O;
		if (c.columnId === "key") k.key = c.newValue;
		else if (c.columnId === "context") k.context = c.newValue;
		else if (c.columnId.startsWith("values.")) {
			let O = c.columnId.replace("values.", "");
			k.values[O] = c.newValue;
		} else {
			console.error("VirtualTableDiv: Invalid columnId", c.columnId);
			return;
		}
		let A = this.bodyElement?.querySelector(`[data-row-id="${c.rowId}"][data-column-id="${c.columnId}"]`);
		if (A) {
			let O = A.getAttribute("data-row-index"), k = O ? parseInt(O, 10) : 0;
			this.gridRenderer.updateCellContent(A, c.rowId, c.columnId, c.newValue, k);
		} else this.updateCellStyle(c.rowId, c.columnId);
		let j = this.changeTracker.getOriginalValue(c.rowId, c.columnId), M = getLangFromColumnId(c.columnId), N = getTranslationKey(this.options.translations, c.rowId, c.columnId, c.newValue);
		this.changeTracker.trackChange(c.rowId, c.columnId, M, j, c.newValue, N, () => {
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
		}, this.gridElement && (c ? this.gridElement.classList.add("readonly") : this.gridElement.classList.remove("readonly")), this.bodyElement && this.bodyElement.querySelectorAll(".virtual-grid-cell").forEach((O) => {
			let k = O.getAttribute("data-column-id"), A = k && this.editableColumns.has(k);
			O.setAttribute("tabindex", A && !c ? "0" : "-1");
		});
	}
	getChanges() {
		return this.changeTracker.getChanges();
	}
	clearChanges() {
		this.changeTracker.clearChanges((c, O) => {
			this.updateCellStyle(c, O);
		});
	}
	destroy() {
		this.keyboardHandlerModule && this.keyboardHandlerModule.detach(), this.modifierKeyTracker && this.modifierKeyTracker.detach(), this.resizeObserver &&= (this.resizeObserver.disconnect(), null), this.virtualizerCleanup &&= (this.virtualizerCleanup(), null), this.scrollElement && this.container.contains(this.scrollElement) && this.container.removeChild(this.scrollElement), this.scrollElement = null, this.gridElement = null, this.headerElement = null, this.bodyElement = null, this.rowVirtualizer = null;
	}
};
export { ChangeTracker, VirtualTableDiv };
