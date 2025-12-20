# i18n Translation Editor - 기술 스택 추천

## 🎯 핵심 요구사항
- Excel-like 스프레드시트 에디터
- **빠른 검색** (수천 개의 키)
- 대용량 데이터 처리 (가상 스크롤)
- 실시간 편집 및 저장
- 복사/붙여넣기 지원

---

## ✅ 추천 기술 스택

### 1. **스프레드시트 그리드 라이브러리**

#### 🏆 **@glideapps/glide-data-grid** (이미 설치됨!)
```bash
# 이미 frontend/package.json에 있음
"@glideapps/glide-data-grid": "^6.0.3"
```

**장점:**
- ✅ Excel-like UX (셀 편집, 복사/붙여넣기, 선택)
- ✅ 가상 스크롤 내장 (수만 개 행 처리 가능)
- ✅ TypeScript 지원
- ✅ React 19 호환
- ✅ 커스터마이징 가능 (셀 렌더러, 에디터)
- ✅ 성능 최적화 (렌더링 최소화)

**대안:**
- `ag-Grid Community` (더 많은 기능, 하지만 무거움)
- `TanStack Table` (더 가볍지만 Excel-like UX는 직접 구현 필요)

---

### 2. **빠른 검색 구현**

#### 옵션 A: **하이브리드 접근** (추천 ⭐)

**백엔드: PostgreSQL Full-Text Search**
```typescript
// NestJS 서비스
async searchTranslations(projectId: string, query: string) {
  // GIN 인덱스 사용 (마이그레이션 필요)
  return this.db.query(`
    SELECT * FROM translations
    WHERE project_id = $1
      AND (
        key ILIKE $2
        OR values::text ILIKE $2
        OR to_tsvector('english', key || ' ' || values::text) 
            @@ plainto_tsquery('english', $2)
      )
    ORDER BY ts_rank(...) DESC
    LIMIT 100
  `, [projectId, `%${query}%`]);
}
```

**프론트엔드: 클라이언트 사이드 필터링 (빠른 반응)**
```typescript
// TanStack Query로 서버 데이터 캐싱
const { data } = useQuery({
  queryKey: ['translations', projectId],
  queryFn: () => fetchAllTranslations(projectId),
  staleTime: 5 * 60 * 1000, // 5분 캐시
});

// 클라이언트에서 즉시 필터링
const filtered = useMemo(() => {
  if (!searchQuery) return data;
  return data.filter(item => 
    item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    Object.values(item.values).some(v => 
      v?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
}, [data, searchQuery]);
```

**장점:**
- ✅ 타이핑 시 즉시 반응 (클라이언트 필터)
- ✅ 서버 검색으로 정확한 결과 (긴 쿼리)
- ✅ 캐싱으로 네트워크 요청 최소화

---

#### 옵션 B: **Fuse.js** (클라이언트 전용, 소규모 데이터)

```bash
pnpm add fuse.js
```

```typescript
import Fuse from 'fuse.js';

const fuse = new Fuse(translations, {
  keys: ['key', 'values.en', 'values.ko', 'context'],
  threshold: 0.3, // 유사도
  includeScore: true,
});

const results = fuse.search(searchQuery);
```

**장점:**
- ✅ 퍼지 검색 (오타 허용)
- ✅ 가벼움
- ✅ 서버 요청 없음

**단점:**
- ❌ 대용량 데이터(10,000+ 키)에서는 느림
- ❌ 메모리 사용량 증가

---

#### 옵션 C: **Minisearch** (클라이언트 전용, 중간 규모)

```bash
pnpm add minisearch
```

```typescript
import MiniSearch from 'minisearch';

const search = new MiniSearch({
  fields: ['key', 'values'],
  storeFields: ['id', 'key', 'values', 'context'],
});

search.addAll(translations);
const results = search.search(searchQuery);
```

**장점:**
- ✅ Fuse.js보다 빠름
- ✅ 인덱싱으로 검색 속도 향상

**단점:**
- ❌ 매우 큰 데이터셋에서는 여전히 제한적

---

### 3. **상태 관리**

#### **TanStack Query** (이미 설치됨) + **Zustand** (이미 설치됨)

```typescript
// Zustand: 로컬 편집 상태 (dirty cells)
const useEditorStore = create((set) => ({
  dirtyCells: new Map<string, { key: string; lang: string; value: string }>(),
  addDirtyCell: (id, lang, value) => set((state) => ({
    dirtyCells: new Map(state.dirtyCells).set(`${id}-${lang}`, { id, lang, value })
  })),
  clearDirtyCells: () => set({ dirtyCells: new Map() }),
}));

// TanStack Query: 서버 데이터
const { data, mutate } = useMutation({
  mutationFn: saveTranslations,
  onSuccess: () => {
    queryClient.invalidateQueries(['translations', projectId]);
    useEditorStore.getState().clearDirtyCells();
  },
});
```

---

### 4. **가상 스크롤**

**@glideapps/glide-data-grid**에 내장되어 있음! 별도 라이브러리 불필요.

```typescript
<DataEditor
  getCellContent={getCellContent}
  columns={columns}
  rows={filteredData.length}
  // 자동으로 가상 스크롤 처리됨
/>
```

---

### 5. **검색 성능 최적화**

#### 백엔드: PostgreSQL 인덱스 추가

```sql
-- 마이그레이션 파일
CREATE INDEX idx_translations_key_search 
ON translations USING gin(to_tsvector('english', key));

CREATE INDEX idx_translations_values_search 
ON translations USING gin(to_tsvector('english', values::text));

-- 또는 단순 LIKE 검색용
CREATE INDEX idx_translations_key_lower 
ON translations(lower(key));
```

#### 프론트엔드: 디바운싱

```typescript
import { useDeferredValue } from 'react';

const [searchQuery, setSearchQuery] = useState('');
const deferredQuery = useDeferredValue(searchQuery); // React 18+

// 또는 lodash.debounce (이미 설치됨)
import { debounce } from 'lodash';
const debouncedSearch = debounce((query) => {
  // 서버 검색
}, 300);
```

---

## 📦 필요한 추가 패키지

```bash
cd frontend
pnpm add fuse.js  # 선택사항 (클라이언트 검색이 필요하면)
# 또는
pnpm add minisearch  # 선택사항
```

**이미 있는 것들:**
- ✅ `@glideapps/glide-data-grid` - 그리드
- ✅ `@tanstack/react-query` - 서버 상태
- ✅ `zustand` - 로컬 상태
- ✅ `lodash` - 유틸리티 (debounce 등)

---

## 🏗️ 아키텍처 제안

```
┌─────────────────────────────────────────┐
│  TranslationEditorPage                  │
│  ┌───────────────────────────────────┐  │
│  │ SearchBar (debounced)             │  │
│  │  → 클라이언트 필터 (즉시)          │  │
│  │  → 서버 검색 (긴 쿼리)             │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ GlideDataGrid                     │  │
│  │  - 가상 스크롤 (자동)              │  │
│  │  - 셀 편집                         │  │
│  │  - 복사/붙여넣기                   │  │
│  │  → Zustand (dirty cells)          │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ SaveButton (Cmd+S)                │  │
│  │  → TanStack Query Mutation        │  │
│  │  → 배치 업데이트 (PATCH)           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🚀 구현 우선순위

### Phase 1: 기본 그리드
1. ✅ `@glideapps/glide-data-grid` 설정
2. ✅ 컬럼: Key, Context, Language columns
3. ✅ 기본 데이터 로딩 (TanStack Query)

### Phase 2: 검색
1. ✅ 클라이언트 사이드 필터링 (즉시 반응)
2. ✅ 디바운싱된 서버 검색 (긴 쿼리)
3. ✅ PostgreSQL 인덱스 추가

### Phase 3: 편집
1. ✅ 인라인 셀 편집
2. ✅ Dirty 상태 추적 (Zustand)
3. ✅ 배치 저장 (Cmd+S)

### Phase 4: 고급 기능
1. ✅ 복사/붙여넣기 (CSV)
2. ✅ 히스토리 뷰 (Pro+)
3. ✅ 권한 체크 (viewer = read-only)

---

## 📊 성능 목표

- **검색 응답 시간**: < 100ms (클라이언트 필터)
- **서버 검색**: < 500ms (10,000개 키 기준)
- **스크롤 FPS**: 60fps (가상 스크롤)
- **초기 로딩**: < 2초 (페이지네이션 또는 부분 로딩)

---

## 🔍 검색 전략 비교

| 방법 | 속도 | 메모리 | 정확도 | 추천 시나리오 |
|------|------|--------|--------|--------------|
| **클라이언트 필터** | ⚡⚡⚡ | 중간 | 중간 | 타이핑 즉시 반응 |
| **PostgreSQL FTS** | ⚡⚡ | 낮음 | 높음 | 긴 쿼리, 정확한 검색 |
| **Fuse.js** | ⚡ | 높음 | 높음 | 소규모 (< 5,000 키) |
| **Minisearch** | ⚡⚡ | 중간 | 높음 | 중규모 (< 20,000 키) |

**최종 추천: 하이브리드 (클라이언트 필터 + 서버 FTS)**

---

## 📝 다음 단계

1. `localeEditor` 폴더에 React 컴포넌트 생성
2. `@glideapps/glide-data-grid` 기본 설정
3. TanStack Query로 번역 데이터 페칭
4. 검색 바 구현 (클라이언트 필터)
5. 백엔드에 검색 엔드포인트 추가 (선택)

