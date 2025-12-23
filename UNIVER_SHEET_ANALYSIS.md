# Univer Sheet 적용 가능성 분석

## 📋 현재 코드베이스 요약

### 구현된 기능
1. **AG Grid 기반 LocaleEditor** (`locale-editor.ts`, 1121줄)
   - 셀 편집 및 변경사항 추적
   - 키보드 네비게이션 (Tab, Enter, Shift+Enter, Esc)
   - 가상 스크롤링
   - 읽기 전용 모드
   - 컬럼: Key (pinned left), Context (pinned left), Language 컬럼들 (flex)

2. **ChangeTracker** (`change-tracker.ts`)
   - 변경사항 추적 (dirty cells)
   - Effect 기반 검증
   - 원본 데이터 비교

3. **UndoRedoManager** (`undo-redo-manager.ts`)
   - Undo/Redo 기능

4. **Virtual Table** (`virtual-table.ts`)
   - 커스텀 가상 스크롤링 구현

### 비즈니스 로직 요구사항
- Excel-like 스프레드시트 인터페이스
- 셀 편집 (Key, Context, Language 컬럼들)
- 변경사항 추적 (dirty cells 시각화)
- 키보드 네비게이션
- 가상 스크롤링 (대용량 데이터)
- 읽기 전용 모드
- Undo/Redo
- 검색/필터링 (향후)
- Import/Export (향후)

---

## ✅ Univer Sheet 적용 가능성

### 1. **React 없이 순수 TypeScript 사용 가능**
- ✅ **가능**: Univer Sheet는 React 없이도 사용 가능
- Univer는 플러그인 기반 아키텍처로, Vanilla JS/TypeScript로 사용 가능
- MCP 도구들을 보면 React 의존성 없이 사용 가능

### 2. **Excel-like 스프레드시트 기능**
- ✅ **완벽 지원**: Univer Sheet는 Excel과 유사한 기능 제공
  - 셀 편집, 포맷팅, 수식 지원
  - 컬럼/행 조작
  - 복사/붙여넣기
  - 셀 병합

### 3. **핵심 기능 비교**

| 기능 | 현재 (AG Grid) | Univer Sheet | 가능 여부 |
|------|---------------|--------------|----------|
| 셀 편집 | ✅ | ✅ | ✅ |
| 변경사항 추적 | ✅ (커스텀) | ⚠️ (커스텀 구현 필요) | ✅ |
| 키보드 네비게이션 | ✅ (커스텀) | ✅ (기본 제공) | ✅ |
| 가상 스크롤링 | ✅ | ✅ | ✅ |
| 읽기 전용 모드 | ✅ | ✅ | ✅ |
| 컬럼 고정 (pinned) | ✅ | ✅ | ✅ |
| 셀 스타일링 | ✅ | ✅ | ✅ |
| Undo/Redo | ✅ (커스텀) | ✅ (기본 제공) | ✅ |
| 검색/필터링 | ✅ | ✅ | ✅ |
| Import/Export | ❌ | ✅ (Excel, CSV) | ✅ |

### 4. **장점**

#### ✅ **Univer Sheet의 장점**
1. **Excel 호환성**
   - Excel 파일 직접 Import/Export 가능
   - Excel 수식 지원
   - Excel 포맷 지원

2. **내장 Undo/Redo**
   - 현재는 커스텀 구현 (`UndoRedoManager`)
   - Univer는 기본 제공

3. **풍부한 편집 기능**
   - 셀 병합, 포맷팅, 수식 등
   - Excel과 유사한 UX

4. **플러그인 시스템**
   - 필요한 기능만 선택적으로 추가
   - 커스터마이징 용이

5. **성능**
   - Canvas 기반 렌더링 옵션
   - 대용량 데이터 처리 최적화

#### ⚠️ **주의사항**
1. **변경사항 추적 (Change Tracking)**
   - Univer는 기본적으로 변경사항 추적 기능이 없음
   - `ChangeTracker` 클래스를 Univer 이벤트와 통합해야 함
   - **구현 가능**: Univer의 `onCellValueChanged` 이벤트 활용

2. **커스텀 키보드 네비게이션**
   - 현재는 매우 특수한 네비게이션 로직 (Tab, Enter, Shift+Enter)
   - Univer의 기본 네비게이션과 다를 수 있음
   - **구현 가능**: Univer의 키보드 이벤트 핸들러 커스터마이징

3. **데이터 구조 변환**
   - 현재: `Translation[]` → AG Grid RowData
   - Univer: `Translation[]` → Univer Sheet Data
   - **구현 가능**: 변환 로직 작성 필요

4. **스타일링**
   - 현재: AG Grid 테마 + 커스텀 CSS
   - Univer: 자체 테마 시스템
   - **구현 가능**: Univer 테마 커스터마이징

---

## 🎯 구현 전략

### Phase 1: 기본 통합
1. Univer Sheet 설치 및 초기화
2. `Translation[]` → Univer Sheet 데이터 변환
3. 컬럼 정의 (Key, Context, Language 컬럼들)
4. 기본 렌더링

### Phase 2: 편집 기능
1. 셀 편집 활성화
2. `ChangeTracker` 통합
3. 변경사항 추적 (dirty cells 시각화)
4. 읽기 전용 모드

### Phase 3: 키보드 네비게이션
1. 커스텀 키보드 핸들러 구현
2. Tab, Enter, Shift+Enter, Esc 처리
3. 현재 로직과 동일한 동작 보장

### Phase 4: 고급 기능
1. Undo/Redo (Univer 기본 기능 활용)
2. 검색/필터링
3. Import/Export (Excel, CSV)

---

## 📊 결론

### ✅ **Univer Sheet로 구현 가능**

**이유:**
1. ✅ React 없이 순수 TypeScript 사용 가능
2. ✅ Excel-like 기능 완벽 지원
3. ✅ 가상 스크롤링 지원
4. ✅ 기본 Undo/Redo 제공
5. ✅ Import/Export 기능 내장
6. ✅ 커스터마이징 가능 (플러그인 시스템)

**주의사항:**
1. ⚠️ 변경사항 추적은 커스텀 구현 필요 (현재 `ChangeTracker` 활용)
2. ⚠️ 키보드 네비게이션 커스터마이징 필요
3. ⚠️ 데이터 구조 변환 로직 필요
4. ⚠️ 스타일링 커스터마이징 필요

**권장사항:**
- ✅ **전환 권장**: Univer Sheet는 Excel 호환성과 Import/Export 기능이 큰 장점
- 현재 `ChangeTracker`, `UndoRedoManager` 등은 재사용 가능
- 점진적 마이그레이션 전략 권장

---

## 🔧 다음 단계

1. **Univer Sheet 설치 및 기본 통합**
   ```bash
   pnpm add @univerjs/core @univerjs/sheets @univerjs/sheets-ui
   ```

2. **기본 LocaleEditor 클래스 생성**
   - Univer Sheet 인스턴스 초기화
   - 데이터 변환 로직
   - 컬럼 정의

3. **ChangeTracker 통합**
   - Univer 이벤트 리스너 연결
   - 변경사항 추적 로직

4. **테스트 작성**
   - 기존 테스트 케이스 재사용
   - Univer 특화 테스트 추가



