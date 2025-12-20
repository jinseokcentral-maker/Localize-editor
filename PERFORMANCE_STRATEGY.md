# 성능 최적화 전략 - React 없는 Excel-like 에디터

## 🎯 성능 목표
- **초기 렌더링**: < 100ms (10,000개 행)
- **검색 필터링**: < 50ms (클라이언트)
- **스크롤 FPS**: 60fps (가상 스크롤)
- **셀 편집 반응**: < 16ms (즉각적)
- **메모리 사용**: < 100MB (10,000개 행)

---

## 🏆 최고 성능 스택 추천

### 옵션 1: **Canvas 기반 그리드** ⭐⭐⭐ (최고 성능)

#### **Canvas + Virtual Scrolling (직접 구현)**

**장점:**
- ✅ **최고 성능** (DOM 조작 없음)
- ✅ 수만 개 행도 부드럽게 처리
- ✅ 메모리 효율적
- ✅ 완전한 제어

**단점:**
- ❌ 구현 복잡도 높음
- ❌ 접근성 (a11y) 직접 구현 필요

**라이브러리:**
- `@tanstack/virtual` (가상 스크롤 로직만)
- 또는 직접 구현

---

#### **HyperFormula + Canvas** (추천)

```bash
pnpm add hyperformula
```

**장점:**
- ✅ Excel 수식 엔진 (선택사항)
- ✅ 빠른 계산
- ✅ Canvas 렌더링 가능

---

### 옵션 2: **AG Grid Community (Vanilla)** ⭐⭐ (균형)

```bash
pnpm add ag-grid-community
```

**장점:**
- ✅ **가상 스크롤 최적화** (Row Virtualization)
- ✅ **Column Virtualization** (수백 개 컬럼 처리)
- ✅ Canvas 렌더링 옵션
- ✅ 성능 튜닝 옵션 많음

**성능 설정:**
```typescript
const gridOptions = {
  rowModelType: 'viewport', // 가상 스크롤
  suppressColumnVirtualisation: false, // 컬럼 가상화
  suppressRowVirtualisation: false, // 행 가상화
  animateRows: false, // 애니메이션 비활성화
  suppressScrollOnNewData: true,
  // ...
};
```

---

### 옵션 3: **Handsontable (Vanilla)** ⭐

```bash
pnpm add handsontable
```

**장점:**
- ✅ Excel-like 기능 완비
- ✅ 가상 스크롤 내장

**단점:**
- ⚠️ AG Grid보다 약간 느림

---

## 🚀 성능 최적화 기법

### 1. **가상 스크롤 (Virtual Scrolling)**

#### 직접 구현 (최고 성능)

```typescript
// src/utils/virtual-scroll.ts
export class VirtualScroll {
  private container: HTMLElement;
  private rowHeight: number;
  private visibleRows: number;
  private scrollTop: number = 0;
  private totalRows: number;

  constructor(container: HTMLElement, rowHeight: number) {
    this.container = container;
    this.rowHeight = rowHeight;
    this.visibleRows = Math.ceil(container.clientHeight / rowHeight);
    this.totalRows = 0;

    container.addEventListener('scroll', this.handleScroll.bind(this));
  }

  private handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.render();
  }

  private getVisibleRange() {
    const start = Math.floor(this.scrollTop / this.rowHeight);
    const end = Math.min(start + this.visibleRows + 2, this.totalRows); // +2 buffer
    return { start, end };
  }

  render() {
    const { start, end } = this.getVisibleRange();
    const offsetY = start * this.rowHeight;

    // DOM 업데이트 최소화
    this.updateRows(start, end, offsetY);
  }

  private updateRows(start: number, end: number, offsetY: number) {
    // Fragment 사용으로 리플로우 최소화
    const fragment = document.createDocumentFragment();
    
    for (let i = start; i < end; i++) {
      const row = this.createRow(i);
      row.style.transform = `translateY(${i * this.rowHeight}px)`;
      fragment.appendChild(row);
    }

    // 한 번에 DOM 업데이트
    this.container.innerHTML = '';
    this.container.appendChild(fragment);
  }
}
```

---

### 2. **Canvas 렌더링** (최고 성능)

```typescript
// src/components/canvas-grid.ts
export class CanvasGrid {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private data: Translation[] = [];
  private cellWidth = 200;
  private cellHeight = 30;
  private scrollX = 0;
  private scrollY = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 스크롤 이벤트
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrollY += e.deltaY;
      this.scrollX += e.deltaX;
      this.render();
    });

    // 클릭 이벤트 (셀 선택)
    this.canvas.addEventListener('click', (e) => {
      const cell = this.getCellFromPoint(e.offsetX, e.offsetY);
      this.selectCell(cell);
    });
  }

  private render() {
    // Canvas 클리어
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 가시 영역만 렌더링
    const visibleRows = this.getVisibleRows();
    const visibleCols = this.getVisibleCols();

    // 배치 렌더링 (성능 최적화)
    this.ctx.save();
    this.ctx.translate(-this.scrollX, -this.scrollY);

    for (const row of visibleRows) {
      for (const col of visibleCols) {
        this.renderCell(row, col);
      }
    }

    this.ctx.restore();
  }

  private renderCell(row: number, col: number) {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cell = this.data[row];

    // 배경
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(x, y, this.cellWidth, this.cellHeight);

    // 텍스트
    this.ctx.fillStyle = '#000';
    this.ctx.font = '14px system-ui';
    this.ctx.fillText(cell?.key || '', x + 4, y + 20);

    // 그리드 라인
    this.ctx.strokeStyle = '#e5e7eb';
    this.ctx.strokeRect(x, y, this.cellWidth, this.cellHeight);
  }

  // RequestAnimationFrame으로 부드러운 렌더링
  private requestRender() {
    requestAnimationFrame(() => this.render());
  }
}
```

---

### 3. **Web Workers로 검색 처리**

```typescript
// src/workers/search.worker.ts
self.onmessage = function(e) {
  const { translations, query } = e.data;

  const lowerQuery = query.toLowerCase();
  const results = translations.filter(t => 
    t.key.toLowerCase().includes(lowerQuery) ||
    Object.values(t.values).some(v => 
      v?.toLowerCase().includes(lowerQuery)
    )
  );

  self.postMessage({ results });
};

// 메인 스레드에서 사용
// src/utils/search.ts
export class SearchWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      new URL('../workers/search.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  search(translations: Translation[], query: string): Promise<Translation[]> {
    return new Promise((resolve) => {
      this.worker.onmessage = (e) => {
        resolve(e.data.results);
      };
      this.worker.postMessage({ translations, query });
    });
  }
}
```

---

### 4. **메모이제이션 및 캐싱**

```typescript
// src/utils/memoize.ts
const cache = new Map<string, any>();

export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// 사용 예시
const filteredData = memoize(
  (translations: Translation[], query: string) => {
    // 필터링 로직
  },
  (translations, query) => `${translations.length}-${query}`
);
```

---

### 5. **디바운싱 및 쓰로틀링**

```typescript
// src/utils/debounce.ts
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 검색 디바운싱
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 150); // 150ms 디바운스
```

---

### 6. **Object Pooling** (메모리 최적화)

```typescript
// src/utils/object-pool.ts
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;

  constructor(createFn: () => T, initialSize: number = 10) {
    this.createFn = createFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  acquire(): T {
    return this.pool.pop() || this.createFn();
  }

  release(obj: T) {
    // 리셋 로직
    this.pool.push(obj);
  }
}

// 사용 예시 (셀 DOM 요소 재사용)
const cellPool = new ObjectPool(() => document.createElement('div'), 100);
```

---

### 7. **Intersection Observer** (가시 영역만 렌더링)

```typescript
// src/utils/intersection-observer.ts
export class VisibilityManager {
  private observer: IntersectionObserver;

  constructor(callback: (visible: boolean) => void) {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          callback(entry.isIntersecting);
        });
      },
      { rootMargin: '50px' } // 50px 미리 로드
    );
  }

  observe(element: HTMLElement) {
    this.observer.observe(element);
  }
}
```

---

## 📊 성능 벤치마크 비교

| 방법 | 1,000행 | 10,000행 | 100,000행 | 메모리 |
|------|---------|----------|-----------|--------|
| **Canvas 직접 구현** | ⚡⚡⚡ | ⚡⚡⚡ | ⚡⚡⚡ | 낮음 |
| **AG Grid (Vanilla)** | ⚡⚡⚡ | ⚡⚡⚡ | ⚡⚡ | 중간 |
| **Handsontable** | ⚡⚡⚡ | ⚡⚡ | ⚡ | 중간 |
| **Lit + 그리드** | ⚡⚡ | ⚡⚡ | ⚡ | 중간 |
| **jQuery 직접 구현** | ⚡ | ❌ | ❌ | 높음 |

---

## 🎯 최종 추천: **Canvas 기반 직접 구현** 또는 **AG Grid**

### 시나리오별 선택

#### **10,000+ 행, 최고 성능 필요**
→ **Canvas 직접 구현** 또는 **AG Grid (Vanilla)**

#### **1,000-10,000 행, 빠른 개발**
→ **AG Grid Community (Vanilla)**

#### **1,000 행 이하, 간단한 기능**
→ **Handsontable (Vanilla)**

---

## 🏗️ 최적화된 아키텍처

```
┌─────────────────────────────────────┐
│  LocaleEditor (Web Component)       │
│  ┌───────────────────────────────┐   │
│  │ Canvas Grid                   │   │
│  │  - 가상 스크롤                │   │
│  │  - 배치 렌더링                │   │
│  │  - RAF 최적화                 │   │
│  └───────────────────────────────┘   │
│  ┌───────────────────────────────┐   │
│  │ Search Worker (Web Worker)    │   │
│  │  - 백그라운드 검색            │   │
│  │  - 메인 스레드 블로킹 없음    │   │
│  └───────────────────────────────┘   │
│  ┌───────────────────────────────┐   │
│  │ State (Zustand 또는 Vanilla)  │   │
│  │  - 메모이제이션               │   │
│  │  - Object Pooling             │   │
│  └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🚀 구현 우선순위

### Phase 1: 기본 Canvas 그리드
1. ✅ Canvas 렌더링 엔진
2. ✅ 가상 스크롤
3. ✅ 셀 선택/편집

### Phase 2: 성능 최적화
1. ✅ RequestAnimationFrame
2. ✅ 배치 렌더링
3. ✅ 메모이제이션

### Phase 3: 고급 기능
1. ✅ Web Workers 검색
2. ✅ Object Pooling
3. ✅ Intersection Observer

---

## 📝 성능 측정 도구

```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string) {
    const start = this.marks.get(startMark);
    if (start) {
      const duration = performance.now() - start;
      console.log(`${name}: ${duration.toFixed(2)}ms`);
      return duration;
    }
  }

  // FPS 측정
  measureFPS(callback: (fps: number) => void) {
    let lastTime = performance.now();
    let frames = 0;

    const tick = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        callback(Math.round((frames * 1000) / (currentTime - lastTime)));
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}
```

---

## 💡 핵심 원칙

1. **DOM 조작 최소화** → Canvas 사용
2. **가상 스크롤 필수** → 보이는 것만 렌더링
3. **Web Workers 활용** → 메인 스레드 블로킹 방지
4. **메모이제이션** → 불필요한 계산 방지
5. **RAF 사용** → 부드러운 애니메이션
6. **배치 업데이트** → 리플로우 최소화

---

## 🎯 결론

**React 없이 최고 성능을 원한다면:**

1. **Canvas 직접 구현** (최고 성능, 복잡)
2. **AG Grid Community (Vanilla)** (균형, 추천 ⭐)
3. **Handsontable (Vanilla)** (빠른 개발)

**추가 최적화:**
- Web Workers (검색)
- 메모이제이션
- Object Pooling
- 가상 스크롤

이렇게 하면 React보다 **더 빠른 성능**을 낼 수 있습니다! 🚀

