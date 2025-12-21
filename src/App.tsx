import React, { useState, useRef } from 'react';
import { LocaleEditor, type LocaleEditorRef } from './components/LocaleEditor';
import type { Translation } from './types/translation';

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

function App() {
  const [isReadOnly, setIsReadOnly] = useState(false);
  const editorRef = useRef<LocaleEditorRef>(null);

  const handleGetChanges = () => {
    const changes = editorRef.current?.getChanges() || [];
    console.log('변경사항:', changes);
    alert(`변경된 셀 수: ${changes.length}\n콘솔을 확인하세요.`);
  };

  const handleClearChanges = () => {
    editorRef.current?.clearChanges();
    alert('변경사항이 초기화되었습니다.');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Locale Editor</h1>
      <p className="text-gray-600 mb-8">Excel-like i18n translation editor</p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
        <h2 className="text-xl font-semibold mb-2 text-blue-900">
          🚀 Glide Data Grid 기반으로 전환
        </h2>
        <p className="text-blue-800 mb-2">
          React + Glide Data Grid를 사용한 새로운 구현입니다.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          💡 Canvas 기반의 고성능 데이터 그리드로 수백만 행을 부드럽게 처리할 수 있습니다.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setIsReadOnly(!isReadOnly)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Toggle Editable (현재: {isReadOnly ? '읽기 전용' : '편집 가능'})
        </button>
        <button
          onClick={handleGetChanges}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          변경사항 조회
        </button>
        <button
          onClick={handleClearChanges}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          변경사항 초기화
        </button>
        <span className="text-sm text-gray-600">
          셀을 편집하면 변경된 셀이 노란색으로 표시됩니다.
        </span>
      </div>

      <div
        id="editor-container"
        className="w-full mb-8 border border-gray-200 rounded overflow-hidden"
        style={{ height: '600px', width: '100%' }}
      >
        <LocaleEditor
          ref={editorRef}
          translations={allTranslations}
          languages={['en', 'ko']}
          defaultLanguage="en"
          readOnly={isReadOnly}
          onCellChange={(id, lang, value) => {
            console.log('🔵 셀 변경:', { id, lang, value });
          }}
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">진행 상황</h2>
        <ul className="list-none p-0 m-0">
          <li className="py-2 text-gray-600">
            <span className="text-green-600 font-semibold">✓</span> React + Glide Data Grid 통합
          </li>
          <li className="py-2 text-gray-400">
            <span className="text-gray-400">○</span> 셀 편집 기능 구현
          </li>
          <li className="py-2 text-gray-600">
            <span className="text-green-600 font-semibold">✓</span> 변경사항 추적 (dirty cells)
          </li>
          <li className="py-2 text-gray-400">
            <span className="text-gray-400">○</span> 키 유효성 검사 (unique key)
          </li>
          <li className="py-2 text-gray-400">
            <span className="text-gray-400">○</span> Undo/Redo 기능
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;

