# 코드베이스 리팩토링 계획

## 📋 개요

Vim 모드 구현 전에 코드베이스 전반을 검토하고 리팩토링할 수 있는 부분들을 정리했습니다.

---

## 🔍 발견된 주요 이슈

### 1. VirtualTableDiv 클래스가 너무 큼 (2460줄)
- **문제**: 단일 책임 원칙 위반, 유지보수 어려움
- **영향**: 높음
- **우선순위**: 높음

### 2. console.log/error/warn 사용
- **문제**: 프로덕션 코드에 디버그 로그가 남아있음
- **영향**: 낮음 (기능에는 영향 없음)
- **우선순위**: 중간

### 3. 타입 안정성 (`as any` 사용)
- **문제**: 타입 안정성 저하, 런타임 에러 가능성
- **영향**: 중간
- **우선순위**: 높음

### 4. 필터링 로직 복잡도
- **문제**: `getFilteredTranslations()` 메서드가 길고 복잡함
- **영향**: 중간
- **우선순위**: 중간

### 5. Help 모달이 VirtualTableDiv 내부에 구현됨
- **문제**: 관심사 분리 위반
- **영향**: 낮음
- **우선순위**: 낮음

### 6. 필터 관련 메서드 중복
- **문제**: `filterEmpty()`, `filterChanged()`, `filterDuplicate()` 등이 유사한 패턴
- **영향**: 낮음
- **우선순위**: 낮음

---

## 🎯 리팩토링 계획

### Phase 1: 타입 안정성 개선 (높은 우선순위)

#### 1.1 `as any` 제거
**위치**: `src/components/virtual-table-div.ts`, `src/components/cell-editor.ts`

**문제점**:
```typescript
// 현재 코드
(this.options as any).translations = filtered;
const mutableTranslation = translation as any;
```

**해결 방안**:
```typescript
// 옵션 1: 인터페이스 확장
interface MutableVirtualTableDivOptions extends VirtualTableDivOptions {
  translations: Translation[]; // readonly 제거
}

// 옵션 2: 내부 상태로 관리
private currentTranslations: Translation[] = [];

// 옵션 3: 타입 가드 사용
function isMutableTranslation(t: Translation): t is MutableTranslation {
  return true; // 실제로는 더 엄격한 체크
}
```

**작업**:
- [ ] `VirtualTableDivOptions`에 내부 상태 관리용 타입 추가
- [ ] `as any` 사용 제거
- [ ] 타입 안전한 방법으로 변경

---

### Phase 2: 로깅 시스템 개선 (중간 우선순위)

#### 2.1 Logger 유틸리티 생성
**위치**: `src/utils/logger.ts` (새로 생성)

**구현**:
```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = LogLevel.WARN; // 프로덕션 기본값

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log("[DEBUG]", ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log("[INFO]", ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn("[WARN]", ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error("[ERROR]", ...args);
    }
  }
}

export const logger = new Logger();
```

**작업**:
- [ ] `src/utils/logger.ts` 생성
- [ ] 모든 `console.log/error/warn`를 `logger`로 교체
- [ ] 개발 모드에서만 디버그 로그 활성화

---

### Phase 3: 필터링 로직 리팩토링 (중간 우선순위)

#### 3.1 FilterManager 클래스 생성
**위치**: `src/components/filter-manager.ts` (새로 생성)

**구현**:
```typescript
export type FilterType = "none" | "empty" | "changed" | "duplicate" | "search";

export interface FilterOptions {
  type: FilterType;
  keyword?: string;
}

export class FilterManager {
  constructor(
    private translations: readonly Translation[],
    private languages: readonly string[],
    private changeTracker: ChangeTracker
  ) {}

  filter(translations: readonly Translation[], options: FilterOptions): Translation[] {
    let filtered = [...translations];

    switch (options.type) {
      case "search":
        return this.applySearchFilter(filtered, options.keyword || "");
      case "empty":
        return this.applyEmptyFilter(filtered);
      case "changed":
        return this.applyChangedFilter(filtered);
      case "duplicate":
        return this.applyDuplicateFilter(filtered);
      default:
        return filtered;
    }
  }

  private applySearchFilter(translations: Translation[], keyword: string): Translation[] {
    const lowerKeyword = keyword.toLowerCase().trim();
    if (!lowerKeyword) return translations;

    return translations.filter((translation) => {
      if (translation.key.toLowerCase().includes(lowerKeyword)) return true;
      if (translation.context?.toLowerCase().includes(lowerKeyword)) return true;
      return this.languages.some((lang) => {
        const value = translation.values[lang] || "";
        return value.toLowerCase().includes(lowerKeyword);
      });
    });
  }

  private applyEmptyFilter(translations: Translation[]): Translation[] {
    return translations.filter((translation) => {
      return this.languages.some((lang) => {
        const value = translation.values[lang] || "";
        return value.trim() === "";
      });
    });
  }

  private applyChangedFilter(translations: Translation[]): Translation[] {
    return translations.filter((translation) => {
      if (this.changeTracker.hasChange(translation.id, "key")) return true;
      if (this.changeTracker.hasChange(translation.id, "context")) return true;
      return this.languages.some((lang) => {
        return this.changeTracker.hasChange(translation.id, `values.${lang}`);
      });
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

**작업**:
- [ ] `FilterManager` 클래스 생성
- [ ] `VirtualTableDiv`에서 필터링 로직을 `FilterManager`로 이동
- [ ] 테스트 작성

---

### Phase 4: Help 모달 분리 (낮은 우선순위)

#### 4.1 HelpModal 컴포넌트 생성
**위치**: `src/components/help-modal.ts` (새로 생성)

**구현**:
```typescript
export class HelpModal {
  private overlay: HTMLElement | null = null;

  show(): void {
    // 기존 showHelp() 로직 이동
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  isVisible(): boolean {
    return this.overlay !== null;
  }
}
```

**작업**:
- [ ] `HelpModal` 클래스 생성
- [ ] `VirtualTableDiv`의 `showHelp()` 메서드를 `HelpModal`로 이동
- [ ] `VirtualTableDiv`에서 `HelpModal` 인스턴스 사용

---

### Phase 5: VirtualTableDiv 클래스 분할 (높은 우선순위, 복잡)

#### 5.1 상태 관리 분리
**목표**: VirtualTableDiv의 상태를 더 작은 단위로 분리

**제안 구조**:
```
VirtualTableDiv (메인 클래스)
  ├── FilterState (필터 관련 상태)
  ├── SearchState (검색 관련 상태)
  ├── GotoState (Goto 관련 상태)
  └── QuickSearchState (Quick Search 관련 상태)
```

**작업**:
- [ ] 상태 관리 클래스들 생성
- [ ] VirtualTableDiv에서 상태 관리 로직 분리
- [ ] 테스트 작성

#### 5.2 메서드 그룹화
**목표**: 관련된 메서드들을 논리적으로 그룹화

**제안 구조**:
```typescript
export class VirtualTableDiv {
  // 렌더링 관련
  private render(): void { }
  private renderHeader(): void { }
  private renderVirtualRows(): void { }

  // 필터링 관련
  private getFilteredTranslations(): Translation[] { }
  private applyFilter(): void { }

  // 검색 관련
  private handleQuickSearch(query: string): void { }
  private goToNextQuickSearchMatch(): void { }

  // Goto 관련
  private gotoToMatch(match: SearchMatch): void { }
  private gotoToNextMatch(): void { }
}
```

**작업**:
- [ ] 메서드들을 논리적 그룹으로 재구성
- [ ] 주석으로 그룹 구분
- [ ] 필요시 private 클래스로 분리

---

## 📝 구현 순서

### Step 1: 타입 안정성 개선 (1-2시간)
1. `as any` 사용 제거
2. 타입 안전한 방법으로 변경
3. 테스트 확인

### Step 2: 로깅 시스템 개선 (30분-1시간)
1. `Logger` 유틸리티 생성
2. `console.log/error/warn` 교체
3. 개발 모드 설정

### Step 3: 필터링 로직 리팩토링 (1-2시간)
1. `FilterManager` 클래스 생성
2. 필터링 로직 이동
3. 테스트 작성 및 확인

### Step 4: Help 모달 분리 (30분-1시간)
1. `HelpModal` 클래스 생성
2. 로직 이동
3. 테스트 확인

### Step 5: VirtualTableDiv 분할 (2-3시간, 선택적)
1. 상태 관리 분리
2. 메서드 그룹화
3. 테스트 작성 및 확인

---

## ✅ 체크리스트

### Phase 1: 타입 안정성
- [ ] `VirtualTableDivOptions` 타입 개선
- [ ] `as any` 사용 제거
- [ ] 타입 안전한 방법으로 변경
- [ ] 테스트 확인

### Phase 2: 로깅 시스템
- [ ] `Logger` 유틸리티 생성
- [ ] 모든 `console.log/error/warn` 교체
- [ ] 개발 모드 설정
- [ ] 테스트 확인

### Phase 3: 필터링 로직
- [ ] `FilterManager` 클래스 생성
- [ ] 필터링 로직 이동
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 확인

### Phase 4: Help 모달
- [ ] `HelpModal` 클래스 생성
- [ ] 로직 이동
- [ ] 테스트 확인

### Phase 5: VirtualTableDiv 분할 (선택적)
- [ ] 상태 관리 분리
- [ ] 메서드 그룹화
- [ ] 테스트 작성 및 확인

---

## 🎯 우선순위 요약

1. **높은 우선순위** (Vim 모드 구현 전 필수):
   - 타입 안정성 개선 (`as any` 제거)
   - 로깅 시스템 개선

2. **중간 우선순위** (Vim 모드 구현 전 권장):
   - 필터링 로직 리팩토링

3. **낮은 우선순위** (Vim 모드 구현 후 가능):
   - Help 모달 분리
   - VirtualTableDiv 분할

---

## 📚 참고

- [Vim 모드 설계](./vim-mode-design.md)
- [Vim 모드 설계 검토](./vim-mode-design-review.md)

