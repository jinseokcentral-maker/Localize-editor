# Locale Editor 개발 계획 (TDD)

## 개발 방식: Test-Driven Development (TDD)

각 단계마다 다음 사이클을 반복합니다:

1. **RED**: 실패하는 테스트 작성
2. **GREEN**: 최소한의 코드로 테스트 통과
3. **REFACTOR**: 코드 개선 (필요시)
4. **검사**: 사용자에게 검사 요청

## 목표

AG Grid Community를 사용한 Excel-like i18n 번역 에디터를 TDD 방식으로 구현. React 없이 Vanilla TypeScript로 개발하며, 각 기능별 단위 테스트(Vitest)와 E2E 테스트(Playwright)를 포함합니다.

## Effect 패키지 사용 가이드

**중요**: 모든 유틸리티 함수 및 중요 로직은 Effect를 사용하여 구현합니다.

### Effect 사용 원칙

1. **에러 처리**: `Data.TaggedError`를 사용하여 타입 안전한 에러 정의
2. **비동기 작업**: `Effect.tryPromise` 또는 `Effect.promise` 사용
3. **동기 작업**: `Effect.sync` 또는 `Effect.try` 사용
4. **테스트**: `runEffect`, `runEffectSync`, `expectEffectToFail` 헬퍼 사용

### Effect 사용 예시

```typescript
import { Effect, Data } from 'effect';

// 에러 정의
class SearchError extends Data.TaggedError("SearchError")<{
  readonly message: string;
}> {}

// Effect로 래핑된 함수
const searchTranslations = (query: string, translations: Translation[]) =>
  Effect.sync(() => {
    if (!query) return translations;
    // 검색 로직
    return translations.filter(/* ... */);
  }).pipe(
    Effect.catchAll(() => new SearchError({ message: "Search failed" }))
  );
```

### 테스트에서 Effect 사용

```typescript
import { runEffect, expectEffectToFail } from '@/tests/utils/effect-helpers';

test('search should filter translations', async () => {
  const result = await runEffect(searchTranslations("test", mockData));
  expect(result).toHaveLength(2);
});
```

## 프로젝트 구조

```
src/
├── main.ts                    # 진입점
├── components/
│   ├── locale-editor.ts       # 메인 에디터 클래스
│   ├── search-bar.ts          # 검색 바 컴포넌트
│   └── toolbar.ts             # 툴바 (저장, 내보내기 등)
├── types/
│   └── translation.ts         # 타입 정의
├── utils/
│   ├── search.ts              # 검색 유틸리티 (Effect 사용)
│   ├── validation.ts          # 유효성 검증 (Effect 사용)
│   └── debounce.ts            # 디바운싱 (Effect 사용)
├── stores/
│   └── editor-store.ts        # 상태 관리 (간단한 클래스 기반)
└── tests/
    ├── unit/
    │   ├── locale-editor.test.ts
    │   ├── search.test.ts
    │   └── validation.test.ts
    └── e2e/
        ├── editor.spec.ts
        └── search.spec.ts
```

## Step 1: 타입 정의 (TDD)

### 1.1 [RED] 테스트 작성

- **파일**: `src/tests/unit/translation.test.ts`
- Translation 인터페이스 검증 테스트
- LocaleEditorOptions 인터페이스 검증 테스트
- 타입 가드 함수 테스트

### 1.2 [GREEN] 타입 정의 구현

- **파일**: `src/types/translation.ts`
- Translation 인터페이스 정의
- LocaleEditorOptions 인터페이스 정의
- 타입 가드 함수 구현
- 테스트 통과 확인

### 1.3 검사

- 타입 정의가 올바른지 확인
- 테스트 커버리지 확인

## Step 2: AG Grid 통합 (TDD)

### 2.1 [RED] 테스트 작성

- **단위 테스트**: `src/tests/unit/locale-editor.test.ts`
  - 그리드 초기화 테스트
  - 데이터 변환 테스트 (Translation[] → RowData)
  - 컬럼 정의 테스트
- **E2E 테스트**: `src/tests/e2e/editor.spec.ts`
  - 그리드 렌더링 확인
  - 행/컬럼 표시 확인
  - 스크롤 동작 확인

### 2.2 [GREEN] AG Grid 통합 구현

- **파일**: `src/components/locale-editor.ts`
- AG Grid 초기화
- 컬럼 정의 (Key, Context, Language columns)
- 데이터 변환 로직
- 가상 스크롤 활성화
- 테스트 통과 확인

### 2.3 검사

- 그리드가 올바르게 렌더링되는지 확인
- 성능 확인 (초기 렌더링 < 100ms)

## Step 3: i18n 편집 유틸리티 (TDD)

i18n 번역 작업에 특화된 편집 유틸리티를 단계적으로 구현합니다.

### Phase 1: 기본 편집 유틸리티

#### Phase 1-1: 셀 편집 이벤트 처리 및 콜백

**3.1.1 [RED] 테스트 작성**

- **단위 테스트**: `src/tests/unit/locale-editor.test.ts`
  - `onCellChange` 콜백이 셀 값 변경 시 호출되는지 테스트
  - 올바른 파라미터(id, lang, value)가 전달되는지 테스트
  - readOnly 모드에서 콜백이 호출되지 않는지 테스트
  
- **E2E 테스트**: `src/tests/e2e/editor.spec.ts`
  - 셀 클릭 → 편집 모드 진입 확인
  - 값 변경 → onCellChange 콜백 호출 확인

**3.1.2 [GREEN] 구현**

- **파일**: `src/components/locale-editor.ts`
- `onCellValueChanged` 이벤트 핸들러 추가
- `onCellChange` 콜백 호출 로직 구현
- 테스트 통과 확인

**3.1.3 검사**

- 셀 편집 시 콜백이 올바르게 호출되는지 확인

---

#### Phase 1-2: 변경사항 추적 (dirty cells) - TODO

**3.1.4 [RED] 테스트 작성**

- 변경된 셀 추적 테스트
- 변경사항 초기화 테스트

**3.1.5 [GREEN] 구현**

- 변경사항 추적 로직 구현
- 변경된 셀 시각적 표시

---

#### Phase 1-3: 빈 번역 셀 하이라이트 - ✅ 완료

**3.1.6 [RED] 테스트 작성**
- 빈 번역 셀 하이라이트 테스트
- 빈 셀에 `cell-empty` 클래스 적용 확인
- 값 입력 시 하이라이트 제거 확인

**3.1.7 [GREEN] 구현**
- `cellClassRules`에 `cell-empty` 규칙 추가
- CSS 스타일 정의 (연한 빨간색 배경, 왼쪽 빨간 테두리)
- Context 컬럼은 하이라이트 제외
- 테스트 통과 확인

**3.1.8 검사**
- 빈 번역 셀이 올바르게 하이라이트되는지 확인

---

#### Phase 1-4: 향상된 키보드 네비게이션 - ✅ 완료

**3.1.9 [RED] 테스트 작성**
- Tab/Shift+Tab 네비게이션 테스트
- Enter/Shift+Enter 네비게이션 테스트
- Arrow keys 및 Esc 키 동작 테스트
- readOnly 모드에서 네비게이션만 동작하는지 테스트

**3.1.10 [GREEN] 구현**
- `navigateToNextCell` 콜백 구현 (Tab/Shift+Tab)
- `onCellEditingStopped` 이벤트 핸들러 구현 (Enter/Shift+Enter)
- 편집 가능한 언어 컬럼만 순회하도록 커스터마이징
- Arrow keys는 AG Grid 기본 동작 사용
- Esc는 AG Grid 기본 동작 사용 (편집 취소)
- 테스트 통과 확인

**3.1.11 검사**
- 키보드 네비게이션이 올바르게 동작하는지 확인

#### Phase 1-5: Context 컬럼 편집 지원 - TODO

## Step 4: 검색 유틸리티 (TDD)

### 4.1 [RED] 테스트 작성

- **파일**: `src/tests/unit/search.test.ts`
  - **Effect 테스트**: `runEffect` 헬퍼 사용
  - 키 검색 테스트
  - 값 검색 테스트
  - 대소문자 무시 테스트
  - 빈 쿼리 처리 테스트
  - 부분 일치 테스트
  - 에러 처리 테스트 (`expectEffectToFail` 사용)

### 4.2 [GREEN] 검색 유틸리티 구현

- **파일**: `src/utils/search.ts`
- **Effect 사용**: `Effect.sync` 또는 `Effect.try`로 검색 로직 래핑
- 클라이언트 사이드 필터링 함수
- 키/값 검색 로직
- `Data.TaggedError`로 에러 정의
- 테스트 통과 확인

### 4.3 검사

- 검색 로직이 올바른지 확인
- 성능 확인 (검색 < 50ms)

## Step 5: 검색 바 컴포넌트 (TDD)

### 5.1 [RED] 테스트 작성

- **단위 테스트**: `src/tests/unit/search-bar.test.ts`
  - 디바운싱 동작 테스트
  - 필터 연동 테스트
- **E2E 테스트**: `src/tests/e2e/search.spec.ts`
  - 검색 입력 → 결과 필터링
  - 실시간 검색 동작
  - 검색 결과 하이라이트

### 5.2 [GREEN] 검색 바 컴포넌트 구현

- **파일**: `src/components/search-bar.ts`
- 검색 입력 필드
- 디바운싱 (150ms)
- AG Grid 필터 연동
- 테스트 통과 확인

### 5.3 검사

- 검색 바가 올바르게 동작하는지 확인
- 실시간 필터링 확인

## Step 6: 변경사항 추적 스토어 (TDD)

### 6.1 [RED] 테스트 작성

- **파일**: `src/tests/unit/editor-store.test.ts`
  - 변경사항 추가/제거 테스트
  - 배치 수집 테스트
  - 변경사항 초기화 테스트

### 6.2 [GREEN] 변경사항 추적 스토어 구현

- **파일**: `src/stores/editor-store.ts`
- Dirty cells 관리
- 변경사항 배치 수집
- 테스트 통과 확인

### 6.3 검사

- 변경사항 추적이 올바른지 확인

## Step 7: 저장 기능 (TDD)

### 7.1 [RED] 테스트 작성

- **단위 테스트**: `src/tests/unit/locale-editor.test.ts`
  - 저장 콜백 호출 테스트
  - 데이터 포맷팅 테스트
  - 저장 상태 표시 테스트
- **E2E 테스트**: `src/tests/e2e/editor.spec.ts`
  - 셀 편집 → 저장 버튼 클릭
  - 저장 성공/실패 처리

### 7.2 [GREEN] 저장 기능 구현

- **파일**: `src/components/locale-editor.ts`
- onSave 콜백 호출
- 변경사항 포맷팅
- 저장 상태 표시
- 테스트 통과 확인

### 7.3 검사

- 저장 기능이 올바르게 동작하는지 확인

## 테스트 설정

### 단위 테스트 (Vitest)

- **설정**: `vitest.config.ts`
- **실행**: `pnpm test`
- 커버리지 목표: 80% 이상
- Watch 모드: `pnpm test:watch`
- **Effect 헬퍼**: `src/tests/utils/effect-helpers.ts`에서 제공
  - `runEffect`: Effect를 Promise로 변환
  - `runEffectSync`: Effect를 동기적으로 실행
  - `expectEffectToFail`: Effect 실패를 기대하는 헬퍼

### E2E 테스트 (Playwright)

- **설정**: `playwright.config.ts`
- **실행**: `pnpm test:e2e`
- 브라우저: Chromium, Firefox, WebKit
- UI 모드: `pnpm test:e2e:ui`

## TDD 워크플로우

각 Step마다:

1. **테스트 작성** (실패하는 테스트)
2. **구현** (최소한의 코드)
3. **테스트 통과 확인**
4. **리팩토링** (필요시)
5. **사용자 검사 요청**

## 성능 목표

- 초기 렌더링: < 100ms (1,000개 행)
- 검색 필터링: < 50ms
- 스크롤 FPS: 60fps
- 셀 편집 반응: < 16ms

## 주요 파일

- [src/components/locale-editor.ts](src/components/locale-editor.ts) - 메인 에디터 클래스
- [src/types/translation.ts](src/types/translation.ts) - 타입 정의
- [src/utils/search.ts](src/utils/search.ts) - 검색 유틸리티
- [src/tests/unit/locale-editor.test.ts](src/tests/unit/locale-editor.test.ts) - 단위 테스트
- [src/tests/e2e/editor.spec.ts](src/tests/e2e/editor.spec.ts) - E2E 테스트