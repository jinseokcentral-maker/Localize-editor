# WASM 성능 분석 및 활용 방안

## 📊 현재 parsing 프로젝트 분석

### 제공 기능

1. **CSV/Excel 파싱**
   - `parse_csv()` - CSV → JSON 변환
   - `parse_excel()` - Excel → JSON 변환
   - 성능: JavaScript 대비 **4-5배 빠름** (5000줄 기준)

2. **데이터 변환**
   - `jsons_to_csv()` - 여러 JSON 파일 → CSV 병합
   - `jsons_to_table()` - 여러 JSON 파일 → 테이블 형식
   - `excel_to_csv()` - Excel → CSV 변환

3. **헤더 추출**
   - `get_csv_languages()` - CSV 헤더에서 언어 목록 추출
   - `get_excel_languages()` - Excel 헤더에서 언어 목록 추출

### 성능 특성

- **Rust 기반**: 네이티브 성능
- **메모리 효율적**: 스트리밍 처리 가능
- **병렬 처리**: Rust의 동시성 활용 가능

---

## 🎯 localeEditor 성능 요구사항

### 현재 목표
- **검색 필터링**: < 50ms (클라이언트)
- **초기 렌더링**: < 100ms (1,000개 행)
- **스크롤 FPS**: 60fps
- **셀 편집 반응**: < 16ms

### 병목 지점 분석

1. **검색 필터링** (현재: JavaScript)
   - 10,000개 행 기준: ~50-100ms
   - 대용량 데이터에서 느림

2. **데이터 변환** (Import/Export)
   - CSV/Excel → Translation[] 변환
   - Translation[] → CSV/Excel 변환

3. **정렬/필터링** (AG Grid 내장)
   - AG Grid가 처리하지만, 대용량에서는 느릴 수 있음

---

## 💡 WASM 활용 방안 재검토

### ❌ Import/Export는 외부에서 처리

**사용자 요구사항:**
- Import/Export는 localeEditor 프로젝트 밖에서 처리
- Export는 데이터를 밖에서 쓸 수 있도록만 전달

**결과:**
- localeEditor는 순수 에디터 기능에만 집중
- WASM 활용 영역 없음

### 기존 분석 (참고용)

#### 1. **Import/Export 성능 향상** (외부에서 처리하므로 불필요)

**현재 상황:**
- CSV/Excel 파일을 JavaScript로 파싱
- 대용량 파일(10,000+ 행)에서 느림

**WASM 활용:**
```typescript
// src/utils/import-export.ts
import init, { parse_csv, parse_excel, jsons_to_csv } from '../../parsing/pkg/parsing';

// CSV/Excel → Translation[] 변환 (WASM 사용)
export async function importFromFile(file: File): Promise<Translation[]> {
  await init();
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const jsonStr = isExcel
    ? parse_excel(data, '.', false, true)
    : parse_csv(data, '.', false, true);
  
  const parsed = JSON.parse(jsonStr);
  return convertToTranslations(parsed);
}

// Translation[] → CSV 변환 (WASM 사용)
export async function exportToCSV(translations: Translation[]): Promise<string> {
  await init();
  
  // Translation[] → JSON 형식으로 변환
  const langJsons = groupByLanguage(translations);
  const inputs = langJsons.map(lang => ({
    language: lang.code,
    content: JSON.stringify(lang.data)
  }));
  
  return jsons_to_csv(JSON.stringify(inputs), '.');
}
```

**성능 향상:**
- 10,000행 CSV 파싱: JavaScript ~250ms → WASM ~40ms (**6배 빠름**)
- Export도 동일한 성능 향상

---

#### 2. **검색 필터링** ⚠️ (신중 검토 필요)

**현재 상황:**
- JavaScript로 클라이언트 필터링
- 10,000개 행 기준 ~50ms

**WASM 활용 가능성:**
- ❌ **추천하지 않음**
- 이유:
  1. **AG Grid가 이미 최적화됨**: 내장 필터링이 충분히 빠름
  2. **WASM 오버헤드**: 작은 데이터셋에서는 JavaScript가 더 빠를 수 있음
  3. **복잡도 증가**: WASM 로딩, 메모리 관리 등 추가 복잡도
  4. **실시간 필터링**: 타이핑 시 즉각 반응이 필요한데, WASM은 초기 로딩 필요

**대안:**
- AG Grid의 내장 필터 사용
- Web Workers로 백그라운드 검색 (필요시)

---

#### 3. **정렬/필터링** ❌ (불필요)

**이유:**
- AG Grid가 이미 최적화된 정렬/필터링 제공
- WASM으로 구현해도 성능 향상 미미

---

### ❌ 새로운 WASM 프로젝트 필요성

**결론: 필요 없음**

**이유:**
1. **기존 parsing 프로젝트로 충분**: Import/Export 성능 향상에 집중
2. **검색/정렬은 AG Grid가 처리**: 추가 최적화 불필요
3. **개발 비용 대비 효과 낮음**: 새로운 WASM 프로젝트 개발 시간이 오래 걸림

---

## 🚀 구현 계획

### Phase 1: Import/Export WASM 통합 (우선순위 높음)

#### Step 1: WASM 모듈 통합
```typescript
// src/utils/wasm-loader.ts
let wasmInitialized = false;

export async function initWasm(): Promise<void> {
  if (wasmInitialized) return;
  
  const wasmModule = await import('../../parsing/pkg/parsing');
  await wasmModule.default();
  wasmInitialized = true;
}
```

#### Step 2: Import 함수 구현
```typescript
// src/utils/import.ts
import { Effect } from 'effect';
import { initWasm } from './wasm-loader';
import { parse_csv, parse_excel } from '../../parsing/pkg/parsing';

class ImportError extends Data.TaggedError("ImportError")<{
  readonly message: string;
}> {}

export const importFromFile = (file: File) =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () => initWasm(),
      catch: () => new ImportError({ message: "Failed to initialize WASM" })
    });
    
    const buffer = yield* Effect.tryPromise({
      try: () => file.arrayBuffer(),
      catch: () => new ImportError({ message: "Failed to read file" })
    });
    
    const data = new Uint8Array(buffer);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    const jsonStr = yield* Effect.try({
      try: () => isExcel
        ? parse_excel(data, '.', false, true)
        : parse_csv(data, '.', false, true),
      catch: () => new ImportError({ message: "Failed to parse file" })
    });
    
    const parsed = yield* Effect.try({
      try: () => JSON.parse(jsonStr),
      catch: () => new ImportError({ message: "Invalid JSON output" })
    });
    
    return convertToTranslations(parsed);
  });
```

#### Step 3: Export 함수 구현
```typescript
// src/utils/export.ts
import { Effect } from 'effect';
import { initWasm } from './wasm-loader';
import { jsons_to_csv } from '../../parsing/pkg/parsing';

export const exportToCSV = (translations: Translation[]) =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: () => initWasm(),
      catch: () => new ExportError({ message: "Failed to initialize WASM" })
    });
    
    const langJsons = groupByLanguage(translations);
    const inputs = langJsons.map(lang => ({
      language: lang.code,
      content: JSON.stringify(lang.data)
    }));
    
    const csv = yield* Effect.try({
      try: () => jsons_to_csv(JSON.stringify(inputs), '.'),
      catch: () => new ExportError({ message: "Failed to generate CSV" })
    });
    
    return csv;
  });
```

---

### Phase 2: Web Worker 통합 (선택적)

대용량 파일 처리 시 메인 스레드 블로킹 방지:

```typescript
// src/workers/import.worker.ts
import init, { parse_csv, parse_excel } from '../../parsing/pkg/parsing';

self.onmessage = async (e) => {
  const { file, data } = e.data;
  
  await init();
  
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const jsonStr = isExcel
    ? parse_excel(data, '.', false, true)
    : parse_csv(data, '.', false, true);
  
  self.postMessage({ result: JSON.parse(jsonStr) });
};
```

---

## 📊 성능 비교 예상

| 작업 | JavaScript | WASM | 향상 |
|------|-----------|------|------|
| **CSV Import (10K 행)** | ~250ms | ~40ms | **6배** |
| **Excel Import (10K 행)** | ~300ms | ~50ms | **6배** |
| **CSV Export (10K 행)** | ~200ms | ~35ms | **5.7배** |
| **검색 필터링 (10K 행)** | ~50ms | ~45ms | 미미 |
| **정렬 (10K 행)** | ~30ms | ~28ms | 미미 |

---

## 🎯 최종 권장사항

### ❌ WASM 활용 불필요

**이유:**
1. **Import/Export는 외부에서 처리**
   - localeEditor는 순수 에디터 기능에만 집중
   - 데이터 변환은 프론트엔드에서 처리

2. **검색 필터링**
   - AG Grid 내장 필터가 충분히 빠름 (목표: < 50ms 달성)
   - WASM 오버헤드가 더 클 수 있음
   - 실시간 필터링에는 JavaScript가 더 적합

3. **정렬/필터링**
   - AG Grid가 이미 최적화됨
   - 추가 최적화 불필요

4. **셀 편집/렌더링**
   - AG Grid가 Canvas 기반으로 최적화됨
   - WASM으로 개선할 여지 없음

### 결론

**localeEditor 프로젝트에서는 WASM이 필요 없습니다.**

- ✅ AG Grid가 이미 최적화된 성능 제공
- ✅ 검색/필터링은 JavaScript로 충분
- ✅ Import/Export는 외부에서 처리
- ✅ 개발 복잡도 증가 대비 효과 미미

---

## 📝 최종 결론

### localeEditor에서 WASM 불필요

**이유:**
1. **Import/Export는 외부에서 처리**
   - localeEditor는 에디터 기능에만 집중
   - 데이터 변환은 프론트엔드에서 처리

2. **AG Grid가 이미 최적화됨**
   - 검색/필터링: 내장 필터 사용 (목표 달성)
   - 렌더링: Canvas 기반 최적화
   - 정렬: 내장 정렬 사용

3. **개발 복잡도 대비 효과 미미**
   - WASM 로딩 오버헤드
   - 메모리 관리 복잡도
   - 타입 변환 오버헤드

### 권장사항

**WASM 없이 진행:**
- ✅ AG Grid의 최적화된 기능 활용
- ✅ JavaScript로 검색/필터링 구현
- ✅ 단순하고 유지보수하기 쉬운 구조

**성능 목표 달성 가능:**
- 검색 필터링: < 50ms (AG Grid 내장 필터)
- 초기 렌더링: < 100ms (AG Grid 가상 스크롤)
- 스크롤 FPS: 60fps (AG Grid 최적화)

