# Goto 텍스트 검색 기능 설계

## 요구사항
- `goto hell` 같은 명령으로 "hell"이 포함된 곳으로 이동
- key, context, values (모든 언어)에서 검색
- fuzzy find 지원
- Multiple match 처리 방법

## Multiple Match 처리 옵션

### 옵션 1: 첫 번째 매치로 이동 + 상태 표시 (추천 ⭐)
**장점:**
- 빠르고 직관적
- 추가 UI 없이도 작동
- 기존 UX 패턴과 일치

**구현:**
- 첫 번째 매치로 이동
- 상태바/토스트에 "3 matches found, showing first" 표시
- `goto next` / `goto prev` 명령으로 순환 이동 가능

**예시:**
```
goto hell
→ 첫 번째 "hell" 매치로 이동
→ 상태바: "3 matches found (1/3). Press 'goto next' for next match"
```

---

### 옵션 2: Command Palette에서 매치 목록 표시
**장점:**
- 사용자가 직접 선택 가능
- 매치 컨텍스트 미리보기 가능

**단점:**
- 추가 클릭 필요
- Command Palette를 다시 열어야 함

**구현:**
- 여러 매치가 있으면 Command Palette에 매치 목록 표시
- 각 항목: "Row 5: common.buttons.hell" 형식
- 선택하면 해당 행으로 이동

**예시:**
```
goto hell
→ Command Palette에 매치 목록 표시:
  - Row 5: common.buttons.hell
  - Row 12: common.messages.hell (context: "Go to hell")
  - Row 23: common.values.hell (en: "Hello")
→ 사용자가 선택
```

---

### 옵션 3: 순환 이동 (goto next/prev)
**장점:**
- 빠른 순환 이동
- 키보드 중심 워크플로우

**단점:**
- 현재 위치 추적 필요
- 상태 관리 복잡

**구현:**
- `goto hell` → 첫 번째 매치로 이동 + 매치 목록 저장
- `goto next` → 다음 매치로 이동
- `goto prev` → 이전 매치로 이동
- 상태바에 현재 위치 표시 (2/5)

**예시:**
```
goto hell
→ 첫 번째 매치로 이동 (1/3)
goto next
→ 두 번째 매치로 이동 (2/3)
goto next
→ 세 번째 매치로 이동 (3/3)
goto next
→ 첫 번째 매치로 순환 (1/3)
```

---

### 옵션 4: 하이브리드 (옵션 1 + 3) ⭐⭐⭐
**장점:**
- 빠른 첫 이동 + 필요시 순환
- 유연한 사용자 경험

**구현:**
- `goto hell` → 첫 번째 매치로 이동 + 매치 목록 저장
- 상태바에 매치 개수 표시
- `goto next` / `goto prev` 명령으로 순환
- 상태바 업데이트: "Match 2 of 3"

**예시:**
```
goto hell
→ 첫 번째 매치로 이동
→ 상태바: "3 matches found (1/3). Use 'goto next' for next match"

goto next
→ 두 번째 매치로 이동
→ 상태바: "Match 2 of 3"

goto prev
→ 첫 번째 매치로 이동
→ 상태바: "Match 1 of 3"
```

---

## 검색 범위 및 우선순위

### 검색 범위
1. **Key** (가장 중요)
2. **Context**
3. **Values** (모든 언어)

### 우선순위 (매칭 점수)
- Key에 매치: 점수 3
- Context에 매치: 점수 2
- Value에 매치: 점수 1
- 여러 곳에 매치: 점수 합산

### 정렬 순서
1. 매칭 점수 (높은 순)
2. 행 번호 (낮은 순)

---

## Fuzzy Search 지원

### 옵션 A: 간단한 포함 검색 (현재 searchKeyword와 동일)
- `toLowerCase().includes(keyword)`
- 빠르고 단순

### 옵션 B: Fuse.js 사용 (Command Palette와 동일)
- 더 정교한 fuzzy matching
- 오타 허용
- 약간 느릴 수 있음

**추천: 옵션 A (간단한 포함 검색)**
- goto는 빠른 이동이 목적
- 정확한 키워드 입력을 가정
- 필요시 나중에 Fuse.js로 업그레이드 가능

---

## 구현 계획

### Phase 1: 기본 텍스트 검색
1. `goto` 명령에서 숫자가 아닌 경우 텍스트 검색으로 처리
2. `findMatches(keyword)` 메서드 구현
   - key, context, values에서 검색
   - 매칭 점수 계산
   - 정렬 (점수 → 행 번호)
3. 첫 번째 매치로 이동
4. 상태 표시 (매치 개수)

### Phase 2: 순환 이동
1. 현재 검색 결과 저장 (`currentSearchMatches`, `currentMatchIndex`)
2. `goto next` / `goto prev` 명령 추가
3. 상태바 업데이트

### Phase 3: 향상된 UX
1. 매치 하이라이트 (선택적)
2. 상태바 개선
3. 키보드 단축키 (예: `Ctrl+G` → `goto next`)

---

## 명령어 예시

```
goto 10          → 10번째 행으로 이동 (기존)
goto top         → 첫 번째 행으로 이동 (기존)
goto bottom      → 마지막 행으로 이동 (기존)
goto hell        → "hell"이 포함된 첫 번째 매치로 이동
goto next        → 다음 매치로 이동 (검색 결과가 있을 때만)
goto prev        → 이전 매치로 이동 (검색 결과가 있을 때만)
```

---

## 상태 관리

```typescript
private currentSearchMatches: {
  keyword: string;
  matches: Array<{
    rowIndex: number;
    translation: Translation;
    score: number;
    matchedFields: string[]; // ['key', 'context', 'values.en']
  }>;
  currentIndex: number;
} | null = null;
```

---

## 추천 구현 순서

1. **Phase 1 (기본 텍스트 검색)** - 가장 중요
   - 빠른 구현
   - 즉시 사용 가능
   - 사용자 피드백 수집

2. **Phase 2 (순환 이동)** - 사용자 요청 시
   - Phase 1 사용 후 필요성 판단
   - 상태 관리 추가

3. **Phase 3 (향상된 UX)** - 선택적
   - 사용자 피드백 기반
   - 점진적 개선

