# Vim 모드 구현 상태 및 요구사항

## 📋 현재 상태

### ✅ 이미 구현된 것 (Vim 모드에서도 사용 가능)

#### 1. Command Palette (명령 팔레트) ✅
- **상태**: 모든 모드에서 작동하도록 설계됨
- **기능**:
  - `Cmd/Ctrl+K`로 팔레트 열기 (모든 모드에서 작동)
  - 모드별 명령 필터링 (`availableInModes` 속성)
  - Vim 전용 명령어 등록 가능
- **구현 위치**: `CommandRegistry`, `CommandPalette`
- **테스트**: ✅ 단위 테스트 및 E2E 테스트 완료

#### 2. Quick Search (빠른 검색) ✅
- **상태**: 모든 모드에서 작동
- **기능**:
  - `/` 키로 검색 모드 진입 (Vim 스타일)
  - `n`/`N` 키로 다음/이전 매칭 이동
  - 컬럼별 검색 (`/key:keyword`, `/en:keyword`)
- **구현 위치**: `QuickSearch`, `QuickSearchUI`
- **테스트**: ✅ 단위 테스트 및 E2E 테스트 완료

#### 3. 필터링 기능 ✅
- **상태**: 모든 모드에서 작동
- **기능**:
  - Command Palette에서 `filter empty`, `filter changed`, `filter duplicate` 명령
  - `search <keyword>` 명령
- **구현 위치**: `VirtualTableDiv`
- **테스트**: ✅ E2E 테스트 완료

#### 4. Goto 텍스트 검색 (Fuzzy Find) ✅
- **상태**: 모든 모드에서 작동
- **기능**:
  - `goto "keyword"` 형식으로 텍스트 검색
  - `goto next`/`goto prev` 명령
- **구현 위치**: `TextSearchMatcher`, `CommandPalette`
- **테스트**: ✅ E2E 테스트 완료

#### 5. Status Bar (상태바) ✅
- **상태**: 모든 모드에서 작동
- **기능**: 현재 상태 정보 표시
- **구현 위치**: `StatusBar`
- **테스트**: ✅ E2E 테스트 완료

#### 6. Help Modal (도움말) ✅
- **상태**: 모든 모드에서 작동
- **기능**: `help` 명령으로 도움말 표시
- **구현 위치**: `VirtualTableDiv`
- **테스트**: ✅ E2E 테스트 완료

---

## ❌ 미구현: Vim 모드 핵심 기능

### 1. Vim 모드 시스템 (Normal/Insert/Visual 모드) ❌
- **상태**: 전혀 구현되지 않음
- **필요한 기능**:
  - Normal 모드 (기본 모드)
  - Insert 모드 (편집 모드)
  - Visual 모드 (선택 모드)
  - 모드 전환 로직
  - 모드 표시 (상태바에 표시)

### 2. Vim 키보드 네비게이션 ❌
- **상태**: 전혀 구현되지 않음
- **필요한 기능**:
  - `h, j, k, l`: 셀 이동 (왼, 아래, 위, 오른)
  - `gg`: 첫 번째 행으로 이동
  - `G`: 마지막 행으로 이동
  - `0`: 행의 첫 번째 셀로 이동
  - `$`: 행의 마지막 셀로 이동
  - `w`: 다음 단어/셀로 이동
  - `b`: 이전 단어/셀로 이동

### 3. Vim 편집 명령어 ❌
- **상태**: 전혀 구현되지 않음
- **필요한 기능**:
  - `i`: Insert 모드 진입 (현재 셀 편집 시작)
  - `a`: Insert 모드 진입 (현재 셀 끝에서 편집 시작)
  - `o`: Insert 모드 진입 (아래 행에 새 셀 추가)
  - `O`: Insert 모드 진입 (위 행에 새 셀 추가)
  - `Esc`: Normal 모드로 복귀

### 4. Vim Visual 모드 ❌
- **상태**: 전혀 구현되지 않음
- **필요한 기능**:
  - `v`: Visual 모드 진입 (셀 선택)
  - `V`: Visual Line 모드 (행 선택)
  - `Ctrl+V`: Visual Block 모드 (컬럼 선택)
  - 선택된 셀 시각적 표시
  - 선택된 셀에 대한 작업 (복사, 삭제 등)

### 5. Vim 텍스트 조작 ❌
- **상태**: 전혀 구현되지 않음
- **필요한 기능**:
  - `dd`: 현재 행 삭제
  - `yy`: 현재 행 복사
  - `p`: 붙여넣기 (아래 행에)
  - `P`: 붙여넣기 (위 행에)
  - `x`: 현재 셀 삭제
  - `r`: 현재 셀 교체
  - `cw`: 현재 단어 변경
  - `dw`: 현재 단어 삭제

### 6. Vim 명령어 모드 (`:`) ❌
- **상태**: 전혀 구현되지 않음
- **필요한 기능**:
  - `:` 키로 명령어 입력 모드 진입
  - Command Palette와 통합 (또는 별도 구현)
  - Vim 스타일 명령어 (`:w`, `:q`, `:goto 100` 등)
  - 명령어 히스토리 (위/아래 화살표)

### 7. Vim Undo/Redo ❌
- **상태**: 부분 구현 (현재는 Cmd+Z/Y만 작동)
- **필요한 기능**:
  - `u`: Undo (Normal 모드에서)
  - `Ctrl+R`: Redo (Normal 모드에서)
  - Vim 스타일 Undo 트리 (향후)

### 8. Vim 검색 (`/`) ✅
- **상태**: 이미 Quick Search로 구현됨
- **기능**: `/` 키로 검색 모드 진입
- **참고**: 이미 Vim 스타일로 작동함

---

## 📊 Vim 모드에서 사용 가능한 Utility 요약

### ✅ 이미 작동하는 Utility (모드 무관)

| Utility | 상태 | Vim 모드에서 사용 가능? |
|---------|------|----------------------|
| Command Palette (Cmd/Ctrl+K) | ✅ | ✅ 예 |
| Quick Search (`/`) | ✅ | ✅ 예 |
| 필터링 (filter empty/changed/duplicate) | ✅ | ✅ 예 |
| Goto 텍스트 검색 (`goto "keyword"`) | ✅ | ✅ 예 |
| Status Bar | ✅ | ✅ 예 |
| Help Modal | ✅ | ✅ 예 |
| Undo/Redo (Cmd+Z/Y) | ✅ | ✅ 예 (하지만 Vim 스타일 `u`/`Ctrl+R` 필요) |

### ❌ Vim 모드 전용 기능 (미구현)

| 기능 | 상태 | 우선순위 |
|------|------|---------|
| Normal/Insert/Visual 모드 | ❌ | 높음 |
| hjkl 네비게이션 | ❌ | 높음 |
| gg/G 이동 | ❌ | 중간 |
| i/a/o/O 편집 진입 | ❌ | 높음 |
| v/V/Ctrl+V Visual 모드 | ❌ | 중간 |
| dd/yy/p 텍스트 조작 | ❌ | 중간 |
| : 명령어 모드 | ❌ | 중간 |
| u/Ctrl+R Undo/Redo | ❌ | 높음 |

---

## 🎯 Vim 모드 구현 우선순위

### Phase 1: 핵심 Vim 기능 (필수)
1. **Normal/Insert 모드 시스템**
   - 모드 전환 로직
   - 모드 표시 (상태바)
   - `i`/`Esc` 키 처리

2. **hjkl 네비게이션**
   - Normal 모드에서 hjkl로 셀 이동
   - Insert 모드에서는 텍스트 내 커서 이동 (기본 동작)

3. **Vim 스타일 Undo/Redo**
   - `u`: Undo (Normal 모드)
   - `Ctrl+R`: Redo (Normal 모드)

4. **기본 편집 진입**
   - `i`: Insert 모드 진입
   - `a`: Insert 모드 진입 (끝에서)

### Phase 2: 고급 Vim 기능
5. **빠른 이동**
   - `gg`: 첫 번째 행
   - `G`: 마지막 행
   - `0`/`$`: 행의 시작/끝

6. **Visual 모드**
   - `v`: Visual 모드
   - 셀 선택 및 시각적 표시

7. **텍스트 조작**
   - `dd`: 행 삭제
   - `yy`: 행 복사
   - `p`/`P`: 붙여넣기

### Phase 3: Vim 명령어 모드
8. **`: ` 명령어 모드**
   - `:` 키로 명령어 입력
   - Command Palette와 통합 또는 별도 구현
   - 명령어 히스토리

---

## 💡 구현 전략

### 1. 모드 시스템 기반 구축
- `VimModeManager` 클래스 생성
- Normal/Insert/Visual 모드 상태 관리
- 모드 전환 로직

### 2. KeyboardHandler 확장
- 현재 모드 확인 (`currentMode === "vim"`)
- Vim 키보드 핸들러 분리
- 모드별 키 처리 분기

### 3. 기존 Utility와 통합
- ✅ Command Palette: 이미 모드별 필터링 지원
- ✅ Quick Search: 이미 Vim 스타일 (`/`)
- ✅ 필터링: 이미 Command Palette에서 사용 가능
- ✅ Status Bar: 모드 표시 추가 필요

### 4. 테스트 전략
- Vim 모드 전용 단위 테스트
- Vim 모드 E2E 테스트
- 모드 전환 테스트
- Utility 통합 테스트

---

## 📝 결론

**현재 상황:**
- ✅ **Utility들은 이미 Vim 모드에서도 작동하도록 설계됨** (Command Palette, Quick Search, 필터링 등)
- ❌ **Vim 모드 자체는 전혀 구현되지 않음** (Normal/Insert/Visual 모드, hjkl 네비게이션 등)

**다음 단계:**
1. Vim 모드 시스템 구현 (Normal/Insert/Visual 모드)
2. Vim 키보드 네비게이션 구현 (hjkl, gg, G 등)
3. Vim 편집 명령어 구현 (i, a, dd, yy, p 등)
4. 기존 Utility와의 통합 확인 및 개선

**참고:**
- `mode-system-design.md`: 모드 시스템 설계 문서
- `keyboard-navigation-spec.md`: 키보드 네비게이션 명세
- `CommandRegistry`: 이미 모드별 필터링 지원

