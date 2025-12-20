# Effect 사용 가이드

이 프로젝트에서는 **Effect** 패키지를 사용하여 유틸리티 함수 및 중요 로직을 구현합니다.

## 기본 원칙

1. **모든 유틸리티 함수는 Effect로 래핑**
2. **에러는 `Data.TaggedError`로 정의**
3. **테스트는 Effect 헬퍼를 사용**

## 에러 정의

```typescript
import { Data } from 'effect';

class SearchError extends Data.TaggedError("SearchError")<{
  readonly message: string;
  readonly query?: string;
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string;
  readonly reason: string;
}> {}
```

## Effect 함수 작성

### 동기 함수

```typescript
import { Effect } from 'effect';

const filterTranslations = (query: string, translations: Translation[]) =>
  Effect.sync(() => {
    if (!query) return translations;
    
    const lowerQuery = query.toLowerCase();
    return translations.filter(t => 
      t.key.toLowerCase().includes(lowerQuery) ||
      Object.values(t.values).some(v => 
        v?.toLowerCase().includes(lowerQuery)
      )
    );
  });
```

### 에러 처리 포함

```typescript
import { Effect, Data } from 'effect';

class SearchError extends Data.TaggedError("SearchError")<{
  readonly message: string;
}> {}

const searchTranslations = (query: string, translations: Translation[]) =>
  Effect.try({
    try: () => {
      if (query.length < 1) {
        throw new SearchError({ message: "Query too short" });
      }
      // 검색 로직
      return filtered;
    },
    catch: (error) => error instanceof SearchError 
      ? error 
      : new SearchError({ message: "Unknown error" })
  });
```

### 비동기 함수

```typescript
import { Effect } from 'effect';

const fetchTranslations = (projectId: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/projects/${projectId}/translations`)
      .then(res => res.json() as Promise<Translation[]>),
    catch: () => new FetchError({ message: "Failed to fetch" })
  });
```

## 테스트에서 사용

### 기본 사용

```typescript
import { describe, it, expect } from 'vitest';
import { runEffect } from '@/tests/utils/effect-helpers';
import { filterTranslations } from '@/utils/search';

describe('filterTranslations', () => {
  it('should filter by key', async () => {
    const result = await runEffect(
      filterTranslations('submit', mockTranslations)
    );
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('common.buttons.submit');
  });
});
```

### 에러 테스트

```typescript
import { expectEffectToFail } from '@/tests/utils/effect-helpers';

it('should fail with invalid query', async () => {
  const error = await expectEffectToFail(
    searchTranslations('', mockTranslations)
  );
  expect(error._tag).toBe('SearchError');
});
```

### 동기 Effect 테스트

```typescript
import { runEffectSync } from '@/tests/utils/effect-helpers';

it('should work synchronously', () => {
  const result = runEffectSync(
    Effect.sync(() => 42)
  );
  expect(result).toBe(42);
});
```

## 파일별 Effect 사용

### `src/utils/search.ts`
- 검색 로직을 Effect로 래핑
- `SearchError` 정의

### `src/utils/validation.ts`
- 유효성 검증을 Effect로 래핑
- `ValidationError` 정의

### `src/utils/debounce.ts`
- 디바운싱 로직을 Effect로 래핑

### `src/stores/editor-store.ts`
- 상태 변경 로직을 Effect로 래핑 (선택적)

## 참고 자료

- Effect 공식 문서: https://effect.website
- 프로젝트 내 가이드: `.cursor/plans/effect.txt`

