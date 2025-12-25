# Vim 모드 구현 설계

## 📋 개요

i18n 번역 에디터에 Vim 모드를 추가하여 Vim 사용자들이 익숙한 키보드 인터페이스를 제공합니다.

---

## 🎯 목표

1. **Vim 사용자 친화적**: Vim 사용자들이 즉시 사용할 수 있는 익숙한 키보드 인터페이스
2. **기존 기능과 통합**: Command Palette, Quick Search 등 기존 유틸리티와 완벽하게 통합
3. **점진적 학습**: Excel 모드에서 Vim 모드로 자연스럽게 전환 가능
4. **성능**: 모드 전환 및 키 처리에 오버헤드 없음

---

## 🏗️ 아키텍처

### 1. 모드 시스템 구조

```
┌─────────────────────────────────────┐
│      VirtualTableDiv                │
│  ┌───────────────────────────────┐  │
│  │   ModeManager (새로 추가)      │  │
│  │   - currentMode: EditorMode    │  │
│  │   - modeState: ModeState       │  │
│  │   - onModeChange callback      │  │
│  └───────────────────────────────┘  │
│           │                          │
│           ├── KeyboardHandler        │
│           │   └── VimKeyboardHandler │
│           │                          │
│           ├── StatusBar              │
│           │   └── 모드 표시 업데이트 │
│           │                          │
│           └── CommandPalette         │
│               └── 모드별 명령 필터링 │
└─────────────────────────────────────┘
```

### 2. 모드 타입 정의

```typescript
// 기존 EditorMode 확장 (이미 정의됨)
type EditorMode = "excel" | "vim" | "hybrid" | "all";

// Vim 모드 내부 상태
type VimMode = "normal" | "insert" | "visual" | "visual-line" | "visual-block" | "command";

// 전체 모드 상태
interface ModeState {
  editorMode: EditorMode;
  vimMode?: VimMode;  // vim 모드일 때만 존재
  isEditing?: boolean; // 편집 중인지 (Insert 모드와 구분)
}
```

---

## 📦 Phase 1: 핵심 Vim 기능 (MVP)

### 1.1 모드 시스템 기반 구축

#### ModeManager 클래스
- **역할**: 모드 상태 관리 및 전환
- **위치**: `src/components/mode-manager.ts`
- **기능**:
  - `setEditorMode(mode: EditorMode)`: 에디터 모드 전환 (excel ↔ vim)
  - `setVimMode(mode: VimMode)`: Vim 내부 모드 전환 (normal ↔ insert ↔ visual)
  - `getCurrentModeState(): ModeState`: 현재 모드 상태 반환
  - `onModeChange(callback)`: 모드 변경 콜백

#### 모드 전환 명령
- Command Palette에 `mode vim`, `mode excel` 명령 추가
- 단축키: `Cmd/Ctrl+M` (모드 전환 메뉴, 선택적)

### 1.2 Normal/Insert 모드 기본

#### Normal 모드 (기본 모드)
- **특징**: 셀 간 이동 및 명령 실행
- **표시**: 상태바에 `[Vim Normal]` 표시
- **키 동작**:
  - `hjkl`: 셀 이동 (왼, 아래, 위, 오른)
  - `i`: Insert 모드 진입 (현재 셀 편집 시작)
  - `a`: Insert 모드 진입 (현재 셀 끝에서 편집 시작)
  - `Esc`: Normal 모드로 복귀 (편집 중일 때)
  - `u`: Undo
  - `Ctrl+R`: Redo
  - `gg`: 첫 번째 행으로 이동
  - `G`: 마지막 행으로 이동
  - `0`: 행의 첫 번째 셀로 이동
  - `$`: 행의 마지막 셀로 이동

#### Insert 모드 (편집 모드)
- **특징**: 텍스트 입력 및 편집
- **표시**: 상태바에 `[Vim Insert]` 표시
- **키 동작**:
  - 모든 텍스트 입력 키는 기본 동작 (브라우저 기본)
  - `Esc`: Normal 모드로 복귀
  - `Arrow keys`: 텍스트 내 커서 이동 (기본 동작)
  - `Enter`: 줄바꿈 (기본 동작)
  - `Tab`: 들여쓰기 (기본 동작)

#### 모드 전환 로직
```
Normal 모드
  ├─ i/a → Insert 모드 (셀 편집 시작)
  └─ Esc (편집 중) → Normal 모드

Insert 모드
  └─ Esc → Normal 모드 (편집 종료)
```

### 1.3 Vim 키보드 핸들러

#### VimKeyboardHandler 클래스
- **역할**: Vim 모드에서의 키보드 이벤트 처리
- **위치**: `src/components/vim-keyboard-handler.ts`
- **통합**: `KeyboardHandler`에 통합 또는 분기 처리

#### 키 처리 우선순위
1. **글로벌 키** (모든 모드에서 작동):
   - `Cmd/Ctrl+K`: Command Palette
   - `Cmd/Ctrl+F`: Find
   - `Cmd/Ctrl+H`: Replace
   - `/`: Quick Search

2. **Vim Normal 모드 키**:
   - `hjkl`: 셀 이동
   - `i/a`: Insert 모드 진입
   - `u/Ctrl+R`: Undo/Redo
   - `gg/G`: 행 이동
   - `0/$`: 행 내 이동

3. **Vim Insert 모드 키**:
   - `Esc`: Normal 모드로 복귀
   - 나머지는 기본 동작

### 1.4 상태바 모드 표시

#### StatusBar 업데이트
- 현재 모드 표시:
  - Excel 모드: `[Normal]` 또는 `[Editing]`
  - Vim Normal 모드: `[Vim Normal]`
  - Vim Insert 모드: `[Vim Insert]`
  - Vim Visual 모드: `[Vim Visual]` (Phase 2)

---

## 📦 Phase 2: 고급 Vim 기능

### 2.1 Visual 모드

#### Visual 모드 (셀 선택)
- **v**: Visual 모드 진입 (셀 단위 선택)
- **V**: Visual Line 모드 (행 단위 선택)
- **Ctrl+V**: Visual Block 모드 (컬럼 단위 선택)
- **표시**: 선택된 셀에 배경색 표시
- **동작**: `hjkl`로 선택 영역 확장

#### Visual 모드 명령어
- `d`: 선택된 셀 삭제
- `y`: 선택된 셀 복사
- `p`: 붙여넣기 (아래 행에)
- `P`: 붙여넣기 (위 행에)
- `Esc`: Normal 모드로 복귀

### 2.2 빠른 이동

#### 행 이동
- `gg`: 첫 번째 행으로 이동
- `G`: 마지막 행으로 이동
- `{숫자}G`: 특정 행으로 이동 (예: `10G` → 10번째 행)
- `{숫자}gg`: 특정 행으로 이동 (예: `10gg` → 10번째 행)

#### 행 내 이동
- `0`: 행의 첫 번째 셀로 이동
- `$`: 행의 마지막 셀로 이동
- `w`: 다음 단어/셀로 이동 (편집 가능한 셀만)
- `b`: 이전 단어/셀로 이동 (편집 가능한 셀만)

### 2.3 텍스트 조작

#### 셀 단위 조작
- `dd`: 현재 행 삭제 (향후 구현)
- `yy`: 현재 행 복사 (향후 구현)
- `p`: 붙여넣기 (아래 행에, 향후 구현)
- `P`: 붙여넣기 (위 행에, 향후 구현)
- `x`: 현재 셀 삭제 (값을 빈 문자열로)
- `r{문자}`: 현재 셀을 한 문자로 교체 (향후 구현)

#### 편집 명령어
- `cw`: 현재 단어 변경 (향후 구현)
- `dw`: 현재 단어 삭제 (향후 구현)
- `o`: Insert 모드 진입 (아래 행에 새 셀 추가, 향후 구현)
- `O`: Insert 모드 진입 (위 행에 새 셀 추가, 향후 구현)

---

## 📦 Phase 3: Vim 명령어 모드

### 3.1 `:` 명령어 모드

#### 명령어 모드 진입
- `:` 키로 명령어 입력 모드 진입
- Command Palette와 통합 또는 별도 UI

#### 지원 명령어
- `:w`: 저장 (향후 구현)
- `:q`: 종료 (향후 구현)
- `:goto {숫자}`: 특정 행으로 이동
- `:goto "keyword"`: 텍스트 검색
- `:filter empty`: 빈 번역 필터
- `:filter changed`: 변경된 셀 필터
- `:filter duplicate`: 중복 Key 필터
- `:clear filter`: 필터 제거
- `:mode excel`: Excel 모드로 전환
- `:mode vim`: Vim 모드로 전환
- `:help`: 도움말 표시

#### 명령어 히스토리
- 위/아래 화살표로 이전 명령어 탐색
- Command Palette의 히스토리와 통합

---

## 🔄 기존 기능과의 통합

### 1. Command Palette
- ✅ 이미 모드별 필터링 지원 (`availableInModes`)
- ✅ Vim 모드에서도 `Cmd/Ctrl+K`로 작동
- ✅ Vim 전용 명령어 추가 가능

### 2. Quick Search
- ✅ 이미 Vim 스타일 (`/` 키)
- ✅ Vim 모드에서도 동일하게 작동
- ✅ `n`/`N` 키로 다음/이전 매칭 이동

### 3. Find & Replace
- ✅ `Cmd/Ctrl+F`로 찾기
- ✅ `Cmd/Ctrl+H`로 바꾸기
- ✅ Vim 모드에서도 동일하게 작동

### 4. Status Bar
- ✅ 모드 표시 업데이트 필요
- ✅ Vim 모드 상태 표시 추가

### 5. Undo/Redo
- ✅ `u`/`Ctrl+R` 키 추가 (Normal 모드)
- ✅ 기존 `Cmd+Z`/`Cmd+Y`도 계속 작동

---

## 🎨 UI/UX 고려사항

### 1. 모드 표시
- **상태바**: `[Vim Normal]`, `[Vim Insert]`, `[Vim Visual]`
- **시각적 피드백**: 모드 전환 시 부드러운 애니메이션 (선택적)

### 2. 키보드 단축키 충돌 방지
- **글로벌 키**: 모든 모드에서 동일하게 작동
  - `Cmd/Ctrl+K`: Command Palette
  - `Cmd/Ctrl+F`: Find
  - `Cmd/Ctrl+H`: Replace
  - `/`: Quick Search
- **모드별 키**: 모드에 따라 다르게 작동
  - Normal 모드: `hjkl` (셀 이동)
  - Insert 모드: `hjkl` (텍스트 내 커서 이동, 기본 동작)

### 3. 점진적 학습 지원
- **하이브리드 모드**: Excel 기본 + Vim 보조 (향후 구현)
- **도움말**: `:help` 명령으로 Vim 모드 단축키 표시

---

## 📝 구현 순서

### Step 1: 모드 시스템 기반 구축
1. `ModeManager` 클래스 생성
2. `VirtualTableDiv`에 모드 관리 통합
3. 상태바 모드 표시 업데이트
4. Command Palette 모드 전환 명령 추가

### Step 2: Normal/Insert 모드 기본
1. `VimKeyboardHandler` 클래스 생성
2. Normal 모드 키 처리 (`hjkl`, `i`, `a`, `Esc`)
3. Insert 모드 키 처리 (`Esc`)
4. 모드 전환 로직 구현
5. 상태바 모드 표시 업데이트

### Step 3: Vim 네비게이션
1. `gg`/`G` 행 이동 구현
2. `0`/`$` 행 내 이동 구현
3. `w`/`b` 단어 단위 이동 구현 (선택적)

### Step 4: Vim Undo/Redo
1. `u` 키로 Undo (Normal 모드)
2. `Ctrl+R` 키로 Redo (Normal 모드)
3. 기존 `Cmd+Z`/`Cmd+Y`와 통합

### Step 5: 테스트
1. 단위 테스트 작성
2. E2E 테스트 작성
3. 모드 전환 테스트
4. 키보드 동작 테스트

---

## 🧪 테스트 계획

### 단위 테스트
- `ModeManager` 테스트
- `VimKeyboardHandler` 테스트
- 모드 전환 로직 테스트

### E2E 테스트
- 모드 전환 테스트
- Normal 모드 키 동작 테스트
- Insert 모드 키 동작 테스트
- 기존 기능과의 통합 테스트

---

## 🚀 향후 확장

### Phase 4: Visual 모드
- Visual 모드 구현
- 셀 선택 및 조작
- 복사/붙여넣기

### Phase 5: 텍스트 조작
- `dd`/`yy`/`p` 구현
- `cw`/`dw` 구현
- `o`/`O` 구현

### Phase 6: 명령어 모드
- `:` 명령어 모드 구현
- 명령어 히스토리
- Command Palette 통합

---

## 📚 참고 문서

- [Vim 모드 구현 상태](./Vim_모드_구현_상태.md)
- [진행상황 요약](./진행상황_요약.md)
- [문서별 구현 상태 요약](./문서별_구현_상태_요약.md)

---

## ✅ 체크리스트

### Phase 1 (MVP)
- [ ] `ModeManager` 클래스 생성
- [ ] `VimKeyboardHandler` 클래스 생성
- [ ] Normal/Insert 모드 전환 구현
- [ ] `hjkl` 네비게이션 구현
- [ ] `i`/`a` Insert 모드 진입 구현
- [ ] `Esc` Normal 모드 복귀 구현
- [ ] `u`/`Ctrl+R` Undo/Redo 구현
- [ ] `gg`/`G` 행 이동 구현
- [ ] `0`/`$` 행 내 이동 구현
- [ ] 상태바 모드 표시 업데이트
- [ ] Command Palette 모드 전환 명령 추가
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성

### Phase 2 (고급 기능)
- [ ] Visual 모드 구현
- [ ] `v`/`V`/`Ctrl+V` Visual 모드 진입
- [ ] Visual 모드 선택 영역 표시
- [ ] `d`/`y`/`p` 텍스트 조작
- [ ] `w`/`b` 단어 단위 이동

### Phase 3 (명령어 모드)
- [ ] `:` 명령어 모드 구현
- [ ] 명령어 히스토리
- [ ] Command Palette 통합

