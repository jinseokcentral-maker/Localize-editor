# Glide Data Grid 전환 개발 계획

## 개요

AG Grid Community에서 Glide Data Grid로 전환하여 더 나은 성능과 Canvas 기반 렌더링의 이점을 활용합니다.

**참고 문서**: [Glide Data Grid 공식 문서](https://docs.grid.glideapps.com/)

## 현재 상태

### ✅ 이미 구현된 것 (Glide Data Grid 기반)
- 기본 React 컴포넌트 (`LocaleEditor.tsx`)
- 기본 셀 렌더링 및 편집
- 컬럼 정의 (Key, Context, Language 컬럼)
- 읽기 전용 모드 지원

### ⚠️ AG Grid에서 포팅해야 할 기능들

## 필수 기능 목록

### 1. 핵심 데이터 관리
- [x] Translation 데이터 구조
- [x] 기본 셀 렌더링
- [ ] Change Tracking (변경사항 추적)
- [ ] Undo/Redo 기능
- [ ] 원본 데이터와 변경사항 비교

### 2. 키보드 네비게이션
- [ ] **Tab 키**: 모든 컬럼 순회 (Key → Context → Language 컬럼들)
  - 편집 완료 후 오른쪽 셀로 이동 (편집 모드 아님)
  - 행 끝에서 다음 행 첫 컬럼으로 이동
  - 마지막 행에서 첫 행으로 순환
- [ ] **Shift+Tab 키**: 언어 컬럼만 역순으로 순회
  - 편집 완료 후 이전 언어 셀로 이동
  - 행 시작에서 이전 행 마지막 언어 컬럼으로 이동
  - 첫 행에서 마지막 행으로 순환
- [ ] **Enter 키**: 아래 행의 같은 언어 컬럼으로 이동 및 편집 시작
  - 편집 완료 후 아래 행으로 이동
  - 마지막 행에서는 이동하지 않음
  - 이동 후 자동 편집 모드 시작
- [ ] **Shift+Enter 키**: 위 행의 같은 언어 컬럼으로 이동 및 편집 시작
  - 편집 완료 후 위 행으로 이동
  - 첫 행에서는 이동하지 않음
  - 이동 후 자동 편집 모드 시작
- [ ] **Esc 키**: 편집 취소 (변경사항 저장하지 않음)
  - 원래 값으로 복원
  - 셀 이동하지 않음

### 3. 셀 편집 기능
- [x] 기본 텍스트 편집
- [ ] 편집 완료 시 변경사항 추적
- [ ] 편집 취소 (Esc 키)
- [ ] 편집 중 키보드 네비게이션 처리
- [ ] 셀 값 검증 (선택적)

### 4. 시각적 피드백
- [ ] 변경된 셀 하이라이트 (dirty cell 표시)
- [ ] 읽기 전용 모드 표시 (popover 또는 tooltip)
- [ ] 포커스 표시
- [ ] 선택된 셀 표시

### 5. 컬럼 기능
- [x] Key 컬럼 (pinned left)
- [x] Context 컬럼 (pinned left)
- [x] Language 컬럼들 (동적 생성)
- [ ] 컬럼 리사이징
- [ ] 컬럼 이동 (선택적)
- [ ] 컬럼 너비 저장/복원

### 6. 성능 최적화
- [x] Virtual scrolling (Glide Data Grid 기본 제공)
- [ ] 대량 데이터 처리 (수만 ~ 수십만 행)
- [ ] 렌더링 최적화
- [ ] 메모리 관리

### 7. 이벤트 및 콜백
- [x] `onCellChange` 콜백
- [ ] `onSave` 콜백 (변경사항 저장)
- [ ] `onSearch` 콜백 (서버 검색, 선택적)
- [ ] 셀 편집 시작/종료 이벤트

### 8. 유틸리티 기능
- [ ] `getChanges()`: 모든 변경사항 반환
- [ ] `clearChanges()`: 변경사항 초기화
- [ ] `setReadOnly()`: 읽기 전용 모드 토글
- [ ] `destroy()`: 리소스 정리

### 9. 스타일링
- [x] 기본 테마 설정
- [ ] 커스텀 스타일 (변경된 셀, 읽기 전용 등)
- [ ] 반응형 레이아웃

## 구현 우선순위

### Phase 1: 핵심 기능 (필수)
1. **Change Tracking 구현**
   - ChangeTracker 클래스 통합
   - 변경된 셀 시각적 표시
   - `getChanges()`, `clearChanges()` 메서드

2. **키보드 네비게이션 구현**
   - Tab/Shift+Tab 네비게이션
   - Enter/Shift+Enter 네비게이션
   - Esc 키 편집 취소

3. **셀 편집 완성**
   - 편집 완료 시 변경사항 추적
   - 편집 취소 기능

### Phase 2: 고급 기능
4. **Undo/Redo 구현**
   - UndoRedoManager 통합
   - Ctrl+Z, Ctrl+Y 단축키

5. **컬럼 기능**
   - 컬럼 리사이징
   - 컬럼 너비 저장/복원

6. **읽기 전용 모드 개선**
   - Popover/Tooltip 표시
   - 시각적 피드백

### Phase 3: 최적화 및 개선
7. **성능 최적화**
   - 대량 데이터 테스트
   - 렌더링 최적화

8. **추가 기능**
   - 검색 기능 (선택적)
   - 필터링 (선택적)
   - 정렬 (선택적)

## Glide Data Grid API 활용

### 주요 API 참고

#### 1. DataEditor Props
```typescript
<DataEditor
  getCellContent={getCellContent}  // 셀 데이터 제공
  columns={columns}                 // 컬럼 정의
  rows={numRows}                    // 행 수
  onCellEdited={onCellEdited}       // 셀 편집 완료
  onCellClicked={onCellClicked}     // 셀 클릭
  onKeyDown={onKeyDown}             // 키보드 이벤트
  // ... 기타 props
/>
```

#### 2. 키보드 네비게이션
- `onKeyDown`: 키보드 이벤트 처리
- `onCellEdited`: 셀 편집 완료 처리
- `getCellContent`: 셀 데이터 제공 (편집 모드 포함)

#### 3. 셀 편집 제어
- `GridCell.readonly`: 읽기 전용 설정
- `GridCell.allowOverlay`: 편집 오버레이 허용
- `onCellEdited`: 편집 완료 시 호출

#### 4. 포커스 및 선택
- `onCellClicked`: 셀 클릭 처리
- `onSelectionChanged`: 선택 변경 처리
- `selectedCells`: 선택된 셀 관리

## 기술적 고려사항

### 1. 상태 관리
- React hooks 사용 (useState, useCallback, useMemo)
- 변경사항 추적을 위한 별도 상태 관리
- 성능을 위한 메모이제이션

### 2. 이벤트 처리
- 키보드 이벤트: `onKeyDown` prop 활용
- 셀 편집 이벤트: `onCellEdited` prop 활용
- 커스텀 네비게이션 로직 구현

### 3. 성능
- `getCellContent` 메모이제이션 (useCallback)
- 컬럼 정의 메모이제이션 (useMemo)
- 불필요한 리렌더링 방지

### 4. 타입 안정성
- Glide Data Grid 타입 활용
- Translation 타입 유지
- Effect 기반 에러 처리 (기존 코드와 일관성)

## 마이그레이션 체크리스트

### 코드 구조
- [ ] `LocaleEditor.tsx`를 메인 컴포넌트로 사용
- [ ] ChangeTracker 통합
- [ ] UndoRedoManager 통합
- [ ] 기존 타입 정의 유지

### 기능 구현
- [ ] Change Tracking
- [ ] 키보드 네비게이션 (Tab, Shift+Tab, Enter, Shift+Enter, Esc)
- [ ] 셀 편집 및 취소
- [ ] 읽기 전용 모드
- [ ] 컬럼 리사이징

### 테스트
- [ ] 단위 테스트 업데이트
- [ ] E2E 테스트 업데이트
- [ ] 키보드 네비게이션 테스트
- [ ] 성능 테스트

### 문서화
- [ ] README 업데이트
- [ ] API 문서 업데이트
- [ ] 사용 예제 업데이트

## 참고 자료

- [Glide Data Grid 공식 문서](https://docs.grid.glideapps.com/)
- [Glide Data Grid GitHub](https://github.com/glideapps/glide-data-grid)
- [키보드 네비게이션 명세서](./keyboard-navigation-spec.md)
- [Virtual Core 사용 가이드](./virtual-core-usage.md)

## 다음 단계

1. **Change Tracking 구현**부터 시작
2. **키보드 네비게이션** 구현
3. **테스트 작성 및 검증**
4. **기존 AG Grid 코드 제거** (선택적)


