import React, { useCallback, useMemo, useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import DataEditor, { type DataEditorRef } from '@glideapps/glide-data-grid';
import type { GridCell, GridColumn, Item, GridKeyEventArgs, GridSelection } from '@glideapps/glide-data-grid';
import { GridCellKind } from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import type { Translation, TranslationChange } from '../types/translation';
import { ChangeTracker } from './change-tracker';

export interface LocaleEditorProps {
  translations: readonly Translation[];
  languages: readonly string[];
  defaultLanguage?: string;
  readOnly?: boolean;
  onCellChange?: (id: string, lang: string, value: string) => void;
}

export interface LocaleEditorRef {
  getChanges: () => TranslationChange[];
  clearChanges: () => void;
}

export const LocaleEditor = forwardRef<LocaleEditorRef, LocaleEditorProps>(({
  translations,
  languages,
  defaultLanguage,
  readOnly = false,
  onCellChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataEditorRef = useRef<DataEditorRef>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const changeTrackerRef = useRef<ChangeTracker>(new ChangeTracker());
  // 변경사항 추적을 위한 상태 (리렌더링 트리거용)
  const [changesVersion, setChangesVersion] = useState(0);
  // 내부 translations 상태 관리 (셀 편집 시 업데이트)
  const [internalTranslations, setInternalTranslations] = useState<Translation[]>([...translations]);
  // 현재 선택된 셀 위치 추적
  const [selectedCell, setSelectedCell] = useState<Item | null>(null);

  // ChangeTracker 초기화 및 내부 상태 동기화 (translations 변경 시)
  useEffect(() => {
    changeTrackerRef.current.initializeOriginalData(translations, languages);
    // 내부 상태를 prop과 동기화
    setInternalTranslations([...translations]);
    // 변경사항 추적 상태 업데이트를 위해 버전 증가
    setChangesVersion(v => v + 1);
  }, [translations, languages]);

  // ref를 통해 메서드 노출
  useImperativeHandle(ref, () => ({
    getChanges: () => changeTrackerRef.current.getChanges(),
    clearChanges: () => {
      const changeTracker = changeTrackerRef.current;
      const changes = changeTracker.getChanges();
      
      // 변경사항을 원본 값으로 되돌리기
      setInternalTranslations(prev => {
        const updated = [...prev];
        
        changes.forEach(change => {
          const rowIndex = updated.findIndex(t => t.id === change.id);
          if (rowIndex === -1) return;
          
          const updatedTranslation = { ...updated[rowIndex] };
          
          if (change.lang === 'key') {
            updatedTranslation.key = change.oldValue;
          } else if (change.lang === 'context') {
            updatedTranslation.context = change.oldValue;
          } else {
            // language 컬럼인 경우
            updatedTranslation.values = {
              ...updatedTranslation.values,
              [change.lang]: change.oldValue,
            };
          }
          
          updated[rowIndex] = updatedTranslation;
        });
        
        return updated;
      });
      
      // 변경사항 추적 초기화
      changeTracker.clearChanges();
      setChangesVersion(v => v + 1); // 변경사항 초기화 후 리렌더링
    },
  }), []);

  // 컨테이너 크기 측정
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 컬럼 정의: Key, Context, 그리고 각 언어 컬럼
  const columns = useMemo<GridColumn[]>(() => {
    const cols: GridColumn[] = [
      {
        title: 'Key',
        width: 200,
        id: 'key',
      },
      {
        title: 'Context',
        width: 200,
        id: 'context',
      },
      ...languages.map((lang) => ({
        title: lang.toUpperCase(),
        width: 150,
        id: `lang-${lang}`,
      })),
    ];
    return cols;
  }, [languages]);

  // 셀 데이터 가져오기
  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell;
      const translation = internalTranslations[row];
      
      if (!translation) {
        return {
          kind: GridCellKind.Text,
          data: '',
          displayData: '',
          allowOverlay: false,
        };
      }

      const column = columns[col];
      const changeTracker = changeTrackerRef.current;
      
      if (column.id === 'key') {
        const field = 'key';
        const isDirty = changeTracker.hasChange(translation.id, field);
        return {
          kind: GridCellKind.Text,
          data: translation.key,
          displayData: translation.key,
          allowOverlay: !readOnly, // 읽기 전용이 아니면 편집 가능
          readonly: readOnly,
          themeOverride: isDirty ? {
            bgCell: '#fff3cd', // 변경된 셀 배경색 (노란색 계열)
          } : undefined,
        };
      } else if (column.id === 'context') {
        const field = 'context';
        const isDirty = changeTracker.hasChange(translation.id, field);
        return {
          kind: GridCellKind.Text,
          data: translation.context || '',
          displayData: translation.context || '',
          allowOverlay: !readOnly, // 읽기 전용이 아니면 편집 가능
          readonly: readOnly,
          themeOverride: isDirty ? {
            bgCell: '#fff3cd', // 변경된 셀 배경색
          } : undefined,
        };
      } else if (column.id?.startsWith('lang-')) {
        const lang = column.id.replace('lang-', '');
        const value = translation.values[lang] || '';
        const field = `values.${lang}`;
        const isDirty = changeTracker.hasChange(translation.id, field);
        return {
          kind: GridCellKind.Text,
          data: value,
          displayData: value,
          allowOverlay: !readOnly, // 읽기 전용이 아니면 편집 가능
          readonly: readOnly,
          themeOverride: isDirty ? {
            bgCell: '#fff3cd', // 변경된 셀 배경색
          } : undefined,
        };
      }

      return {
        kind: GridCellKind.Text,
        data: '',
        displayData: '',
        allowOverlay: false,
      };
    },
    [internalTranslations, columns, readOnly, changesVersion]
  );

  // 셀 편집 완료 처리
  const onCellEdited = useCallback(
    (cell: Item, newValue: GridCell) => {
      if (newValue.kind !== GridCellKind.Text) return;
      
      const [col, row] = cell;
      const translation = internalTranslations[row];
      if (!translation) return;

      const column = columns[col];
      const changeTracker = changeTrackerRef.current;
      const newValueStr = newValue.data;
      
      // 내부 상태 업데이트
      setInternalTranslations(prev => {
        const updated = [...prev];
        const updatedTranslation = { ...updated[row] };
        
        if (column.id === 'key') {
          updatedTranslation.key = newValueStr;
        } else if (column.id === 'context') {
          updatedTranslation.context = newValueStr;
        } else if (column.id?.startsWith('lang-')) {
          const lang = column.id.replace('lang-', '');
          updatedTranslation.values = {
            ...updatedTranslation.values,
            [lang]: newValueStr,
          };
        }
        
        updated[row] = updatedTranslation;
        return updated;
      });
      
      if (column.id === 'key') {
        const field = 'key';
        const oldValue = changeTracker.getOriginalValue(translation.id, field);
        changeTracker.trackChange(
          translation.id,
          field,
          'key',
          oldValue,
          newValueStr,
          newValueStr, // key 자체를 key로 사용
        );
        setChangesVersion(v => v + 1); // 변경사항 반영을 위해 리렌더링
        if (onCellChange) {
          onCellChange(translation.id, 'key', newValueStr);
        }
      } else if (column.id === 'context') {
        const field = 'context';
        const oldValue = changeTracker.getOriginalValue(translation.id, field);
        changeTracker.trackChange(
          translation.id,
          field,
          'context',
          oldValue,
          newValueStr,
          translation.key,
        );
        setChangesVersion(v => v + 1); // 변경사항 반영을 위해 리렌더링
        if (onCellChange) {
          onCellChange(translation.id, 'context', newValueStr);
        }
      } else if (column.id?.startsWith('lang-')) {
        const lang = column.id.replace('lang-', '');
        const field = `values.${lang}`;
        const oldValue = changeTracker.getOriginalValue(translation.id, field);
        changeTracker.trackChange(
          translation.id,
          field,
          lang,
          oldValue,
          newValueStr,
          translation.key,
        );
        setChangesVersion(v => v + 1); // 변경사항 반영을 위해 리렌더링
        if (onCellChange) {
          onCellChange(translation.id, lang, newValueStr);
        }
      }
    },
    [internalTranslations, columns, onCellChange]
  );

  // Tab 키 네비게이션 처리
  const onKeyDown = useCallback(
    (event: GridKeyEventArgs) => {
      // Tab 키만 처리, 나머지는 기본 동작 허용
      if (event.key === 'Tab' && !event.shiftKey) {
        // 현재 선택된 셀 위치 (location에서 가져오거나 selectedCell 사용)
        const currentCell = event.location || selectedCell || [0, 0];
        const [currentCol, currentRow] = currentCell;
        const totalCols = columns.length;
        const totalRows = internalTranslations.length;
        
        // 다음 셀 위치 계산
        let nextCol = currentCol + 1;
        let nextRow = currentRow;
        
        // 현재 행의 마지막 컬럼이면 다음 행의 첫 컬럼으로
        if (nextCol >= totalCols) {
          nextCol = 0;
          nextRow = currentRow + 1;
          
          // 마지막 행이면 첫 행으로 순환
          if (nextRow >= totalRows) {
            nextRow = 0;
          }
        }
        
        // 포커스 이동
        const nextCell: Item = [nextCol, nextRow];
        setSelectedCell(nextCell);
        
        // DataEditor ref를 통해 스크롤 및 포커스 이동
        if (dataEditorRef.current) {
          dataEditorRef.current.scrollTo(nextCell[1], nextCell[0]);
        }
        
        // 기본 Tab 동작은 막되, selection은 onGridSelectionChange에서 처리되도록 함
        event.preventDefault();
        event.stopPropagation();
        event.cancel();
      }
      // 다른 키는 기본 동작 허용 (아무것도 하지 않음)
    },
    [selectedCell, columns, internalTranslations.length]
  );

  // 셀 클릭 시 선택된 셀 업데이트
  const onCellClicked = useCallback(
    (cell: Item) => {
      setSelectedCell(cell);
    },
    []
  );

  // GridSelection 변경 시 추적
  const onGridSelectionChange = useCallback(
    (newSelection: GridSelection) => {
      if (newSelection.current) {
        setSelectedCell(newSelection.current.cell);
      }
    },
    []
  );


  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <DataEditor
        ref={dataEditorRef}
        getCellContent={getCellContent}
        columns={columns}
        rows={internalTranslations.length}
        onCellEdited={onCellEdited}
        onCellClicked={onCellClicked}
        onKeyDown={onKeyDown}
        onGridSelectionChange={onGridSelectionChange}
        rowMarkers="number"
        rowSelect="none"
        rangeSelect="cell"
        isDraggable={false}
        width={dimensions.width}
        height={dimensions.height}
        theme={{
          bgCell: '#ffffff',
          bgHeader: '#f8fafc',
          bgHeaderHasFocus: '#f1f5f9',
          textHeader: '#1e293b',
          textHeaderSelected: '#1e293b',
          bgCellMedium: '#fafafa',
          bgBubble: '#e2e8f0',
          bgBubbleSelected: '#cbd5e1',
          bgSearchResult: '#fef3c7',
          textDark: '#1e293b',
          textMedium: '#64748b',
          textLight: '#94a3b8',
          textBubble: '#1e293b',
          borderColor: '#e2e8f0',
          drilldownBorder: '#cbd5e1',
          linkColor: '#3b82f6',
          headerFontStyle: '600 14px system-ui',
          baseFontStyle: '14px system-ui',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      />
    </div>
  );
});

LocaleEditor.displayName = 'LocaleEditor';

