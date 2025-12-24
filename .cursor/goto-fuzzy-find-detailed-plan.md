# Goto Fuzzy Find 상세 계획

## 요구사항

### 입력 패턴
1. `goto "` → 따옴표 시작, fuzzy find 모드 활성화
2. `goto "h` → "h"로 실시간 fuzzy find 시작
3. `goto "hell` → "hell"로 실시간 fuzzy find 계속
4. `goto "hell"` → "hell" 검색 완료, Enter 시 첫 번째 매치로 이동
5. `goto "hell` → 아직 입력 중 (다음 문자가 올 수 있음)

### 동작 방식
- Command Palette에서 `goto "` 입력 시 → fuzzy find 모드로 전환
- 실시간으로 검색 결과를 Command Palette에 표시
- 검색 결과는 행 번호와 매치된 필드(key/context/value) 표시
- Enter 시 첫 번째 매치로 이동

---

## 상세 설계

### 1. Command Palette 확장

#### 1.1 입력 파싱 로직
```typescript
// command-palette.ts
private parseInput(query: string): {
  command: string;
  args: string[];
  isFuzzyFindMode: boolean;
  fuzzyFindQuery: string;
} {
  // "goto "hell"" → { command: "goto", isFuzzyFindMode: true, fuzzyFindQuery: "hell" }
  // "goto "h" → { command: "goto", isFuzzyFindMode: true, fuzzyFindQuery: "h" }
  // "goto "h → { command: "goto", isFuzzyFindMode: true, fuzzyFindQuery: "h" } (입력 중)
  // "goto 10" → { command: "goto", isFuzzyFindMode: false, fuzzyFindQuery: "" }
}
```

#### 1.2 Fuzzy Find 모드 감지
- `goto "` 패턴 감지
- 따옴표가 열려있고 닫히지 않았으면 → 입력 중
- 따옴표가 열리고 닫혔으면 → 검색 완료

#### 1.3 실시간 검색 결과 표시
- Command Palette의 명령 목록 대신 검색 결과 표시
- 각 결과 항목:
  ```
  Row 5: common.buttons.hell
    Matched in: key
  Row 12: common.messages.welcome
    Matched in: context ("Go to hell")
  Row 23: common.values.greeting
    Matched in: values.en ("Hello")
  ```

---

### 2. 검색 로직

#### 2.1 검색 범위
- **Key**: `translation.key`
- **Context**: `translation.context`
- **Values**: 모든 언어의 `translation.values[lang]`

#### 2.2 매칭 점수 계산
```typescript
interface MatchResult {
  rowIndex: number;
  translation: Translation;
  score: number; // 0-100
  matchedFields: Array<{
    field: 'key' | 'context' | `values.${string}`;
    matchedText: string;
    matchType: 'exact' | 'contains' | 'fuzzy';
  }>;
}

// 점수 계산
- Key에 정확히 매치: +50점
- Key에 포함: +30점
- Context에 포함: +20점
- Value에 포함: +10점
- Fuzzy match (부분 일치): +5점
```

#### 2.3 정렬 순서
1. 매칭 점수 (높은 순)
2. 행 번호 (낮은 순)

---

### 3. UI/UX

#### 3.1 Command Palette 표시
```
[Command Palette]
> goto "hell

Search Results (3 matches):
  → Row 5: common.buttons.hell
     Matched in: key
  → Row 12: common.messages.welcome
     Matched in: context
  → Row 23: common.values.greeting
     Matched in: values.en
```

#### 3.2 입력 상태 표시
- `goto "hell` → 입력 중 (따옴표 미완성)
- `goto "hell"` → 검색 완료 (따옴표 완성)
- Enter → 첫 번째 매치로 이동

#### 3.3 키보드 네비게이션
- `ArrowUp/Down`: 검색 결과 간 이동
- `Enter`: 선택된 매치로 이동
- `Escape`: Command Palette 닫기
- `Backspace`: 입력 취소

---

### 4. 구현 단계

#### Phase 1: 기본 파싱 및 모드 감지
1. `parseInput` 메서드 구현
   - `goto "` 패턴 감지
   - 따옴표 상태 추적 (열림/닫힘)
   - fuzzy find 쿼리 추출

2. Command Palette에 모드 표시
   - fuzzy find 모드일 때 UI 변경
   - 검색 결과 영역 표시

#### Phase 2: 실시간 검색
1. `findMatches` 메서드 구현
   - key, context, values에서 검색
   - 매칭 점수 계산
   - 결과 정렬

2. Command Palette에 검색 결과 표시
   - 실시간 업데이트 (debounce 150ms)
   - 행 번호, 매치 필드 표시

#### Phase 3: 이동 및 상태 관리
1. Enter 시 첫 번째 매치로 이동
2. 검색 결과 저장 (`currentGotoMatches`)
3. 상태 표시 (매치 개수)

#### Phase 4: 순환 이동 (선택적)
1. `goto next` / `goto prev` 명령 추가
2. 현재 검색 결과에서 다음/이전 매치로 이동

---

### 5. 코드 구조

#### 5.1 Command Palette 확장
```typescript
// command-palette.ts
class CommandPalette {
  private isFuzzyFindMode: boolean = false;
  private fuzzyFindQuery: string = "";
  private fuzzyFindResults: MatchResult[] = [];
  
  private handleInput(query: string): void {
    const parsed = this.parseInput(query);
    
    if (parsed.isFuzzyFindMode) {
      this.isFuzzyFindMode = true;
      this.fuzzyFindQuery = parsed.fuzzyFindQuery;
      this.updateFuzzyFindResults();
    } else {
      this.isFuzzyFindMode = false;
      this.updateCommands();
    }
  }
  
  private updateFuzzyFindResults(): void {
    // VirtualTableDiv의 findMatches 호출
    // 결과를 Command Palette에 표시
  }
}
```

#### 5.2 VirtualTableDiv 확장
```typescript
// virtual-table-div.ts
class VirtualTableDiv {
  findMatches(keyword: string): MatchResult[] {
    // 검색 로직
    // 매칭 점수 계산
    // 정렬 및 반환
  }
  
  gotoToMatch(match: MatchResult): void {
    // 해당 행으로 이동
    // 포커스 설정
  }
}
```

---

### 6. 예외 처리

#### 6.1 따옴표 처리
- `goto "hell` → 입력 중 (따옴표 미완성, 검색 계속)
- `goto "hell"` → 검색 완료
- `goto "hell" extra` → "hell"만 검색, "extra"는 무시
- `goto "hell"world` → 따옴표 안의 내용만 검색

#### 6.2 검색 결과 없음
- "No matches found" 메시지 표시
- Enter 시 아무 동작 없음

#### 6.3 특수 문자
- 따옴표 이스케이프: `goto "say \"hello\""` → `say "hello"` 검색
- 공백 처리: `goto "hello world"` → `hello world` 검색

---

### 7. 테스트 케이스

#### 7.1 입력 파싱
- `goto "hell"` → fuzzy find 모드, 쿼리: "hell"
- `goto "h` → fuzzy find 모드, 쿼리: "h" (입력 중)
- `goto 10` → 일반 모드
- `goto top` → 일반 모드

#### 7.2 검색 결과
- Key 매치 우선순위 확인
- 여러 필드 매치 시 점수 합산 확인
- 정렬 순서 확인

#### 7.3 이동
- 첫 번째 매치로 이동 확인
- 스크롤 및 포커스 확인

---

### 8. 향후 확장

#### 8.1 Fuzzy Search 라이브러리 통합
- 현재: 간단한 포함 검색
- 향후: Fuse.js로 업그레이드 가능

#### 8.2 하이라이트
- 검색 결과에서 매치된 부분 하이라이트
- 그리드에서 매치된 셀 하이라이트

#### 8.3 순환 이동
- `goto next` / `goto prev` 명령
- 상태바에 현재 위치 표시

---

## 구현 우선순위

1. **Phase 1 (필수)**: 입력 파싱 및 모드 감지
2. **Phase 2 (필수)**: 실시간 검색 및 결과 표시
3. **Phase 3 (필수)**: 이동 기능
4. **Phase 4 (선택)**: 순환 이동

