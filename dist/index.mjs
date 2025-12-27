import { Data, Effect, Option } from "effect";
import { z } from "zod";
function memo(r, j, M) {
	let N = M.initialDeps ?? [], P, F = !0;
	function I() {
		let I;
		M.key && M.debug?.() && (I = Date.now());
		let L = r();
		if (!(L.length !== N.length || L.some((r, j) => N[j] !== r))) return P;
		N = L;
		let R;
		if (M.key && M.debug?.() && (R = Date.now()), P = j(...L), M.key && M.debug?.()) {
			let r = Math.round((Date.now() - I) * 100) / 100, j = Math.round((Date.now() - R) * 100) / 100, N = j / 16, P = (r, j) => {
				for (r = String(r); r.length < j;) r = " " + r;
				return r;
			};
			console.info(`%c⏱ ${P(j, 5)} /${P(r, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * N, 120))}deg 100% 31%);`, M?.key);
		}
		return M?.onChange && !(F && M.skipInitialOnChange) && M.onChange(P), F = !1, P;
	}
	return I.updateDeps = (r) => {
		N = r;
	}, I;
}
function notUndefined(r, j) {
	if (r === void 0) throw Error(`Unexpected undefined${j ? `: ${j}` : ""}`);
	return r;
}
const approxEqual = (r, j) => Math.abs(r - j) < 1.01, debounce = (r, j, M) => {
	let N;
	return function(...P) {
		r.clearTimeout(N), N = r.setTimeout(() => j.apply(this, P), M);
	};
};
var getRect = (r) => {
	let { offsetWidth: j, offsetHeight: M } = r;
	return {
		width: j,
		height: M
	};
};
const defaultKeyExtractor = (r) => r, defaultRangeExtractor = (r) => {
	let j = Math.max(r.startIndex - r.overscan, 0), M = Math.min(r.endIndex + r.overscan, r.count - 1), N = [];
	for (let r = j; r <= M; r++) N.push(r);
	return N;
}, observeElementRect = (r, j) => {
	let M = r.scrollElement;
	if (!M) return;
	let N = r.targetWindow;
	if (!N) return;
	let P = (r) => {
		let { width: M, height: N } = r;
		j({
			width: Math.round(M),
			height: Math.round(N)
		});
	};
	if (P(getRect(M)), !N.ResizeObserver) return () => {};
	let F = new N.ResizeObserver((j) => {
		let N = () => {
			let r = j[0];
			if (r?.borderBoxSize) {
				let j = r.borderBoxSize[0];
				if (j) {
					P({
						width: j.inlineSize,
						height: j.blockSize
					});
					return;
				}
			}
			P(getRect(M));
		};
		r.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(N) : N();
	});
	return F.observe(M, { box: "border-box" }), () => {
		F.unobserve(M);
	};
};
var addEventListenerOptions = { passive: !0 }, supportsScrollend = typeof window > "u" ? !0 : "onscrollend" in window;
const observeElementOffset = (r, j) => {
	let M = r.scrollElement;
	if (!M) return;
	let N = r.targetWindow;
	if (!N) return;
	let P = 0, F = r.options.useScrollendEvent && supportsScrollend ? () => void 0 : debounce(N, () => {
		j(P, !1);
	}, r.options.isScrollingResetDelay), I = (N) => () => {
		let { horizontal: I, isRtl: L } = r.options;
		P = I ? M.scrollLeft * (L && -1 || 1) : M.scrollTop, F(), j(P, N);
	}, R = I(!0), B = I(!1);
	B(), M.addEventListener("scroll", R, addEventListenerOptions);
	let V = r.options.useScrollendEvent && supportsScrollend;
	return V && M.addEventListener("scrollend", B, addEventListenerOptions), () => {
		M.removeEventListener("scroll", R), V && M.removeEventListener("scrollend", B);
	};
}, measureElement = (r, j, M) => {
	if (j?.borderBoxSize) {
		let r = j.borderBoxSize[0];
		if (r) return Math.round(r[M.options.horizontal ? "inlineSize" : "blockSize"]);
	}
	return r[M.options.horizontal ? "offsetWidth" : "offsetHeight"];
}, elementScroll = (r, { adjustments: j = 0, behavior: M }, N) => {
	let P = r + j;
	N.scrollElement?.scrollTo?.({
		[N.options.horizontal ? "left" : "top"]: P,
		behavior: M
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
		let r = null, j = () => r || (!this.targetWindow || !this.targetWindow.ResizeObserver ? null : r = new this.targetWindow.ResizeObserver((r) => {
			r.forEach((r) => {
				let j = () => {
					this._measureElement(r.target, r);
				};
				this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(j) : j();
			});
		}));
		return {
			disconnect: () => {
				j()?.disconnect(), r = null;
			},
			observe: (r) => j()?.observe(r, { box: "border-box" }),
			unobserve: (r) => j()?.unobserve(r)
		};
	})();
	range = null;
	constructor(r) {
		this.setOptions(r);
	}
	setOptions = (r) => {
		Object.entries(r).forEach(([j, M]) => {
			M === void 0 && delete r[j];
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
			...r
		};
	};
	notify = (r) => {
		this.options.onChange?.(this, r);
	};
	maybeNotify = memo(() => (this.calculateRange(), [
		this.isScrolling,
		this.range ? this.range.startIndex : null,
		this.range ? this.range.endIndex : null
	]), (r) => {
		this.notify(r);
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
		this.unsubs.filter(Boolean).forEach((r) => r()), this.unsubs = [], this.observer.disconnect(), this.scrollElement = null, this.targetWindow = null;
	};
	_didMount = () => () => {
		this.cleanup();
	};
	_willUpdate = () => {
		let r = this.options.enabled ? this.options.getScrollElement() : null;
		if (this.scrollElement !== r) {
			if (this.cleanup(), !r) {
				this.maybeNotify();
				return;
			}
			this.scrollElement = r, this.scrollElement && "ownerDocument" in this.scrollElement ? this.targetWindow = this.scrollElement.ownerDocument.defaultView : this.targetWindow = this.scrollElement?.window ?? null, this.elementsCache.forEach((r) => {
				this.observer.observe(r);
			}), this._scrollToOffset(this.getScrollOffset(), {
				adjustments: void 0,
				behavior: void 0
			}), this.unsubs.push(this.options.observeElementRect(this, (r) => {
				this.scrollRect = r, this.maybeNotify();
			})), this.unsubs.push(this.options.observeElementOffset(this, (r, j) => {
				this.scrollAdjustments = 0, this.scrollDirection = j ? this.getScrollOffset() < r ? "forward" : "backward" : null, this.scrollOffset = r, this.isScrolling = j, this.maybeNotify();
			}));
		}
	};
	getSize = () => this.options.enabled ? (this.scrollRect = this.scrollRect ?? this.options.initialRect, this.scrollRect[this.options.horizontal ? "width" : "height"]) : (this.scrollRect = null, 0);
	getScrollOffset = () => this.options.enabled ? (this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset == "function" ? this.options.initialOffset() : this.options.initialOffset), this.scrollOffset) : (this.scrollOffset = null, 0);
	getFurthestMeasurement = (r, j) => {
		let M = /* @__PURE__ */ new Map(), N = /* @__PURE__ */ new Map();
		for (let P = j - 1; P >= 0; P--) {
			let j = r[P];
			if (M.has(j.lane)) continue;
			let F = N.get(j.lane);
			if (F == null || j.end > F.end ? N.set(j.lane, j) : j.end < F.end && M.set(j.lane, !0), M.size === this.options.lanes) break;
		}
		return N.size === this.options.lanes ? Array.from(N.values()).sort((r, j) => r.end === j.end ? r.index - j.index : r.end - j.end)[0] : void 0;
	};
	getMeasurementOptions = memo(() => [
		this.options.count,
		this.options.paddingStart,
		this.options.scrollMargin,
		this.options.getItemKey,
		this.options.enabled,
		this.options.lanes
	], (r, j, M, N, P, F) => (this.prevLanes !== void 0 && this.prevLanes !== F && (this.lanesChangedFlag = !0), this.prevLanes = F, this.pendingMeasuredCacheIndexes = [], {
		count: r,
		paddingStart: j,
		scrollMargin: M,
		getItemKey: N,
		enabled: P,
		lanes: F
	}), {
		key: !1,
		skipInitialOnChange: !0,
		onChange: () => {
			this.notify(this.isScrolling);
		}
	});
	getMeasurements = memo(() => [this.getMeasurementOptions(), this.itemSizeCache], ({ count: r, paddingStart: j, scrollMargin: M, getItemKey: N, enabled: P, lanes: F }, I) => {
		if (!P) return this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), [];
		if (this.laneAssignments.size > r) for (let j of this.laneAssignments.keys()) j >= r && this.laneAssignments.delete(j);
		this.lanesChangedFlag && (this.lanesChangedFlag = !1, this.lanesSettling = !0, this.measurementsCache = [], this.itemSizeCache.clear(), this.laneAssignments.clear(), this.pendingMeasuredCacheIndexes = []), this.measurementsCache.length === 0 && (this.measurementsCache = this.options.initialMeasurementsCache, this.measurementsCache.forEach((r) => {
			this.itemSizeCache.set(r.key, r.size);
		}));
		let L = this.lanesSettling ? 0 : this.pendingMeasuredCacheIndexes.length > 0 ? Math.min(...this.pendingMeasuredCacheIndexes) : 0;
		this.pendingMeasuredCacheIndexes = [], this.lanesSettling && this.measurementsCache.length === r && (this.lanesSettling = !1);
		let R = this.measurementsCache.slice(0, L), B = Array(F).fill(void 0);
		for (let r = 0; r < L; r++) {
			let j = R[r];
			j && (B[j.lane] = r);
		}
		for (let P = L; P < r; P++) {
			let r = N(P), F = this.laneAssignments.get(P), L, V;
			if (F !== void 0 && this.options.lanes > 1) {
				L = F;
				let r = B[L], N = r === void 0 ? void 0 : R[r];
				V = N ? N.end + this.options.gap : j + M;
			} else {
				let r = this.options.lanes === 1 ? R[P - 1] : this.getFurthestMeasurement(R, P);
				V = r ? r.end + this.options.gap : j + M, L = r ? r.lane : P % this.options.lanes, this.options.lanes > 1 && this.laneAssignments.set(P, L);
			}
			let H = I.get(r), U = typeof H == "number" ? H : this.options.estimateSize(P), W = V + U;
			R[P] = {
				index: P,
				start: V,
				size: U,
				end: W,
				key: r,
				lane: L
			}, B[L] = P;
		}
		return this.measurementsCache = R, R;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	calculateRange = memo(() => [
		this.getMeasurements(),
		this.getSize(),
		this.getScrollOffset(),
		this.options.lanes
	], (r, j, M, N) => this.range = r.length > 0 && j > 0 ? calculateRange({
		measurements: r,
		outerSize: j,
		scrollOffset: M,
		lanes: N
	}) : null, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualIndexes = memo(() => {
		let r = null, j = null, M = this.calculateRange();
		return M && (r = M.startIndex, j = M.endIndex), this.maybeNotify.updateDeps([
			this.isScrolling,
			r,
			j
		]), [
			this.options.rangeExtractor,
			this.options.overscan,
			this.options.count,
			r,
			j
		];
	}, (r, j, M, N, P) => N === null || P === null ? [] : r({
		startIndex: N,
		endIndex: P,
		overscan: j,
		count: M
	}), {
		key: !1,
		debug: () => this.options.debug
	});
	indexFromElement = (r) => {
		let j = this.options.indexAttribute, M = r.getAttribute(j);
		return M ? parseInt(M, 10) : (console.warn(`Missing attribute name '${j}={index}' on measured element.`), -1);
	};
	_measureElement = (r, j) => {
		let M = this.indexFromElement(r), N = this.measurementsCache[M];
		if (!N) return;
		let P = N.key, F = this.elementsCache.get(P);
		F !== r && (F && this.observer.unobserve(F), this.observer.observe(r), this.elementsCache.set(P, r)), r.isConnected && this.resizeItem(M, this.options.measureElement(r, j, this));
	};
	resizeItem = (r, j) => {
		let M = this.measurementsCache[r];
		if (!M) return;
		let N = j - (this.itemSizeCache.get(M.key) ?? M.size);
		N !== 0 && ((this.shouldAdjustScrollPositionOnItemSizeChange === void 0 ? M.start < this.getScrollOffset() + this.scrollAdjustments : this.shouldAdjustScrollPositionOnItemSizeChange(M, N, this)) && this._scrollToOffset(this.getScrollOffset(), {
			adjustments: this.scrollAdjustments += N,
			behavior: void 0
		}), this.pendingMeasuredCacheIndexes.push(M.index), this.itemSizeCache = new Map(this.itemSizeCache.set(M.key, j)), this.notify(!1));
	};
	measureElement = (r) => {
		if (!r) {
			this.elementsCache.forEach((r, j) => {
				r.isConnected || (this.observer.unobserve(r), this.elementsCache.delete(j));
			});
			return;
		}
		this._measureElement(r, void 0);
	};
	getVirtualItems = memo(() => [this.getVirtualIndexes(), this.getMeasurements()], (r, j) => {
		let M = [];
		for (let N = 0, P = r.length; N < P; N++) {
			let P = j[r[N]];
			M.push(P);
		}
		return M;
	}, {
		key: !1,
		debug: () => this.options.debug
	});
	getVirtualItemForOffset = (r) => {
		let j = this.getMeasurements();
		if (j.length !== 0) return notUndefined(j[findNearestBinarySearch(0, j.length - 1, (r) => notUndefined(j[r]).start, r)]);
	};
	getOffsetForAlignment = (r, j, M = 0) => {
		let N = this.getSize(), P = this.getScrollOffset();
		j === "auto" && (j = r >= P + N ? "end" : "start"), j === "center" ? r += (M - N) / 2 : j === "end" && (r -= N);
		let F = this.getTotalSize() + this.options.scrollMargin - N;
		return Math.max(Math.min(F, r), 0);
	};
	getOffsetForIndex = (r, j = "auto") => {
		r = Math.max(0, Math.min(r, this.options.count - 1));
		let M = this.measurementsCache[r];
		if (!M) return;
		let N = this.getSize(), P = this.getScrollOffset();
		if (j === "auto") if (M.end >= P + N - this.options.scrollPaddingEnd) j = "end";
		else if (M.start <= P + this.options.scrollPaddingStart) j = "start";
		else return [P, j];
		let F = j === "end" ? M.end + this.options.scrollPaddingEnd : M.start - this.options.scrollPaddingStart;
		return [this.getOffsetForAlignment(F, j, M.size), j];
	};
	isDynamicMode = () => this.elementsCache.size > 0;
	scrollToOffset = (r, { align: j = "start", behavior: M } = {}) => {
		M === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getOffsetForAlignment(r, j), {
			adjustments: void 0,
			behavior: M
		});
	};
	scrollToIndex = (r, { align: j = "auto", behavior: M } = {}) => {
		M === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), r = Math.max(0, Math.min(r, this.options.count - 1));
		let N = 0, P = (j) => {
			if (!this.targetWindow) return;
			let N = this.getOffsetForIndex(r, j);
			if (!N) {
				console.warn("Failed to get offset for index:", r);
				return;
			}
			let [P, L] = N;
			this._scrollToOffset(P, {
				adjustments: void 0,
				behavior: M
			}), this.targetWindow.requestAnimationFrame(() => {
				let j = this.getScrollOffset(), M = this.getOffsetForIndex(r, L);
				if (!M) {
					console.warn("Failed to get offset for index:", r);
					return;
				}
				approxEqual(M[0], j) || F(L);
			});
		}, F = (j) => {
			this.targetWindow && (N++, N < 10 ? this.targetWindow.requestAnimationFrame(() => P(j)) : console.warn(`Failed to scroll to index ${r} after 10 attempts.`));
		};
		P(j);
	};
	scrollBy = (r, { behavior: j } = {}) => {
		j === "smooth" && this.isDynamicMode() && console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."), this._scrollToOffset(this.getScrollOffset() + r, {
			adjustments: void 0,
			behavior: j
		});
	};
	getTotalSize = () => {
		let r = this.getMeasurements(), j;
		if (r.length === 0) j = this.options.paddingStart;
		else if (this.options.lanes === 1) j = r[r.length - 1]?.end ?? 0;
		else {
			let M = Array(this.options.lanes).fill(null), N = r.length - 1;
			for (; N >= 0 && M.some((r) => r === null);) {
				let j = r[N];
				M[j.lane] === null && (M[j.lane] = j.end), N--;
			}
			j = Math.max(...M.filter((r) => r !== null));
		}
		return Math.max(j - this.options.scrollMargin + this.options.paddingEnd, 0);
	};
	_scrollToOffset = (r, { adjustments: j, behavior: M }) => {
		this.options.scrollToFn(r, {
			behavior: M,
			adjustments: j
		}, this);
	};
	measure = () => {
		this.itemSizeCache = /* @__PURE__ */ new Map(), this.laneAssignments = /* @__PURE__ */ new Map(), this.notify(!1);
	};
}, findNearestBinarySearch = (r, j, M, N) => {
	for (; r <= j;) {
		let P = (r + j) / 2 | 0, F = M(P);
		if (F < N) r = P + 1;
		else if (F > N) j = P - 1;
		else return P;
	}
	return r > 0 ? r - 1 : 0;
};
function calculateRange({ measurements: r, outerSize: j, scrollOffset: M, lanes: N }) {
	let P = r.length - 1, F = (j) => r[j].start;
	if (r.length <= N) return {
		startIndex: 0,
		endIndex: P
	};
	let I = findNearestBinarySearch(0, P, F, M), L = I;
	if (N === 1) for (; L < P && r[L].end < M + j;) L++;
	else if (N > 1) {
		let F = Array(N).fill(0);
		for (; L < P && F.some((r) => r < M + j);) {
			let j = r[L];
			F[j.lane] = j.end, L++;
		}
		let R = Array(N).fill(M + j);
		for (; I >= 0 && R.some((r) => r >= M);) {
			let j = r[I];
			R[j.lane] = j.start, I--;
		}
		I = Math.max(0, I - I % N), L = Math.min(P, L + (N - 1 - L % N));
	}
	return {
		startIndex: I,
		endIndex: L
	};
}
var ChangeTrackerError = class extends Data.TaggedError("ChangeTrackerError") {}, ValidationError = class extends Data.TaggedError("ValidationError") {}, CellEditorError = class extends Data.TaggedError("CellEditorError") {}, VimCommandTrackerError = class extends Data.TaggedError("VimCommandTrackerError") {}, CommandLineError = class extends Data.TaggedError("CommandLineError") {};
const RowIdSchema = z.string().min(1, "Row ID must not be empty"), FieldSchema = z.string().refine((r) => r === "key" || r === "context" || r.startsWith("values."), { message: "Field must be 'key', 'context', or start with 'values.'" }), LangSchema = z.string().min(1, "Language code must not be empty");
z.string().regex(/^.+-.+$/, "Change key must be in format 'rowId-field'");
function validateWithEffect(r, M, P) {
	return Effect.try({
		try: () => r.parse(M),
		catch: (r) => r instanceof z.ZodError ? new ValidationError({
			message: P || "Validation failed",
			issues: r.issues.map((r) => ({
				path: r.path.map(String),
				message: r.message
			}))
		}) : new ValidationError({
			message: P || "Validation failed",
			issues: [{
				path: [],
				message: String(r)
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
	setLevel(r) {
		this.level = r;
	}
	getLevel() {
		return this.level;
	}
	debug(...r) {
		this.level <= LogLevel.DEBUG && console.log("[DEBUG]", ...r);
	}
	info(...r) {
		this.level <= LogLevel.INFO && console.log("[INFO]", ...r);
	}
	warn(...r) {
		this.level <= LogLevel.WARN && console.warn("[WARN]", ...r);
	}
	error(...r) {
		this.level <= LogLevel.ERROR && console.error("[ERROR]", ...r);
	}
}();
var ChangeTracker = class {
	config;
	changes = /* @__PURE__ */ new Map();
	originalData = /* @__PURE__ */ new Map();
	constructor(r = defaultConfig) {
		this.config = {
			...defaultConfig,
			...r
		};
	}
	initializeOriginalData(r, M) {
		if (this.config.enableValidation) {
			for (let r of M) {
				let M = validateWithEffect(LangSchema, r, `Invalid language code: ${r}`);
				Effect.runSync(Effect.match(M, {
					onFailure: (r) => {
						throw logger.error("ChangeTracker: Invalid language code", r), r;
					},
					onSuccess: () => {}
				}));
			}
			for (let M of r) {
				let r = validateWithEffect(RowIdSchema, M.id, `Invalid row ID: ${M.id}`);
				if (Effect.runSync(Effect.match(r, {
					onFailure: (r) => {
						throw logger.error("ChangeTracker: Invalid row ID", r), r;
					},
					onSuccess: () => {}
				})), typeof M.key != "string" || M.key.length === 0) {
					let r = new ChangeTrackerError({
						message: `Invalid key for translation ${M.id}`,
						code: "INVALID_CHANGE_DATA"
					});
					Effect.runSync(Effect.match(Effect.fail(r), {
						onFailure: (r) => {
							throw logger.error("ChangeTracker: Invalid translation key", r), r;
						},
						onSuccess: () => {}
					}));
				}
			}
		}
		this.originalData.clear(), this.changes.clear(), r.forEach((r) => {
			let j = /* @__PURE__ */ new Map();
			j.set("key", r.key), j.set("context", r.context || ""), M.forEach((M) => {
				j.set(`values.${M}`, r.values[M] || "");
			}), this.originalData.set(r.id, j);
		});
	}
	getOriginalValueEffect(r, N) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, r, "Invalid row ID"), (r) => Effect.flatMap(validateWithEffect(FieldSchema, N, "Invalid field"), (N) => {
			let P = this.originalData.get(r);
			if (!P) return Effect.fail(new ChangeTrackerError({
				message: `Original data not found for row ID: ${r}`,
				code: "ORIGINAL_DATA_NOT_FOUND"
			}));
			let F = P.get(N);
			return Effect.succeed(Option.fromNullable(F));
		}));
	}
	getOriginalValue(r, N) {
		if (!this.config.enableValidation) return this.originalData.get(r)?.get(N) ?? "";
		let P = this.getOriginalValueEffect(r, N);
		return Effect.runSync(Effect.match(P, {
			onFailure: () => "",
			onSuccess: (r) => Option.getOrElse(r, () => "")
		}));
	}
	trackChangeEffect(r, M, N, P, F, I) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, r, "Invalid row ID"), (r) => Effect.flatMap(validateWithEffect(FieldSchema, M, "Invalid field"), (M) => Effect.flatMap(validateWithEffect(LangSchema, N, "Invalid language code"), (N) => {
			if (typeof I != "string" || I.length === 0) return Effect.fail(new ChangeTrackerError({
				message: "Key must be a non-empty string",
				code: "INVALID_CHANGE_DATA"
			}));
			let L = `${r}-${M}`;
			if (P === F) return this.changes.delete(L), Effect.void;
			let R = {
				id: r,
				key: I,
				lang: N,
				oldValue: P,
				newValue: F
			};
			return this.changes.set(L, R), Effect.void;
		})));
	}
	trackChange(r, M, N, P, F, I, L) {
		if (!this.config.enableValidation) {
			let j = `${r}-${M}`;
			if (P === F) {
				this.changes.delete(j), L && L(r, M, !1);
				return;
			}
			let R = {
				id: r,
				key: I,
				lang: N,
				oldValue: P,
				newValue: F
			};
			this.changes.set(j, R), L && L(r, M, !0);
			return;
		}
		let R = this.trackChangeEffect(r, M, N, P, F, I);
		Effect.runSync(Effect.match(R, {
			onFailure: (r) => {
				logger.warn("ChangeTracker: Failed to track change", r);
			},
			onSuccess: () => {
				L && L(r, M, P !== F);
			}
		}));
	}
	hasChangeEffect(r, M) {
		return Effect.flatMap(validateWithEffect(RowIdSchema, r, "Invalid row ID"), (r) => Effect.flatMap(validateWithEffect(FieldSchema, M, "Invalid field"), (M) => {
			let N = `${r}-${M}`;
			return Effect.succeed(this.changes.has(N));
		}));
	}
	hasChange(r, M) {
		if (!this.config.enableValidation) {
			let j = `${r}-${M}`;
			return this.changes.has(j);
		}
		let N = this.hasChangeEffect(r, M);
		return Effect.runSync(Effect.match(N, {
			onFailure: () => !1,
			onSuccess: (r) => r
		}));
	}
	getChanges() {
		return Array.from(this.changes.values());
	}
	clearChanges(r) {
		r && this.changes.forEach((j, M) => {
			let [N, P] = M.split("-", 2);
			r(N, P, !1);
		}), this.changes.clear();
	}
	getChangesMap() {
		return this.changes;
	}
}, UndoRedoManager = class {
	history = [];
	currentIndex = -1;
	maxHistorySize = 100;
	push(r) {
		this.history = this.history.slice(0, this.currentIndex + 1), this.history.push(r), this.currentIndex++, this.history.length > this.maxHistorySize && (this.history.shift(), this.currentIndex--);
	}
	canUndo() {
		return this.currentIndex >= 0;
	}
	canRedo() {
		return this.currentIndex < this.history.length - 1;
	}
	undo() {
		if (!this.canUndo()) return null;
		let r = this.history[this.currentIndex];
		return this.currentIndex--, {
			type: r.type,
			rowId: r.rowId,
			columnId: r.columnId,
			oldValue: r.newValue,
			newValue: r.oldValue
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
		this.modifierKeyDownHandler || this.modifierKeyUpHandler || (this.modifierKeyDownHandler = (r) => {
			(r.key === "Meta" || r.key === "MetaLeft" || r.key === "MetaRight") && (this.metaKeyPressed = !0), (r.key === "Control" || r.key === "ControlLeft" || r.key === "ControlRight") && (this.ctrlKeyPressed = !0);
		}, this.modifierKeyUpHandler = (r) => {
			(r.key === "Meta" || r.key === "MetaLeft" || r.key === "MetaRight") && (this.metaKeyPressed = !1), (r.key === "Control" || r.key === "ControlLeft" || r.key === "ControlRight") && (this.ctrlKeyPressed = !1);
		}, window.addEventListener("keydown", this.modifierKeyDownHandler, !0), window.addEventListener("keyup", this.modifierKeyUpHandler, !0));
	}
	detach() {
		this.modifierKeyDownHandler &&= (window.removeEventListener("keydown", this.modifierKeyDownHandler, !0), null), this.modifierKeyUpHandler &&= (window.removeEventListener("keyup", this.modifierKeyUpHandler, !0), null);
	}
	isModifierPressed(r) {
		return navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? this.metaKeyPressed || r.metaKey || this.ctrlKeyPressed || r.ctrlKey : this.ctrlKeyPressed || r.ctrlKey || this.metaKeyPressed || r.metaKey;
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
	focusCell(r, j) {
		this.focusedCell = {
			rowIndex: r,
			columnId: j
		};
	}
	blur() {
		this.focusedCell = null;
	}
	hasFocus() {
		return this.focusedCell !== null;
	}
};
function toMutableTranslation(r) {
	return {
		id: r.id,
		key: r.key,
		context: r.context,
		values: { ...r.values },
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		updatedBy: r.updatedBy
	};
}
function getLangFromColumnId(r) {
	return r === "key" ? "key" : r === "context" ? "context" : r.startsWith("values.") ? r.replace("values.", "") : r;
}
function getTranslationKey(r, j, M, N) {
	return M === "key" ? N : r.find((r) => r.id === j)?.key || "";
}
function checkKeyDuplicate(r, j, M) {
	return r.some((r) => r.id !== j && r.key.trim() === M.trim());
}
var CellEditor = class {
	editingCell = null;
	isEscapeKeyPressed = !1;
	isFinishingEdit = !1;
	translations;
	changeTracker;
	undoRedoManager;
	callbacks;
	constructor(r, j, M, N = {}) {
		this.translations = r, this.changeTracker = j, this.undoRedoManager = M, this.callbacks = N;
	}
	getEditingCell() {
		return this.editingCell;
	}
	isEditing() {
		return this.editingCell !== null;
	}
	startEditingEffect(r, M, N, P) {
		this.editingCell && this.stopEditing();
		let F = P.querySelector(".virtual-grid-cell-content");
		if (!F) return Effect.fail(new CellEditorError({
			message: "Cell content not found",
			code: "TRANSLATION_NOT_FOUND"
		}));
		let I = F.textContent || "", L = this.createEditInput(I);
		P.innerHTML = "", P.appendChild(L), requestAnimationFrame(() => {
			L.focus(), L.select();
		}), this.editingCell = {
			rowIndex: r,
			columnId: M,
			rowId: N
		}, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!0);
		let R = !1;
		if (M === "key") {
			let r = () => {
				let r = L.value.trim();
				R = !1, P.classList.remove("cell-duplicate-key"), r && checkKeyDuplicate(this.translations, N, r) && (R = !0, P.classList.add("cell-duplicate-key"));
			};
			L.addEventListener("input", r), r();
		}
		return this.attachInputListeners(L, P, (r) => {
			if (this.isFinishingEdit) return;
			this.isFinishingEdit = !0, r && M === "key" && R && (r = !1), r && L.value !== I && this.applyCellChange(N, M, I, L.value).catch((r) => {
				logger.error("Failed to apply cell change:", r);
			});
			let j = r ? L.value : I;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(P, N, M, j), this.editingCell = null, this.isFinishingEdit = !1, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!1);
		}, r, M, I, N), Effect.void;
	}
	startEditing(r, j, M, N) {
		this.editingCell && this.stopEditing();
		let P = N.querySelector(".virtual-grid-cell-content");
		if (!P) return;
		let F = P.textContent || "", I = this.createEditInput(F);
		N.innerHTML = "", N.appendChild(I), requestAnimationFrame(() => {
			I.focus(), I.select();
		}), this.editingCell = {
			rowIndex: r,
			columnId: j,
			rowId: M
		}, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!0);
		let L = !1;
		if (j === "key") {
			let r = () => {
				let r = I.value.trim();
				L = !1, N.classList.remove("cell-duplicate-key"), r && checkKeyDuplicate(this.translations, M, r) && (L = !0, N.classList.add("cell-duplicate-key"));
			};
			I.addEventListener("input", r), r();
		}
		this.attachInputListeners(I, N, (r) => {
			if (this.isFinishingEdit) return;
			this.isFinishingEdit = !0, r && j === "key" && L && (r = !1), r && I.value !== F && this.applyCellChange(M, j, F, I.value).catch((r) => {
				logger.error("Failed to apply cell change:", r);
			});
			let P = r ? I.value : F;
			this.callbacks.updateCellContent && this.callbacks.updateCellContent(N, M, j, P), this.editingCell = null, this.isFinishingEdit = !1, this.callbacks.onEditStateChange && this.callbacks.onEditStateChange(!1);
		}, r, j, F, M);
	}
	attachInputListeners(r, j, M, N, P, F, I) {
		r.addEventListener("blur", () => {
			this.isFinishingEdit || (this.isEscapeKeyPressed ? (M(!1), this.isEscapeKeyPressed = !1) : M(!0));
		}), r.addEventListener("beforeinput", (r) => {
			(r.inputType === "historyUndo" || r.inputType === "historyRedo") && (r.preventDefault(), M(!0));
		}), r.addEventListener("keydown", (j) => {
			if (j.key === "Enter") {
				j.preventDefault(), j.stopPropagation();
				let F = j.shiftKey ? "up" : "down";
				M(!0), r.blur(), P.startsWith("values.") && this.callbacks.onEditFinished && requestAnimationFrame(() => {
					this.callbacks.onEditFinished && this.callbacks.onEditFinished(N, P, F);
				});
			} else j.key === "Escape" ? (j.preventDefault(), j.stopPropagation(), this.isEscapeKeyPressed = !0, r.blur()) : j.key === "Tab" && (j.preventDefault(), j.stopPropagation(), M(!0), r.blur());
		});
	}
	applyCellChangeEffect(r, M, N, P) {
		let F = this.translations.find((j) => j.id === r);
		if (!F) return Effect.fail(new CellEditorError({
			message: `Translation not found: ${r}`,
			code: "TRANSLATION_NOT_FOUND"
		}));
		let I = toMutableTranslation(F);
		if (M === "key") I.key = P;
		else if (M === "context") I.context = P;
		else if (M.startsWith("values.")) {
			let r = M.replace("values.", "");
			I.values[r] = P;
		} else return Effect.fail(new CellEditorError({
			message: `Invalid column ID: ${M}`,
			code: "INVALID_COLUMN_ID"
		}));
		this.undoRedoManager.push({
			type: "cell-change",
			rowId: r,
			columnId: M,
			oldValue: N,
			newValue: P
		});
		let L = this.changeTracker.getOriginalValue(r, M), R = getLangFromColumnId(M), B = getTranslationKey(this.translations, r, M, P);
		return this.changeTracker.trackChange(r, M, R, L, P, B, () => {
			this.callbacks.updateCellStyle && this.callbacks.updateCellStyle(r, M);
		}), this.callbacks.onCellChange && this.callbacks.onCellChange(r, M, P), Effect.void;
	}
	async applyCellChange(r, M, N, P) {
		let F = this.applyCellChangeEffect(r, M, N, P);
		return Effect.runPromise(F);
	}
	stopEditingEffect(r) {
		return this.editingCell && this.stopEditing(r), Effect.void;
	}
	stopEditing(r) {
		if (!this.editingCell || !r) {
			this.editingCell = null;
			return;
		}
		let j = r.querySelector(`[data-row-index="${this.editingCell.rowIndex}"]`);
		if (j) {
			let r = j.querySelector(`[data-column-id="${this.editingCell.columnId}"]`);
			if (r) {
				let j = r.querySelector("input");
				if (j) {
					let M = r.getAttribute("data-row-id"), N = this.editingCell.columnId, P = j.value;
					this.isFinishingEdit = !0, this.callbacks.updateCellContent && M && this.callbacks.updateCellContent(r, M, N, P), this.isFinishingEdit = !1;
				}
			}
		}
		this.editingCell = null;
	}
	createEditInput(r) {
		let j = document.createElement("input");
		return j.type = "text", j.value = r, j.className = "virtual-grid-cell-input", j.style.width = "100%", j.style.height = "100%", j.style.border = "2px solid #3b82f6", j.style.outline = "none", j.style.padding = "4px 8px", j.style.fontSize = "14px", j.style.fontFamily = "inherit", j.style.backgroundColor = "#fff", j;
	}
	setEscapeKeyPressed(r) {
		this.isEscapeKeyPressed = r;
	}
}, KeyboardHandler = class {
	keyboardHandler = null;
	modifierKeyTracker;
	focusManager;
	callbacks;
	constructor(r, j, M = {}) {
		this.modifierKeyTracker = r, this.focusManager = j, this.callbacks = M;
	}
	attach() {
		this.keyboardHandler || (this.keyboardHandler = (r) => {
			let j = this.modifierKeyTracker.isModifierPressed(r), M = r.target, N = M.tagName === "INPUT" || M.tagName === "TEXTAREA" || M.isContentEditable, P = (r.key === "z" || r.key === "Z" || r.code === "KeyZ") && !r.shiftKey;
			if (j && P) {
				r.preventDefault(), r.stopPropagation(), this.callbacks.onUndo && this.callbacks.onUndo();
				return;
			}
			let F = r.key === "y" || r.key === "Y" || r.code === "KeyY" || (r.key === "z" || r.key === "Z" || r.code === "KeyZ") && r.shiftKey;
			if (j && F) {
				r.preventDefault(), r.stopPropagation(), this.callbacks.onRedo && this.callbacks.onRedo();
				return;
			}
			if (j && (r.key === "k" || r.code === "KeyK")) {
				r.preventDefault(), r.stopPropagation(), this.callbacks.onOpenCommandPalette && this.callbacks.onOpenCommandPalette("excel");
				return;
			}
			if (j && (r.key === "f" || r.code === "KeyF") && !N) {
				r.preventDefault(), r.stopPropagation(), this.callbacks.onOpenFind && this.callbacks.onOpenFind();
				return;
			}
			if (j && (r.key === "h" || r.code === "KeyH") && !N) {
				r.preventDefault(), r.stopPropagation(), this.callbacks.onOpenReplace && this.callbacks.onOpenReplace();
				return;
			}
			if ((r.key === "/" || r.code === "Slash") && !N && (!this.callbacks.isQuickSearchMode || !this.callbacks.isQuickSearchMode())) {
				r.preventDefault(), r.stopPropagation(), this.callbacks.onOpenQuickSearch && this.callbacks.onOpenQuickSearch();
				return;
			}
			if (this.callbacks.isQuickSearchMode && this.callbacks.isQuickSearchMode() && !N) {
				if (r.key === "n" && !r.shiftKey) {
					r.preventDefault(), r.stopPropagation(), this.callbacks.onQuickSearchNext && this.callbacks.onQuickSearchNext();
					return;
				}
				if (r.key === "N" || r.key === "n" && r.shiftKey) {
					r.preventDefault(), r.stopPropagation(), this.callbacks.onQuickSearchPrev && this.callbacks.onQuickSearchPrev();
					return;
				}
			}
			if (r.key === "F2" || r.code === "F2") {
				if (this.focusManager.hasFocus() && !N) {
					r.preventDefault(), r.stopPropagation();
					let j = this.focusManager.getFocusedCell();
					if (j && this.callbacks.onStartEditing) {
						if (this.callbacks.isEditableColumn && !this.callbacks.isEditableColumn(j.columnId) || this.callbacks.isReadOnly && this.callbacks.isReadOnly()) return;
						this.callbacks.onStartEditing(j.rowIndex, j.columnId);
					}
				}
				return;
			}
			if (r.key === "Enter" && this.focusManager.hasFocus() && !N && (!this.callbacks.isQuickSearchMode || !this.callbacks.isQuickSearchMode())) {
				let j = this.focusManager.getFocusedCell();
				if (j) {
					let M = j.columnId.startsWith("values.");
					if (r.shiftKey) {
						if (!M) return;
					} else if (!M) {
						if (this.callbacks.isEditableColumn && !this.callbacks.isEditableColumn(j.columnId) || this.callbacks.isReadOnly && this.callbacks.isReadOnly()) return;
						if (this.callbacks.onStartEditing) {
							r.preventDefault(), r.stopPropagation(), this.callbacks.onStartEditing(j.rowIndex, j.columnId);
							return;
						}
					}
				}
			}
			this.focusManager.hasFocus() && !N && this.handleKeyboardNavigation(r);
		}, document.addEventListener("keydown", this.keyboardHandler, !0));
	}
	detach() {
		this.keyboardHandler &&= (document.removeEventListener("keydown", this.keyboardHandler, !0), null);
	}
	handleKeyboardNavigation(r) {
		let j = this.focusManager.getFocusedCell();
		if (!j || !this.callbacks.getAllColumns || !this.callbacks.focusCell) return;
		let { rowIndex: M, columnId: N } = j, P = this.callbacks.getAllColumns(), F = this.callbacks.getMaxRowIndex ? this.callbacks.getMaxRowIndex() : Infinity, I = P.indexOf(N);
		if (I < 0) return;
		let L = M, R = I;
		if (r.key === "Tab" && (r.preventDefault(), r.stopPropagation(), r.shiftKey ? I > 0 ? R = I - 1 : M > 0 ? (L = M - 1, R = P.length - 1) : (L = F, R = P.length - 1) : I < P.length - 1 ? R = I + 1 : M < F ? (L = M + 1, R = 0) : (L = 0, R = 0)), r.key === "Enter" && N.startsWith("values.")) if (r.preventDefault(), r.stopPropagation(), r.shiftKey) if (M > 0) L = M - 1;
		else return;
		else if (M < F) L = M + 1;
		else return;
		r.key.startsWith("Arrow") && (r.preventDefault(), r.stopPropagation(), r.key === "ArrowRight" && I < P.length - 1 ? R = I + 1 : r.key === "ArrowLeft" && I > 0 ? R = I - 1 : r.key === "ArrowDown" && M < F ? L = M + 1 : r.key === "ArrowUp" && M > 0 && (L = M - 1));
		let B = P[R];
		B && (this.focusManager.focusCell(L, B), this.callbacks.focusCell(L, B), this.callbacks.onNavigate && this.callbacks.onNavigate(L, B));
	}
	updateCallbacks(r) {
		this.callbacks = {
			...this.callbacks,
			...r
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
	constructor(r) {
		this.options = r;
	}
	addResizeHandle(r, j) {
		let M = document.createElement("div");
		M.className = "column-resize-handle", M.setAttribute("data-column-id", j), M.style.position = "absolute", M.style.right = "-2px", M.style.top = "0", M.style.bottom = "0", M.style.width = "4px", M.style.cursor = "col-resize", M.style.zIndex = "25", M.style.backgroundColor = "transparent", M.addEventListener("mousedown", (M) => {
			M.preventDefault(), M.stopPropagation(), this.startResize(j, M.clientX, r);
		}), r.appendChild(M);
	}
	startResize(r, j, M) {
		this.isResizing = !0, this.resizeStartX = j, this.resizeStartWidth = M.offsetWidth || M.getBoundingClientRect().width, this.resizeColumnId = r, this.options.callbacks.onResizeStart && this.options.callbacks.onResizeStart(r), this.resizeHandler = (r) => {
			!this.isResizing || !this.resizeColumnId || (r.preventDefault(), this.handleResize(r.clientX));
		}, this.resizeEndHandler = (r) => {
			this.isResizing && (r.preventDefault(), this.endResize());
		}, document.addEventListener("mousemove", this.resizeHandler, !0), document.addEventListener("mouseup", this.resizeEndHandler, !0), document.body.style.cursor = "col-resize", document.body.style.userSelect = "none";
	}
	handleResize(r) {
		if (!this.resizeColumnId) return;
		let j = r - this.resizeStartX, M = this.options.columnMinWidths.get(this.resizeColumnId) || 80, N = Math.max(M, this.resizeStartWidth + j), P = `values.${this.options.languages[this.options.languages.length - 1]}`;
		this.resizeColumnId !== P && this.options.columnWidths.set(this.resizeColumnId, N), this.options.callbacks.onResize && this.options.callbacks.onResize(this.resizeColumnId, N);
	}
	endResize() {
		this.resizeHandler &&= (document.removeEventListener("mousemove", this.resizeHandler, !0), null), this.resizeEndHandler &&= (document.removeEventListener("mouseup", this.resizeEndHandler, !0), null), document.body.style.cursor = "", document.body.style.userSelect = "";
		let r = this.resizeColumnId, j = r && this.options.columnWidths.get(r) || this.resizeStartWidth;
		this.isResizing = !1, this.resizeColumnId = null, r && this.options.callbacks.onResizeEnd && this.options.callbacks.onResizeEnd(r, j);
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
	options;
	constructor(r) {
		this.options = r, this.defaultKeyWidth = r.defaultKeyWidth ?? 200, this.defaultContextWidth = r.defaultContextWidth ?? 200, this.defaultLangWidth = r.defaultLangWidth ?? 150;
	}
	getColumnWidthValue(r, j) {
		return this.options.columnWidths.get(r) || j || this.getDefaultWidth(r);
	}
	getDefaultWidth(r) {
		return r === "row-number" ? 50 : r === "key" ? this.defaultKeyWidth : r === "context" ? this.defaultContextWidth : this.defaultLangWidth;
	}
	calculateColumnWidths(r) {
		let j = this.getColumnWidthValue("row-number", 50), M = this.getColumnWidthValue("key", this.defaultKeyWidth), N = this.getColumnWidthValue("context", this.defaultContextWidth), P = this.options.languages.map((r) => this.getColumnWidthValue(`values.${r}`, this.defaultLangWidth)), F = j + M + N + P.slice(0, -1).reduce((r, j) => r + j, 0), I = this.options.languages[this.options.languages.length - 1], L = this.options.columnMinWidths.get(`values.${I}`) || 80, R = Math.max(L, r - F);
		return {
			rowNumber: j,
			key: M,
			context: N,
			languages: [...P.slice(0, -1), R]
		};
	}
	applyColumnWidth(r, j, M) {
		let N = `values.${this.options.languages[this.options.languages.length - 1]}`;
		r !== N && this.options.columnWidths.set(r, j);
		let P = this.getColumnWidthValue("row-number", 50), F = r === "key" ? j : this.getColumnWidthValue("key", this.defaultKeyWidth), I = r === "context" ? j : this.getColumnWidthValue("context", this.defaultContextWidth), L = this.options.languages.slice(0, -1).map((M) => {
			let N = `values.${M}`;
			return r === N ? j : this.getColumnWidthValue(N, this.defaultLangWidth);
		}), R = P + F + I + L.reduce((r, j) => r + j, 0), B = this.options.columnMinWidths.get(N) || 80, V = Math.max(B, M - R);
		return {
			columnWidths: {
				rowNumber: P,
				key: F,
				context: I,
				languages: [...L, V]
			},
			totalWidth: M
		};
	}
}, GridRenderer = class {
	options;
	constructor(r) {
		this.options = r;
	}
	createHeaderCell(r, j, M, N, P) {
		let F = document.createElement("div");
		return F.className = "virtual-grid-header-cell", F.setAttribute("role", "columnheader"), F.textContent = r, P && F.setAttribute("data-column-id", P), F.style.width = `${j}px`, F.style.minWidth = `${j}px`, F.style.maxWidth = `${j}px`, (M > 0 || N > 0) && (F.style.position = "sticky", F.style.left = `${M}px`, F.style.zIndex = N.toString(), F.style.backgroundColor = "#f8fafc"), F.style.overflow = "visible", F;
	}
	createRow(r, j, M) {
		let N = document.createElement("div");
		N.className = "virtual-grid-row", N.setAttribute("role", "row"), N.setAttribute("data-row-index", j.toString()), N.setAttribute("data-row-id", r.id);
		let P = this.createCell(r.id, "row-number", (j + 1).toString(), j, !1, M.rowNumber, 0, 15);
		P.classList.add("row-number-cell"), N.appendChild(P);
		let F = this.createCell(r.id, "key", r.key, j, !this.options.readOnly, M.key, M.rowNumber, 10);
		N.appendChild(F);
		let I = this.createCell(r.id, "context", r.context || "", j, !this.options.readOnly, M.context, M.rowNumber + M.key, 10);
		return N.appendChild(I), this.options.languages.forEach((P, F) => {
			let I = r.values[P] || "", L = M.languages[F], R = M.rowNumber + M.key + M.context, B = this.createCell(r.id, `values.${P}`, I, j, !this.options.readOnly, L, R, 0);
			N.appendChild(B);
		}), N;
	}
	createCell(r, j, M, N, P, F, I, L) {
		let R = document.createElement("div");
		R.className = "virtual-grid-cell", R.setAttribute("role", "gridcell"), R.setAttribute("data-row-id", r), R.setAttribute("data-column-id", j), R.setAttribute("data-row-index", N.toString()), R.setAttribute("tabindex", P ? "0" : "-1"), R.style.width = `${F}px`, R.style.minWidth = `${F}px`, R.style.maxWidth = `${F}px`, (I > 0 || L > 0) && (R.style.position = "sticky", R.style.left = `${I}px`, R.style.zIndex = L.toString(), R.style.backgroundColor = "#fafafa");
		let B = document.createElement("div");
		return B.className = "virtual-grid-cell-content", B.textContent = M, R.appendChild(B), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(r, j, R), P && !this.options.readOnly && (R.addEventListener("dblclick", (r) => {
			r.preventDefault(), r.stopPropagation(), this.options.callbacks.onCellDblClick && this.options.callbacks.onCellDblClick(N, j, R);
		}), R.addEventListener("focus", () => {
			this.options.callbacks.onCellFocus && this.options.callbacks.onCellFocus(N, j), R.classList.add("focused");
		}), R.addEventListener("blur", () => {
			R.classList.remove("focused");
		})), R;
	}
	updateCellContent(r, j, M, N, P) {
		r.innerHTML = "";
		let F = document.createElement("div");
		F.className = "virtual-grid-cell-content", F.textContent = N, r.appendChild(F), !this.options.readOnly && this.options.editableColumns.has(M) && r.addEventListener("dblclick", (j) => {
			j.preventDefault(), j.stopPropagation(), this.options.callbacks.onCellDblClick && this.options.callbacks.onCellDblClick(P, M, r);
		}), this.options.callbacks.updateCellStyle && this.options.callbacks.updateCellStyle(j, M, r);
	}
}, CommandRegistry = class {
	commands = /* @__PURE__ */ new Map();
	usageCounts = /* @__PURE__ */ new Map();
	storageKey = "command-palette-usage";
	callbacks;
	constructor(r = {}) {
		this.callbacks = r, this.loadUsageCounts();
	}
	registerCommand(r) {
		let j = {
			...r,
			usageCount: r.usageCount ?? 0,
			availableInModes: r.availableInModes ?? ["all"]
		};
		this.commands.set(r.id, j), this.applySavedUsageCount(r.id);
	}
	getCommandById(r) {
		return this.commands.get(r);
	}
	getCommands(r) {
		let j = Array.from(this.commands.values());
		return !r || r === "all" ? j : j.filter((j) => {
			let M = j.availableInModes ?? ["all"];
			return M.includes("all") || M.includes(r);
		});
	}
	incrementUsage(r) {
		let j = (this.usageCounts.get(r) ?? 0) + 1;
		this.usageCounts.set(r, j);
		let M = this.commands.get(r);
		M && (M.usageCount = j), this.saveUsageCounts(), this.callbacks.onCommandExecuted && this.callbacks.onCommandExecuted(r);
	}
	getPopularCommands(r = 10, j) {
		return this.getCommands(j).sort((r, j) => {
			let M = this.usageCounts.get(r.id) ?? 0;
			return (this.usageCounts.get(j.id) ?? 0) - M;
		}).slice(0, r);
	}
	loadUsageCounts() {
		try {
			let r = localStorage.getItem(this.storageKey);
			if (r) {
				let j = JSON.parse(r);
				this.usageCounts = new Map(Object.entries(j));
			}
		} catch (r) {
			logger.warn("Failed to load command usage counts:", r);
		}
	}
	applySavedUsageCount(r) {
		let j = this.usageCounts.get(r);
		if (j !== void 0) {
			let M = this.commands.get(r);
			M && (M.usageCount = j);
		}
	}
	saveUsageCounts() {
		try {
			let r = Object.fromEntries(this.usageCounts);
			localStorage.setItem(this.storageKey, JSON.stringify(r));
		} catch (r) {
			logger.warn("Failed to save command usage counts:", r);
		}
	}
	clear() {
		this.commands.clear(), this.usageCounts.clear(), localStorage.removeItem(this.storageKey);
	}
};
function isArray(r) {
	return Array.isArray ? Array.isArray(r) : getTag(r) === "[object Array]";
}
var INFINITY = Infinity;
function baseToString(r) {
	if (typeof r == "string") return r;
	let j = r + "";
	return j == "0" && 1 / r == -INFINITY ? "-0" : j;
}
function toString(r) {
	return r == null ? "" : baseToString(r);
}
function isString(r) {
	return typeof r == "string";
}
function isNumber(r) {
	return typeof r == "number";
}
function isBoolean(r) {
	return r === !0 || r === !1 || isObjectLike(r) && getTag(r) == "[object Boolean]";
}
function isObject(r) {
	return typeof r == "object";
}
function isObjectLike(r) {
	return isObject(r) && r !== null;
}
function isDefined(r) {
	return r != null;
}
function isBlank(r) {
	return !r.trim().length;
}
function getTag(r) {
	return r == null ? r === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(r);
}
var INCORRECT_INDEX_TYPE = "Incorrect 'index' type", LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (r) => `Invalid value for key ${r}`, PATTERN_LENGTH_TOO_LARGE = (r) => `Pattern length exceeds max of ${r}.`, MISSING_KEY_PROPERTY = (r) => `Missing ${r} property in key`, INVALID_KEY_WEIGHT_VALUE = (r) => `Property 'weight' in key '${r}' must be a positive integer`, hasOwn = Object.prototype.hasOwnProperty, KeyStore = class {
	constructor(r) {
		this._keys = [], this._keyMap = {};
		let j = 0;
		r.forEach((r) => {
			let M = createKey(r);
			this._keys.push(M), this._keyMap[M.id] = M, j += M.weight;
		}), this._keys.forEach((r) => {
			r.weight /= j;
		});
	}
	get(r) {
		return this._keyMap[r];
	}
	keys() {
		return this._keys;
	}
	toJSON() {
		return JSON.stringify(this._keys);
	}
};
function createKey(r) {
	let j = null, M = null, N = null, P = 1, F = null;
	if (isString(r) || isArray(r)) N = r, j = createKeyPath(r), M = createKeyId(r);
	else {
		if (!hasOwn.call(r, "name")) throw Error(MISSING_KEY_PROPERTY("name"));
		let I = r.name;
		if (N = I, hasOwn.call(r, "weight") && (P = r.weight, P <= 0)) throw Error(INVALID_KEY_WEIGHT_VALUE(I));
		j = createKeyPath(I), M = createKeyId(I), F = r.getFn;
	}
	return {
		path: j,
		id: M,
		weight: P,
		src: N,
		getFn: F
	};
}
function createKeyPath(r) {
	return isArray(r) ? r : r.split(".");
}
function createKeyId(r) {
	return isArray(r) ? r.join(".") : r;
}
function get(r, j) {
	let M = [], N = !1, P = (r, j, F) => {
		if (isDefined(r)) if (!j[F]) M.push(r);
		else {
			let I = r[j[F]];
			if (!isDefined(I)) return;
			if (F === j.length - 1 && (isString(I) || isNumber(I) || isBoolean(I))) M.push(toString(I));
			else if (isArray(I)) {
				N = !0;
				for (let r = 0, M = I.length; r < M; r += 1) P(I[r], j, F + 1);
			} else j.length && P(I, j, F + 1);
		}
	};
	return P(r, isString(j) ? j.split(".") : j, 0), N ? M : M[0];
}
var MatchOptions = {
	includeMatches: !1,
	findAllMatches: !1,
	minMatchCharLength: 1
}, BasicOptions = {
	isCaseSensitive: !1,
	ignoreDiacritics: !1,
	includeScore: !1,
	keys: [],
	shouldSort: !0,
	sortFn: (r, j) => r.score === j.score ? r.idx < j.idx ? -1 : 1 : r.score < j.score ? -1 : 1
}, FuzzyOptions = {
	location: 0,
	threshold: .6,
	distance: 100
}, AdvancedOptions = {
	useExtendedSearch: !1,
	getFn: get,
	ignoreLocation: !1,
	ignoreFieldNorm: !1,
	fieldNormWeight: 1
}, Config = {
	...BasicOptions,
	...MatchOptions,
	...FuzzyOptions,
	...AdvancedOptions
}, SPACE = /[^ ]+/g;
function norm(r = 1, j = 3) {
	let M = /* @__PURE__ */ new Map(), N = 10 ** j;
	return {
		get(j) {
			let P = j.match(SPACE).length;
			if (M.has(P)) return M.get(P);
			let F = 1 / P ** (.5 * r), I = parseFloat(Math.round(F * N) / N);
			return M.set(P, I), I;
		},
		clear() {
			M.clear();
		}
	};
}
var FuseIndex = class {
	constructor({ getFn: r = Config.getFn, fieldNormWeight: j = Config.fieldNormWeight } = {}) {
		this.norm = norm(j, 3), this.getFn = r, this.isCreated = !1, this.setIndexRecords();
	}
	setSources(r = []) {
		this.docs = r;
	}
	setIndexRecords(r = []) {
		this.records = r;
	}
	setKeys(r = []) {
		this.keys = r, this._keysMap = {}, r.forEach((r, j) => {
			this._keysMap[r.id] = j;
		});
	}
	create() {
		this.isCreated || !this.docs.length || (this.isCreated = !0, isString(this.docs[0]) ? this.docs.forEach((r, j) => {
			this._addString(r, j);
		}) : this.docs.forEach((r, j) => {
			this._addObject(r, j);
		}), this.norm.clear());
	}
	add(r) {
		let j = this.size();
		isString(r) ? this._addString(r, j) : this._addObject(r, j);
	}
	removeAt(r) {
		this.records.splice(r, 1);
		for (let j = r, M = this.size(); j < M; j += 1) --this.records[j].i;
	}
	getValueForItemAtKeyId(r, j) {
		return r[this._keysMap[j]];
	}
	size() {
		return this.records.length;
	}
	_addString(r, j) {
		if (!isDefined(r) || isBlank(r)) return;
		let M = {
			v: r,
			i: j,
			n: this.norm.get(r)
		};
		this.records.push(M);
	}
	_addObject(r, j) {
		let M = {
			i: j,
			$: {}
		};
		this.keys.forEach((j, N) => {
			let P = j.getFn ? j.getFn(r) : this.getFn(r, j.path);
			if (isDefined(P)) {
				if (isArray(P)) {
					let r = [], j = [{
						nestedArrIndex: -1,
						value: P
					}];
					for (; j.length;) {
						let { nestedArrIndex: M, value: N } = j.pop();
						if (isDefined(N)) if (isString(N) && !isBlank(N)) {
							let j = {
								v: N,
								i: M,
								n: this.norm.get(N)
							};
							r.push(j);
						} else isArray(N) && N.forEach((r, M) => {
							j.push({
								nestedArrIndex: M,
								value: r
							});
						});
					}
					M.$[N] = r;
				} else if (isString(P) && !isBlank(P)) {
					let r = {
						v: P,
						n: this.norm.get(P)
					};
					M.$[N] = r;
				}
			}
		}), this.records.push(M);
	}
	toJSON() {
		return {
			keys: this.keys,
			records: this.records
		};
	}
};
function createIndex(r, j, { getFn: M = Config.getFn, fieldNormWeight: N = Config.fieldNormWeight } = {}) {
	let P = new FuseIndex({
		getFn: M,
		fieldNormWeight: N
	});
	return P.setKeys(r.map(createKey)), P.setSources(j), P.create(), P;
}
function parseIndex(r, { getFn: j = Config.getFn, fieldNormWeight: M = Config.fieldNormWeight } = {}) {
	let { keys: N, records: P } = r, F = new FuseIndex({
		getFn: j,
		fieldNormWeight: M
	});
	return F.setKeys(N), F.setIndexRecords(P), F;
}
function computeScore$1(r, { errors: j = 0, currentLocation: M = 0, expectedLocation: N = 0, distance: P = Config.distance, ignoreLocation: F = Config.ignoreLocation } = {}) {
	let I = j / r.length;
	if (F) return I;
	let L = Math.abs(N - M);
	return P ? I + L / P : L ? 1 : I;
}
function convertMaskToIndices(r = [], j = Config.minMatchCharLength) {
	let M = [], N = -1, P = -1, F = 0;
	for (let I = r.length; F < I; F += 1) {
		let I = r[F];
		I && N === -1 ? N = F : !I && N !== -1 && (P = F - 1, P - N + 1 >= j && M.push([N, P]), N = -1);
	}
	return r[F - 1] && F - N >= j && M.push([N, F - 1]), M;
}
var MAX_BITS = 32;
function search(r, j, M, { location: N = Config.location, distance: P = Config.distance, threshold: F = Config.threshold, findAllMatches: I = Config.findAllMatches, minMatchCharLength: L = Config.minMatchCharLength, includeMatches: R = Config.includeMatches, ignoreLocation: B = Config.ignoreLocation } = {}) {
	if (j.length > MAX_BITS) throw Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS));
	let V = j.length, H = r.length, U = Math.max(0, Math.min(N, H)), W = F, G = U, K = L > 1 || R, q = K ? Array(H) : [], J;
	for (; (J = r.indexOf(j, G)) > -1;) {
		let r = computeScore$1(j, {
			currentLocation: J,
			expectedLocation: U,
			distance: P,
			ignoreLocation: B
		});
		if (W = Math.min(r, W), G = J + V, K) {
			let r = 0;
			for (; r < V;) q[J + r] = 1, r += 1;
		}
	}
	G = -1;
	let Y = [], X = 1, Z = V + H, Q = 1 << V - 1;
	for (let N = 0; N < V; N += 1) {
		let F = 0, L = Z;
		for (; F < L;) computeScore$1(j, {
			errors: N,
			currentLocation: U + L,
			expectedLocation: U,
			distance: P,
			ignoreLocation: B
		}) <= W ? F = L : Z = L, L = Math.floor((Z - F) / 2 + F);
		Z = L;
		let R = Math.max(1, U - L + 1), J = I ? H : Math.min(U + L, H) + V, $ = Array(J + 2);
		$[J + 1] = (1 << N) - 1;
		for (let F = J; F >= R; --F) {
			let I = F - 1, L = M[r.charAt(I)];
			if (K && (q[I] = +!!L), $[F] = ($[F + 1] << 1 | 1) & L, N && ($[F] |= (Y[F + 1] | Y[F]) << 1 | 1 | Y[F + 1]), $[F] & Q && (X = computeScore$1(j, {
				errors: N,
				currentLocation: I,
				expectedLocation: U,
				distance: P,
				ignoreLocation: B
			}), X <= W)) {
				if (W = X, G = I, G <= U) break;
				R = Math.max(1, 2 * U - G);
			}
		}
		if (computeScore$1(j, {
			errors: N + 1,
			currentLocation: U,
			expectedLocation: U,
			distance: P,
			ignoreLocation: B
		}) > W) break;
		Y = $;
	}
	let $ = {
		isMatch: G >= 0,
		score: Math.max(.001, X)
	};
	if (K) {
		let r = convertMaskToIndices(q, L);
		r.length ? R && ($.indices = r) : $.isMatch = !1;
	}
	return $;
}
function createPatternAlphabet(r) {
	let j = {};
	for (let M = 0, N = r.length; M < N; M += 1) {
		let P = r.charAt(M);
		j[P] = (j[P] || 0) | 1 << N - M - 1;
	}
	return j;
}
var stripDiacritics = String.prototype.normalize ? ((r) => r.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g, "")) : ((r) => r), BitapSearch = class {
	constructor(r, { location: j = Config.location, threshold: M = Config.threshold, distance: N = Config.distance, includeMatches: P = Config.includeMatches, findAllMatches: F = Config.findAllMatches, minMatchCharLength: I = Config.minMatchCharLength, isCaseSensitive: L = Config.isCaseSensitive, ignoreDiacritics: R = Config.ignoreDiacritics, ignoreLocation: B = Config.ignoreLocation } = {}) {
		if (this.options = {
			location: j,
			threshold: M,
			distance: N,
			includeMatches: P,
			findAllMatches: F,
			minMatchCharLength: I,
			isCaseSensitive: L,
			ignoreDiacritics: R,
			ignoreLocation: B
		}, r = L ? r : r.toLowerCase(), r = R ? stripDiacritics(r) : r, this.pattern = r, this.chunks = [], !this.pattern.length) return;
		let V = (r, j) => {
			this.chunks.push({
				pattern: r,
				alphabet: createPatternAlphabet(r),
				startIndex: j
			});
		}, H = this.pattern.length;
		if (H > MAX_BITS) {
			let r = 0, j = H % MAX_BITS, M = H - j;
			for (; r < M;) V(this.pattern.substr(r, MAX_BITS), r), r += MAX_BITS;
			if (j) {
				let r = H - MAX_BITS;
				V(this.pattern.substr(r), r);
			}
		} else V(this.pattern, 0);
	}
	searchIn(r) {
		let { isCaseSensitive: j, ignoreDiacritics: M, includeMatches: N } = this.options;
		if (r = j ? r : r.toLowerCase(), r = M ? stripDiacritics(r) : r, this.pattern === r) {
			let j = {
				isMatch: !0,
				score: 0
			};
			return N && (j.indices = [[0, r.length - 1]]), j;
		}
		let { location: P, distance: F, threshold: I, findAllMatches: L, minMatchCharLength: R, ignoreLocation: B } = this.options, V = [], H = 0, U = !1;
		this.chunks.forEach(({ pattern: j, alphabet: M, startIndex: W }) => {
			let { isMatch: G, score: K, indices: q } = search(r, j, M, {
				location: P + W,
				distance: F,
				threshold: I,
				findAllMatches: L,
				minMatchCharLength: R,
				includeMatches: N,
				ignoreLocation: B
			});
			G && (U = !0), H += K, G && q && (V = [...V, ...q]);
		});
		let W = {
			isMatch: U,
			score: U ? H / this.chunks.length : 1
		};
		return U && N && (W.indices = V), W;
	}
}, BaseMatch = class {
	constructor(r) {
		this.pattern = r;
	}
	static isMultiMatch(r) {
		return getMatch(r, this.multiRegex);
	}
	static isSingleMatch(r) {
		return getMatch(r, this.singleRegex);
	}
	search() {}
};
function getMatch(r, j) {
	let M = r.match(j);
	return M ? M[1] : null;
}
var ExactMatch = class extends BaseMatch {
	constructor(r) {
		super(r);
	}
	static get type() {
		return "exact";
	}
	static get multiRegex() {
		return /^="(.*)"$/;
	}
	static get singleRegex() {
		return /^=(.*)$/;
	}
	search(r) {
		let j = r === this.pattern;
		return {
			isMatch: j,
			score: j ? 0 : 1,
			indices: [0, this.pattern.length - 1]
		};
	}
}, InverseExactMatch = class extends BaseMatch {
	constructor(r) {
		super(r);
	}
	static get type() {
		return "inverse-exact";
	}
	static get multiRegex() {
		return /^!"(.*)"$/;
	}
	static get singleRegex() {
		return /^!(.*)$/;
	}
	search(r) {
		let j = r.indexOf(this.pattern) === -1;
		return {
			isMatch: j,
			score: j ? 0 : 1,
			indices: [0, r.length - 1]
		};
	}
}, PrefixExactMatch = class extends BaseMatch {
	constructor(r) {
		super(r);
	}
	static get type() {
		return "prefix-exact";
	}
	static get multiRegex() {
		return /^\^"(.*)"$/;
	}
	static get singleRegex() {
		return /^\^(.*)$/;
	}
	search(r) {
		let j = r.startsWith(this.pattern);
		return {
			isMatch: j,
			score: j ? 0 : 1,
			indices: [0, this.pattern.length - 1]
		};
	}
}, InversePrefixExactMatch = class extends BaseMatch {
	constructor(r) {
		super(r);
	}
	static get type() {
		return "inverse-prefix-exact";
	}
	static get multiRegex() {
		return /^!\^"(.*)"$/;
	}
	static get singleRegex() {
		return /^!\^(.*)$/;
	}
	search(r) {
		let j = !r.startsWith(this.pattern);
		return {
			isMatch: j,
			score: j ? 0 : 1,
			indices: [0, r.length - 1]
		};
	}
}, SuffixExactMatch = class extends BaseMatch {
	constructor(r) {
		super(r);
	}
	static get type() {
		return "suffix-exact";
	}
	static get multiRegex() {
		return /^"(.*)"\$$/;
	}
	static get singleRegex() {
		return /^(.*)\$$/;
	}
	search(r) {
		let j = r.endsWith(this.pattern);
		return {
			isMatch: j,
			score: j ? 0 : 1,
			indices: [r.length - this.pattern.length, r.length - 1]
		};
	}
}, InverseSuffixExactMatch = class extends BaseMatch {
	constructor(r) {
		super(r);
	}
	static get type() {
		return "inverse-suffix-exact";
	}
	static get multiRegex() {
		return /^!"(.*)"\$$/;
	}
	static get singleRegex() {
		return /^!(.*)\$$/;
	}
	search(r) {
		let j = !r.endsWith(this.pattern);
		return {
			isMatch: j,
			score: j ? 0 : 1,
			indices: [0, r.length - 1]
		};
	}
}, FuzzyMatch = class extends BaseMatch {
	constructor(r, { location: j = Config.location, threshold: M = Config.threshold, distance: N = Config.distance, includeMatches: P = Config.includeMatches, findAllMatches: F = Config.findAllMatches, minMatchCharLength: I = Config.minMatchCharLength, isCaseSensitive: L = Config.isCaseSensitive, ignoreDiacritics: R = Config.ignoreDiacritics, ignoreLocation: B = Config.ignoreLocation } = {}) {
		super(r), this._bitapSearch = new BitapSearch(r, {
			location: j,
			threshold: M,
			distance: N,
			includeMatches: P,
			findAllMatches: F,
			minMatchCharLength: I,
			isCaseSensitive: L,
			ignoreDiacritics: R,
			ignoreLocation: B
		});
	}
	static get type() {
		return "fuzzy";
	}
	static get multiRegex() {
		return /^"(.*)"$/;
	}
	static get singleRegex() {
		return /^(.*)$/;
	}
	search(r) {
		return this._bitapSearch.searchIn(r);
	}
}, IncludeMatch = class extends BaseMatch {
	constructor(r) {
		super(r);
	}
	static get type() {
		return "include";
	}
	static get multiRegex() {
		return /^'"(.*)"$/;
	}
	static get singleRegex() {
		return /^'(.*)$/;
	}
	search(r) {
		let j = 0, M, N = [], P = this.pattern.length;
		for (; (M = r.indexOf(this.pattern, j)) > -1;) j = M + P, N.push([M, j - 1]);
		let F = !!N.length;
		return {
			isMatch: F,
			score: F ? 0 : 1,
			indices: N
		};
	}
}, searchers = [
	ExactMatch,
	IncludeMatch,
	PrefixExactMatch,
	InversePrefixExactMatch,
	InverseSuffixExactMatch,
	SuffixExactMatch,
	InverseExactMatch,
	FuzzyMatch
], searchersLen = searchers.length, SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/, OR_TOKEN = "|";
function parseQuery(r, j = {}) {
	return r.split(OR_TOKEN).map((r) => {
		let M = r.trim().split(SPACE_RE).filter((r) => r && !!r.trim()), N = [];
		for (let r = 0, P = M.length; r < P; r += 1) {
			let P = M[r], F = !1, I = -1;
			for (; !F && ++I < searchersLen;) {
				let r = searchers[I], M = r.isMultiMatch(P);
				M && (N.push(new r(M, j)), F = !0);
			}
			if (!F) for (I = -1; ++I < searchersLen;) {
				let r = searchers[I], M = r.isSingleMatch(P);
				if (M) {
					N.push(new r(M, j));
					break;
				}
			}
		}
		return N;
	});
}
var MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]), ExtendedSearch = class {
	constructor(r, { isCaseSensitive: j = Config.isCaseSensitive, ignoreDiacritics: M = Config.ignoreDiacritics, includeMatches: N = Config.includeMatches, minMatchCharLength: P = Config.minMatchCharLength, ignoreLocation: F = Config.ignoreLocation, findAllMatches: I = Config.findAllMatches, location: L = Config.location, threshold: R = Config.threshold, distance: B = Config.distance } = {}) {
		this.query = null, this.options = {
			isCaseSensitive: j,
			ignoreDiacritics: M,
			includeMatches: N,
			minMatchCharLength: P,
			findAllMatches: I,
			ignoreLocation: F,
			location: L,
			threshold: R,
			distance: B
		}, r = j ? r : r.toLowerCase(), r = M ? stripDiacritics(r) : r, this.pattern = r, this.query = parseQuery(this.pattern, this.options);
	}
	static condition(r, j) {
		return j.useExtendedSearch;
	}
	searchIn(r) {
		let j = this.query;
		if (!j) return {
			isMatch: !1,
			score: 1
		};
		let { includeMatches: M, isCaseSensitive: N, ignoreDiacritics: P } = this.options;
		r = N ? r : r.toLowerCase(), r = P ? stripDiacritics(r) : r;
		let F = 0, I = [], L = 0;
		for (let N = 0, P = j.length; N < P; N += 1) {
			let P = j[N];
			I.length = 0, F = 0;
			for (let j = 0, N = P.length; j < N; j += 1) {
				let N = P[j], { isMatch: R, indices: B, score: V } = N.search(r);
				if (R) {
					if (F += 1, L += V, M) {
						let r = N.constructor.type;
						MultiMatchSet.has(r) ? I = [...I, ...B] : I.push(B);
					}
				} else {
					L = 0, F = 0, I.length = 0;
					break;
				}
			}
			if (F) {
				let r = {
					isMatch: !0,
					score: L / F
				};
				return M && (r.indices = I), r;
			}
		}
		return {
			isMatch: !1,
			score: 1
		};
	}
}, registeredSearchers = [];
function register(...r) {
	registeredSearchers.push(...r);
}
function createSearcher(r, j) {
	for (let M = 0, N = registeredSearchers.length; M < N; M += 1) {
		let N = registeredSearchers[M];
		if (N.condition(r, j)) return new N(r, j);
	}
	return new BitapSearch(r, j);
}
var LogicalOperator = {
	AND: "$and",
	OR: "$or"
}, KeyType = {
	PATH: "$path",
	PATTERN: "$val"
}, isExpression = (r) => !!(r[LogicalOperator.AND] || r[LogicalOperator.OR]), isPath = (r) => !!r[KeyType.PATH], isLeaf = (r) => !isArray(r) && isObject(r) && !isExpression(r), convertToExplicit = (r) => ({ [LogicalOperator.AND]: Object.keys(r).map((j) => ({ [j]: r[j] })) });
function parse(r, j, { auto: M = !0 } = {}) {
	let N = (r) => {
		let P = Object.keys(r), F = isPath(r);
		if (!F && P.length > 1 && !isExpression(r)) return N(convertToExplicit(r));
		if (isLeaf(r)) {
			let N = F ? r[KeyType.PATH] : P[0], I = F ? r[KeyType.PATTERN] : r[N];
			if (!isString(I)) throw Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(N));
			let L = {
				keyId: createKeyId(N),
				pattern: I
			};
			return M && (L.searcher = createSearcher(I, j)), L;
		}
		let I = {
			children: [],
			operator: P[0]
		};
		return P.forEach((j) => {
			let M = r[j];
			isArray(M) && M.forEach((r) => {
				I.children.push(N(r));
			});
		}), I;
	};
	return isExpression(r) || (r = convertToExplicit(r)), N(r);
}
function computeScore(r, { ignoreFieldNorm: j = Config.ignoreFieldNorm }) {
	r.forEach((r) => {
		let M = 1;
		r.matches.forEach(({ key: r, norm: N, score: P }) => {
			let F = r ? r.weight : null;
			M *= (P === 0 && F ? 2 ** -52 : P) ** +((F || 1) * (j ? 1 : N));
		}), r.score = M;
	});
}
function transformMatches(r, j) {
	let M = r.matches;
	j.matches = [], isDefined(M) && M.forEach((r) => {
		if (!isDefined(r.indices) || !r.indices.length) return;
		let { indices: M, value: N } = r, P = {
			indices: M,
			value: N
		};
		r.key && (P.key = r.key.src), r.idx > -1 && (P.refIndex = r.idx), j.matches.push(P);
	});
}
function transformScore(r, j) {
	j.score = r.score;
}
function format(r, j, { includeMatches: M = Config.includeMatches, includeScore: N = Config.includeScore } = {}) {
	let P = [];
	return M && P.push(transformMatches), N && P.push(transformScore), r.map((r) => {
		let { idx: M } = r, N = {
			item: j[M],
			refIndex: M
		};
		return P.length && P.forEach((j) => {
			j(r, N);
		}), N;
	});
}
var Fuse = class {
	constructor(r, j = {}, M) {
		this.options = {
			...Config,
			...j
		}, this.options.useExtendedSearch, this._keyStore = new KeyStore(this.options.keys), this.setCollection(r, M);
	}
	setCollection(r, j) {
		if (this._docs = r, j && !(j instanceof FuseIndex)) throw Error(INCORRECT_INDEX_TYPE);
		this._myIndex = j || createIndex(this.options.keys, this._docs, {
			getFn: this.options.getFn,
			fieldNormWeight: this.options.fieldNormWeight
		});
	}
	add(r) {
		isDefined(r) && (this._docs.push(r), this._myIndex.add(r));
	}
	remove(r = () => !1) {
		let j = [];
		for (let M = 0, N = this._docs.length; M < N; M += 1) {
			let P = this._docs[M];
			r(P, M) && (this.removeAt(M), --M, --N, j.push(P));
		}
		return j;
	}
	removeAt(r) {
		this._docs.splice(r, 1), this._myIndex.removeAt(r);
	}
	getIndex() {
		return this._myIndex;
	}
	search(r, { limit: j = -1 } = {}) {
		let { includeMatches: M, includeScore: N, shouldSort: P, sortFn: F, ignoreFieldNorm: I } = this.options, L = isString(r) ? isString(this._docs[0]) ? this._searchStringList(r) : this._searchObjectList(r) : this._searchLogical(r);
		return computeScore(L, { ignoreFieldNorm: I }), P && L.sort(F), isNumber(j) && j > -1 && (L = L.slice(0, j)), format(L, this._docs, {
			includeMatches: M,
			includeScore: N
		});
	}
	_searchStringList(r) {
		let j = createSearcher(r, this.options), { records: M } = this._myIndex, N = [];
		return M.forEach(({ v: r, i: M, n: P }) => {
			if (!isDefined(r)) return;
			let { isMatch: F, score: I, indices: L } = j.searchIn(r);
			F && N.push({
				item: r,
				idx: M,
				matches: [{
					score: I,
					value: r,
					norm: P,
					indices: L
				}]
			});
		}), N;
	}
	_searchLogical(r) {
		let j = parse(r, this.options), M = (r, j, N) => {
			if (!r.children) {
				let { keyId: M, searcher: P } = r, F = this._findMatches({
					key: this._keyStore.get(M),
					value: this._myIndex.getValueForItemAtKeyId(j, M),
					searcher: P
				});
				return F && F.length ? [{
					idx: N,
					item: j,
					matches: F
				}] : [];
			}
			let P = [];
			for (let F = 0, I = r.children.length; F < I; F += 1) {
				let I = r.children[F], L = M(I, j, N);
				if (L.length) P.push(...L);
				else if (r.operator === LogicalOperator.AND) return [];
			}
			return P;
		}, N = this._myIndex.records, P = {}, F = [];
		return N.forEach(({ $: r, i: N }) => {
			if (isDefined(r)) {
				let I = M(j, r, N);
				I.length && (P[N] || (P[N] = {
					idx: N,
					item: r,
					matches: []
				}, F.push(P[N])), I.forEach(({ matches: r }) => {
					P[N].matches.push(...r);
				}));
			}
		}), F;
	}
	_searchObjectList(r) {
		let j = createSearcher(r, this.options), { keys: M, records: N } = this._myIndex, P = [];
		return N.forEach(({ $: r, i: N }) => {
			if (!isDefined(r)) return;
			let F = [];
			M.forEach((M, N) => {
				F.push(...this._findMatches({
					key: M,
					value: r[N],
					searcher: j
				}));
			}), F.length && P.push({
				idx: N,
				item: r,
				matches: F
			});
		}), P;
	}
	_findMatches({ key: r, value: j, searcher: M }) {
		if (!isDefined(j)) return [];
		let N = [];
		if (isArray(j)) j.forEach(({ v: j, i: P, n: F }) => {
			if (!isDefined(j)) return;
			let { isMatch: I, score: L, indices: R } = M.searchIn(j);
			I && N.push({
				score: L,
				key: r,
				value: j,
				idx: P,
				norm: F,
				indices: R
			});
		});
		else {
			let { v: P, n: F } = j, { isMatch: I, score: L, indices: R } = M.searchIn(P);
			I && N.push({
				score: L,
				key: r,
				value: P,
				norm: F,
				indices: R
			});
		}
		return N;
	}
};
Fuse.version = "7.1.0", Fuse.createIndex = createIndex, Fuse.parseIndex = parseIndex, Fuse.config = Config, Fuse.parseQuery = parse, register(ExtendedSearch);
function searchCommands(r, j) {
	if (!r.trim()) return j.map((r) => ({
		command: r,
		score: 1,
		matchedIndices: []
	}));
	let M = new Fuse(j, {
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
	}).search(r).map((r) => {
		let j = r.score === void 0 ? 0 : 1 - r.score, M = [];
		if (r.matches) {
			for (let j of r.matches) if (j.indices) for (let [r, N] of j.indices) for (let j = r; j <= N; j++) M.push(j);
		}
		return {
			command: r.item,
			score: j,
			matchedIndices: Array.from(new Set(M)).sort((r, j) => r - j)
		};
	});
	return M.sort((r, j) => {
		if (Math.abs(r.score - j.score) < .01) {
			let M = r.command.usageCount ?? 0;
			return (j.command.usageCount ?? 0) - M;
		}
		return j.score - r.score;
	}), M;
}
function parseFuzzyFindInput(r) {
	let j = r.trim();
	if (!j.startsWith("goto ") && !j.startsWith("go to ")) return {
		isFuzzyFindMode: !1,
		fuzzyFindQuery: "",
		quoteChar: null
	};
	let M = j.startsWith("goto ") ? j.slice(5) : j.slice(6), N = null;
	if (M.startsWith("\"")) N = "\"";
	else if (M.startsWith("'")) N = "'";
	else return {
		isFuzzyFindMode: !1,
		fuzzyFindQuery: "",
		quoteChar: null
	};
	let P = M.slice(1), F = P;
	return P.endsWith(N) && (F = P.slice(0, -1)), {
		isFuzzyFindMode: !0,
		fuzzyFindQuery: F,
		quoteChar: N
	};
}
function updateInputStyling(r, j, M) {
	let N = r.parentElement?.querySelector(".command-palette-input-overlay");
	if (N && N.remove(), !M.isFuzzyFindMode || !M.quoteChar) return null;
	let P = document.createElement("div");
	P.className = "command-palette-input-overlay", P.style.cssText = "\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    pointer-events: none;\n    padding: 12px 16px;\n    font-size: 16px;\n    font-family: system-ui, -apple-system, sans-serif;\n    white-space: pre;\n    overflow: hidden;\n    box-sizing: border-box;\n    line-height: 1.5;\n    border: none;\n    background: transparent;\n  ";
	let F = j.indexOf(M.quoteChar), I = j.substring(0, F + 1), L = M.fuzzyFindQuery, R = document.createTextNode(I), B = document.createElement("span");
	if (B.style.cssText = "color: #1e293b;", B.appendChild(R), P.appendChild(B), L) {
		let r = document.createElement("span");
		r.style.cssText = "\n      font-weight: bold;\n      font-style: italic;\n      color: #1e293b;\n    ", r.textContent = L, P.appendChild(r);
	}
	return r.parentElement && r.parentElement.appendChild(P), P;
}
function createFuzzyFindList(r, j, M, N, P) {
	if (r.innerHTML = "", !j || j.trim() === "") {
		let j = document.createElement("div");
		j.className = "command-palette-item command-palette-item-empty", j.textContent = "Type to search...", r.appendChild(j);
		return;
	}
	if (M.length === 0) {
		let j = document.createElement("div");
		j.className = "command-palette-item command-palette-item-empty", j.textContent = "No matches found", r.appendChild(j);
		return;
	}
	let F = document.createElement("div");
	F.className = "command-palette-item command-palette-item-empty", F.textContent = `Search Results (${M.length})`, r.appendChild(F), M.forEach((j, M) => {
		let F = document.createElement("div");
		F.className = "command-palette-item", F.setAttribute("role", "option"), F.setAttribute("aria-selected", (M === N).toString()), M === N && F.classList.add("command-palette-item-selected");
		let I = document.createElement("div");
		I.className = "command-palette-item-label";
		let L = j.translation, R = "";
		if (j.matchedFields && j.matchedFields.length > 0) {
			let r = j.matchedFields[0];
			if (r.field === "key") R = `Key: ${L.key}`;
			else if (r.field === "context") R = `Context: ${L.context || ""}`;
			else if (r.field.startsWith("values.")) {
				let j = r.field.replace("values.", "");
				R = `${j.toUpperCase()}: ${L.values?.[j] || ""}`;
			} else R = L.key || "";
		} else R = L.key || "";
		I.textContent = R;
		let B = document.createElement("div");
		B.className = "command-palette-item-description", B.textContent = `Row ${j.rowIndex + 1}`, F.appendChild(B), F.appendChild(I), F.addEventListener("click", () => {
			P(M);
		}), r.appendChild(F);
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
	constructor(r, j = {}) {
		this.commandRegistry = r, this.callbacks = j;
	}
	open(r = "excel") {
		this.isOpen || (this.currentMode = r, this.isOpen = !0, this.query = "", this.selectedIndex = 0, this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.fuzzyFindResults = [], this.createUI(), this.updateCommands(), this.attachEventListeners(), requestAnimationFrame(() => {
			this.input?.focus();
		}));
	}
	close() {
		this.isOpen && (this.isOpen = !1, this.query = "", this.selectedIndex = 0, this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.fuzzyFindResults = [], this.fuzzyFindDebounceTimer !== null && (clearTimeout(this.fuzzyFindDebounceTimer), this.fuzzyFindDebounceTimer = null), this.inputOverlay &&= (this.inputOverlay.remove(), null), this.detachEventListeners(), this.removeUI(), this.callbacks.onClose && this.callbacks.onClose());
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "command-palette-overlay", this.overlay.setAttribute("role", "dialog"), this.overlay.setAttribute("aria-label", "Command Palette"), this.overlay.setAttribute("aria-modal", "true"), this.container = document.createElement("div"), this.container.className = "command-palette", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "command-palette-input", this.input.setAttribute("placeholder", "Type a command or search..."), this.input.setAttribute("aria-label", "Command search input"), this.input.setAttribute("autocomplete", "off"), this.input.setAttribute("spellcheck", "false"), this.input.style.color = "transparent", this.input.style.caretColor = "#1e293b", this.list = document.createElement("div"), this.list.className = "command-palette-list", this.list.setAttribute("role", "listbox"), this.list.setAttribute("aria-label", "Command list"), this.footer = document.createElement("div"), this.footer.className = "command-palette-footer", this.footer.innerHTML = "\n      <span class=\"command-palette-hint\">\n        <kbd>↑</kbd><kbd>↓</kbd> Navigate\n        <kbd>Enter</kbd> Execute\n        <kbd>Esc</kbd> Close\n      </span>\n    ";
		let r = document.createElement("div");
		r.style.position = "relative", r.appendChild(this.input), this.container.appendChild(r), this.container.appendChild(this.list), this.container.appendChild(this.footer), this.overlay.appendChild(this.container), document.body.appendChild(this.overlay), this.overlay.addEventListener("click", (r) => {
			r.target === this.overlay && this.close();
		});
	}
	removeUI() {
		this.inputOverlay &&= (this.inputOverlay.remove(), null), this.overlay && (document.body.removeChild(this.overlay), this.overlay = null, this.container = null, this.input = null, this.list = null, this.footer = null);
	}
	attachEventListeners() {
		this.input && (this.input.addEventListener("input", (r) => {
			let j = r.target;
			this.handleInput(j.value);
		}), this.input.addEventListener("keydown", (r) => {
			this.handleKeyDown(r);
		}));
	}
	detachEventListeners() {}
	handleInput(r) {
		this.query = r, this.selectedIndex = 0;
		let j = parseFuzzyFindInput(r);
		j.isFuzzyFindMode ? (this.isFuzzyFindMode = !0, this.fuzzyFindQuery = j.fuzzyFindQuery, this.fuzzyFindQuoteChar = j.quoteChar, this.updateInputStyling(r, j), this.updateFuzzyFindResults()) : (this.isFuzzyFindMode = !1, this.fuzzyFindQuery = "", this.fuzzyFindQuoteChar = null, this.updateInputStyling(r, j), this.fuzzyFindResults = [], this.updateCommands());
	}
	updateInputStyling(r, j) {
		this.input && (this.inputOverlay &&= (this.inputOverlay.remove(), null), this.inputOverlay = updateInputStyling(this.input, r, j));
	}
	updateFuzzyFindResults() {
		this.fuzzyFindDebounceTimer !== null && clearTimeout(this.fuzzyFindDebounceTimer), this.fuzzyFindDebounceTimer = window.setTimeout(() => {
			this.callbacks.onFindMatches && this.fuzzyFindQuery && this.fuzzyFindQuery.trim() ? (this.fuzzyFindResults = this.callbacks.onFindMatches(this.fuzzyFindQuery.trim()), this.updateList()) : (this.fuzzyFindResults = [], this.updateList()), this.fuzzyFindDebounceTimer = null;
		}, 150);
	}
	updateFuzzyFindList() {
		this.list && (this.fuzzyFindResults.length > 0 && this.selectedIndex >= this.fuzzyFindResults.length && (this.selectedIndex = 0), createFuzzyFindList(this.list, this.fuzzyFindQuery, this.fuzzyFindResults, this.selectedIndex, (r) => {
			this.selectedIndex = r, this.executeSelectedCommand();
		}));
	}
	handleKeyDown(r) {
		let j = this.isFuzzyFindMode ? this.fuzzyFindResults.length - 1 : this.filteredCommands.length - 1;
		r.key === "ArrowDown" ? (r.preventDefault(), this.selectedIndex = Math.min(this.selectedIndex + 1, j), this.updateList(), this.updateFooter(), this.scrollToSelected()) : r.key === "ArrowUp" ? (r.preventDefault(), this.selectedIndex = Math.max(0, this.selectedIndex - 1), this.updateList(), this.updateFooter(), this.scrollToSelected()) : r.key === "Enter" ? (r.preventDefault(), this.executeSelectedCommand()) : r.key === "Escape" && (r.preventDefault(), this.close());
	}
	updateCommands() {
		let r = this.commandRegistry.getCommands(this.currentMode);
		this.query.trim() ? this.filteredCommands = searchCommands(this.query, r) : this.filteredCommands = this.commandRegistry.getPopularCommands(10, this.currentMode).map((r) => ({
			command: r,
			score: 1,
			matchedIndices: []
		})), this.filteredCommands = this.filteredCommands.slice(0, 50), this.updateList();
	}
	updateFooter() {
		if (this.footer) if (this.isFuzzyFindMode && this.fuzzyFindResults.length > 0) {
			let r = this.selectedIndex + 1, j = this.fuzzyFindResults.length;
			this.footer.innerHTML = `
        <span class="command-palette-hint">
          <kbd>↑</kbd><kbd>↓</kbd> Navigate
          <kbd>Enter</kbd> Go to match
          <kbd>Esc</kbd> Close
        </span>
        <span class="command-palette-match-info">
          ${r}/${j} matches
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
				let r = document.createElement("div");
				r.className = "command-palette-item command-palette-item-empty", r.textContent = "No commands found", this.list.appendChild(r);
				return;
			}
			this.filteredCommands.forEach((r, j) => {
				let M = document.createElement("div");
				M.className = "command-palette-item", M.setAttribute("role", "option"), M.setAttribute("aria-selected", (j === this.selectedIndex).toString()), j === this.selectedIndex && M.classList.add("command-palette-item-selected");
				let N = document.createElement("div");
				if (N.className = "command-palette-item-label", N.textContent = r.command.label, r.command.description) {
					let j = document.createElement("div");
					j.className = "command-palette-item-description", j.textContent = r.command.description, M.appendChild(j);
				}
				if (r.command.shortcut) {
					let j = document.createElement("div");
					j.className = "command-palette-item-shortcut", j.textContent = r.command.shortcut, M.appendChild(j);
				}
				M.appendChild(N), M.addEventListener("click", () => {
					this.selectedIndex = j, this.executeSelectedCommand();
				}), this.list && this.list.appendChild(M);
			});
		}
	}
	scrollToSelected() {
		if (!this.list) return;
		let r = this.list.querySelectorAll(".command-palette-item")[this.selectedIndex];
		if (r) {
			if (typeof r.scrollIntoView == "function") try {
				r.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
			} catch {}
			if (this.list && r.offsetTop !== void 0) try {
				let j = r.offsetTop, M = j + (r.offsetHeight || 0), N = this.list.scrollTop || 0, P = this.list.clientHeight || 0, F = N + P;
				j < N ? this.list.scrollTop = j : M > F && (this.list.scrollTop = M - P);
			} catch {}
		}
	}
	executeSelectedCommand() {
		if (this.isFuzzyFindMode) {
			if (this.fuzzyFindResults.length === 0) return;
			let r = this.fuzzyFindResults[this.selectedIndex];
			r && this.callbacks.onGotoMatch && this.callbacks.onGotoMatch(r), this.close();
			return;
		}
		let r = this.filteredCommands[this.selectedIndex];
		if (!r) return;
		let j = r.command;
		this.commandRegistry.incrementUsage(j.id);
		try {
			let r = this.parseCommandArgs(this.query, j.id);
			j.execute(r), this.callbacks.onCommandExecute && this.callbacks.onCommandExecute(j, r);
		} catch (r) {
			logger.error("Error executing command:", r);
		}
		this.close();
	}
	parseCommandArgs(r, j) {
		let M = r.trim().split(/\s+/);
		return j === "goto" && (M[0] === "goto" || M[0] === "go" && M[1] === "to") ? M[0] === "goto" ? M.slice(1) : M.slice(2) : j === "search" && M[0] === "search" || M[0] === j || M[0].startsWith(j) ? M.slice(1) : [];
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
}, TextSearchMatcher = class {
	options;
	constructor(r) {
		this.options = r;
	}
	findMatches(r) {
		if (!r.trim()) return [];
		let j = r.toLowerCase().trim(), M = [];
		return this.options.translations.forEach((r, N) => {
			let P = 0, F = [], I = r.key.toLowerCase();
			if (I === j ? (P += 50, F.push({
				field: "key",
				matchedText: r.key,
				matchType: "exact"
			})) : I.includes(j) ? (P += 30, F.push({
				field: "key",
				matchedText: r.key,
				matchType: "contains"
			})) : this.fuzzyMatch(I, j) && (P += 15, F.push({
				field: "key",
				matchedText: r.key,
				matchType: "fuzzy"
			})), r.context) {
				let M = r.context.toLowerCase();
				M === j ? (P += 20, F.push({
					field: "context",
					matchedText: r.context,
					matchType: "exact"
				})) : M.includes(j) ? (P += 20, F.push({
					field: "context",
					matchedText: r.context,
					matchType: "contains"
				})) : this.fuzzyMatch(M, j) && (P += 10, F.push({
					field: "context",
					matchedText: r.context,
					matchType: "fuzzy"
				}));
			}
			this.options.languages.forEach((M) => {
				let N = r.values[M] || "", I = N.toLowerCase();
				I === j ? (P += 10, F.push({
					field: `values.${M}`,
					matchedText: N,
					matchType: "exact"
				})) : I.includes(j) ? (P += 10, F.push({
					field: `values.${M}`,
					matchedText: N,
					matchType: "contains"
				})) : this.fuzzyMatch(I, j) && (P += 5, F.push({
					field: `values.${M}`,
					matchedText: N,
					matchType: "fuzzy"
				}));
			}), P > 0 && M.push({
				rowIndex: N,
				translation: r,
				score: P,
				matchedFields: F
			});
		}), M.sort((r, j) => j.score === r.score ? r.rowIndex - j.rowIndex : j.score - r.score), M;
	}
	fuzzyMatch(r, j) {
		if (j.length === 0) return !0;
		if (j.length > r.length) return !1;
		let M = 0;
		for (let N = 0; N < r.length && M < j.length; N++) r[N] === j[M] && M++;
		return M === j.length;
	}
};
function parseSearchQuery(r) {
	if (!r || !r.trim()) return null;
	let j = r.trim(), M = j.match(/^(\w+):(.+)$/);
	if (M) {
		let [, r, j] = M;
		if (j.trim()) return {
			keyword: j.trim(),
			column: r.toLowerCase()
		};
	}
	return { keyword: j };
}
function findMatchIndices(r, j) {
	if (!r || !j) return [];
	let M = r.toLowerCase(), N = j.toLowerCase(), P = [], F = 0;
	for (;;) {
		let r = M.indexOf(N, F);
		if (r === -1) break;
		for (let j = 0; j < N.length; j++) P.push(r + j);
		F = r + 1;
	}
	return P;
}
var QuickSearch = class {
	options;
	constructor(r) {
		this.options = r;
	}
	findMatches(r) {
		if (!r.keyword) return [];
		let j = [], M = r.keyword.toLowerCase();
		return this.options.translations.forEach((N, P) => {
			if (r.column) {
				let F = this.getColumnIdForSearch(r.column);
				if (F) {
					let I = this.getCellValue(N, F);
					if (I && I.toLowerCase().includes(M)) {
						let M = findMatchIndices(I, r.keyword);
						j.push({
							rowIndex: P,
							columnId: F,
							matchedText: I,
							matchIndices: M
						});
					}
				}
				return;
			}
			[
				"key",
				"context",
				...this.options.languages.map((r) => `values.${r}`)
			].forEach((F) => {
				let I = this.getCellValue(N, F);
				if (I && I.toLowerCase().includes(M)) {
					let M = findMatchIndices(I, r.keyword);
					j.push({
						rowIndex: P,
						columnId: F,
						matchedText: I,
						matchIndices: M
					});
				}
			});
		}), j;
	}
	getColumnIdForSearch(r) {
		let j = r.toLowerCase();
		return j === "key" ? "key" : j === "context" ? "context" : this.options.languages.includes(j) ? `values.${j}` : null;
	}
	getCellValue(r, j) {
		if (j === "key") return r.key || null;
		if (j === "context") return r.context || null;
		if (j.startsWith("values.")) {
			let M = j.replace("values.", "");
			return r.values?.[M] || null;
		}
		return null;
	}
	static highlightText(r, j) {
		if (!r || j.length === 0) return escapeHtml(r);
		let M = [...new Set(j)].sort((r, j) => r - j), N = [], P = 0, F = null;
		if (M.forEach((j, I) => {
			if (!(F !== null && j === M[I - 1] + 1)) {
				if (F !== null) {
					let j = M[I - 1] + 1;
					N.push(`<mark class="quick-search-highlight">${escapeHtml(r.substring(F, j))}</mark>`), P = j;
				}
				j > P && N.push(escapeHtml(r.substring(P, j))), F = j;
			}
		}), F !== null) {
			let j = M[M.length - 1] + 1;
			N.push(`<mark class="quick-search-highlight">${escapeHtml(r.substring(F, j))}</mark>`), P = j;
		}
		return P < r.length && N.push(escapeHtml(r.substring(P))), N.join("");
	}
};
function escapeHtml(r) {
	let j = document.createElement("div");
	return j.textContent = r, j.innerHTML;
}
var QuickSearchUI = class {
	overlay = null;
	input = null;
	statusText = null;
	isOpen = !1;
	callbacks;
	container;
	constructor(r, j = {}) {
		this.container = r, this.callbacks = j;
	}
	open() {
		this.isOpen || (this.isOpen = !0, this.createUI(), requestAnimationFrame(() => {
			this.input && this.input.focus();
		}));
	}
	close() {
		this.isOpen && (this.isOpen = !1, this.destroyUI(), this.callbacks.onClose && this.callbacks.onClose());
	}
	updateStatus(r, j) {
		this.statusText && (j === 0 ? this.statusText.textContent = "No matches" : this.statusText.textContent = `${r + 1}/${j} matches`);
	}
	getQuery() {
		return this.input?.value || "";
	}
	setQuery(r) {
		this.input && (this.input.value = r);
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "quick-search-overlay", this.overlay.setAttribute("role", "dialog"), this.overlay.setAttribute("aria-label", "Quick Search");
		let r = document.createElement("div");
		r.className = "quick-search-bar";
		let j = document.createElement("div");
		j.className = "quick-search-label", j.textContent = "/", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "quick-search-input", this.input.placeholder = "Search... (e.g., keyword, key:keyword, en:keyword)", this.input.setAttribute("aria-label", "Search query"), this.statusText = document.createElement("div"), this.statusText.className = "quick-search-status", this.statusText.textContent = "";
		let M = document.createElement("button");
		M.className = "quick-search-close", M.textContent = "×", M.setAttribute("aria-label", "Close search"), M.addEventListener("click", () => {
			this.close();
		}), this.input.addEventListener("input", () => {
			this.callbacks.onSearch && this.callbacks.onSearch(this.input?.value || "");
		}), this.input.addEventListener("keydown", (r) => {
			r.key === "Escape" ? (r.preventDefault(), r.stopPropagation(), this.close()) : (r.key === "Enter" || r.code === "Enter") && (r.preventDefault(), r.stopPropagation(), this.callbacks.onNextMatch && this.callbacks.onNextMatch());
		}), r.appendChild(j), r.appendChild(this.input), r.appendChild(this.statusText), r.appendChild(M), this.overlay.appendChild(r), this.container.appendChild(this.overlay), requestAnimationFrame(() => {
			this.overlay && this.overlay.classList.add("quick-search-overlay-open");
		});
	}
	destroyUI() {
		this.overlay && (this.overlay.classList.remove("quick-search-overlay-open"), setTimeout(() => {
			this.overlay && this.overlay.parentElement && this.overlay.parentElement.removeChild(this.overlay), this.overlay = null, this.input = null, this.statusText = null;
		}, 200));
	}
	isSearchMode() {
		return this.isOpen;
	}
}, StatusBar = class {
	statusBarElement = null;
	container;
	callbacks;
	constructor(r, j = {}) {
		this.container = r, this.callbacks = j;
	}
	create() {
		this.statusBarElement || (this.statusBarElement = document.createElement("div"), this.statusBarElement.className = "status-bar", this.statusBarElement.setAttribute("role", "status"), this.statusBarElement.setAttribute("aria-live", "polite"), this.statusBarElement.setAttribute("aria-atomic", "true"), this.container.appendChild(this.statusBarElement));
	}
	update(r) {
		if (this.statusBarElement || this.create(), !this.statusBarElement) return;
		let j = [];
		if (j.push(`[${r.mode}]`), r.rowIndex === null ? j.push(`Row -/${r.totalRows}`) : j.push(`Row ${r.rowIndex + 1}/${r.totalRows}`), r.columnId) {
			let M = this.getColumnDisplayName(r.columnId);
			j.push(`Col: ${M}`);
		}
		r.changesCount > 0 && j.push(`${r.changesCount} change${r.changesCount === 1 ? "" : "s"}`), r.emptyCount > 0 && j.push(`${r.emptyCount} empty`), r.duplicateCount > 0 && j.push(`${r.duplicateCount} duplicate${r.duplicateCount === 1 ? "" : "s"}`);
		let M = j.join(" | "), N = r.command ? `Command: ${r.command}` : "";
		this.statusBarElement.innerHTML = `
      <span class="status-bar-left">${M}</span>
      ${N ? `<span class="status-bar-command">${N}</span>` : ""}
    `, this.callbacks.onStatusUpdate && this.callbacks.onStatusUpdate(r);
	}
	getColumnDisplayName(r) {
		return r === "row-number" ? "#" : r === "key" ? "Key" : r === "context" ? "Context" : r.startsWith("values.") ? r.replace("values.", "").toUpperCase() : r;
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
	constructor(r) {
		this.translations = r.translations, this.languages = r.languages, this.callbacks = r;
	}
	open(r = "find") {
		if (this.overlay) {
			this.setMode(r);
			return;
		}
		this.createUI(), this.setMode(r), this.attach();
	}
	close() {
		this.overlay && (this.overlay.remove(), this.overlay = null, this.container = null), this.detach(), this.callbacks.onClose && this.callbacks.onClose();
	}
	setMode(r) {
		if (!this.container) return;
		let j = this.container.querySelector(".find-replace-replace-section");
		if (j && (j.style.display = r === "replace" ? "block" : "none"), r === "replace") {
			let r = this.container.querySelector(".find-replace-replace-input");
			r && setTimeout(() => r.focus(), 0);
		}
	}
	createUI() {
		this.overlay = document.createElement("div"), this.overlay.className = "find-replace-overlay", this.overlay.style.cssText = "\n      position: fixed;\n      top: 0;\n      left: 0;\n      right: 0;\n      background: rgba(0, 0, 0, 0.3);\n      z-index: 10000;\n      display: flex;\n      justify-content: center;\n      padding-top: 20px;\n    ", this.container = document.createElement("div"), this.container.className = "find-replace-container", this.container.style.cssText = "\n      background: white;\n      border-radius: 8px;\n      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n      padding: 16px;\n      padding-top: 48px;\n      min-width: 500px;\n      max-width: 600px;\n      position: relative;\n    ";
		let r = document.createElement("div");
		r.className = "find-replace-find-section", r.style.cssText = "\n      display: flex;\n      gap: 8px;\n      align-items: center;\n      margin-bottom: 12px;\n    ";
		let j = document.createElement("input");
		j.type = "text", j.className = "find-replace-find-input", j.placeholder = "Find", j.style.cssText = "\n      flex: 1;\n      padding: 8px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      font-size: 14px;\n    ", j.value = this.state.searchQuery, j.addEventListener("input", (r) => {
			this.state.searchQuery = r.target.value, this.performSearch();
		}), j.addEventListener("keydown", (r) => {
			r.key === "Escape" ? this.close() : r.key === "Enter" && !r.shiftKey ? (r.preventDefault(), this.goToNextMatch()) : r.key === "Enter" && r.shiftKey && (r.preventDefault(), this.goToPrevMatch());
		});
		let M = document.createElement("div");
		M.style.cssText = "display: flex; gap: 4px;";
		let N = this.createButton("↑", "Previous", () => {
			this.goToPrevMatch();
		}), P = this.createButton("↓", "Next", () => {
			this.goToNextMatch();
		});
		M.appendChild(N), M.appendChild(P), r.appendChild(j), r.appendChild(M);
		let F = document.createElement("div");
		F.className = "find-replace-replace-section", F.style.cssText = "\n      display: none;\n      display: flex;\n      gap: 8px;\n      align-items: center;\n      margin-bottom: 12px;\n    ";
		let I = document.createElement("input");
		I.type = "text", I.className = "find-replace-replace-input", I.placeholder = "Replace", I.style.cssText = "\n      flex: 1;\n      padding: 8px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      font-size: 14px;\n    ", I.value = this.state.replaceQuery, I.addEventListener("input", (r) => {
			let j = r.target.value;
			this.state.replaceQuery = j;
		}), I.addEventListener("keydown", (r) => {
			r.key === "Escape" ? this.close() : r.key === "Enter" && !r.shiftKey ? (r.preventDefault(), this.replaceCurrent()) : r.key === "Enter" && r.shiftKey && (r.preventDefault(), this.replaceAll());
		});
		let L = document.createElement("div");
		L.style.cssText = "display: flex; gap: 4px;";
		let R = this.createButton("Replace", "Replace current", () => {
			this.replaceCurrent();
		}), B = this.createButton("Replace All", "Replace all", () => {
			this.replaceAll();
		});
		L.appendChild(R), L.appendChild(B), F.appendChild(I), F.appendChild(L);
		let V = document.createElement("div");
		V.style.cssText = "\n      display: flex;\n      gap: 16px;\n      align-items: center;\n      margin-bottom: 12px;\n      font-size: 12px;\n    ";
		let H = this.createCheckbox("Aa", "Match case", this.state.isCaseSensitive, (r) => {
			this.state.isCaseSensitive = r, this.performSearch();
		}), U = this.createCheckbox("Ab", "Match whole word", this.state.isWholeWord, (r) => {
			this.state.isWholeWord = r, this.performSearch();
		}), W = this.createCheckbox(".*", "Use regular expression", this.state.isRegex, (r) => {
			this.state.isRegex = r, this.performSearch();
		});
		V.appendChild(H), V.appendChild(U), V.appendChild(W);
		let G = document.createElement("div");
		G.className = "find-replace-result", G.style.cssText = "\n      font-size: 12px;\n      color: #666;\n      min-height: 20px;\n    ";
		let K = document.createElement("button");
		K.textContent = "×", K.className = "find-replace-close-button", K.style.cssText = "\n      position: absolute;\n      top: 8px;\n      right: 8px;\n      background: none;\n      border: none;\n      font-size: 24px;\n      cursor: pointer;\n      color: #666;\n      width: 32px;\n      height: 32px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 10;\n      pointer-events: auto;\n    ", K.addEventListener("click", (r) => {
			r.stopPropagation(), this.close();
		}), this.container.style.position = "relative", this.container.appendChild(K), this.container.appendChild(r), this.container.appendChild(F), this.container.appendChild(V), this.container.appendChild(G), this.overlay.appendChild(this.container), document.body.appendChild(this.overlay), this.overlay.addEventListener("click", (r) => {
			r.target === this.overlay && this.close();
		}), setTimeout(() => j.focus(), 0);
	}
	createButton(r, j, M) {
		let N = document.createElement("button");
		return N.textContent = r, N.title = j, N.style.cssText = "\n      padding: 6px 12px;\n      border: 1px solid #ddd;\n      border-radius: 4px;\n      background: white;\n      cursor: pointer;\n      font-size: 12px;\n    ", N.addEventListener("click", M), N;
	}
	createCheckbox(r, j, M, N) {
		let P = document.createElement("label");
		P.style.cssText = "display: flex; align-items: center; gap: 4px; cursor: pointer;", P.title = j;
		let F = document.createElement("input");
		F.type = "checkbox", F.checked = M, F.style.cssText = "cursor: pointer;", F.addEventListener("change", (r) => {
			N(r.target.checked);
		});
		let I = document.createElement("span");
		return I.textContent = r, P.appendChild(F), P.appendChild(I), P;
	}
	performSearch() {
		if (!this.state.searchQuery.trim()) {
			this.state.matches = [], this.state.currentMatchIndex = -1, this.updateResult(), this.callbacks.onFind && this.callbacks.onFind([]);
			return;
		}
		let r = [], j = this.buildSearchPattern(this.state.searchQuery);
		this.translations.forEach((M, N) => {
			[
				"key",
				"context",
				...this.languages.map((r) => `values.${r}`)
			].forEach((P) => {
				let F = this.getCellValue(M, P);
				F && this.findMatchesInText(F, j).forEach((j) => {
					r.push({
						rowIndex: N,
						columnId: P,
						matchedText: F,
						matchIndex: j.index,
						matchLength: j.length
					});
				});
			});
		}), this.state.matches = r, this.state.currentMatchIndex = r.length > 0 ? 0 : -1, this.updateResult(), this.callbacks.onFind && this.callbacks.onFind(r);
	}
	buildSearchPattern(r) {
		let j = r;
		if (this.state.isRegex) try {
			return new RegExp(j, this.state.isCaseSensitive ? "g" : "gi");
		} catch {
			j = this.escapeRegex(r);
		}
		else j = this.escapeRegex(r);
		return this.state.isWholeWord && (j = `\\b${j}\\b`), new RegExp(j, this.state.isCaseSensitive ? "g" : "gi");
	}
	escapeRegex(r) {
		return r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	findMatchesInText(r, j) {
		let M = [], N;
		for (j.lastIndex = 0; (N = j.exec(r)) !== null;) M.push({
			index: N.index,
			length: N[0].length
		}), N.index === j.lastIndex && j.lastIndex++;
		return M;
	}
	getCellValue(r, j) {
		if (j === "key") return r.key;
		if (j === "context") return r.context || null;
		if (j.startsWith("values.")) {
			let M = j.replace("values.", "");
			return r.values[M] || null;
		}
		return null;
	}
	updateResult() {
		let r = this.container?.querySelector(".find-replace-result");
		r && (this.state.matches.length === 0 ? r.textContent = this.state.searchQuery ? "No matches found" : "" : r.textContent = `${this.state.currentMatchIndex + 1} of ${this.state.matches.length} matches`);
	}
	goToNextMatch() {
		this.state.matches.length !== 0 && (this.state.currentMatchIndex = (this.state.currentMatchIndex + 1) % this.state.matches.length, this.updateResult(), this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]));
	}
	goToPrevMatch() {
		this.state.matches.length !== 0 && (this.state.currentMatchIndex = this.state.currentMatchIndex <= 0 ? this.state.matches.length - 1 : this.state.currentMatchIndex - 1, this.updateResult(), this.navigateToMatch(this.state.matches[this.state.currentMatchIndex]));
	}
	navigateToMatch(r) {
		this.callbacks.onFind && this.callbacks.onFind([r]);
	}
	replaceCurrent() {
		if (this.state.currentMatchIndex < 0 || this.state.currentMatchIndex >= this.state.matches.length) return;
		let r = this.container?.querySelector(".find-replace-replace-input"), j = r ? r.value : this.state.replaceQuery, M = this.state.matches[this.state.currentMatchIndex];
		this.callbacks.onReplace && this.callbacks.onReplace(M, j), this.performSearch();
	}
	replaceAll() {
		if (this.state.matches.length === 0) return;
		let r = this.container?.querySelector(".find-replace-replace-input"), j = r ? r.value : this.state.replaceQuery;
		this.callbacks.onReplaceAll && this.callbacks.onReplaceAll(this.state.matches, j), this.performSearch();
	}
	attach() {
		let r = (r) => {
			r.key === "Escape" && this.overlay && this.close();
		};
		document.addEventListener("keydown", r), this.overlay.__escapeHandler = r;
	}
	detach() {
		this.overlay && this.overlay.__escapeHandler && document.removeEventListener("keydown", this.overlay.__escapeHandler);
	}
	isOpen() {
		return this.overlay !== null;
	}
}, FilterManager = class {
	options;
	constructor(r) {
		this.options = r;
	}
	filterEffect(r, M) {
		let N = this;
		return Effect.gen(function* (P) {
			switch (M.type) {
				case "search": return yield* P(N.applySearchFilterEffect(r, M.keyword || ""));
				case "empty": return yield* P(N.applyEmptyFilterEffect(r));
				case "changed": return yield* P(N.applyChangedFilterEffect(r));
				case "duplicate": return yield* P(N.applyDuplicateFilterEffect(r));
				default: return yield* P(Effect.succeed([...r]));
			}
		});
	}
	filter(r, M) {
		let N = this.filterEffect(r, M);
		return Effect.runSync(Effect.match(N, {
			onFailure: (j) => (logger.warn("Filter failed, returning original translations", j), [...r]),
			onSuccess: (r) => r
		}));
	}
	applySearchFilterEffect(r, M) {
		let N = this;
		return Effect.gen(function* (P) {
			let F = M.toLowerCase().trim();
			if (!F) return yield* P(Effect.succeed([...r]));
			let I = r.filter((r) => r.key.toLowerCase().includes(F) || r.context?.toLowerCase().includes(F) ? !0 : N.options.languages.some((j) => (r.values[j] || "").toLowerCase().includes(F)));
			return yield* P(Effect.succeed(I));
		});
	}
	applySearchFilter(r, M) {
		let N = this.applySearchFilterEffect(r, M);
		return Effect.runSync(Effect.match(N, {
			onFailure: () => [...r],
			onSuccess: (r) => r
		}));
	}
	applyEmptyFilterEffect(r) {
		let M = this;
		return Effect.gen(function* (N) {
			let P = r.filter((r) => M.options.languages.some((j) => (r.values[j] || "").trim() === ""));
			return yield* N(Effect.succeed(P));
		});
	}
	applyEmptyFilter(r) {
		let M = this.applyEmptyFilterEffect(r);
		return Effect.runSync(Effect.match(M, {
			onFailure: () => [...r],
			onSuccess: (r) => r
		}));
	}
	applyChangedFilterEffect(r) {
		let M = this;
		return Effect.gen(function* (N) {
			let P = [];
			for (let j of r) {
				if (M.options.changeTracker.hasChange(j.id, "key")) {
					P.push(j);
					continue;
				}
				if (M.options.changeTracker.hasChange(j.id, "context")) {
					P.push(j);
					continue;
				}
				let r = !1;
				for (let N of M.options.languages) if (M.options.changeTracker.hasChange(j.id, `values.${N}`)) {
					r = !0;
					break;
				}
				r && P.push(j);
			}
			return yield* N(Effect.succeed(P));
		});
	}
	applyChangedFilter(r) {
		let M = this.applyChangedFilterEffect(r);
		return Effect.runSync(Effect.match(M, {
			onFailure: () => [...r],
			onSuccess: (r) => r
		}));
	}
	applyDuplicateFilterEffect(r) {
		return Effect.gen(function* (M) {
			let N = /* @__PURE__ */ new Map();
			r.forEach((r) => {
				let j = N.get(r.key) || 0;
				N.set(r.key, j + 1);
			});
			let P = r.filter((r) => (N.get(r.key) || 0) > 1);
			return yield* M(Effect.succeed(P));
		});
	}
	applyDuplicateFilter(r) {
		let M = this.applyDuplicateFilterEffect(r);
		return Effect.runSync(Effect.match(M, {
			onFailure: () => [...r],
			onSuccess: (r) => r
		}));
	}
}, VimCommandTracker = class {
	currentSequence = "";
	commandType = "motion";
	autoClearTimer = null;
	options;
	constructor(r = {}) {
		this.options = {
			maxSequenceLength: r.maxSequenceLength ?? 20,
			autoClearDelay: r.autoClearDelay ?? 1e3,
			onCommandUpdate: r.onCommandUpdate ?? (() => {})
		};
	}
	addKeyEffect(r) {
		let M = this;
		return Effect.gen(function* (N) {
			if (M.currentSequence.length >= M.options.maxSequenceLength) return yield* N(Effect.fail(new VimCommandTrackerError({
				message: `Maximum sequence length (${M.options.maxSequenceLength}) exceeded`,
				code: "MAX_SEQUENCE_LENGTH_EXCEEDED"
			})));
			M.currentSequence += r, M.updateCommandType();
			let P = M.createCommand();
			return M.options.onCommandUpdate(P), M.resetAutoClearTimer(), P;
		});
	}
	addKey(r) {
		let M = Effect.runSync(Effect.either(this.addKeyEffect(r)));
		if (M._tag === "Left") {
			let r = M.left;
			return r instanceof VimCommandTrackerError || logger.error("VimCommandTracker: Unexpected error in addKey", r), null;
		}
		return M.right;
	}
	completeCommandEffect() {
		let r = this;
		return Effect.gen(function* (M) {
			if (!r.currentSequence) return yield* M(Effect.fail(new VimCommandTrackerError({
				message: "No command sequence to complete",
				code: "INVALID_KEY_SEQUENCE"
			})));
			let N = r.createCommand();
			return N.type = "complete", r.options.onCommandUpdate(N), r.clear(), N;
		});
	}
	completeCommand() {
		return Effect.runSync(Effect.match(this.completeCommandEffect(), {
			onFailure: (r) => {
				throw r instanceof VimCommandTrackerError ? r : (logger.error("VimCommandTracker: Unexpected error in completeCommand", r), new VimCommandTrackerError({
					message: "Failed to complete command",
					code: "INVALID_KEY_SEQUENCE"
				}));
			},
			onSuccess: (r) => r
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
		let r = this.currentSequence[this.currentSequence.length - 1];
		if (/^\d+$/.test(this.currentSequence)) {
			this.commandType = "number";
			return;
		}
		if ([
			"d",
			"y",
			"c"
		].includes(r)) {
			this.commandType = "operator";
			return;
		}
		if ([
			"w",
			"b",
			"e"
		].includes(r) && this.currentSequence.length > 1) {
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
		let r = this.currentSequence;
		if (r) return /^\d+$/.test(r) ? `Repeat ${r} times` : {
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
		}[r] || void 0;
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
	constructor(r) {
		this.container = r.container, this.options = {
			container: r.container,
			onExecute: r.onExecute ?? (() => {}),
			onCancel: r.onCancel ?? (() => {}),
			maxHistorySize: r.maxHistorySize ?? 50,
			placeholder: r.placeholder ?? "Enter command..."
		}, this.loadHistory();
	}
	showEffect(r) {
		return Effect.sync(() => {
			this.isVisible ||= (this.historyIndex = -1, this.loadHistory(), this.createUI(), this.input && (this.input.value = r || "", requestAnimationFrame(() => {
				if (this.input) {
					let j = r || "";
					this.input.value !== j && (logger.warn(`CommandLine: Input value was reset during show! Expected: "${j}", Got: "${this.input.value}"`), this.input.value = j), this.input.focus(), this.input.select();
				}
			})), !0);
		}).pipe(Effect.catchAll((r) => (logger.error("CommandLine: Failed to show", r), Effect.fail(r))));
	}
	show(r) {
		Effect.runSync(Effect.match(this.showEffect(r), {
			onFailure: (r) => {
				logger.error("CommandLine: Failed to show", r);
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
		let r = document.createElement("div");
		r.className = "command-line", this.input = document.createElement("input"), this.input.type = "text", this.input.className = "command-line-input", this.input.setAttribute("placeholder", this.options.placeholder), this.input.setAttribute("aria-label", "Command input"), this.input.setAttribute("autocomplete", "off"), this.input.setAttribute("spellcheck", "false"), this.attachInputListeners(), r.appendChild(this.input), this.overlay.appendChild(r), this.container.appendChild(this.overlay);
	}
	attachInputListeners() {
		if (!this.input) {
			logger.warn("CommandLine: Cannot attach listeners - input is null");
			return;
		}
		this.input.addEventListener("keydown", (r) => {
			r.key === "Enter" ? (r.preventDefault(), r.stopPropagation(), this.executeCommand().catch((r) => {
				logger.error("CommandLine: executeCommand error (outer catch)", r), this.hide();
			})) : r.key === "Escape" ? (r.preventDefault(), r.stopPropagation(), this.cancel()) : r.key === "ArrowUp" ? (r.preventDefault(), r.stopPropagation(), this.navigateHistory(-1), this.input && requestAnimationFrame(() => {
				this.input && this.input.focus();
			})) : r.key === "ArrowDown" && (r.preventDefault(), r.stopPropagation(), this.navigateHistory(1), this.input && requestAnimationFrame(() => {
				this.input && this.input.focus();
			}));
		}), this.overlay && this.overlay.addEventListener("click", (r) => {
			r.target === this.overlay && this.cancel();
		});
	}
	executeCommandEffect() {
		let r = this;
		return Effect.gen(function* (M) {
			if (!r.input) return yield* M(Effect.fail(new CommandLineError({
				message: "Input element not found",
				code: "INVALID_COMMAND"
			})));
			let N = r.input.value.trim();
			if (!N) {
				r.hide();
				return;
			}
			r.addToHistory(N);
			try {
				let P = r.options.onExecute(N);
				if (P instanceof Promise) {
					let N = null, F = new Promise((r, j) => {
						N = window.setTimeout(() => {
							j(/* @__PURE__ */ Error("Command execution timeout (5s)"));
						}, 5e3);
					});
					try {
						yield* M(Effect.promise(() => Promise.race([P.finally(() => {
							N !== null && (window.clearTimeout(N), N = null);
						}), F])));
					} catch (P) {
						return N !== null && (window.clearTimeout(N), N = null), logger.error("CommandLine: Command execution timeout or error", P), r.hide(), yield* M(Effect.fail(new CommandLineError({
							message: `Command execution failed: ${P instanceof Error ? P.message : String(P)}`,
							code: "COMMAND_EXECUTION_FAILED"
						})));
					}
				}
			} catch (N) {
				return logger.error("CommandLine: Command execution failed", N), r.hide(), yield* M(Effect.fail(new CommandLineError({
					message: `Command execution failed: ${N instanceof Error ? N.message : String(N)}`,
					code: "COMMAND_EXECUTION_FAILED"
				})));
			}
			r.hide();
		}).pipe(Effect.catchAll((M) => (logger.error("CommandLine: Failed to execute command", M), r.hide(), Effect.fail(M))));
	}
	async executeCommand() {
		let r = null;
		try {
			let M = new Promise((j, M) => {
				r = window.setTimeout(() => {
					M(/* @__PURE__ */ Error("Command execution timeout (5s)"));
				}, 5e3);
			});
			await Promise.race([Effect.runPromise(this.executeCommandEffect()).finally(() => {
				r !== null && (window.clearTimeout(r), r = null);
			}), M]);
		} catch (j) {
			r !== null && (window.clearTimeout(r), r = null), logger.error("CommandLine: executeCommand failed", j), this.hide();
		}
	}
	cancel() {
		this.options.onCancel(), this.hide();
	}
	navigateHistory(r) {
		if (this.input && (this.loadHistory(), this.history.length !== 0)) {
			if (this.historyIndex === -1) if (r < 0) if (this.history.length > 0) this.historyIndex = 0;
			else return;
			else return;
			else this.historyIndex -= r;
			if (this.historyIndex < 0) {
				this.historyIndex = -1, this.input.value = "";
				return;
			} else if (this.historyIndex >= this.history.length) {
				this.historyIndex = this.history.length, this.input.value = "";
				return;
			}
			if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
				let r = this.history[this.historyIndex];
				r && typeof r == "string" ? this.input ? (this.input.value = r, requestAnimationFrame(() => {
					this.input && (this.input.value !== r && (logger.warn(`CommandLine: Input value was reset in Firefox! Expected: "${r}", Got: "${this.input.value}"`), this.input.value = r), this.input.focus(), this.input.setSelectionRange(0, this.input.value.length));
				})) : logger.warn("CommandLine: Input element is null when setting history value") : this.input && (this.input.value = "");
			} else this.input && (this.input.value = "");
		}
	}
	addToHistory(r) {
		let j = this.history.indexOf(r);
		j !== -1 && this.history.splice(j, 1), this.history.unshift(r), this.history.length > this.options.maxHistorySize && (this.history = this.history.slice(0, this.options.maxHistorySize)), this.saveHistory();
	}
	getHistory() {
		return [...this.history];
	}
	clearHistory() {
		this.history = [], this.historyIndex = -1, this.saveHistory();
	}
	saveHistory() {
		try {
			let r = JSON.stringify(this.history);
			localStorage.setItem("commandLineHistory", r);
		} catch (r) {
			logger.error("Failed to save command line history", r);
		}
	}
	loadHistory() {
		try {
			let r = localStorage.getItem("commandLineHistory");
			if (r) {
				let j = JSON.parse(r);
				Array.isArray(j) ? this.history = j : (logger.warn("CommandLine: Invalid history format in localStorage", j), this.history = []);
			} else this.history = [];
		} catch (r) {
			logger.error("Failed to load command line history", r), this.history = [];
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
	constructor(r) {
		this.container = r.container, this.options = r, this.columnWidths = r.columnWidths || /* @__PURE__ */ new Map(), this.rowHeight = r.rowHeight || 40, this.headerHeight = r.headerHeight || 40, this.editableColumns = new Set(["key", "context"]), r.languages.forEach((r) => {
			this.editableColumns.add(`values.${r}`);
		}), this.columnMinWidths.set("key", 100), this.columnMinWidths.set("context", 100), r.languages.forEach((r) => {
			this.columnMinWidths.set(`values.${r}`, 80);
		}), this.originalTranslations = [...r.translations], this.currentTranslations = [...r.translations], this.changeTracker.initializeOriginalData(r.translations, r.languages), this.filterManager = new FilterManager({
			translations: r.translations,
			languages: r.languages,
			changeTracker: this.changeTracker
		}), this.cellEditor = new CellEditor(r.translations, this.changeTracker, this.undoRedoManager, {
			onCellChange: (j, M, N) => {
				let P = this.currentTranslations.findIndex((r) => r.id === j);
				if (P !== -1) {
					let r = this.currentTranslations[P], F = toMutableTranslation(r);
					if (M === "key") F.key = N;
					else if (M === "context") F.context = N;
					else if (M.startsWith("values.")) {
						let r = M.replace("values.", "");
						F.values[r] = N;
					}
					this.currentTranslations[P] = F;
					let I = this.originalTranslations.findIndex((r) => r.id === j);
					if (I !== -1) {
						let r = this.originalTranslations[I], j = toMutableTranslation(r);
						if (M === "key") j.key = N;
						else if (M === "context") j.context = N;
						else if (M.startsWith("values.")) {
							let r = M.replace("values.", "");
							j.values[r] = N;
						}
						let P = [...this.originalTranslations];
						P[I] = j, this.originalTranslations = P;
					}
				}
				this.updateCellStyle(j, M), this.updateStatusBar(), r.onCellChange && r.onCellChange(j, M, N);
			},
			onEditStateChange: () => {
				this.updateStatusBar();
			},
			onEditFinished: (r, j, M) => {
				let N = this.currentTranslations.length - 1, P = r;
				if (M === "down") if (r < N) P = r + 1;
				else {
					this.focusCell(r, j);
					return;
				}
				else if (r > 0) P = r - 1;
				else {
					this.focusCell(r, j);
					return;
				}
				this.focusCell(P, j), requestAnimationFrame(() => {
					this.startEditingFromKeyboard(P, j);
				});
			},
			updateCellStyle: (r, j) => {
				this.updateCellStyle(r, j);
			},
			updateCellContent: (r, j, M, N) => {
				let P = r.getAttribute("data-row-index"), F = P ? parseInt(P, 10) : 0;
				this.gridRenderer.updateCellContent(r, j, M, N, F);
			}
		}), this.commandRegistry = new CommandRegistry({ onCommandExecuted: () => {} }), this.registerDefaultCommands(), this.quickSearch = new QuickSearch({
			translations: r.translations,
			languages: r.languages
		}), this.quickSearchUI = new QuickSearchUI(this.container, {
			onSearch: (r) => {
				this.handleQuickSearch(r);
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
					let r = this.focusManager.getFocusedCell();
					r && this.focusCell(r.rowIndex, r.columnId);
				}
			},
			onFindMatches: (r) => this.findMatches(r),
			onGotoMatch: (r) => {
				this.gotoToMatch(r);
				let j = this.commandPalette.getFuzzyFindResults(), M = this.commandPalette.getFuzzyFindQuery(), N = j.map((r) => ({
					rowIndex: r.rowIndex,
					translation: r.translation,
					score: r.score,
					matchedFields: r.matchedFields
				})), P = N.findIndex((j) => j.rowIndex === r.rowIndex);
				this.currentGotoMatches = {
					keyword: M,
					matches: N,
					currentIndex: P === -1 ? 0 : P
				};
			}
		}), this.keyboardHandlerModule = new KeyboardHandler(this.modifierKeyTracker, this.focusManager, {
			onUndo: () => this.handleUndo(),
			onRedo: () => this.handleRedo(),
			onStartEditing: (r, j) => {
				this.startEditingFromKeyboard(r, j);
			},
			getAllColumns: () => [
				"key",
				"context",
				...r.languages.map((r) => `values.${r}`)
			],
			getMaxRowIndex: () => r.translations.length - 1,
			focusCell: (r, j) => {
				this.focusCell(r, j);
			},
			onOpenCommandPalette: (r) => {
				this.commandPalette.open(r);
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
			isEditableColumn: (r) => this.editableColumns.has(r),
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
			languages: r.languages
		}), this.columnResizer = new ColumnResizer({
			columnWidths: this.columnWidths,
			columnMinWidths: this.columnMinWidths,
			languages: r.languages,
			callbacks: {
				onResize: (r, j) => {
					this.applyColumnWidth(r, j);
				},
				onResizeEnd: () => {
					this.rowVirtualizer && this.bodyElement && this.renderVirtualRows();
				}
			}
		}), this.gridRenderer = new GridRenderer({
			languages: r.languages,
			readOnly: r.readOnly,
			editableColumns: this.editableColumns,
			callbacks: {
				onCellDblClick: (r, j, M) => {
					this.startEditing(r, j, M);
				},
				onCellFocus: (r, j) => {
					this.focusManager.focusCell(r, j), this.updateStatusBar();
				},
				updateCellStyle: (r, j, M) => {
					this.updateCellStyle(r, j, M);
				}
			}
		}), this.findReplace = new FindReplace({
			translations: r.translations,
			languages: r.languages,
			onFind: (r) => {
				if (r.length > 0) {
					let j = r[0];
					this.gotoToFindMatch(j);
				}
			},
			onReplace: (r, j) => {
				this.replaceFindMatch(r, j);
			},
			onReplaceAll: (r, j) => {
				this.replaceAllFindMatches(r, j);
			},
			onClose: () => {}
		}), this.vimCommandTracker = new VimCommandTracker({ onCommandUpdate: (r) => {
			this.updateStatusBar();
		} }), this.commandLine = new CommandLine({
			container: this.container,
			onExecute: async (r) => {
				await this.executeCommandLineCommand(r);
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
		let r = (() => {
			if (this.scrollElement) {
				let r = this.scrollElement.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) return {
					width: r.width,
					height: r.height
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
			initialRect: r,
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
		let r = null, j = this.cellEditor.getEditingCell();
		if (j) {
			let M = this.bodyElement.querySelector(`[data-row-index="${j.rowIndex}"]`);
			if (M) {
				let N = M.querySelector(`[data-column-id="${j.columnId}"]`);
				if (N) {
					let M = N.querySelector("input");
					M && (r = {
						rowId: j.rowId,
						columnId: j.columnId,
						value: M.value
					});
				}
			}
		}
		this.bodyElement.innerHTML = "";
		let M = this.rowVirtualizer.getVirtualItems(), N = this.rowVirtualizer.getTotalSize();
		this.bodyElement.style.height = `${N}px`;
		let P, F = this.getContainerWidth();
		if (this.columnResizer.isResizingActive()) P = this.columnWidthCalculator.calculateColumnWidths(F);
		else if (this.columnWidths.size > 0) P = this.columnWidthCalculator.calculateColumnWidths(F);
		else {
			let r = this.getColumnWidthsFromHeader();
			if (r) {
				let j = r.rowNumber + r.key + r.context + r.languages.slice(0, -1).reduce((r, j) => r + j, 0), M = this.columnMinWidths.get(`values.${this.options.languages[this.options.languages.length - 1]}`) || 80, N = Math.max(M, F - j);
				P = {
					rowNumber: r.rowNumber,
					key: r.key,
					context: r.context,
					languages: [...r.languages.slice(0, -1), N]
				};
			} else P = this.columnWidthCalculator.calculateColumnWidths(F);
		}
		M.forEach((j) => {
			let M = this.getFilteredTranslations()[j.index];
			if (!M) return;
			let N = this.gridRenderer.createRow(M, j.index, P), I = F;
			if (N.style.position = "absolute", N.style.top = `${j.start}px`, N.style.left = "0", N.style.width = `${I}px`, N.style.minWidth = `${I}px`, N.style.maxWidth = `${I}px`, N.style.height = `${j.size}px`, N.setAttribute("data-index", j.index.toString()), this.bodyElement.appendChild(N), this.applyQuickSearchHighlight(N, j.index), r && M.id === r.rowId) {
				let M = N.querySelector(`[data-column-id="${r.columnId}"]`);
				M && requestAnimationFrame(() => {
					this.startEditing(j.index, r.columnId, M);
					let N = M.querySelector("input");
					N && (N.value = r.value, N.focus(), N.select());
				});
			}
			this.rowVirtualizer.measureElement(N);
		});
	}
	renderHeader() {
		if (!this.headerElement) return;
		let r = document.createElement("div");
		r.className = "virtual-grid-header-row", r.setAttribute("role", "row");
		let j = this.getContainerWidth(), M;
		this.columnWidths.size > 0 ? M = this.columnWidthCalculator.calculateColumnWidths(j) : (M = this.columnWidthCalculator.calculateColumnWidths(j), this.columnWidths.set("row-number", M.rowNumber), this.columnWidths.set("key", M.key), this.columnWidths.set("context", M.context), this.options.languages.slice(0, -1).forEach((r, j) => {
			let N = M.languages[j];
			this.columnWidths.set(`values.${r}`, N);
		}));
		let N = j;
		r.style.width = `${N}px`, r.style.minWidth = `${N}px`, r.style.maxWidth = `${N}px`;
		let P = this.gridRenderer.createHeaderCell("", M.rowNumber, 0, 15, "row-number");
		P.classList.add("row-number-header"), r.appendChild(P);
		let F = this.gridRenderer.createHeaderCell("Key", M.key, M.rowNumber, 10, "key");
		this.columnResizer.addResizeHandle(F, "key"), r.appendChild(F);
		let I = this.gridRenderer.createHeaderCell("Context", M.context, M.rowNumber + M.key, 10, "context");
		this.columnResizer.addResizeHandle(I, "context"), r.appendChild(I), this.options.languages.forEach((j, N) => {
			let P = M.languages[N], F = `values.${j}`, I = M.rowNumber + M.key + M.context, L = this.gridRenderer.createHeaderCell(j.toUpperCase(), P, I, 0, F);
			this.columnResizer.addResizeHandle(L, F), r.appendChild(L);
		}), this.headerElement.appendChild(r);
	}
	applyColumnWidth(r, j) {
		let M = this.getContainerWidth(), { columnWidths: N, totalWidth: P } = this.columnWidthCalculator.applyColumnWidth(r, j, M);
		if (this.headerElement) {
			let r = this.headerElement.querySelector(".virtual-grid-header-row");
			r && (r.style.width = `${P}px`, r.style.minWidth = `${P}px`, r.style.maxWidth = `${P}px`);
			let j = this.headerElement.querySelector("[data-column-id=\"row-number\"]");
			j && (j.style.width = `${N.rowNumber}px`, j.style.minWidth = `${N.rowNumber}px`, j.style.maxWidth = `${N.rowNumber}px`);
			let M = this.headerElement.querySelector("[data-column-id=\"key\"]");
			M && (M.style.width = `${N.key}px`, M.style.minWidth = `${N.key}px`, M.style.maxWidth = `${N.key}px`, M.style.left = `${N.rowNumber}px`);
			let F = this.headerElement.querySelector("[data-column-id=\"context\"]");
			F && (F.style.width = `${N.context}px`, F.style.minWidth = `${N.context}px`, F.style.maxWidth = `${N.context}px`, F.style.left = `${N.rowNumber + N.key}px`), this.options.languages.forEach((r, j) => {
				let M = this.headerElement.querySelector(`[data-column-id="values.${r}"]`);
				if (M) {
					let r = N.languages[j];
					M.style.width = `${r}px`, M.style.minWidth = `${r}px`, M.style.maxWidth = `${r}px`;
					let P = N.rowNumber + N.key + N.context;
					M.style.left = `${P}px`;
				}
			});
		}
		this.bodyElement && (this.bodyElement.querySelectorAll(".virtual-grid-row").forEach((r) => {
			let j = r;
			j.style.width = `${P}px`, j.style.minWidth = `${P}px`, j.style.maxWidth = `${P}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"row-number\"]").forEach((r) => {
			let j = r;
			j.style.width = `${N.rowNumber}px`, j.style.minWidth = `${N.rowNumber}px`, j.style.maxWidth = `${N.rowNumber}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"key\"]").forEach((r) => {
			let j = r;
			j.style.width = `${N.key}px`, j.style.minWidth = `${N.key}px`, j.style.maxWidth = `${N.key}px`, j.style.left = `${N.rowNumber}px`;
		}), this.bodyElement.querySelectorAll("[data-column-id=\"context\"]").forEach((r) => {
			let j = r;
			j.style.width = `${N.context}px`, j.style.minWidth = `${N.context}px`, j.style.maxWidth = `${N.context}px`, j.style.left = `${N.rowNumber + N.key}px`;
		}), this.options.languages.forEach((r, j) => {
			let M = this.bodyElement.querySelectorAll(`[data-column-id="values.${r}"]`), P = N.languages[j], F = N.rowNumber + N.key + N.context;
			M.forEach((r) => {
				let j = r;
				j.style.width = `${P}px`, j.style.minWidth = `${P}px`, j.style.maxWidth = `${P}px`, j.style.left = `${F}px`;
			});
		}));
	}
	getColumnWidthsFromHeader() {
		if (!this.headerElement) return null;
		let r = this.headerElement.querySelector(".virtual-grid-header-row");
		if (!r) return null;
		let j = r.querySelectorAll(".virtual-grid-header-cell"), M = {
			rowNumber: 0,
			key: 0,
			context: 0,
			languages: []
		};
		return j.forEach((r) => {
			let j = r.getAttribute("data-column-id"), N = r.offsetWidth || r.getBoundingClientRect().width;
			j === "row-number" ? M.rowNumber = N : j === "key" ? M.key = N : j === "context" ? M.context = N : j && j.startsWith("values.") && M.languages.push(N);
		}), M.rowNumber > 0 && M.key > 0 && M.context > 0 && M.languages.length === this.options.languages.length ? M : null;
	}
	startEditing(r, j, M) {
		if (this.options.readOnly) return;
		let N = M.getAttribute("data-row-id");
		N && (this.cellEditor.startEditing(r, j, N, M), this.updateStatusBar());
	}
	startEditingFromKeyboard(r, j) {
		if (!this.bodyElement || !this.editableColumns.has(j) || this.options.readOnly) return;
		let M = this.bodyElement.querySelector(`[data-row-index="${r}"][data-column-id="${j}"]`);
		M && this.startEditing(r, j, M);
	}
	stopEditing() {
		this.cellEditor.stopEditing(this.bodyElement || void 0), this.updateStatusBar();
	}
	updateCellStyle(r, j, M) {
		if (!this.bodyElement) return;
		let N = M || this.bodyElement.querySelector(`[data-row-id="${r}"][data-column-id="${j}"]`);
		if (!N) return;
		let P = `${r}-${j}`;
		if (this.changeTracker.getChangesMap().has(P) ? N.classList.add("cell-dirty") : N.classList.remove("cell-dirty"), j.startsWith("values.")) {
			let M = this.currentTranslations.find((j) => j.id === r);
			if (M) {
				let r = j.replace("values.", ""), P = M.values[r] || "";
				!P || typeof P == "string" && P.trim() === "" ? N.classList.add("cell-empty") : N.classList.remove("cell-empty");
			}
		}
	}
	attachKeyboardListeners() {
		this.modifierKeyTracker.attach(), this.keyboardHandlerModule.attach(), this.vimKeyboardHandler = this.handleVimKeyboardEvent.bind(this), document.addEventListener("keydown", this.vimKeyboardHandler);
	}
	handleVimKeyboardEvent(r) {
		if (this.commandLine?.getVisible() || this.cellEditor.getEditingCell() !== null || this.quickSearchUI?.isSearchMode() || this.commandPalette.isPaletteOpen() || document.querySelector(".find-replace-overlay")) return;
		let j = r.target;
		if (!(j.tagName === "INPUT" || j.tagName === "TEXTAREA" || j.isContentEditable) && !(r.ctrlKey || r.metaKey || r.altKey)) {
			if (r.key === ":" || r.code === "Semicolon") {
				r.preventDefault(), r.stopPropagation(), this.commandLine && (this.vimCommandTracker && (this.vimCommandTracker.clear(), this.updateStatusBar()), this.commandLine.show());
				return;
			}
			if (r.key === "Escape") {
				if (this.commandLine?.getVisible()) {
					r.preventDefault(), r.stopPropagation(), this.commandLine.hide();
					return;
				}
				this.vimCommandTracker && (this.vimCommandTracker.cancelCommand(), this.updateStatusBar());
				return;
			}
			r.key.length === 1 && !r.shiftKey && !r.ctrlKey && !r.metaKey && !r.altKey && this.vimCommandTracker && (this.vimCommandTracker.addKey(r.key), this.updateStatusBar());
		}
	}
	focusCell(r, j) {
		if (!this.bodyElement) return;
		this.focusManager.focusCell(r, j), this.updateStatusBar();
		let M = this.bodyElement.querySelector(`[data-row-index="${r}"][data-column-id="${j}"]`);
		if (!M && this.rowVirtualizer) {
			this.rowVirtualizer.scrollToIndex(r, {
				align: "start",
				behavior: "auto"
			}), this.renderScheduled === !1 && this.renderVirtualRows();
			let N = (P = 0) => {
				if (!(P > 20)) {
					if (M = this.bodyElement.querySelector(`[data-row-index="${r}"][data-column-id="${j}"]`), M) {
						M.focus(), M.dispatchEvent(new FocusEvent("focus", { bubbles: !0 }));
						return;
					}
					requestAnimationFrame(() => {
						N(P + 1);
					});
				}
			};
			N(0);
		} else M && (M.focus(), M.dispatchEvent(new FocusEvent("focus", { bubbles: !0 })));
	}
	handleUndo() {
		if (!this.undoRedoManager.canUndo()) return;
		let r = this.undoRedoManager.undo();
		r && (this.applyUndoRedoAction(r), this.updateStatusBar());
	}
	handleRedo() {
		if (!this.undoRedoManager.canRedo()) return;
		let r = this.undoRedoManager.redo();
		r && (this.applyUndoRedoAction(r), this.updateStatusBar());
	}
	applyUndoRedoAction(r) {
		if (r.type !== "cell-change") {
			logger.warn("VirtualTableDiv: Invalid action type", r.type);
			return;
		}
		this.cellEditor.isEditing() && this.stopEditing();
		let j = this.currentTranslations.findIndex((j) => j.id === r.rowId);
		if (j === -1) {
			logger.error("VirtualTableDiv: Translation not found", r.rowId);
			return;
		}
		let M = this.currentTranslations[j], N = toMutableTranslation(M);
		if (r.columnId === "key") N.key = r.newValue;
		else if (r.columnId === "context") N.context = r.newValue;
		else if (r.columnId.startsWith("values.")) {
			let j = r.columnId.replace("values.", "");
			N.values[j] = r.newValue;
		} else {
			logger.error("VirtualTableDiv: Invalid columnId", r.columnId);
			return;
		}
		let P = this.originalTranslations.findIndex((j) => j.id === r.rowId);
		if (P !== -1) {
			let j = this.originalTranslations[P], M = toMutableTranslation(j);
			if (r.columnId === "key") M.key = r.newValue;
			else if (r.columnId === "context") M.context = r.newValue;
			else if (r.columnId.startsWith("values.")) {
				let j = r.columnId.replace("values.", "");
				M.values[j] = r.newValue;
			}
			let N = [...this.originalTranslations];
			N[P] = M, this.originalTranslations = N;
		}
		this.currentTranslations[j] = N;
		let F = this.bodyElement?.querySelector(`[data-row-id="${r.rowId}"][data-column-id="${r.columnId}"]`);
		if (F) {
			let j = F.getAttribute("data-row-index"), M = j ? parseInt(j, 10) : 0;
			this.gridRenderer.updateCellContent(F, r.rowId, r.columnId, r.newValue, M);
		} else this.updateCellStyle(r.rowId, r.columnId);
		let I = this.changeTracker.getOriginalValue(r.rowId, r.columnId), L = getLangFromColumnId(r.columnId), R = getTranslationKey(this.currentTranslations, r.rowId, r.columnId, r.newValue);
		this.changeTracker.trackChange(r.rowId, r.columnId, L, I, r.newValue, R, () => {
			this.updateCellStyle(r.rowId, r.columnId);
		}), this.options.onCellChange && this.options.onCellChange(r.rowId, r.columnId, r.newValue), this.rowVirtualizer && this.bodyElement && this.renderVirtualRows();
	}
	getContainerWidth() {
		return this.container && this.container.clientWidth > 0 ? this.container.clientWidth : typeof window < "u" ? window.innerWidth : 1e3;
	}
	setReadOnly(r) {
		this.options = {
			...this.options,
			readOnly: r
		}, this.gridRenderer = new GridRenderer({
			languages: this.options.languages,
			readOnly: r,
			editableColumns: this.editableColumns,
			callbacks: {
				onCellDblClick: (r, j, M) => {
					this.startEditing(r, j, M);
				},
				onCellFocus: (r, j) => {
					this.focusManager.focusCell(r, j);
				},
				updateCellStyle: (r, j, M) => {
					this.updateCellStyle(r, j, M);
				}
			}
		}), this.gridElement && (r ? this.gridElement.classList.add("readonly") : this.gridElement.classList.remove("readonly")), this.bodyElement && this.bodyElement.querySelectorAll(".virtual-grid-cell").forEach((j) => {
			let M = j.getAttribute("data-column-id"), N = M && this.editableColumns.has(M);
			r ? j.setAttribute("tabindex", "-1") : j.setAttribute("tabindex", N ? "0" : "-1");
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
			execute: (r) => {
				if (r && r.length > 0) {
					let j = r[0].toLowerCase();
					if (j === "top" || j === "first" || j === "1") {
						this.gotoTop();
						return;
					}
					if (j === "bottom" || j === "last") {
						this.gotoBottom();
						return;
					}
					let M = parseInt(r[0], 10);
					!isNaN(M) && M > 0 && this.gotoRow(M - 1);
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
			execute: (r) => {
				if (r && r.length > 0) {
					let j = r.join(" ");
					this.searchKeyword(j);
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
				let r = !this.options.readOnly;
				this.setReadOnly(r);
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
	gotoRow(r) {
		let j = this.getFilteredTranslations();
		if (r < 0 || r >= j.length) return;
		this.rowVirtualizer && this.rowVirtualizer.scrollToIndex(r, {
			align: "start",
			behavior: "smooth"
		});
		let M = [
			"key",
			"context",
			...this.options.languages.map((r) => `values.${r}`)
		].find((r) => this.editableColumns.has(r));
		M && setTimeout(() => {
			this.focusCell(r, M);
		}, 300);
	}
	gotoTop() {
		this.gotoRow(0);
	}
	gotoBottom() {
		let r = this.getFilteredTranslations();
		if (r.length > 0) {
			let j = r.length - 1;
			this.rowVirtualizer && this.rowVirtualizer.scrollToIndex(j, {
				align: "end",
				behavior: "smooth"
			});
			let M = [
				"key",
				"context",
				...this.options.languages.map((r) => `values.${r}`)
			].find((r) => this.editableColumns.has(r));
			M && setTimeout(() => {
				this.focusCell(j, M);
			}, 300);
		}
	}
	findMatches(r) {
		return new TextSearchMatcher({
			translations: this.getFilteredTranslations(),
			languages: this.options.languages
		}).findMatches(r);
	}
	gotoToMatch(r) {
		if (this.gotoRow(r.rowIndex), this.currentGotoMatches) {
			let j = this.currentGotoMatches.matches.findIndex((j) => j.rowIndex === r.rowIndex);
			j !== -1 && (this.currentGotoMatches.currentIndex = j);
		}
	}
	gotoToNextMatch() {
		if (!this.currentGotoMatches || this.currentGotoMatches.matches.length === 0) return;
		let { matches: r, currentIndex: j } = this.currentGotoMatches, M = (j + 1) % r.length, N = r[M];
		this.currentGotoMatches.currentIndex = M, this.gotoRow(N.rowIndex);
	}
	gotoToPrevMatch() {
		if (!this.currentGotoMatches || this.currentGotoMatches.matches.length === 0) return;
		let { matches: r, currentIndex: j } = this.currentGotoMatches, M = j === 0 ? r.length - 1 : j - 1, N = r[M];
		this.currentGotoMatches.currentIndex = M, this.gotoRow(N.rowIndex);
	}
	openFindReplace(r) {
		this.findReplace && this.findReplace.open(r);
	}
	gotoToFindMatch(r) {
		this.gotoRow(r.rowIndex), this.focusCell(r.rowIndex, r.columnId);
	}
	replaceFindMatch(r, j) {
		let M = this.getFilteredTranslations();
		if (r.rowIndex < 0 || r.rowIndex >= M.length) return;
		let N = M[r.rowIndex], P = null;
		if (r.columnId === "key") P = N.key;
		else if (r.columnId === "context") P = N.context || null;
		else if (r.columnId.startsWith("values.")) {
			let j = r.columnId.replace("values.", "");
			P = N.values[j] || null;
		}
		if (P === null) return;
		let F = P.substring(0, r.matchIndex), I = P.substring(r.matchIndex + r.matchLength), L = F + j + I;
		if (r.columnId !== "key") {
			{
				let j = r.columnId, M = "";
				if (j === "context") M = N.context || "";
				else if (j.startsWith("values.")) {
					let r = j.replace("values.", "");
					M = N.values[r] || "";
				}
				this.cellEditor.applyCellChange(N.id, j, M, L).catch((r) => {
					logger.error("Failed to apply cell change:", r);
				});
			}
			this.updateStatusBar(), this.renderVirtualRows();
		}
	}
	replaceAllFindMatches(r, j) {
		[...r].sort((r, j) => r.rowIndex === j.rowIndex ? j.matchIndex - r.matchIndex : j.rowIndex - r.rowIndex).forEach((r) => {
			this.replaceFindMatch(r, j);
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
	searchKeyword(r) {
		this.currentSearchKeyword = r, this.currentFilter = r.trim() ? "search" : "none", this.applyFilter();
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
		let r = document.querySelector(".help-modal-overlay");
		if (r && r.remove(), !document.querySelector("link[href*=\"help-modal.css\"]")) {
			let r = document.createElement("link");
			r.rel = "stylesheet", r.href = new URL("data:text/css;base64,LyoqCiAqIEhlbHAgTW9kYWwg7Iqk7YOA7J28CiAqIFZTIENvZGUg7Iqk7YOA7J287J2YIOuPhOybgOunkCDrqqjri6wKICovCgouaGVscC1tb2RhbC1vdmVybGF5IHsKICBwb3NpdGlvbjogZml4ZWQ7CiAgdG9wOiAwOwogIGxlZnQ6IDA7CiAgcmlnaHQ6IDA7CiAgYm90dG9tOiAwOwogIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC40KTsKICB6LWluZGV4OiAxMDAxOyAvKiBDb21tYW5kIFBhbGV0dGXrs7Tri6Qg7JyE7JeQIO2RnOyLnCAqLwogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICBhbmltYXRpb246IGZhZGVJbiAwLjE1cyBlYXNlLW91dDsKfQoKQGtleWZyYW1lcyBmYWRlSW4gewogIGZyb20gewogICAgb3BhY2l0eTogMDsKICB9CiAgdG8gewogICAgb3BhY2l0eTogMTsKICB9Cn0KCi5oZWxwLW1vZGFsIHsKICB3aWR0aDogOTAlOwogIG1heC13aWR0aDogNzAwcHg7CiAgbWF4LWhlaWdodDogODB2aDsKICBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmOwogIGJvcmRlci1yYWRpdXM6IDhweDsKICBib3gtc2hhZG93OiAwIDhweCAzMnB4IHJnYmEoMCwgMCwgMCwgMC4yKTsKICBkaXNwbGF5OiBmbGV4OwogIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47CiAgYW5pbWF0aW9uOiBzbGlkZURvd24gMC4xNXMgZWFzZS1vdXQ7CiAgb3ZlcmZsb3c6IGhpZGRlbjsKfQoKQGtleWZyYW1lcyBzbGlkZURvd24gewogIGZyb20gewogICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKC0yMHB4KTsKICAgIG9wYWNpdHk6IDA7CiAgfQogIHRvIHsKICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTsKICAgIG9wYWNpdHk6IDE7CiAgfQp9CgouaGVscC1tb2RhbC1oZWFkZXIgewogIHBhZGRpbmc6IDIwcHggMjRweDsKICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2UyZThmMDsKICBkaXNwbGF5OiBmbGV4OwogIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsKICBhbGlnbi1pdGVtczogY2VudGVyOwogIGJhY2tncm91bmQtY29sb3I6ICNmOGZhZmM7Cn0KCi5oZWxwLW1vZGFsLXRpdGxlIHsKICBmb250LXNpemU6IDIwcHg7CiAgZm9udC13ZWlnaHQ6IDYwMDsKICBjb2xvcjogIzFlMjkzYjsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLWNsb3NlIHsKICBiYWNrZ3JvdW5kOiBub25lOwogIGJvcmRlcjogbm9uZTsKICBmb250LXNpemU6IDI0cHg7CiAgY29sb3I6ICM2NDc0OGI7CiAgY3Vyc29yOiBwb2ludGVyOwogIHBhZGRpbmc6IDA7CiAgd2lkdGg6IDMycHg7CiAgaGVpZ2h0OiAzMnB4OwogIGRpc3BsYXk6IGZsZXg7CiAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICBib3JkZXItcmFkaXVzOiA0cHg7CiAgdHJhbnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciAwLjFzOwp9CgouaGVscC1tb2RhbC1jbG9zZTpob3ZlciB7CiAgYmFja2dyb3VuZC1jb2xvcjogI2UyZThmMDsKICBjb2xvcjogIzFlMjkzYjsKfQoKLmhlbHAtbW9kYWwtY29udGVudCB7CiAgZmxleDogMTsKICBvdmVyZmxvdy15OiBhdXRvOwogIHBhZGRpbmc6IDI0cHg7Cn0KCi5oZWxwLW1vZGFsLXNlY3Rpb24gewogIG1hcmdpbi1ib3R0b206IDMycHg7Cn0KCi5oZWxwLW1vZGFsLXNlY3Rpb246bGFzdC1jaGlsZCB7CiAgbWFyZ2luLWJvdHRvbTogMDsKfQoKLmhlbHAtbW9kYWwtc2VjdGlvbi10aXRsZSB7CiAgZm9udC1zaXplOiAxNnB4OwogIGZvbnQtd2VpZ2h0OiA2MDA7CiAgY29sb3I6ICMxZTI5M2I7CiAgbWFyZ2luOiAwIDAgMTZweCAwOwogIHBhZGRpbmctYm90dG9tOiA4cHg7CiAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNlMmU4ZjA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWxpc3QgewogIGxpc3Qtc3R5bGU6IG5vbmU7CiAgcGFkZGluZzogMDsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWl0ZW0gewogIGRpc3BsYXk6IGZsZXg7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgcGFkZGluZzogMTJweCAwOwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjFmNWY5Owp9CgouaGVscC1tb2RhbC1zaG9ydGN1dC1pdGVtOmxhc3QtY2hpbGQgewogIGJvcmRlci1ib3R0b206IG5vbmU7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWRlc2NyaXB0aW9uIHsKICBmb250LXNpemU6IDE0cHg7CiAgY29sb3I6ICM0NzU1Njk7CiAgZmxleDogMTsKfQoKLmhlbHAtbW9kYWwtc2hvcnRjdXQta2V5cyB7CiAgZGlzcGxheTogZmxleDsKICBnYXA6IDRweDsKICBhbGlnbi1pdGVtczogY2VudGVyOwp9CgouaGVscC1tb2RhbC1zaG9ydGN1dC1rZXkgewogIHBhZGRpbmc6IDRweCA4cHg7CiAgYmFja2dyb3VuZC1jb2xvcjogI2YxZjVmOTsKICBib3JkZXI6IDFweCBzb2xpZCAjZTJlOGYwOwogIGJvcmRlci1yYWRpdXM6IDRweDsKICBmb250LXNpemU6IDEycHg7CiAgZm9udC1mYW1pbHk6IHN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZjsKICBjb2xvcjogIzFlMjkzYjsKICBib3gtc2hhZG93OiAwIDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjEpOwogIGZvbnQtd2VpZ2h0OiA1MDA7Cn0KCi5oZWxwLW1vZGFsLXNob3J0Y3V0LWtleS1zZXBhcmF0b3IgewogIGNvbG9yOiAjOTRhM2I4OwogIGZvbnQtc2l6ZTogMTJweDsKICBtYXJnaW46IDAgMnB4Owp9CgouaGVscC1tb2RhbC1jb21tYW5kLWxpc3QgewogIGxpc3Qtc3R5bGU6IG5vbmU7CiAgcGFkZGluZzogMDsKICBtYXJnaW46IDA7Cn0KCi5oZWxwLW1vZGFsLWNvbW1hbmQtaXRlbSB7CiAgcGFkZGluZzogMTJweCAwOwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZjFmNWY5Owp9CgouaGVscC1tb2RhbC1jb21tYW5kLWl0ZW06bGFzdC1jaGlsZCB7CiAgYm9yZGVyLWJvdHRvbTogbm9uZTsKfQoKLmhlbHAtbW9kYWwtY29tbWFuZC1uYW1lIHsKICBmb250LXNpemU6IDE0cHg7CiAgZm9udC13ZWlnaHQ6IDUwMDsKICBjb2xvcjogIzFlMjkzYjsKICBtYXJnaW4tYm90dG9tOiA0cHg7CiAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTsKICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjFmNWY5OwogIHBhZGRpbmc6IDJweCA2cHg7CiAgYm9yZGVyLXJhZGl1czogNHB4OwogIGRpc3BsYXk6IGlubGluZS1ibG9jazsKfQoKLmhlbHAtbW9kYWwtY29tbWFuZC1kZXNjcmlwdGlvbiB7CiAgZm9udC1zaXplOiAxM3B4OwogIGNvbG9yOiAjNjQ3NDhiOwogIG1hcmdpbi10b3A6IDRweDsKfQoKLyog7Iqk7YGs66Gk67CUIOyKpO2DgOydvCAqLwouaGVscC1tb2RhbC1jb250ZW50Ojotd2Via2l0LXNjcm9sbGJhciB7CiAgd2lkdGg6IDhweDsKfQoKLmhlbHAtbW9kYWwtY29udGVudDo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2sgewogIGJhY2tncm91bmQ6ICNmMWY1Zjk7Cn0KCi5oZWxwLW1vZGFsLWNvbnRlbnQ6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHsKICBiYWNrZ3JvdW5kOiAjY2JkNWUxOwogIGJvcmRlci1yYWRpdXM6IDRweDsKfQoKLmhlbHAtbW9kYWwtY29udGVudDo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWI6aG92ZXIgewogIGJhY2tncm91bmQ6ICM5NGEzYjg7Cn0KCgoKCg==", "" + import.meta.url).href, document.head.appendChild(r);
		}
		let j = document.createElement("div");
		j.className = "help-modal-overlay", j.setAttribute("role", "dialog"), j.setAttribute("aria-label", "Keyboard Shortcuts Help"), j.setAttribute("aria-modal", "true");
		let M = document.createElement("div");
		M.className = "help-modal";
		let N = document.createElement("div");
		N.className = "help-modal-header";
		let P = document.createElement("h2");
		P.className = "help-modal-title", P.textContent = "Keyboard Shortcuts";
		let F = document.createElement("button");
		F.className = "help-modal-close", F.innerHTML = "×", F.setAttribute("aria-label", "Close"), F.onclick = () => j.remove(), N.appendChild(P), N.appendChild(F);
		let I = document.createElement("div");
		I.className = "help-modal-content";
		let L = document.createElement("div");
		L.className = "help-modal-section";
		let R = document.createElement("h3");
		R.className = "help-modal-section-title", R.textContent = "Keyboard Shortcuts", L.appendChild(R);
		let B = document.createElement("ul");
		B.className = "help-modal-shortcut-list";
		let V = navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "Cmd" : "Ctrl";
		[
			{
				description: "Open Command Palette",
				keys: [V, "K"]
			},
			{
				description: "Undo",
				keys: [V, "Z"]
			},
			{
				description: "Redo",
				keys: [V, "Y"]
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
		].forEach((r) => {
			let j = document.createElement("li");
			j.className = "help-modal-shortcut-item";
			let M = document.createElement("span");
			M.className = "help-modal-shortcut-description", M.textContent = r.description;
			let N = document.createElement("div");
			N.className = "help-modal-shortcut-keys", r.keys.forEach((r, j) => {
				if (j > 0) {
					let r = document.createElement("span");
					r.className = "help-modal-shortcut-key-separator", r.textContent = "+", N.appendChild(r);
				}
				let M = document.createElement("kbd");
				M.className = "help-modal-shortcut-key", M.textContent = r, N.appendChild(M);
			}), j.appendChild(M), j.appendChild(N), B.appendChild(j);
		}), L.appendChild(B), I.appendChild(L);
		let H = document.createElement("div");
		H.className = "help-modal-section";
		let U = document.createElement("h3");
		U.className = "help-modal-section-title", U.textContent = "Available Commands", H.appendChild(U);
		let W = document.createElement("ul");
		W.className = "help-modal-command-list", [
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
		].forEach((r) => {
			let j = document.createElement("li");
			j.className = "help-modal-command-item";
			let M = document.createElement("div");
			M.className = "help-modal-command-name", M.textContent = r.name;
			let N = document.createElement("div");
			N.className = "help-modal-command-description", N.textContent = r.description, j.appendChild(M), j.appendChild(N), W.appendChild(j);
		}), H.appendChild(W), I.appendChild(H), M.appendChild(N), M.appendChild(I), j.appendChild(M), document.body.appendChild(j), j.addEventListener("click", (r) => {
			r.target === j && j.remove();
		});
		let G = (r) => {
			r.key === "Escape" && (j.remove(), document.removeEventListener("keydown", G));
		};
		document.addEventListener("keydown", G);
		let K = new MutationObserver(() => {
			document.body.contains(j) || (document.removeEventListener("keydown", G), K.disconnect());
		});
		K.observe(document.body, {
			childList: !0,
			subtree: !0
		});
	}
	clearChanges() {
		this.changeTracker.clearChanges((r, j) => {
			this.updateCellStyle(r, j);
		});
	}
	openQuickSearch() {
		this.quickSearchUI && this.quickSearchUI.open();
	}
	closeQuickSearch() {
		this.quickSearchUI && this.quickSearchUI.close(), this.currentQuickSearchMatches = [], this.currentQuickSearchIndex = -1, this.bodyElement && this.renderVirtualRows();
	}
	handleQuickSearch(r) {
		if (!this.quickSearch || !this.quickSearchUI) return;
		let j = parseSearchQuery(r);
		if (!j) {
			this.currentQuickSearchMatches = [], this.currentQuickSearchIndex = -1, this.quickSearchUI.updateStatus(0, 0), this.bodyElement && this.renderVirtualRows();
			return;
		}
		let M = this.quickSearch.findMatches(j);
		this.currentQuickSearchMatches = M, this.currentQuickSearchIndex = M.length > 0 ? 0 : -1, M.length > 0 ? (this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, M.length), this.goToQuickSearchMatch(M[0])) : this.quickSearchUI.updateStatus(0, 0), this.bodyElement && this.renderVirtualRows();
	}
	goToNextQuickSearchMatch() {
		if (this.currentQuickSearchMatches.length === 0) return;
		(this.currentQuickSearchIndex < 0 || this.currentQuickSearchIndex >= this.currentQuickSearchMatches.length) && (this.currentQuickSearchIndex = 0), this.currentQuickSearchIndex = (this.currentQuickSearchIndex + 1) % this.currentQuickSearchMatches.length;
		let r = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
		this.goToQuickSearchMatch(r), this.quickSearchUI && this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, this.currentQuickSearchMatches.length);
	}
	goToPrevQuickSearchMatch() {
		if (this.currentQuickSearchMatches.length === 0) return;
		this.currentQuickSearchIndex = this.currentQuickSearchIndex <= 0 ? this.currentQuickSearchMatches.length - 1 : this.currentQuickSearchIndex - 1;
		let r = this.currentQuickSearchMatches[this.currentQuickSearchIndex];
		this.goToQuickSearchMatch(r), this.quickSearchUI && this.quickSearchUI.updateStatus(this.currentQuickSearchIndex, this.currentQuickSearchMatches.length);
	}
	goToQuickSearchMatch(r) {
		if (this.rowVirtualizer && this.scrollElement) if (this.rowVirtualizer.getVirtualItems().find((j) => j.index === r.rowIndex) && this.bodyElement) {
			let j = this.bodyElement.querySelector(`[data-index="${r.rowIndex}"]`);
			j && j.scrollIntoView({
				behavior: "auto",
				block: "center"
			});
		} else {
			let j = r.rowIndex * this.rowHeight;
			this.scrollElement.scrollTop = j - this.scrollElement.clientHeight / 2;
		}
		requestAnimationFrame(() => {
			this.focusCell(r.rowIndex, r.columnId), this.bodyElement && this.renderVirtualRows();
		});
	}
	applyQuickSearchHighlight(r, j) {
		this.currentQuickSearchMatches.length !== 0 && (r.querySelectorAll(".virtual-grid-cell").forEach((r) => {
			r.classList.remove("quick-search-matched", "quick-search-current-match");
			let j = r.querySelector(".virtual-grid-cell-content");
			if (j) {
				let r = j.getAttribute("data-original-text");
				r !== null && (j.textContent = r, j.removeAttribute("data-original-text"));
			}
		}), this.currentQuickSearchMatches.forEach((M) => {
			if (M.rowIndex !== j) return;
			let N = r.querySelector(`[data-column-id="${M.columnId}"]`);
			if (!N) return;
			let P = N.querySelector(".virtual-grid-cell-content");
			P && (P.getAttribute("data-original-text") || P.setAttribute("data-original-text", M.matchedText), P.innerHTML = QuickSearch.highlightText(M.matchedText, M.matchIndices), N.classList.add("quick-search-matched"), this.currentQuickSearchIndex >= 0 && this.currentQuickSearchIndex < this.currentQuickSearchMatches.length && this.currentQuickSearchMatches[this.currentQuickSearchIndex].rowIndex === j && this.currentQuickSearchMatches[this.currentQuickSearchIndex].columnId === M.columnId && N.classList.add("quick-search-current-match"));
		}));
	}
	destroy() {
		this.keyboardHandlerModule && this.keyboardHandlerModule.detach(), this.commandPalette && this.commandPalette.isPaletteOpen() && this.commandPalette.close(), this.modifierKeyTracker && this.modifierKeyTracker.detach(), this.resizeObserver &&= (this.resizeObserver.disconnect(), null), this.virtualizerCleanup &&= (this.virtualizerCleanup(), null), this.scrollElement && this.container.contains(this.scrollElement) && this.container.removeChild(this.scrollElement), this.scrollElement = null, this.gridElement = null, this.headerElement = null, this.bodyElement = null, this.rowVirtualizer = null, this.statusBar &&= (this.statusBar.destroy(), null), this.vimKeyboardHandler &&= (document.removeEventListener("keydown", this.vimKeyboardHandler), null), this.commandLine &&= (this.commandLine.destroy(), null), this.vimCommandTracker &&= (this.vimCommandTracker.clear(), null);
	}
	initStatusBar() {
		this.statusBar = new StatusBar(this.container, { onStatusUpdate: () => {} }), this.statusBar.create(), this.updateStatusBar();
	}
	async executeCommandLineCommand(r) {
		let j = r.trim();
		if (!j) return;
		let M = j.split(/\s+/), N = M[0].toLowerCase(), P = M.slice(1);
		if ((N === "goto" || N === "go") && P.length > 0) {
			let r = P[0].toLowerCase();
			if (r === "top" || r === "first" || r === "1") {
				this.gotoTop();
				return;
			}
			if (r === "bottom" || r === "last") {
				this.gotoBottom();
				return;
			}
			let j = parseInt(P[0], 10);
			if (!isNaN(j) && j > 0) {
				this.gotoRow(j - 1);
				return;
			}
		}
		let F = this.commandRegistry.getCommands("all").find((r) => {
			let j = r.id.toLowerCase(), M = r.label.toLowerCase();
			return j === N || M.includes(N) || r.keywords?.some((r) => r.toLowerCase() === N);
		});
		F ? F.execute(P) : logger.warn(`CommandLine: Unknown command: ${N}`);
	}
	updateStatusBar() {
		if (!this.statusBar) return;
		let r = this.cellEditor.getEditingCell() === null ? "Normal" : "Editing", j = this.focusManager.getFocusedCell(), M = this.getFilteredTranslations().length, N = j && typeof j.rowIndex == "number" ? j.rowIndex : null;
		M > 0 ? N === null ? N = 0 : N >= M && (N = M - 1) : N = 0;
		let P = j ? j.columnId : null, F = this.changeTracker.getChanges().length, I = this.countEmptyTranslations(), L = this.countDuplicateKeys(), R = this.vimCommandTracker?.getCurrentCommand(), B = R ? R.sequence : null;
		this.statusBar.update({
			mode: r,
			rowIndex: N,
			totalRows: M,
			columnId: P,
			changesCount: F,
			emptyCount: I,
			duplicateCount: L,
			command: B
		});
	}
	countEmptyTranslations() {
		let r = this.getFilteredTranslations(), j = 0;
		return r.forEach((r) => {
			this.options.languages.forEach((M) => {
				let N = r.values[M] || "";
				(!N || typeof N == "string" && N.trim() === "") && j++;
			});
		}), j;
	}
	countDuplicateKeys() {
		let r = this.getFilteredTranslations(), j = /* @__PURE__ */ new Map();
		r.forEach((r) => {
			let M = r.key.trim();
			M && j.set(M, (j.get(M) || 0) + 1);
		});
		let M = 0;
		return j.forEach((r) => {
			r > 1 && (M += r - 1);
		}), M;
	}
};
export { ChangeTracker, VirtualTableDiv };
