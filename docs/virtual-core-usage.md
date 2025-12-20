# Virtual Core 사용 가이드

이 문서는 프로젝트 내부에 포함된 `virtual-core` 라이브러리(`@tanstack/virtual-core` 포크)의 사용법을 설명합니다.

## 목차

1. [개요](#개요)
2. [기본 개념](#기본-개념)
3. [Virtualizer 클래스](#virtualizer-클래스)
4. [주요 API](#주요-api)
5. [사용 예제](#사용-예제)
6. [옵션 설명](#옵션-설명)
7. [주요 메서드](#주요-메서드)
8. [VirtualTable에서의 사용 예제](#virtualtable에서의-사용-예제)

## 개요

`virtual-core`는 대량의 데이터를 효율적으로 렌더링하기 위한 가상 스크롤링 라이브러리입니다. 실제로 보이는 영역(viewport)에 해당하는 아이템만 DOM에 렌더링하여 성능을 최적화합니다.

**장점:**
- 대량의 데이터(수천, 수만 개)를 부드럽게 스크롤 가능
- DOM 노드 수를 최소화하여 메모리 사용량 감소
- 스크롤 성능 향상

## 기본 개념

### VirtualItem

가상 아이템은 실제로 렌더링되어야 하는 아이템의 위치 정보를 담고 있습니다.

```typescript
interface VirtualItem {
  key: Key              // 아이템의 고유 키
  index: number         // 아이템의 인덱스
  start: number         // 아이템의 시작 위치 (px)
  end: number           // 아이템의 끝 위치 (px)
  size: number          // 아이템의 크기 (px)
  lane: number          // 다중 레인(multi-lane) 레이아웃에서의 레인 번호
}
```

### Virtualizer

`Virtualizer` 클래스는 가상 스크롤링의 핵심입니다. 스크롤 위치와 뷰포트 크기를 관찰하여 현재 보여야 할 아이템들을 계산합니다.

## Virtualizer 클래스

### 생성자

```typescript
import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from '@/virtual-core/index';

const virtualizer = new Virtualizer<HTMLElement, HTMLDivElement>({
  count: 1000,                    // 전체 아이템 수
  getScrollElement: () => scrollContainer,
  estimateSize: (index) => 50,    // 각 아이템의 예상 크기 (px)
  scrollToFn: elementScroll,
  observeElementRect: observeElementRect,
  observeElementOffset: observeElementOffset,
  onChange: (instance, sync) => {
    // 변경 사항 발생 시 호출됨
    renderItems();
  },
});
```

### 필수 옵션

1. **count**: 전체 아이템의 개수
2. **getScrollElement**: 스크롤 컨테이너를 반환하는 함수
3. **estimateSize**: 각 아이템의 예상 크기를 반환하는 함수
4. **scrollToFn**: 스크롤 이동 함수 (`elementScroll` 또는 `windowScroll`)
5. **observeElementRect**: 뷰포트 크기 관찰 함수 (`observeElementRect` 또는 `observeWindowRect`)
6. **observeElementOffset**: 스크롤 위치 관찰 함수 (`observeElementOffset` 또는 `observeWindowOffset`)

## 주요 API

### getVirtualItems()

현재 뷰포트에 표시되어야 하는 가상 아이템들의 배열을 반환합니다.

```typescript
const virtualItems = virtualizer.getVirtualItems();

virtualItems.forEach((item) => {
  // item.index: 원본 데이터 배열의 인덱스
  // item.start: 렌더링 위치 (top 또는 left, px)
  // item.size: 아이템 크기 (px)
  // item.end: 아이템 끝 위치 (px)
});
```

### getTotalSize()

전체 가상 리스트의 전체 크기를 반환합니다 (px). 이 값은 spacer 요소의 높이/너비 설정에 사용됩니다.

```typescript
const totalSize = virtualizer.getTotalSize();
// 예: 1000개 아이템 × 50px = 50000px
```

### measureElement()

아이템 요소의 실제 크기를 측정하여 Virtualizer에 알립니다. 동적 크기 아이템의 경우 필수입니다.

```typescript
// DOM 요소를 측정
virtualizer.measureElement(element);

// null을 전달하면 연결되지 않은 요소들을 정리
virtualizer.measureElement(null);
```

### scrollToIndex()

특정 인덱스로 스크롤합니다.

```typescript
virtualizer.scrollToIndex(500, {
  align: 'start',      // 'start' | 'center' | 'end' | 'auto'
  behavior: 'smooth',  // 'auto' | 'smooth'
});
```

### scrollToOffset()

특정 오프셋(px)으로 스크롤합니다.

```typescript
virtualizer.scrollToOffset(1000, {
  align: 'start',
  behavior: 'smooth',
});
```

## 사용 예제

### 기본 예제: 수직 리스트

```typescript
import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from '@/virtual-core/index';

const container = document.getElementById('container')!;
const scrollElement = document.createElement('div');
scrollElement.style.height = '600px';
scrollElement.style.overflow = 'auto';
container.appendChild(scrollElement);

const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`,
}));

const virtualizer = new Virtualizer<HTMLElement, HTMLDivElement>({
  count: items.length,
  getScrollElement: () => scrollElement,
  estimateSize: () => 50,
  scrollToFn: elementScroll,
  observeElementRect: observeElementRect,
  observeElementOffset: observeElementOffset,
  onChange: () => {
    renderItems();
  },
});

function renderItems() {
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  
  scrollElement.innerHTML = '';
  
  // 가상 아이템 렌더링
  virtualItems.forEach((item) => {
    const element = document.createElement('div');
    element.textContent = items[item.index].text;
    element.style.position = 'absolute';
    element.style.top = `${item.start}px`;
    element.style.height = `${item.size}px`;
    element.style.width = '100%';
    element.setAttribute('data-index', item.index.toString());
    scrollElement.appendChild(element);
    
    // 요소 크기 측정
    virtualizer.measureElement(element);
  });
  
  // Spacer 추가 (전체 높이 유지)
  const spacer = document.createElement('div');
  spacer.style.height = `${totalSize}px`;
  spacer.setAttribute('aria-hidden', 'true');
  scrollElement.appendChild(spacer);
}

// 초기 렌더링
renderItems();
```

### 수평 리스트

```typescript
const virtualizer = new Virtualizer<HTMLElement, HTMLDivElement>({
  count: items.length,
  getScrollElement: () => scrollElement,
  estimateSize: () => 200,
  horizontal: true,  // 수평 스크롤 활성화
  scrollToFn: elementScroll,
  observeElementRect: observeElementRect,
  observeElementOffset: observeElementOffset,
  onChange: () => {
    renderItems();
  },
});

function renderItems() {
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  
  virtualItems.forEach((item) => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = `${item.start}px`;  // top 대신 left 사용
    element.style.width = `${item.size}px`;  // height 대신 width 사용
    // ...
  });
  
  // Spacer
  const spacer = document.createElement('div');
  spacer.style.width = `${totalSize}px`;  // height 대신 width 사용
  // ...
}
```

## 옵션 설명

### 필수 옵션

| 옵션 | 타입 | 설명 |
|------|------|------|
| `count` | `number` | 전체 아이템의 개수 |
| `getScrollElement` | `() => TScrollElement \| null` | 스크롤 컨테이너를 반환하는 함수 |
| `estimateSize` | `(index: number) => number` | 각 아이템의 예상 크기 (px) |
| `scrollToFn` | `Function` | 스크롤 이동 함수 (`elementScroll` 또는 `windowScroll`) |
| `observeElementRect` | `Function` | 뷰포트 크기 관찰 함수 (`observeElementRect` 또는 `observeWindowRect`) |
| `observeElementOffset` | `Function` | 스크롤 위치 관찰 함수 (`observeElementOffset` 또는 `observeWindowOffset`) |

### 선택 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `onChange` | `(instance, sync) => void` | `() => {}` | 변경 사항 발생 시 호출되는 콜백 |
| `overscan` | `number` | `1` | 뷰포트 밖에 렌더링할 추가 아이템 수 (성능 최적화용) |
| `horizontal` | `boolean` | `false` | 수평 스크롤 모드 활성화 |
| `paddingStart` | `number` | `0` | 시작 부분 패딩 (px) |
| `paddingEnd` | `number` | `0` | 끝 부분 패딩 (px) |
| `gap` | `number` | `0` | 아이템 간 간격 (px) |
| `initialOffset` | `number \| (() => number)` | `0` | 초기 스크롤 오프셋 |
| `getItemKey` | `(index: number) => Key` | `(i) => i` | 아이템의 고유 키 생성 함수 |
| `indexAttribute` | `string` | `'data-index'` | DOM 요소에 인덱스를 저장할 속성명 |
| `enabled` | `boolean` | `true` | 가상 스크롤링 활성화 여부 |
| `lanes` | `number` | `1` | 다중 레인 레이아웃에서의 레인 수 (예: 그리드 레이아웃) |
| `debug` | `boolean` | `false` | 디버그 모드 활성화 (콘솔 로그 출력) |

## 주요 메서드

### getVirtualItems(): VirtualItem[]

현재 뷰포트에 표시되어야 하는 가상 아이템들의 배열을 반환합니다.

### getTotalSize(): number

전체 가상 리스트의 전체 크기를 반환합니다 (px).

### measureElement(element: TItemElement | null | undefined): void

아이템 요소의 실제 크기를 측정합니다. 동적 크기 아이템의 경우 필수입니다.

### scrollToIndex(index: number, options?: ScrollToIndexOptions): void

특정 인덱스로 스크롤합니다.

```typescript
interface ScrollToIndexOptions {
  align?: 'start' | 'center' | 'end' | 'auto';
  behavior?: 'auto' | 'smooth';
}
```

### scrollToOffset(offset: number, options?: ScrollToOffsetOptions): void

특정 오프셋(px)으로 스크롤합니다.

```typescript
interface ScrollToOffsetOptions {
  align?: 'start' | 'center' | 'end' | 'auto';
  behavior?: 'auto' | 'smooth';
}
```

### scrollBy(delta: number, options?: ScrollToOffsetOptions): void

현재 스크롤 위치에서 상대적으로 스크롤합니다.

```typescript
virtualizer.scrollBy(100);  // 100px 아래로 스크롤
virtualizer.scrollBy(-100); // 100px 위로 스크롤
```

### getOffsetForIndex(index: number, align?: ScrollAlignment): [number, ScrollAlignment] | undefined

특정 인덱스의 스크롤 오프셋을 계산합니다. 직접 스크롤하지 않고 오프셋만 계산합니다.

### setOptions(options: Partial<VirtualizerOptions>): void

옵션을 동적으로 업데이트합니다.

## VirtualTable에서의 사용 예제

현재 프로젝트의 `VirtualTable` 컴포넌트에서 사용하는 방법:

```typescript
import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@/virtual-core/index";

export class VirtualTable {
  private rowVirtualizer: Virtualizer<HTMLElement, HTMLTableRowElement> | null = null;

  private initVirtualScrolling(): void {
    if (!this.scrollElement || !this.bodyElement) return;

    this.rowVirtualizer = new Virtualizer<HTMLElement, HTMLTableRowElement>({
      count: this.options.translations.length,        // 전체 행 수
      getScrollElement: () => this.scrollElement,     // 스크롤 컨테이너
      estimateSize: () => this.rowHeight,             // 예상 행 높이
      scrollToFn: elementScroll,                      // 요소 스크롤 함수
      observeElementRect: observeElementRect,         // 뷰포트 크기 관찰
      observeElementOffset: observeElementOffset,     // 스크롤 위치 관찰
      onChange: () => {
        this.renderVirtualRows();                     // 변경 시 재렌더링
      },
    });

    // 초기 렌더링
    this.renderVirtualRows();
  }

  private renderVirtualRows(): void {
    if (!this.rowVirtualizer || !this.bodyElement) return;

    const virtualItems = this.rowVirtualizer.getVirtualItems();
    const totalSize = this.rowVirtualizer.getTotalSize();

    // 기존 행 제거
    this.bodyElement.innerHTML = '';

    // 가상 아이템 렌더링
    virtualItems.forEach((virtualItem) => {
      const translation = this.options.translations[virtualItem.index];
      const row = this.createRow(translation, virtualItem.index);

      // 절대 위치 설정
      row.style.position = 'absolute';
      row.style.top = `${virtualItem.start}px`;
      row.style.height = `${virtualItem.size}px`;
      row.setAttribute('data-index', virtualItem.index.toString());

      this.bodyElement.appendChild(row);

      // 요소 크기 측정 (동적 크기 대응)
      this.rowVirtualizer.measureElement(row);
    });

    // Spacer 추가 (전체 높이 유지)
    if (virtualItems.length > 0) {
      const lastItem = virtualItems[virtualItems.length - 1]!;
      const remainingHeight = Math.max(0, totalSize - lastItem.end);
      if (remainingHeight > 0) {
        const spacer = document.createElement('tr');
        spacer.style.height = `${remainingHeight}px`;
        spacer.setAttribute('aria-hidden', 'true');
        spacer.style.visibility = 'hidden';
        this.bodyElement.appendChild(spacer);
      }
    }
  }
}
```

## 주의사항

1. **data-index 속성 필수**: DOM 요소에는 반드시 `data-index` 속성(또는 `indexAttribute`로 지정한 속성)을 설정해야 합니다. 이를 통해 Virtualizer가 요소와 인덱스를 매칭합니다.

2. **measureElement 호출**: 동적 크기 아이템의 경우 `measureElement`를 호출하여 실제 크기를 측정해야 합니다.

3. **Spacer 추가**: 전체 높이를 유지하기 위해 spacer 요소를 추가해야 합니다. 이렇게 해야 스크롤바가 올바르게 작동합니다.

4. **절대 위치 사용**: 가상 아이템들은 `position: absolute`를 사용하여 배치해야 합니다.

5. **onChange 콜백**: `onChange` 콜백에서 `getVirtualItems()`를 호출하여 렌더링을 업데이트해야 합니다.

## 참고

- 원본 라이브러리: [@tanstack/virtual-core](https://github.com/TanStack/virtual)
- 현재 프로젝트에서는 내부 모듈로 포함되어 있음 (`src/virtual-core/`)

