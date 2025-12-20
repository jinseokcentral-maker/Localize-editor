import './style.css';
import { LocaleEditor } from './components/locale-editor';
import type { Translation } from './types/translation';

// Step 2: AG Grid 통합 완료
const app = document.querySelector<HTMLDivElement>('#app')!;

// 예제 데이터
const exampleTranslations: Translation[] = [
  {
    id: '1',
    key: 'common.buttons.submit',
    values: { en: 'Submit', ko: '제출' },
    context: 'Submit button text',
  },
  {
    id: '2',
    key: 'common.buttons.cancel',
    values: { en: 'Cancel', ko: '취소' },
    context: 'Cancel button text',
  },
  {
    id: '3',
    key: 'common.buttons.save',
    values: { en: 'Save', ko: '저장' },
  },
  {
    id: '4',
    key: 'common.messages.welcome',
    values: { en: 'Welcome', ko: '환영합니다' },
    context: 'Welcome message',
  },
  {
    id: '5',
    key: 'common.messages.goodbye',
    values: { en: 'Goodbye', ko: '안녕히 가세요' },
  },
];

// UI 구조
app.innerHTML = `
  <div class="p-8 font-sans max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">
      Locale Editor
    </h1>
    <p class="text-gray-600 mb-8">
      Excel-like i18n translation editor
    </p>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
      <h2 class="text-xl font-semibold mb-2 text-blue-900">
        ✅ Step 2: AG Grid 통합 완료
      </h2>
      <p class="text-blue-800 mb-2">
        AG Grid가 통합되었고, 그리드가 렌더링됩니다. 모든 테스트가 통과했습니다.
      </p>
      <p class="text-green-800 font-semibold">
        ✅ Phase 1-1: 셀 편집 이벤트 처리 완료
      </p>
      <p class="text-sm text-gray-600 mt-2">
        💡 언어 컬럼(EN, KO)의 셀을 더블클릭하여 편집해보세요. 편집 후 Enter 키를 누르면 콘솔에 변경사항이 표시됩니다.
      </p>
    </div>
    
    <div id="cell-change-feedback" class="mb-2 text-sm font-semibold min-h-[24px]"></div>
    
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

// 에디터 초기화
const container = document.getElementById('editor-container')!;

// 셀 변경 콜백 (디버깅용)
const onCellChange = (id: string, lang: string, value: string) => {
  console.log('🔵 셀 변경:', { 
    id, 
    lang, 
    value, 
    valueType: typeof value, 
    valueLength: value.length,
    isEmpty: value === ''
  });
  
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

const editor = new LocaleEditor({
  translations: exampleTranslations,
  languages: ['en', 'ko'],
  defaultLanguage: 'en',
  container,
  readOnly: false,
  onCellChange,
});

editor.render();

console.log('✅ Step 2: AG Grid 통합 완료');
console.log('✅ Phase 1-1: 셀 편집 이벤트 처리 완료');
console.log('Grid API:', editor.getGridApi());
console.log('💡 셀을 편집하면 콘솔에 변경사항이 표시됩니다.');

