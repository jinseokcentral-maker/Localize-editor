# Jspreadsheet CE 전환 작업 계획

## 현재 상태

### ✅ 완료된 작업
- Jspreadsheet CE 라이브러리 설치 및 기본 통합
- React 제거 및 순수 TypeScript로 전환
- 기본 스프레드시트 렌더링 (데이터 표시)
- ChangeTracker 클래스 통합 준비
- 기본 파일 구조 생성

### ⚠️ 현재 문제점
1. **스타일 문제**
   - 글자가 보이지 않는 문제
   - 테이블이 full width가 아닌 문제
   - 커스텀 CSS가 제대로 적용되지 않음

2. **API 호환성 문제**
   - `getCell` 메서드가 존재하지 않음
   - Jspreadsheet CE의 실제 API 확인 필요

3. **기능 미구현**
   - 셀 편집 기능이 제대로 작동하지 않음
   - 변경사항 추적 (dirty cells) 미구현
   - 키보드 네비게이션 미구현

## 내일 할 작업

### 1. Jspreadsheet CE API 정확히 파악 (우선순위: 높음)
- [ ] Jspreadsheet CE 공식 문서 확인
- [ ] 실제 사용 가능한 메서드 목록 확인
- [ ] 셀 접근 방법 확인 (`getCell` 대신 다른 방법)
- [ ] 스타일 적용 방법 확인
- [ ] 이벤트 핸들러 정확한 시그니처 확인

**참고 자료:**
- GitHub: https://github.com/jspreadsheet/ce
- 공식 문서: https://bossanova.uk/jspreadsheet/

### 2. 스타일 문제 해결 (우선순위: 높음)
- [ ] Jspreadsheet CE 기본 CSS가 제대로 로드되는지 확인
- [ ] 테이블이 full width를 차지하도록 수정
- [ ] 글자가 보이도록 색상 설정
- [ ] 테마 옵션 제대로 작동하는지 확인
- [ ] 커스텀 CSS 최소화 (기본 스타일 유지)

### 3. 셀 편집 기능 구현 (우선순위: 높음)
- [ ] `onchange` 이벤트 핸들러 정확히 구현
- [ ] 셀 값 변경 시 내부 상태 업데이트
- [ ] 변경사항이 즉시 화면에 반영되는지 확인

### 4. 변경사항 추적 (Dirty Cells) 구현 (우선순위: 중간)
- [ ] 변경된 셀 식별 로직 구현
- [ ] DOM에서 셀 찾는 방법 정확히 구현
- [ ] 변경된 셀에 노란색 배경 적용
- [ ] `clearChanges()` 시 스타일 제거

### 5. 키보드 네비게이션 구현 (우선순위: 중간)
- [ ] Tab 키: 모든 컬럼 순회
  - 편집 완료 후 오른쪽 셀로 이동
  - 행 끝에서 다음 행 첫 컬럼으로 이동
  - 마지막 행에서 첫 행으로 순환
- [ ] Shift+Tab 키: 언어 컬럼만 역순으로 순회
- [ ] Enter 키: 아래 행의 같은 언어 컬럼으로 이동 및 편집 시작
- [ ] Shift+Enter 키: 위 행의 같은 언어 컬럼으로 이동 및 편집 시작
- [ ] Esc 키: 편집 취소

**참고:** `docs/keyboard-navigation-spec.md` 파일 참고

### 6. 읽기 전용 모드 구현 (우선순위: 낮음)
- [ ] `setReadOnly()` 메서드 구현
- [ ] 읽기 전용일 때 셀 편집 비활성화

### 7. 데이터 동기화 (우선순위: 중간)
- [ ] `refreshSpreadsheet()` 메서드 제대로 구현
- [ ] `clearChanges()` 시 데이터 원복 확인
- [ ] 외부에서 `translations` prop 변경 시 업데이트

## 기술적 고려사항

### Jspreadsheet CE API 확인 필요 사항
1. **셀 접근 방법**
   - `getCell()` 메서드가 있는지?
   - 없다면 DOM을 직접 조작해야 하는지?
   - 행/열 인덱스로 셀을 찾는 다른 방법이 있는지?

2. **스타일 적용 방법**
   - 인라인 스타일로 적용하는 방법
   - CSS 클래스로 적용하는 방법
   - `style` 옵션으로 초기화 시 적용하는 방법

3. **이벤트 핸들러**
   - `onchange` 이벤트의 정확한 시그니처
   - 다른 유용한 이벤트들 (onbeforechange, onafterchange 등)

4. **데이터 업데이트**
   - `setData()` 메서드 사용법
   - 개별 셀 업데이트 방법

### 대안 고려사항
만약 Jspreadsheet CE가 요구사항에 맞지 않는다면:
- 다른 라이브러리 검토 (예: Handsontable, Luckysheet 등)
- 또는 Glide Data Grid로 다시 돌아가기

## 참고 파일
- `src/components/locale-editor-jspreadsheet.ts` - 메인 구현 파일
- `src/app.ts` - 앱 진입점
- `docs/keyboard-navigation-spec.md` - 키보드 네비게이션 명세
- `src/components/change-tracker.ts` - 변경사항 추적 클래스

## 다음 단계
1. Jspreadsheet CE 공식 문서를 자세히 읽고 API 확인
2. 간단한 예제로 테스트하여 실제 동작 확인
3. 문제점을 하나씩 해결
4. 기능을 단계적으로 구현

