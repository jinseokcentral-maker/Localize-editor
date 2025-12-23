import './style.css';
import type { Translation } from './types/translation';
import { VirtualTableDiv } from './components/virtual-table-div';

// Step 2: AG Grid 통합 완료
const app = document.querySelector<HTMLDivElement>('#app')!;

// 예제 데이터 (대량 테스트용으로 1000개 생성)
const exampleTranslations: Translation[] = Array.from({ length: 1000 }, (_, i) => ({
  id: String(i + 1),
  key: `common.items.item${i + 1}`,
  values: {
    en: `Item ${i + 1}`,
    ko: `항목 ${i + 1}`,
  },
  context: i % 3 === 0 ? `Context for item ${i + 1}` : undefined,
}));

// 기존 5개 데이터도 추가 (테스트용)
const originalTranslations: Translation[] = [
  {
    id: 'original-1',
    key: 'common.buttons.submit',
    values: { en: 'Submit', ko: '제출' },
    context: 'Submit button text',
  },
  {
    id: 'original-2',
    key: 'common.buttons.cancel',
    values: { en: 'Cancel', ko: '취소' },
    context: 'Cancel button text',
  },
  {
    id: 'original-3',
    key: 'common.buttons.save',
    values: { en: 'Save', ko: '저장' },
  },
  {
    id: 'original-4',
    key: 'common.messages.welcome',
    values: { en: 'Welcome', ko: '환영합니다' },
    context: 'Welcome message',
  },
  {
    id: 'original-5',
    key: 'common.messages.goodbye',
    values: { en: 'Goodbye', ko: '안녕히 가세요' },
  },
];

// 전체 데이터 합치기
const allTranslations = [...originalTranslations, ...exampleTranslations];

// UI 구조
app.innerHTML = `
  <div>
    <h1 class="text-3xl font-bold mb-2">
      Locale Editor
    </h1>
    <p class="text-gray-600 mb-8">
      Excel-like i18n translation editor
    </p>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
      <h2 class="text-xl font-semibold mb-2 text-blue-900">
        ✅ VirtualTableDiv (Div-based Grid)
      </h2>
      <p class="text-blue-800 mb-2">
        테이블 구조 대신 div 기반 그리드로 구현하여 가상 스크롤링과 완벽하게 호환됩니다.
      </p>
      <p class="text-green-800 font-semibold">
        ✅ 키보드 네비게이션 완전 제어 가능
      </p>
      <p class="text-sm text-gray-600 mt-2">
        💡 셀을 더블클릭하여 편집하거나, Tab/Enter/Arrow 키로 네비게이션하세요. 큰 리스트도 부드럽게 처리됩니다.
      </p>
    </div>
    
    <div id="cell-change-feedback" class="mb-2 text-sm font-semibold min-h-[24px]"></div>
    
    <div class="mb-4 flex items-center gap-4">
      <button
        id="toggle-editable-btn"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Toggle Editable (현재: 편집 가능)
      </button>
      <span id="editable-status" class="text-sm text-gray-600"></span>
    </div>
    
    <div id="editor-container" class="w-full mb-8" style="height: 600px; position: relative;"></div>
    
    <div class="bg-gray-50 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4">
        진행 상황
      </h2>
      <ul class="list-none p-0 m-0">
        <li class="py-2 text-gray-600">
          <span class="text-green-600 font-semibold">✓</span> Step 1: 타입 정의
        </li>
        <li class="py-2 text-gray-600">
          <span class="text-green-600 font-semibold">✓</span> Step 2: AG Grid 통합
        </li>
        <li class="py-2 text-gray-600">
          <span class="text-green-600 font-semibold">✓</span> Phase 1-1: 셀 편집 이벤트 처리 및 콜백
        </li>
        <li class="py-2 text-gray-400">
          <span class="text-gray-400">○</span> Phase 1-2: 변경사항 추적 (dirty cells)
        </li>
        <li class="py-2 text-gray-400">
          <span class="text-gray-400">○</span> Phase 1-3: 빈 번역 셀 하이라이트
        </li>
        <li class="py-2 text-gray-400">
          <span class="text-gray-400">○</span> Phase 1-4: 향상된 키보드 네비게이션
        </li>
        <li class="py-2 text-gray-400">
          <span class="text-gray-400">○</span> Phase 1-5: Context 컬럼 편집 지원
        </li>
      </ul>
    </div>
  </div>
`;

// 에디터 초기화 (VirtualTable 테스트용)
const container = document.getElementById('editor-container')!;
const toggleEditableBtn = document.getElementById('toggle-editable-btn')!;
const editableStatus = document.getElementById('editable-status')!;

let isEditable = true; // 기본값: 편집 가능
let virtualTable: VirtualTableDiv | null = null;

// 셀 변경 콜백
const onCellChange = (id: string, lang: string, value: string) => {
  // UI에 피드백 표시
  const feedbackEl = document.getElementById('cell-change-feedback');
  if (feedbackEl) {
    if (value === '') {
      feedbackEl.textContent = `⚠️ 경고: ${id} / ${lang}의 값이 비어있습니다!`;
      feedbackEl.style.color = '#dc2626';
    } else {
      feedbackEl.textContent = `✅ 변경됨: ${id} / ${lang} = "${value}"`;
      feedbackEl.style.color = '#059669';
    }
    setTimeout(() => {
      feedbackEl.textContent = '';
    }, 3000);
  }
};

// VirtualTableDiv 테스트 (대량 데이터)
virtualTable = new VirtualTableDiv({
  container,
  translations: allTranslations,
  languages: ['en', 'ko'],
  defaultLanguage: 'en',
  readOnly: false,
  rowHeight: 40,
  onCellChange,
});

virtualTable.render();

// Editable 토글 버튼 이벤트
toggleEditableBtn.addEventListener('click', () => {
  isEditable = !isEditable;
  virtualTable?.setReadOnly(!isEditable);
  
  // UI 업데이트
  toggleEditableBtn.textContent = `Toggle Editable (현재: ${isEditable ? '편집 가능' : '읽기 전용'})`;
  toggleEditableBtn.className = isEditable
    ? 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
    : 'px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors';
  
  editableStatus.textContent = isEditable
    ? '💡 편집 가능 모드: 모든 셀을 편집할 수 있습니다.'
    : '🔒 읽기 전용 모드: 언어 컬럼은 편집할 수 없습니다. 마우스를 올리면 tooltip이 표시됩니다.';
});

// 초기 상태 표시
editableStatus.textContent = '💡 VirtualTableDiv 테스트 모드: 모든 셀을 편집할 수 있습니다. Tab/Enter/Arrow 키로 네비게이션하세요.';

