# jQuery vs htmx vs 대안 - Excel-like 에디터 관점

## 🎯 요구사항
- **React 없이** 구현
- Excel-like 스프레드시트 (셀 편집, 복사/붙여넣기, 가상 스크롤)
- 빠른 검색
- Vite + Tailwind 사용

---

## 📊 jQuery vs htmx 비교

### jQuery

**장점:**
- ✅ DOM 조작이 쉬움
- ✅ 이벤트 핸들링 편리
- ✅ 널리 사용됨, 문서 풍부
- ✅ 플러그인 생태계

**단점:**
- ❌ **Excel-like 그리드를 직접 구현해야 함** (가상 스크롤, 셀 편집 등)
- ❌ 상태 관리가 어려움 (전역 변수 남발)
- ❌ 복잡한 UI 로직이 스파게티 코드가 되기 쉬움
- ❌ TypeScript와의 통합이 불편
- ❌ 번들 크기: ~30KB (gzip)

**적합성: ⚠️ 낮음**
- Excel-like 그리드는 매우 복잡한 기능 (가상 스크롤, 셀 선택, 복사/붙여넣기, 키보드 네비게이션)
- jQuery만으로는 구현이 어렵고, 그리드 라이브러리와 함께 써야 함

---

### htmx

**장점:**
- ✅ 서버 중심적 (간단한 CRUD에 적합)
- ✅ HTML만으로 인터랙션
- ✅ 경량 (~10KB)
- ✅ 서버 렌더링과 잘 맞음

**단점:**
- ❌ **클라이언트 사이드 복잡한 상호작용에 부적합**
- ❌ Excel-like 그리드 (셀 편집, 복사/붙여넣기) 구현 불가능
- ❌ 가상 스크롤 불가능 (서버에서 HTML을 받아야 함)
- ❌ 실시간 검색 필터링 어려움
- ❌ 키보드 네비게이션 직접 구현 필요

**적합성: ❌ 매우 낮음**
- htmx는 서버 중심적이고, Excel-like 에디터는 클라이언트 사이드 복잡한 상호작용이 필수

---

## 🏆 더 나은 대안

### 옵션 1: **Vanilla JS + 전용 그리드 라이브러리** ⭐ (추천)

#### **Handsontable** (Vanilla JS 지원)
```bash
pnpm add handsontable
```

**장점:**
- ✅ React 없이 사용 가능 (Vanilla JS)
- ✅ Excel-like 기능 완비 (셀 편집, 복사/붙여넣기, 가상 스크롤)
- ✅ TypeScript 지원
- ✅ 성능 최적화
- ✅ 커스터마이징 가능

**단점:**
- ❌ 상업용은 유료 (Community 버전은 제한적)
- ❌ 번들 크기: ~200KB

**예시:**
```typescript
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

const container = document.getElementById('editor');
const hot = new Handsontable(container, {
  data: translations,
  columns: [
    { data: 'key', readOnly: true },
    { data: 'values.en' },
    { data: 'values.ko' },
  ],
  licenseKey: 'non-commercial-and-evaluation',
});
```

---

#### **AG Grid Community** (Vanilla JS 지원)
```bash
pnpm add ag-grid-community
```

**장점:**
- ✅ React 없이 사용 가능
- ✅ 매우 강력한 기능
- ✅ 가상 스크롤 내장
- ✅ 무료 (Community 버전)

**단점:**
- ❌ 번들 크기: ~300KB
- ❌ 설정이 복잡함

---

### 옵션 2: **Lit (Web Components)** ⭐⭐ (강력 추천)

```bash
pnpm add lit
```

**장점:**
- ✅ **React 없음** (Web Components 기반)
- ✅ 경량 (~15KB)
- ✅ 반응형 상태 관리 내장
- ✅ TypeScript 우수 지원
- ✅ 프레임워크 독립적 (어디서든 사용 가능)
- ✅ Vite와 완벽 호환

**단점:**
- ⚠️ 그리드 라이브러리를 직접 통합해야 함 (Lit로 래핑)

**예시:**
```typescript
import { LitElement, html, css } from 'lit';
import { state } from 'lit/decorators.js';
import Handsontable from 'handsontable';

export class LocaleEditor extends LitElement {
  @state() translations = [];

  firstUpdated() {
    const container = this.shadowRoot.querySelector('#grid');
    this.hot = new Handsontable(container, {
      data: this.translations,
      // ...
    });
  }

  render() {
    return html`
      <div id="grid"></div>
    `;
  }
}
customElements.define('locale-editor', LocaleEditor);
```

---

### 옵션 3: **Alpine.js + 그리드 라이브러리**

```bash
pnpm add alpinejs
```

**장점:**
- ✅ 매우 경량 (~15KB)
- ✅ HTML에 직접 선언적 바인딩
- ✅ React 없음

**단점:**
- ❌ 복잡한 컴포넌트 로직에는 부적합
- ❌ 그리드 라이브러리와의 통합이 어색할 수 있음

---

### 옵션 4: **순수 Vanilla JS + Canvas/WebGL** (최고 성능)

**장점:**
- ✅ 최고 성능 (수만 개 행 처리)
- ✅ 완전한 제어

**단점:**
- ❌ 구현 복잡도 매우 높음
- ❌ 개발 시간 오래 걸림

---

## 🎯 최종 추천: **Lit + Handsontable/AG Grid**

### 이유:
1. ✅ **React 없음** (요구사항 충족)
2. ✅ **Vite + Tailwind** 사용 가능
3. ✅ **전용 그리드 라이브러리**로 Excel-like 기능 구현
4. ✅ **Web Components**로 프론트엔드와 완전 분리
5. ✅ **TypeScript** 완벽 지원
6. ✅ **경량** (Lit ~15KB + 그리드)

---

## 📦 추천 스택 (최종)

```json
{
  "dependencies": {
    "lit": "^3.1.0",
    "handsontable": "^15.0.0",  // 또는 "ag-grid-community": "^32.0.0"
    "zustand": "^5.0.9"  // 상태 관리 (선택)
  },
  "devDependencies": {
    "vite": "^7.2.7",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.9.3"
  }
}
```

---

## 🏗️ 아키텍처 예시 (Lit + Handsontable)

```typescript
// src/components/locale-editor.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

@customElement('locale-editor')
export class LocaleEditor extends LitElement {
  @property({ type: Array }) translations = [];
  @property({ type: Array }) languages = [];
  @property({ type: String }) defaultLanguage = 'en';
  @property({ type: Boolean }) readOnly = false;

  @state() private hot: Handsontable | null = null;
  @state() private searchQuery = '';

  static styles = css`
    :host {
      display: block;
    }
    #grid {
      width: 100%;
      height: 600px;
    }
  `;

  firstUpdated() {
    this.initGrid();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('translations') && this.hot) {
      this.hot.loadData(this.prepareData());
    }
    if (changedProperties.has('searchQuery')) {
      this.filterData();
    }
  }

  private initGrid() {
    const container = this.shadowRoot?.querySelector('#grid') as HTMLElement;
    if (!container) return;

    this.hot = new Handsontable(container, {
      data: this.prepareData(),
      columns: this.prepareColumns(),
      licenseKey: 'non-commercial-and-evaluation',
      readOnly: this.readOnly,
      afterChange: (changes) => {
        if (changes) {
          this.handleCellChange(changes);
        }
      },
    });
  }

  private prepareData() {
    return this.translations.map(t => ({
      key: t.key,
      context: t.context || '',
      ...Object.fromEntries(
        this.languages.map(lang => [lang, t.values[lang] || ''])
      ),
    }));
  }

  private prepareColumns() {
    return [
      { data: 'key', readOnly: true, width: 200 },
      { data: 'context', readOnly: true, width: 150 },
      ...this.languages.map(lang => ({
        data: lang,
        readOnly: this.readOnly,
      })),
    ];
  }

  private handleCellChange(changes: Handsontable.CellChange[]) {
    // 변경사항 처리
    this.dispatchEvent(new CustomEvent('cell-change', {
      detail: { changes },
    }));
  }

  private filterData() {
    // 검색 필터링 로직
  }

  render() {
    return html`
      <div id="grid"></div>
    `;
  }
}
```

---

## 🔍 검색 구현 (Vanilla JS)

```typescript
// src/utils/search.ts
export function filterTranslations(
  translations: Translation[],
  query: string
): Translation[] {
  if (!query) return translations;

  const lowerQuery = query.toLowerCase();
  return translations.filter(t => 
    t.key.toLowerCase().includes(lowerQuery) ||
    Object.values(t.values).some(v => 
      v?.toLowerCase().includes(lowerQuery)
    )
  );
}

// 디바운싱
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
```

---

## 📊 성능 비교

| 방법 | 번들 크기 | 학습 곡선 | Excel 기능 | 추천도 |
|------|-----------|-----------|------------|--------|
| **jQuery** | ~30KB | 낮음 | 직접 구현 필요 | ⚠️ |
| **htmx** | ~10KB | 낮음 | 불가능 | ❌ |
| **Lit + Handsontable** | ~215KB | 중간 | ✅ 완비 | ⭐⭐⭐ |
| **Lit + AG Grid** | ~315KB | 중간 | ✅ 완비 | ⭐⭐⭐ |
| **Vanilla JS + Canvas** | ~50KB | 높음 | 직접 구현 | ⭐ |

---

## 🚀 다음 단계

1. **Lit 프로젝트 초기화**
2. **Handsontable 또는 AG Grid 통합**
3. **Vite + Tailwind 설정**
4. **검색 기능 구현**
5. **Web Component로 빌드**

---

## 💡 결론

**jQuery vs htmx?** → **둘 다 부적합**

**대신:**
- ✅ **Lit (Web Components)** + **Handsontable/AG Grid**
- ✅ React 없음 ✅ Vite ✅ Tailwind ✅ Excel-like 기능

이 조합이 Excel-like 에디터를 만들기에 가장 적합합니다.

