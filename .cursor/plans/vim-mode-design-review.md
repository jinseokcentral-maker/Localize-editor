# Vim 모드 설계 검토 결과

## 📋 검토 개요

현재 코드베이스와 Vim 모드 설계를 비교 분석하여 개선 사항과 주의사항을 정리했습니다.

---

## ✅ 잘 설계된 부분

### 1. 기존 아키텍처와의 호환성
- ✅ `EditorMode` 타입이 이미 정의되어 있음 (`"excel" | "vim" | "hybrid" | "all"`)
- ✅ `CommandRegistry`가 모드별 필터링을 지원 (`availableInModes`)
- ✅ `CommandPalette`가 모드별 명령어 필터링 지원
- ✅ `StatusBar`가 모드 표시를 지원 (`mode: string`)

### 2. 기존 기능과의 통합
- ✅ Quick Search (`/` 키)는 이미 Vim 스타일로 작동
- ✅ Command Palette (`Cmd/Ctrl+K`)는 모든 모드에서 작동
- ✅ Find & Replace는 모든 모드에서 작동
- ✅ `CellEditor`가 `onEditStateChange` 콜백 제공

---

## ⚠️ 개선이 필요한 부분

### 1. 키보드 이벤트 처리 구조

#### 문제점
- 현재 `KeyboardHandler`는 전역 키보드 이벤트를 처리합니다.
- Vim 모드에서 `hjkl` 키를 처리할 때, Insert 모드에서는 이 키들이 텍스트 입력으로 처리되어야 합니다.
- 현재 `isInputField` 체크만으로는 Insert 모드와 Normal 모드를 구분하기 어렵습니다.

#### 해결 방안
```typescript
// KeyboardHandler에 모드 상태 확인 추가
interface KeyboardHandlerCallbacks {
  // ... 기존 콜백들
  getCurrentMode?: () => { editorMode: EditorMode; vimMode?: VimMode };
  isVimInsertMode?: () => boolean;
}

// 키 처리 로직 수정
if (this.callbacks.getCurrentMode) {
  const modeState = this.callbacks.getCurrentMode();
  
  // Vim Normal 모드에서만 hjkl 처리
  if (modeState.editorMode === "vim" && modeState.vimMode === "normal") {
    // hjkl 처리
  }
  
  // Vim Insert 모드에서는 hjkl을 기본 동작으로 처리
  if (modeState.editorMode === "vim" && modeState.vimMode === "insert") {
    // 기본 동작 (텍스트 입력)
    return;
  }
}
```

**권장 사항**: 별도의 `VimKeyboardHandler` 클래스를 만들지 말고, 기존 `KeyboardHandler`에 모드별 분기 처리를 추가하는 것이 더 효율적입니다.

---

### 2. 모드 전환과 편집 상태의 관계

#### 문제점
- 현재 `CellEditor.isEditing()`은 편집 중인지만 확인합니다.
- Vim 모드에서 Insert 모드와 편집 상태(`isEditing`)를 구분해야 합니다.
- Normal 모드에서 `i` 키를 누르면 Insert 모드로 전환하고 편집을 시작해야 합니다.

#### 해결 방안
```typescript
// ModeManager에 편집 상태 통합
interface ModeState {
  editorMode: EditorMode;
  vimMode?: VimMode;
  // isEditing은 CellEditor에서 관리하되, ModeManager가 참조
}

// VirtualTableDiv에서 모드 전환 시 편집 시작
setVimMode("insert") {
  // 현재 포커스된 셀에서 편집 시작
  const focusedCell = this.focusManager.getFocusedCell();
  if (focusedCell) {
    this.startEditing(focusedCell.rowIndex, focusedCell.columnId);
  }
}
```

**권장 사항**: `ModeManager`가 `CellEditor`의 편집 상태를 직접 관리하지 말고, `VirtualTableDiv`에서 모드 전환과 편집 시작을 조율합니다.

---

### 3. Esc 키 처리

#### 문제점
- 현재 `CellEditor`에서 `Esc` 키는 편집 취소로 처리됩니다.
- Vim 모드에서 `Esc` 키는 Normal 모드로 복귀하는 역할도 해야 합니다.
- 두 동작을 조화롭게 통합해야 합니다.

#### 해결 방안
```typescript
// CellEditor의 Esc 처리
input.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    this.isEscapeKeyPressed = true;
    input.blur(); // 편집 종료
    
    // Vim 모드인 경우 Normal 모드로 전환
    if (this.callbacks.onEscapePressed) {
      this.callbacks.onEscapePressed();
    }
  }
});

// VirtualTableDiv에서 처리
onEscapePressed: () => {
  if (this.currentMode === "vim" && this.vimMode === "insert") {
    this.setVimMode("normal");
  }
}
```

**권장 사항**: `CellEditor`에 `onEscapePressed` 콜백을 추가하여 Vim 모드 전환을 처리합니다.

---

### 4. `a` 키 동작 (Insert 모드 진입 - 끝에서)

#### 문제점
- `a` 키는 Insert 모드 진입 시 셀 끝에서 편집을 시작해야 합니다.
- 현재 `CellEditor.startEditing()`은 항상 셀 시작에서 편집을 시작합니다.

#### 해결 방안
```typescript
// CellEditor에 편집 시작 위치 옵션 추가
startEditing(
  rowIndex: number,
  columnId: string,
  rowId: string,
  cell: HTMLElement,
  options?: { cursorPosition?: "start" | "end" | number }
): void {
  // ... 기존 코드
  
  requestAnimationFrame(() => {
    input.focus();
    
    if (options?.cursorPosition === "end") {
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (typeof options?.cursorPosition === "number") {
      input.setSelectionRange(options.cursorPosition, options.cursorPosition);
    } else {
      input.select(); // 기본: 전체 선택
    }
  });
}

// Vim 모드에서 a 키 처리
if (e.key === "a" && modeState.vimMode === "normal") {
  this.setVimMode("insert");
  this.startEditing(rowIndex, columnId, rowId, cell, { cursorPosition: "end" });
}
```

**권장 사항**: `CellEditor`에 커서 위치 옵션을 추가합니다.

---

### 5. `gg`/`G` 키 처리 (연속 키 입력)

#### 문제점
- `gg`는 두 번의 `g` 키 입력을 감지해야 합니다.
- 현재 `KeyboardHandler`는 단일 키 입력만 처리합니다.

#### 해결 방안
```typescript
// VimKeyboardHandler에 키 시퀀스 추적 추가
class VimKeyboardHandler {
  private keySequence: string[] = [];
  private keySequenceTimeout: number | null = null;
  private readonly KEY_SEQUENCE_TIMEOUT = 1000; // 1초

  private handleKeySequence(key: string): boolean {
    this.keySequence.push(key);
    
    // 기존 타이머 취소
    if (this.keySequenceTimeout) {
      clearTimeout(this.keySequenceTimeout);
    }
    
    // 시퀀스 확인
    const sequence = this.keySequence.join("");
    if (sequence === "gg") {
      // 첫 번째 행으로 이동
      this.keySequence = [];
      return true;
    }
    
    // 타이머 설정 (시퀀스 초기화)
    this.keySequenceTimeout = window.setTimeout(() => {
      this.keySequence = [];
    }, this.KEY_SEQUENCE_TIMEOUT);
    
    return false;
  }
}
```

**권장 사항**: `KeyboardHandler`에 키 시퀀스 추적 기능을 추가하거나, 별도의 `VimKeySequenceTracker` 클래스를 만듭니다.

---

### 6. 모드 상태 관리 위치

#### 문제점
- 설계에서는 `ModeManager`를 별도 클래스로 만들었지만, `VirtualTableDiv`에 통합하는 것이 더 효율적일 수 있습니다.

#### 해결 방안
```typescript
// VirtualTableDiv에 모드 상태 통합
export class VirtualTableDiv {
  private currentMode: EditorMode = "excel";
  private vimMode: VimMode = "normal";
  
  setEditorMode(mode: EditorMode): void {
    this.currentMode = mode;
    if (mode === "vim") {
      this.vimMode = "normal";
    }
    this.updateStatusBar();
    // KeyboardHandler에 모드 변경 알림
    this.keyboardHandlerModule.updateCallbacks({
      getCurrentMode: () => ({ editorMode: this.currentMode, vimMode: this.vimMode }),
    });
  }
  
  setVimMode(mode: VimMode): void {
    if (this.currentMode !== "vim") {
      return;
    }
    this.vimMode = mode;
    this.updateStatusBar();
  }
}
```

**권장 사항**: 별도의 `ModeManager` 클래스를 만들지 말고, `VirtualTableDiv`에 모드 상태를 통합합니다. 이렇게 하면 상태 관리가 더 단순해집니다.

---

### 7. 상태바 모드 표시

#### 문제점
- 현재 `StatusBar`는 `mode: string`을 받습니다.
- Vim 모드에서는 `[Vim Normal]`, `[Vim Insert]` 등으로 표시해야 합니다.

#### 해결 방안
```typescript
// VirtualTableDiv에서 모드 문자열 생성
private getModeString(): string {
  if (this.currentMode === "vim") {
    if (this.vimMode === "normal") {
      return "Vim Normal";
    } else if (this.vimMode === "insert") {
      return "Vim Insert";
    } else if (this.vimMode === "visual") {
      return "Vim Visual";
    }
  } else if (this.currentMode === "excel") {
    const isEditing = this.cellEditor.isEditing();
    return isEditing ? "Editing" : "Normal";
  }
  return "Normal";
}

// StatusBar 업데이트
this.updateStatusBar({
  mode: this.getModeString(),
  // ... 기타 정보
});
```

**권장 사항**: `VirtualTableDiv`에서 모드 문자열을 생성하여 `StatusBar`에 전달합니다.

---

### 8. Quick Search와의 통합

#### 현재 상태
- ✅ Quick Search는 이미 `n`/`N` 키를 처리합니다.
- ✅ Quick Search 모드일 때는 Vim 키 처리를 건너뛰어야 합니다.

#### 해결 방안
```typescript
// KeyboardHandler에서 Quick Search 모드 확인
if (this.callbacks.isQuickSearchMode && this.callbacks.isQuickSearchMode()) {
  // Quick Search가 활성화되어 있으면 Vim 키 처리를 건너뜀
  return;
}

// Vim Normal 모드에서만 hjkl 처리
if (modeState.editorMode === "vim" && modeState.vimMode === "normal") {
  // hjkl 처리
}
```

**권장 사항**: 이미 구현되어 있으므로 추가 작업 불필요합니다.

---

## 🔧 수정된 설계 권장 사항

### 1. 아키텍처 변경

**기존 설계**:
```
VirtualTableDiv
  └── ModeManager (별도 클래스)
  └── KeyboardHandler
      └── VimKeyboardHandler (별도 클래스)
```

**수정된 설계**:
```
VirtualTableDiv
  ├── currentMode: EditorMode
  ├── vimMode: VimMode
  └── KeyboardHandler
      └── 모드별 분기 처리 (내부 로직)
```

**이유**: 
- 상태 관리가 더 단순해집니다.
- 불필요한 클래스 생성을 피할 수 있습니다.
- 모드 상태가 한 곳에서 관리됩니다.

---

### 2. 키 처리 우선순위 명확화

```typescript
// 키 처리 우선순위 (위에서 아래 순서)
1. 글로벌 키 (모든 모드에서 작동)
   - Cmd/Ctrl+K: Command Palette
   - Cmd/Ctrl+F: Find
   - Cmd/Ctrl+H: Replace
   - /: Quick Search

2. Quick Search 모드 확인
   - Quick Search 모드일 때는 Vim 키 처리를 건너뜀

3. Input 필드 확인
   - Input 필드일 때는 기본 동작 (텍스트 입력)

4. 모드별 키 처리
   - Excel 모드: 기존 동작
   - Vim Normal 모드: hjkl, i, a, u, Ctrl+R, gg, G, 0, $
   - Vim Insert 모드: Esc만 처리 (나머지는 기본 동작)
```

---

### 3. 모드 전환 명령 추가

```typescript
// CommandRegistry에 모드 전환 명령 추가
this.commandRegistry.registerCommand({
  id: "mode-excel",
  label: "Switch to Excel mode",
  keywords: ["mode", "excel", "switch"],
  execute: () => {
    this.setEditorMode("excel");
  },
  category: "mode",
  availableInModes: ["all"],
});

this.commandRegistry.registerCommand({
  id: "mode-vim",
  label: "Switch to Vim mode",
  keywords: ["mode", "vim", "switch"],
  execute: () => {
    this.setEditorMode("vim");
  },
  category: "mode",
  availableInModes: ["all"],
});
```

---

## 📝 구현 순서 (수정된 버전)

### Step 1: 모드 상태 관리 통합
1. `VirtualTableDiv`에 `currentMode`, `vimMode` 속성 추가
2. `setEditorMode()`, `setVimMode()` 메서드 추가
3. `StatusBar` 모드 표시 업데이트
4. Command Palette 모드 전환 명령 추가

### Step 2: KeyboardHandler 모드 지원
1. `KeyboardHandlerCallbacks`에 `getCurrentMode()` 추가
2. 키 처리 로직에 모드별 분기 추가
3. Vim Normal 모드 키 처리 (`hjkl`, `i`, `a`, `Esc`)
4. Vim Insert 모드 키 처리 (`Esc`)

### Step 3: CellEditor 개선
1. `startEditing()`에 `cursorPosition` 옵션 추가
2. `onEscapePressed` 콜백 추가
3. Vim 모드 전환과 통합

### Step 4: Vim 네비게이션
1. `gg`/`G` 키 시퀀스 처리
2. `0`/`$` 행 내 이동
3. `u`/`Ctrl+R` Undo/Redo

### Step 5: 테스트
1. 단위 테스트 작성
2. E2E 테스트 작성
3. 모드 전환 테스트
4. 키보드 동작 테스트

---

## ✅ 최종 권장 사항

1. **별도 클래스 생성 최소화**: `ModeManager`, `VimKeyboardHandler`를 별도 클래스로 만들지 말고, 기존 클래스에 통합합니다.

2. **상태 관리 단순화**: 모드 상태를 `VirtualTableDiv`에서 직접 관리합니다.

3. **점진적 구현**: Phase 1 (MVP)부터 시작하여 단계적으로 확장합니다.

4. **기존 기능 보존**: Excel 모드의 기존 동작을 유지하면서 Vim 모드를 추가합니다.

5. **테스트 우선**: 각 단계마다 테스트를 작성하여 회귀를 방지합니다.

---

## 📚 참고

- [Vim 모드 설계](./vim-mode-design.md)
- [Vim 모드 구현 상태](./Vim_모드_구현_상태.md)
- [진행상황 요약](./진행상황_요약.md)

