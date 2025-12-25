# Effect 라이브러리 활용 리팩토링 계획

## 📋 개요

현재 코드베이스에서 Effect가 부분적으로만 사용되고 있습니다. Effect의 강력한 기능들을 더 적극적으로 활용하여 타입 안정성과 에러 처리를 개선합니다.

---

## 🔍 현재 Effect 사용 현황

### ✅ 이미 Effect를 사용하는 부분

1. **ChangeTracker** (`src/components/change-tracker.ts`)
   - `getOriginalValueEffect()`, `trackChangeEffect()`, `hasChangeEffect()`
   - 검증 활성화 시 Effect 사용, 비활성화 시 직접 접근

2. **CellEditor** (`src/components/cell-editor.ts`)
   - `startEditingEffect()`, `applyCellChangeEffect()`, `stopEditingEffect()`
   - 실제로는 Promise로 변환하여 사용 (`Effect.runPromise`)

3. **grid-utils** (`src/components/grid-utils.ts`)
   - `getTranslationKeyEffect()`, `checkKeyDuplicateEffect()`

4. **validation** (`src/utils/validation.ts`)
   - `validateWithEffect()`: Zod 스키마를 Effect로 변환

5. **에러 타입** (`src/types/errors.ts`)
   - `ChangeTrackerError`, `ValidationError`가 `Data.TaggedError` 사용

### ❌ Effect를 사용하지 않는 부분

1. **필터링 로직** (`VirtualTableDiv.getFilteredTranslations()`)
   - 순수 함수이지만 Effect로 변환 가능

2. **검색 로직** (`FindReplace`, `QuickSearch`)
   - 에러 처리가 없음

3. **에러 처리**
   - `console.error` 사용, 일관된 에러 처리 없음

4. **의존성 관리**
   - 생성자 주입 방식, Effect Context 미사용

---

## 🎯 Effect 활용 리팩토링 계획

### Phase 1: 필터링 로직을 Effect로 변환

#### 1.1 FilterManager를 Effect 기반으로 구현

**현재 코드**:
```typescript
private getFilteredTranslations(): readonly Translation[] {
  let filtered = [...this.originalTranslations];
  // ... 필터링 로직
  return filtered;
}
```

**Effect 기반 리팩토링**:
```typescript
import { Effect, Array as EffectArray } from "effect";

export class FilterError extends Data.TaggedError("FilterError")<{
  readonly message: string;
  readonly code: "INVALID_FILTER_TYPE" | "INVALID_KEYWORD" | "FILTER_FAILED";
}> {}

export class FilterManager {
  filterEffect(
    translations: readonly Translation[],
    filterType: FilterType,
    keyword?: string
  ): Effect.Effect<Translation[], FilterError> {
    return Effect.gen(function* (_) {
      // 검색 필터
      if (filterType === "search") {
        if (!keyword || !keyword.trim()) {
          return yield* _(Effect.succeed([...translations]));
        }
        
        const lowerKeyword = keyword.toLowerCase().trim();
        const filtered = yield* _(
          Effect.succeed(
            translations.filter((translation) => {
              if (translation.key.toLowerCase().includes(lowerKeyword)) return true;
              if (translation.context?.toLowerCase().includes(lowerKeyword)) return true;
              return this.languages.some((lang) => {
                const value = translation.values[lang] || "";
                return value.toLowerCase().includes(lowerKeyword);
              });
            })
          )
        );
        return filtered;
      }

      // 빈 번역 필터
      if (filterType === "empty") {
        return yield* _(
          Effect.succeed(
            translations.filter((translation) => {
              return this.languages.some((lang) => {
                const value = translation.values[lang] || "";
                return value.trim() === "";
              });
            })
          )
        );
      }

      // 변경된 셀 필터
      if (filterType === "changed") {
        return yield* _(
          Effect.gen(function* (_) {
            const filtered: Translation[] = [];
            for (const translation of translations) {
              const hasKeyChange = yield* _(
                this.changeTracker.hasChangeEffect(translation.id, "key")
              );
              if (hasKeyChange) {
                filtered.push(translation);
                continue;
              }

              const hasContextChange = yield* _(
                this.changeTracker.hasChangeEffect(translation.id, "context")
              );
              if (hasContextChange) {
                filtered.push(translation);
                continue;
              }

              let hasValueChange = false;
              for (const lang of this.languages) {
                const hasChange = yield* _(
                  this.changeTracker.hasChangeEffect(translation.id, `values.${lang}`)
                );
                if (hasChange) {
                  hasValueChange = true;
                  break;
                }
              }
              if (hasValueChange) {
                filtered.push(translation);
              }
            }
            return filtered;
          })
        );
      }

      // 중복 Key 필터
      if (filterType === "duplicate") {
        return yield* _(
          Effect.succeed(
            this.applyDuplicateFilter(translations)
          )
        );
      }

      // 기본: 필터 없음
      return yield* _(Effect.succeed([...translations]));
    });
  }

  private applyDuplicateFilter(translations: Translation[]): Translation[] {
    const keyCounts = new Map<string, number>();
    translations.forEach((t) => {
      keyCounts.set(t.key, (keyCounts.get(t.key) || 0) + 1);
    });
    return translations.filter((translation) => {
      return (keyCounts.get(translation.key) || 0) > 1;
    });
  }
}
```

**장점**:
- 타입 안전한 에러 처리
- 필터링 로직을 조합 가능
- 테스트 용이성 향상

---

### Phase 2: 에러 처리를 Effect로 통일

#### 2.1 통합 에러 타입 정의

```typescript
// src/types/errors.ts
import { Data } from "effect";

export class LocaleEditorError extends Data.TaggedError("LocaleEditorError")<{
  readonly message: string;
  readonly code: LocaleEditorErrorCode;
  readonly cause?: unknown;
}> {}

export type LocaleEditorErrorCode =
  | "TRANSLATION_NOT_FOUND"
  | "INVALID_COLUMN_ID"
  | "DUPLICATE_KEY"
  | "EDIT_IN_PROGRESS"
  | "FILTER_FAILED"
  | "SEARCH_FAILED"
  | "INVALID_ROW_INDEX"
  | "COLUMN_NOT_FOUND"
  | "INVALID_FIELD_FORMAT";

// 에러 타입 통합
export type AppError = 
  | ChangeTrackerError 
  | ValidationError 
  | CellEditorError 
  | LocaleEditorError
  | FilterError;
```

#### 2.2 에러 처리 유틸리티

```typescript
// src/utils/error-handling.ts
import { Effect, Logger } from "effect";
import type { AppError } from "@/types/errors";

export const handleError = <A, E extends AppError>(
  effect: Effect.Effect<A, E>,
  onError?: (error: E) => void
): Effect.Effect<A, never> => {
  return Effect.catchAll(effect, (error) => {
    if (onError) {
      onError(error);
    } else {
      // 기본 에러 처리: 로깅
      Logger.error("Error occurred", error);
    }
    // 에러를 never로 변환 (에러가 발생해도 계속 진행)
    return Effect.succeed(null as A);
  });
};

export const logError = <E extends AppError>(
  error: E
): Effect.Effect<void, never> => {
  return Effect.gen(function* (_) {
    yield* _(Logger.error(`[${error.code}] ${error.message}`, error));
  });
};
```

---

### Phase 3: Context/Service 패턴 활용

#### 3.1 Service 정의

```typescript
// src/services/translation-service.ts
import { Context, Effect } from "effect";
import type { Translation } from "@/types/translation";

export class TranslationService extends Context.Tag("TranslationService")<
  TranslationService,
  {
    readonly getTranslation: (id: string) => Effect.Effect<Translation, TranslationNotFoundError>;
    readonly updateTranslation: (id: string, field: string, value: string) => Effect.Effect<void, UpdateError>;
    readonly getAllTranslations: () => Effect.Effect<readonly Translation[], never>;
  }
>() {}

export class TranslationNotFoundError extends Data.TaggedError("TranslationNotFoundError")<{
  readonly id: string;
}> {}

export class UpdateError extends Data.TaggedError("UpdateError")<{
  readonly message: string;
  readonly code: "INVALID_FIELD" | "DUPLICATE_KEY" | "VALIDATION_FAILED";
}> {}
```

#### 3.2 Service 구현

```typescript
// src/services/translation-service-impl.ts
import { Effect } from "effect";
import { TranslationService, TranslationNotFoundError, UpdateError } from "./translation-service";

export const makeTranslationService = (
  translations: readonly Translation[]
): TranslationService => {
  return TranslationService.of({
    getTranslation: (id: string) =>
      Effect.gen(function* (_) {
        const translation = translations.find((t) => t.id === id);
        if (!translation) {
          return yield* _(
            Effect.fail(
              new TranslationNotFoundError({ id })
            )
          );
        }
        return translation;
      }),

    updateTranslation: (id: string, field: string, value: string) =>
      Effect.gen(function* (_) {
        const translation = yield* _(TranslationService.getTranslation(id));
        
        // 검증
        if (field === "key" && value.trim() === "") {
          return yield* _(
            Effect.fail(
              new UpdateError({
                message: "Key cannot be empty",
                code: "VALIDATION_FAILED",
              })
            )
          );
        }

        // 업데이트 로직
        // ...
      }),

    getAllTranslations: () => Effect.succeed(translations),
  });
};
```

#### 3.3 VirtualTableDiv에서 Service 사용

```typescript
// VirtualTableDiv에서
import { Effect, Layer } from "effect";
import { TranslationService, makeTranslationService } from "@/services/translation-service";

export class VirtualTableDiv {
  private translationServiceLayer: Layer.Layer<TranslationService>;

  constructor(options: VirtualTableDivOptions) {
    // Service Layer 생성
    this.translationServiceLayer = Layer.succeed(
      TranslationService,
      makeTranslationService(options.translations)
    );

    // Effect를 사용하는 메서드에서 Service 사용
    this.updateCellValueEffect(rowId, columnId, value);
  }

  private updateCellValueEffect(
    rowId: string,
    columnId: string,
    value: string
  ): Effect.Effect<void, AppError, TranslationService> {
    return Effect.gen(function* (_) {
      const service = yield* _(TranslationService);
      yield* _(service.updateTranslation(rowId, columnId, value));
    });
  }

  // 동기 버전 (기존 API 호환)
  private updateCellValue(rowId: string, columnId: string, value: string): void {
    const effect = this.updateCellValueEffect(rowId, columnId, value);
    Effect.runSync(
      Effect.provide(effect, this.translationServiceLayer)
    );
  }
}
```

**장점**:
- 의존성 주입이 타입 안전
- 테스트 시 Mock Service 쉽게 주입
- 서비스 간 조합 가능

---

### Phase 4: 비동기 작업을 Effect로 처리

#### 4.1 현재 Promise 사용 부분을 Effect로 변환

**현재 코드**:
```typescript
private async applyCellChange(
  rowId: string,
  columnId: string,
  oldValue: string,
  newValue: string
): Promise<void> {
  const effect = this.applyCellChangeEffect(rowId, columnId, oldValue, newValue);
  return Effect.runPromise(effect);
}
```

**개선**:
```typescript
// Effect를 직접 반환하고, 필요할 때만 Promise로 변환
private applyCellChangeEffect(
  rowId: string,
  columnId: string,
  oldValue: string,
  newValue: string
): Effect.Effect<void, CellEditorError> {
  return Effect.gen(function* (_) {
    // Translation 찾기
    const translation = yield* _(
      this.findTranslationEffect(rowId)
    );

    // 검증
    yield* _(this.validateCellChange(translation, columnId, newValue));

    // 업데이트
    yield* _(this.updateTranslationEffect(translation, columnId, newValue));

    // 변경사항 추적
    yield* _(
      this.changeTracker.trackChangeEffect(
        rowId,
        columnId,
        getLangFromColumnId(columnId),
        oldValue,
        newValue,
        translation.key
      )
    );

    // Undo/Redo 히스토리 추가
    this.undoRedoManager.push({
      type: "cell-change",
      rowId,
      columnId,
      oldValue,
      newValue,
    });
  });
}

// 필요할 때만 Promise로 변환
private applyCellChange(
  rowId: string,
  columnId: string,
  oldValue: string,
  newValue: string
): Promise<void> {
  return Effect.runPromise(
    this.applyCellChangeEffect(rowId, columnId, oldValue, newValue)
  );
}
```

---

### Phase 5: 타입 안정성 개선 (as any 제거)

#### 5.1 Mutable 타입 정의

```typescript
// src/types/translation.ts
export interface MutableTranslation {
  id: string;
  key: string;
  context?: string;
  values: Record<string, string>;
}

// readonly Translation을 MutableTranslation으로 변환하는 Effect
export const toMutableTranslation = (
  translation: Translation
): Effect.Effect<MutableTranslation, never> => {
  return Effect.succeed({
    id: translation.id,
    key: translation.key,
    context: translation.context,
    values: { ...translation.values },
  });
};
```

#### 5.2 안전한 업데이트

```typescript
// as any 대신 Effect를 사용한 안전한 업데이트
private updateTranslationEffect(
  translation: Translation,
  columnId: string,
  value: string
): Effect.Effect<void, CellEditorError> {
  return Effect.gen(function* (_) {
    const mutable = yield* _(toMutableTranslation(translation));

    if (columnId === "key") {
      mutable.key = value;
    } else if (columnId === "context") {
      mutable.context = value;
    } else if (columnId.startsWith("values.")) {
      const lang = columnId.replace("values.", "");
      mutable.values[lang] = value;
    } else {
      return yield* _(
        Effect.fail(
          new CellEditorError(`Invalid column ID: ${columnId}`, "INVALID_COLUMN_ID")
        )
      );
    }

    // 원본 데이터 업데이트 (안전한 방법)
    // ...
  });
}
```

---

### Phase 6: 로깅을 Effect Logger로 통일

#### 6.1 Logger Service

```typescript
// src/services/logger-service.ts
import { Context, Effect, Logger } from "effect";

export class AppLogger extends Context.Tag("AppLogger")<
  AppLogger,
  Logger.Logger
>() {}

export const makeAppLogger = (): AppLogger => {
  return AppLogger.of(
    Logger.make({
      log: (level, message) => {
        if (level._tag === "Error") {
          console.error(`[ERROR] ${message}`);
        } else if (level._tag === "Warning") {
          console.warn(`[WARN] ${message}`);
        } else if (level._tag === "Info") {
          console.log(`[INFO] ${message}`);
        } else {
          console.debug(`[DEBUG] ${message}`);
        }
      },
    })
  );
};
```

#### 6.2 Logger 사용

```typescript
import { Effect, Logger } from "effect";
import { AppLogger } from "@/services/logger-service";

private logError(message: string, error: unknown): Effect.Effect<void, never, AppLogger> {
  return Effect.gen(function* (_) {
    const logger = yield* _(AppLogger);
    yield* _(Logger.error(logger, message, error));
  });
}

// 사용
const effect = this.someOperation().pipe(
  Effect.catchAll((error) =>
    this.logError("Operation failed", error).pipe(
      Effect.flatMap(() => Effect.fail(error))
    )
  )
);
```

---

## 📝 구현 순서

### Step 1: 에러 타입 통일 (1-2시간)
1. 통합 에러 타입 정의
2. 기존 에러 타입을 Effect 에러로 변환
3. 에러 처리 유틸리티 생성

### Step 2: 필터링 로직 Effect 변환 (2-3시간)
1. `FilterManager`를 Effect 기반으로 구현
2. 필터링 로직을 Effect로 변환
3. 테스트 작성

### Step 3: Service 패턴 도입 (3-4시간)
1. `TranslationService` 정의 및 구현
2. `VirtualTableDiv`에서 Service 사용
3. 의존성 주입을 Effect Context로 변경

### Step 4: 타입 안정성 개선 (2-3시간)
1. `as any` 제거
2. Mutable 타입 정의
3. 안전한 업데이트 메서드 구현

### Step 5: 로깅 통일 (1-2시간)
1. Logger Service 생성
2. `console.log/error/warn`를 Effect Logger로 교체
3. 개발/프로덕션 모드 설정

---

## ✅ 체크리스트

### Phase 1: 필터링 로직
- [ ] `FilterManager`를 Effect 기반으로 구현
- [ ] 필터링 로직을 Effect로 변환
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 확인

### Phase 2: 에러 처리 통일
- [ ] 통합 에러 타입 정의
- [ ] 에러 처리 유틸리티 생성
- [ ] 기존 에러 처리를 Effect로 변환
- [ ] 테스트 작성

### Phase 3: Service 패턴
- [ ] `TranslationService` 정의 및 구현
- [ ] `VirtualTableDiv`에서 Service 사용
- [ ] 의존성 주입을 Effect Context로 변경
- [ ] 테스트 작성

### Phase 4: 타입 안정성
- [ ] `as any` 제거
- [ ] Mutable 타입 정의
- [ ] 안전한 업데이트 메서드 구현
- [ ] 테스트 작성

### Phase 5: 로깅 통일
- [ ] Logger Service 생성
- [ ] `console.log/error/warn` 교체
- [ ] 개발/프로덕션 모드 설정

---

## 🎯 우선순위 요약

1. **높은 우선순위** (Vim 모드 구현 전 필수):
   - 에러 타입 통일
   - 타입 안정성 개선 (`as any` 제거)

2. **중간 우선순위** (Vim 모드 구현 전 권장):
   - 필터링 로직 Effect 변환
   - 로깅 통일

3. **낮은 우선순위** (Vim 모드 구현 후 가능):
   - Service 패턴 도입 (대규모 리팩토링)

---

## 📚 참고

- [Effect 공식 문서](https://effect.website/)
- [Effect 패턴 가이드](https://effect.website/docs/guides/essentials/effect-type)
- [Effect Context 패턴](https://effect.website/docs/guides/essentials/context)
- [리팩토링 계획](./refactoring-plan.md)
- [Vim 모드 설계](./vim-mode-design.md)

---

## 💡 추가 고려사항

### 성능 고려
- Effect는 성능 오버헤드가 있으므로, 성능이 중요한 경로에서는 검증 비활성화 옵션 제공
- 프로덕션 환경에서는 Effect 검증을 선택적으로 비활성화 가능

### 점진적 마이그레이션
- 기존 API는 유지하면서 Effect 기반 메서드를 추가
- 점진적으로 Effect 기반 메서드로 전환
- 테스트를 통해 안정성 확인

### 테스트 전략
- Effect 기반 메서드는 Effect 테스트 유틸리티 사용
- Service Mock을 Effect Context로 주입
- 에러 케이스 테스트 용이

