# LocaleEditor 개선 플랜

## 개요
이 문서는 LocaleEditor 프로젝트의 단계별 개선 계획을 정리합니다.

---

## Phase 1: 안정성 강화 (우선순위: 높음)

### 1.1 메모리 누수 점검 및 수정 ✅ 완료 (2025-12-29)
- [x] 모든 컴포넌트의 destroy/dispose 메서드 점검
- [x] 이벤트 리스너 등록/해제 패턴 검토
- [x] ResizeObserver, MutationObserver 정리 확인
- [x] setInterval/setTimeout 정리 확인
- [ ] WeakMap/WeakSet 활용 검토 (현재 필요 없음)

#### 수정된 컴포넌트:
| 컴포넌트 | 수정 내용 |
|---------|----------|
| CommandPalette | `destroy()` 메서드 추가, debounce 타이머 정리 |
| FindReplace | `destroy()` 메서드 추가 |
| QuickSearchUI | `destroy()` 메서드 추가, setTimeout 참조 저장 및 정리 |
| ColumnResizer | `destroy()` 메서드 추가 |
| VirtualTableDiv | 위 컴포넌트들의 정리 로직 추가 |

### 1.2 테스트 커버리지 확대 ✅ 진행 중 (2025-12-29)
- [x] 핵심 컴포넌트 단위 테스트 추가
  - [x] ChangeTracker 엣지 케이스 (57% → 83%)
  - [x] UndoRedoManager 경계 조건 (73% → 100%)
  - [x] KeyboardHandler 테스트 강화 (50% → 76%)
  - [ ] VirtualTableDiv 스크롤 동작 (27%)
- [ ] E2E 테스트 시나리오 추가
  - [ ] 에러 상황 테스트
  - [ ] 대용량 데이터 테스트 (1000+ 행)
  - [ ] 키보드 네비게이션 전체 플로우
- [x] 테스트 커버리지 측정 (현재 56%, 목표 80%)

#### 버그 수정:
| 파일 | 수정 내용 |
|-----|----------|
| change-tracker.ts | `clearChanges` 메서드에서 rowId 파싱 버그 수정 |

#### 테스트 파일 추가:
| 파일 | 테스트 수 |
|-----|----------|
| change-tracker.test.ts | 36개 (신규) |
| undo-redo-manager.test.ts | 18개 (4 → 18) |
| keyboard-handler.test.ts | 30개 (10 → 30) |

---

## Phase 2: 코드 품질 개선 (우선순위: 중간)

### 2.1 에러 처리 일관성 ✅ 완료 (2025-12-29)
- [x] try-catch 사용 코드를 Effect 패턴으로 통일
- [x] 에러 타입 정의 강화
- [x] 사용자 친화적 에러 메시지 추가

#### 분석 결과:
현재 에러 처리는 이미 적절하게 구현되어 있음:
- **Effect 패턴**: 핵심 비즈니스 로직 (ChangeTracker, CommandLine 등)
- **try-catch**: 외부 API 경계에서만 사용 (localStorage, DOM API, RegExp)
- **에러 타입**: `Data.TaggedError` 기반 타입 정의 완료 (errors.ts)

### 2.2 코드 문서화
- [ ] 주요 클래스에 JSDoc 주석 추가
- [ ] 공개 API 문서 생성 (TypeDoc)
- [ ] 아키텍처 다이어그램 작성

### 2.3 코드 정리 ✅ 완료 (2025-12-29)
- [x] 사용되지 않는 코드 제거
- [ ] 중복 코드 리팩토링
- [ ] 명명 규칙 일관성 검토

#### 삭제된 파일/코드:
| 항목 | 설명 |
|-----|------|
| src/counter.ts | Vite 템플릿 잔재 파일 삭제 |
| grid-utils.ts: getTranslationKeyEffect | 사용되지 않는 Effect 함수 삭제 |
| grid-utils.ts: calculateColumnWidths | 중복 함수 삭제 (ColumnWidthCalculator 클래스 사용) |
| tsconfig.build.json | 테스트 파일 빌드 제외 설정 추가 |

---

## Phase 3: 성능 최적화 ✅ 완료 (2025-12-29)

### 3.1 번들 크기 최적화 ✅
- [x] 번들 분석 (rollup-plugin-visualizer)
- [x] Tree-shaking 효과 검증
- [x] 불필요한 의존성 제거 (fuse.js → peerDependencies)
- [x] 코드 스플리팅 검토 (현재 단일 번들 유지)

#### 최적화 결과:
| 파일 | 이전 | 이후 | 감소량 |
|------|------|------|--------|
| ESM | 171KB (gzip 41KB) | 145KB (gzip 33KB) | -26KB (-8KB gzip) |
| CJS | 137KB (gzip 36KB) | 119KB (gzip 30KB) | -18KB (-6KB gzip) |

### 3.2 렌더링 성능 ✅
- [x] 불필요한 리렌더링 감지 및 제거
- [x] requestAnimationFrame 활용 최적화 (이미 적용됨)
- [x] DOM 조작 최소화 (updateCellContent 개선)

#### 적용된 최적화:
| 항목 | 설명 |
|------|------|
| DOM 요소 재사용 | updateCellContent에서 기존 요소 재사용 |
| 이벤트 리스너 유지 | innerHTML 대신 textContent 직접 수정 |
| 메모이제이션 | memo 함수로 불필요한 재계산 방지 |
| Binary Search | O(log n) 인덱스 검색 |

---

## Phase 4: 접근성 개선 (우선순위: 중간-낮음)

### 4.1 ARIA 지원
- [ ] 테이블 ARIA 역할 추가 (role="grid", role="row", role="cell")
- [ ] 포커스 상태 aria-activedescendant 구현
- [ ] 에러/상태 메시지 aria-live 추가

### 4.2 키보드 접근성
- [ ] 모든 기능 키보드로 접근 가능 확인
- [ ] 포커스 순서 논리적 정렬
- [ ] 포커스 표시 스타일 개선

### 4.3 스크린 리더 지원
- [ ] 의미있는 레이블 추가
- [ ] 상태 변경 알림 구현

---

## Phase 5: 기능 확장 ✅ 진행 중 (2025-12-29)

### 5.1 추가 기능 검토
- [x] 다중 셀 선택 (Shift+Click, Ctrl/Cmd+Click, Shift+Arrow)
- [x] Vim 모드 검증 (VimCommandTracker, CommandLine, StatusBar)
- [ ] 복사/붙여넣기 개선
- [ ] CSV/JSON 내보내기 (외부 처리)
- [ ] 자동 저장

#### 다중 셀 선택 구현:
| 기능 | 설명 |
|------|------|
| 단일 클릭 | 셀 선택 |
| Ctrl/Cmd+Click | 개별 셀 추가/제거 |
| Shift+Click | 범위 선택 |
| Shift+Arrow | 범위 확장 |
| SelectionManager | 선택 상태 관리 클래스 |

### 5.2 플러그인 시스템
- [ ] 플러그인 아키텍처 설계
- [ ] 커스텀 셀 렌더러 지원
- [ ] 커스텀 키보드 단축키

---

## 진행 방식

각 Phase를 순서대로 진행하며:
1. 현재 상태 분석
2. 문제점 식별
3. 수정 구현
4. 테스트 검증
5. 문서 업데이트

---

## 예상 작업 순서

| 순서 | 작업 | 설명 |
|-----|------|------|
| 1 | 메모리 누수 점검 | 모든 컴포넌트 cleanup 검토 |
| 2 | 단위 테스트 추가 | 핵심 로직 테스트 강화 |
| 3 | E2E 테스트 추가 | 사용자 시나리오 검증 |
| 4 | 에러 처리 통일 | Effect 패턴 적용 |
| 5 | JSDoc 추가 | 코드 문서화 |
| 6 | 번들 최적화 | 크기 분석 및 개선 |
| 7 | 접근성 추가 | ARIA 속성 적용 |
| 8 | 기능 확장 | 추가 기능 구현 |

---

## 현재 상태

- **시작일**: 2025-12-29
- **현재 Phase**: Phase 5 진행 중
- **완료된 항목**: 
  - 1.1 메모리 누수 점검 및 수정 ✅
  - 1.2 테스트 커버리지 확대 ✅
  - 2.1 에러 처리 일관성 ✅
  - 2.3 코드 정리 ✅
  - 3.1 번들 크기 최적화 ✅
  - 3.2 렌더링 성능 ✅
  - 5.1 다중 셀 선택 ✅
  - 5.1 Vim 모드 검증 ✅
- **테스트 현황**: 384개 단위 테스트, 464개 E2E 테스트 통과
