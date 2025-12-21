import type { Translation } from './types/translation';
import { LocaleEditor } from './components/locale-editor-jspreadsheet';
import { ChangeTracker } from './components/change-tracker';
import './style.css';
import './styles/jspreadsheet-custom.css';

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

// 앱 초기화
function initApp() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('Root container not found');
    return;
  }

  // UI 생성
  container.innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-2">Locale Editor</h1>
      <p class="text-gray-600 mb-8">Excel-like i18n translation editor</p>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
        <h2 class="text-xl font-semibold mb-2 text-blue-900">
          🚀 Jspreadsheet CE 기반으로 전환
        </h2>
        <p class="text-blue-800 mb-2">
          순수 JavaScript + Jspreadsheet CE를 사용한 새로운 구현입니다.
        </p>
        <p class="text-sm text-gray-600 mt-2">
          💡 Excel-like 인터페이스로 직관적인 번역 편집이 가능합니다.
        </p>
      </div>

      <div class="mb-4 flex items-center gap-4 flex-wrap">
        <button
          id="toggle-readonly"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Toggle Editable (현재: 편집 가능)
        </button>
        <button
          id="get-changes"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          변경사항 조회
        </button>
        <button
          id="clear-changes"
          class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          변경사항 초기화
        </button>
        <span class="text-sm text-gray-600">
          셀을 편집하면 변경된 셀이 노란색으로 표시됩니다.
        </span>
      </div>

      <div
        id="editor-container"
        class="w-full mb-8 border border-gray-200 rounded overflow-hidden"
        style="height: 600px; width: 100%; min-height: 400px;"
      ></div>

      <div class="bg-gray-50 rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-4">진행 상황</h2>
        <ul class="list-none p-0 m-0">
          <li class="py-2 text-gray-600">
            <span class="text-green-600 font-semibold">✓</span> Jspreadsheet CE 통합
          </li>
          <li class="py-2 text-gray-400">
            <span class="text-gray-400">○</span> 셀 편집 기능 구현
          </li>
          <li class="py-2 text-gray-400">
            <span class="text-gray-400">○</span> 변경사항 추적 (dirty cells)
          </li>
          <li class="py-2 text-gray-400">
            <span class="text-gray-400">○</span> 키 유효성 검사 (unique key)
          </li>
          <li class="py-2 text-gray-400">
            <span class="text-gray-400">○</span> Undo/Redo 기능
          </li>
        </ul>
      </div>
    </div>
  `;

  // Editor 초기화
  const editorContainer = document.getElementById('editor-container');
  if (!editorContainer) {
    console.error('Editor container not found');
    return;
  }

  const editor = new LocaleEditor({
    container: editorContainer,
    translations: allTranslations,
    languages: ['en', 'ko'],
    defaultLanguage: 'en',
    readOnly: false,
    onCellChange: (id, lang, value) => {
      console.log('🔵 셀 변경:', { id, lang, value });
    },
    // 테마 옵션 (선택적)
    // theme: {
    //   cellColor: '#1e293b',
    //   cellBackgroundColor: '#ffffff',
    //   headerColor: '#1e293b',
    //   headerBackgroundColor: '#f8fafc',
    //   borderColor: '#e2e8f0',
    //   dirtyCellBackgroundColor: '#fff3cd',
    //   selectedCellBackgroundColor: '#dbeafe',
    // },
  });

  // 버튼 이벤트 핸들러
  let isReadOnly = false;
  const toggleReadonlyBtn = document.getElementById('toggle-readonly');
  const getChangesBtn = document.getElementById('get-changes');
  const clearChangesBtn = document.getElementById('clear-changes');

  toggleReadonlyBtn?.addEventListener('click', () => {
    isReadOnly = !isReadOnly;
    editor.setReadOnly(isReadOnly);
    toggleReadonlyBtn.textContent = `Toggle Editable (현재: ${isReadOnly ? '읽기 전용' : '편집 가능'})`;
  });

  getChangesBtn?.addEventListener('click', () => {
    const changes = editor.getChanges();
    console.log('변경사항:', changes);
    alert(`변경된 셀 수: ${changes.length}\n콘솔을 확인하세요.`);
  });

  clearChangesBtn?.addEventListener('click', () => {
    editor.clearChanges();
    alert('변경사항이 초기화되었습니다.');
  });
}

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

