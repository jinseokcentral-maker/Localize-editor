import type { Translation, TranslationChange } from '../types/translation';
import { ChangeTracker } from './change-tracker';

export interface LocaleEditorTheme {
  cellColor?: string;
  cellBackgroundColor?: string;
  headerColor?: string;
  headerBackgroundColor?: string;
  borderColor?: string;
  dirtyCellBackgroundColor?: string;
  selectedCellBackgroundColor?: string;
}

export interface LocaleEditorOptions {
  container: HTMLElement;
  translations: readonly Translation[];
  languages: readonly string[];
  defaultLanguage?: string;
  readOnly?: boolean;
  onCellChange?: (id: string, lang: string, value: string) => void;
  theme?: LocaleEditorTheme;
}

export class LocaleEditor {
  private container: HTMLElement;
  private translations: Translation[];
  private languages: string[];
  private defaultLanguage: string;
  private readOnly: boolean;
  private onCellChange?: (id: string, lang: string, value: string) => void;
  private changeTracker: ChangeTracker;
  private spreadsheet: any; // jspreadsheet instance
  private isInitialized = false;
  private theme?: LocaleEditorTheme;

  constructor(options: LocaleEditorOptions) {
    this.container = options.container;
    this.translations = [...options.translations];
    this.languages = [...options.languages];
    this.defaultLanguage = options.defaultLanguage || options.languages[0];
    this.readOnly = options.readOnly || false;
    this.onCellChange = options.onCellChange;
    this.theme = options.theme;
    this.changeTracker = new ChangeTracker();
    
    // ChangeTracker 초기화
    this.changeTracker.initializeOriginalData(this.translations, this.languages);
    
    this.init();
  }

  private async init() {
    // Jspreadsheet CE와 jSuites 동적 로드
    await this.loadJspreadsheet();
    
    // 스프레드시트 초기화
    this.initSpreadsheet();
  }

  private async loadJspreadsheet() {
    return new Promise<void>((resolve, reject) => {
      // 이미 로드되어 있는지 확인
      if ((window as any).jspreadsheet) {
        resolve();
        return;
      }

      // CSS 로드 (이미 로드되어 있는지 확인)
      const existingCss1 = document.querySelector('link[href*="jspreadsheet.min.css"]');
      if (!existingCss1) {
        const css1 = document.createElement('link');
        css1.rel = 'stylesheet';
        css1.href = 'https://cdn.jsdelivr.net/npm/jspreadsheet-ce/dist/jspreadsheet.min.css';
        document.head.appendChild(css1);
      }

      const existingCss2 = document.querySelector('link[href*="jsuites.min.css"]');
      if (!existingCss2) {
        const css2 = document.createElement('link');
        css2.rel = 'stylesheet';
        css2.href = 'https://cdn.jsdelivr.net/npm/jsuites/dist/jsuites.min.css';
        document.head.appendChild(css2);
      }

      // jSuites 로드
      if ((window as any).jsuites) {
        // Jspreadsheet CE 로드
        if ((window as any).jspreadsheet) {
          resolve();
        } else {
          const jspreadsheetScript = document.createElement('script');
          jspreadsheetScript.src = 'https://cdn.jsdelivr.net/npm/jspreadsheet-ce/dist/index.min.js';
          jspreadsheetScript.onload = () => {
            resolve();
          };
          jspreadsheetScript.onerror = reject;
          document.head.appendChild(jspreadsheetScript);
        }
      } else {
        const jsuitesScript = document.createElement('script');
        jsuitesScript.src = 'https://cdn.jsdelivr.net/npm/jsuites/dist/jsuites.min.js';
        jsuitesScript.onload = () => {
          // Jspreadsheet CE 로드
          const jspreadsheetScript = document.createElement('script');
          jspreadsheetScript.src = 'https://cdn.jsdelivr.net/npm/jspreadsheet-ce/dist/index.min.js';
          jspreadsheetScript.onload = () => {
            resolve();
          };
          jspreadsheetScript.onerror = reject;
          document.head.appendChild(jspreadsheetScript);
        };
        jsuitesScript.onerror = reject;
        document.head.appendChild(jsuitesScript);
      }
    });
  }

  private initSpreadsheet() {
    const jspreadsheet = (window as any).jspreadsheet;
    if (!jspreadsheet) {
      console.error('Jspreadsheet not loaded');
      return;
    }

    // 데이터 준비
    const data = this.translations.map((translation) => {
      const row: any[] = [
        translation.key,
        translation.context || '',
      ];
      
      // 각 언어 컬럼 추가
      this.languages.forEach((lang) => {
        row.push(translation.values[lang] || '');
      });
      
      return row;
    });

    // 컬럼 정의
    const columns: any[] = [
      {
        type: 'text',
        title: 'Key',
        width: 200,
        readOnly: this.readOnly,
      },
      {
        type: 'text',
        title: 'Context',
        width: 200,
        readOnly: this.readOnly,
      },
      ...this.languages.map((lang) => ({
        type: 'text',
        title: lang.toUpperCase(),
        width: 150,
        readOnly: this.readOnly,
      })),
    ];

    // 컨테이너 기본 스타일만 설정 (너비와 높이만)
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'auto';

    // 테마 기반 스타일 객체 생성
    const style: Record<string, string> = {};
    if (this.theme) {
      // 헤더 행 스타일
      const headerStyle = [];
      if (this.theme.headerBackgroundColor) {
        headerStyle.push(`background-color: ${this.theme.headerBackgroundColor}`);
      }
      if (this.theme.headerColor) {
        headerStyle.push(`color: ${this.theme.headerColor}`);
      }
      if (this.theme.borderColor) {
        headerStyle.push(`border-color: ${this.theme.borderColor}`);
      }
      if (headerStyle.length > 0) {
        // 첫 번째 행의 모든 헤더 셀에 스타일 적용
        for (let col = 0; col < columns.length; col++) {
          const cellKey = String.fromCharCode(65 + col) + '1'; // A1, B1, C1...
          style[cellKey] = headerStyle.join('; ');
        }
      }
    }

    // 스프레드시트 초기화
    const jspreadsheetOptions: any = {
      worksheets: [
        {
          data,
          columns,
        },
      ],
      onchange: (instance: any, cell: any, x: number, y: number, value: any) => {
        this.handleCellChange(x, y, value);
      },
    };

    // 테마가 있으면 style 옵션 추가
    if (Object.keys(style).length > 0) {
      jspreadsheetOptions.style = style;
    }

    this.spreadsheet = jspreadsheet(this.container, jspreadsheetOptions);

    this.isInitialized = true;
  }

  private handleCellChange(x: number, y: number, value: any) {
    if (!this.isInitialized) return;

    const translation = this.translations[y];
    if (!translation) return;

    const columnIndex = x;
    const newValue = String(value || '');

    // 컬럼 타입에 따라 처리
    if (columnIndex === 0) {
      // Key 컬럼
      const oldValue = this.changeTracker.getOriginalValue(translation.id, 'key');
      this.changeTracker.trackChange(
        translation.id,
        'key',
        'key',
        oldValue,
        newValue,
        newValue
      );
      translation.key = newValue;
      if (this.onCellChange) {
        this.onCellChange(translation.id, 'key', newValue);
      }
    } else if (columnIndex === 1) {
      // Context 컬럼
      const oldValue = this.changeTracker.getOriginalValue(translation.id, 'context');
      this.changeTracker.trackChange(
        translation.id,
        'context',
        'context',
        oldValue,
        newValue,
        translation.key
      );
      translation.context = newValue;
      if (this.onCellChange) {
        this.onCellChange(translation.id, 'context', newValue);
      }
    } else {
      // Language 컬럼
      const langIndex = columnIndex - 2;
      const lang = this.languages[langIndex];
      if (lang) {
        const field = `values.${lang}`;
        const oldValue = this.changeTracker.getOriginalValue(translation.id, field);
        this.changeTracker.trackChange(
          translation.id,
          field,
          lang,
          oldValue,
          newValue,
          translation.key
        );
        translation.values[lang] = newValue;
        if (this.onCellChange) {
          this.onCellChange(translation.id, lang, newValue);
        }
      }
    }

    // 변경된 셀 스타일 업데이트
    this.updateCellStyle(x, y);
  }


  private updateCellStyle(x: number, y: number) {
    if (!this.spreadsheet) return;
    
    const translation = this.translations[y];
    if (!translation) return;

    // 변경된 셀인지 확인
    const columnIndex = x;
    let isDirty = false;
    let field = '';

    if (columnIndex === 0) {
      field = 'key';
      isDirty = this.changeTracker.hasChange(translation.id, field);
    } else if (columnIndex === 1) {
      field = 'context';
      isDirty = this.changeTracker.hasChange(translation.id, field);
    } else {
      const langIndex = columnIndex - 2;
      const lang = this.languages[langIndex];
      if (lang) {
        field = `values.${lang}`;
        isDirty = this.changeTracker.hasChange(translation.id, field);
      }
    }

    // DOM에서 직접 셀 찾기 (Jspreadsheet CE는 getCell 메서드가 없을 수 있음)
    try {
      // 테이블에서 해당 행과 열 찾기
      const tables = this.container.querySelectorAll('table');
      if (tables.length === 0) return;

      const table = tables[0];
      const rows = table.querySelectorAll('tbody tr');
      if (rows.length <= y) return;

      const row = rows[y] as HTMLTableRowElement;
      const cells = row.querySelectorAll('td');
      if (cells.length <= x) return;

      const cellEl = cells[x] as HTMLElement;
      
      if (isDirty) {
        const dirtyColor = this.theme?.dirtyCellBackgroundColor || '#fff3cd';
        cellEl.style.backgroundColor = dirtyColor;
        cellEl.classList.add('dirty');
      } else {
        const normalColor = this.theme?.cellBackgroundColor || '#ffffff';
        cellEl.style.backgroundColor = normalColor;
        cellEl.classList.remove('dirty');
      }
    } catch (e) {
      // 셀 접근 실패 시 무시
      console.warn('Failed to update cell style:', e);
    }
  }

  getChanges(): TranslationChange[] {
    return this.changeTracker.getChanges();
  }

  clearChanges(): void {
    const changes = this.changeTracker.getChanges();
    
    // 변경사항을 원본 값으로 되돌리기
    changes.forEach((change) => {
      const translation = this.translations.find((t) => t.id === change.id);
      if (!translation) return;

      if (change.lang === 'key') {
        translation.key = change.oldValue;
      } else if (change.lang === 'context') {
        translation.context = change.oldValue;
      } else {
        translation.values[change.lang] = change.oldValue;
      }
    });

    // 변경사항 추적 초기화
    this.changeTracker.clearChanges();
    
    // 스프레드시트 데이터 업데이트
    this.refreshSpreadsheet();
  }

  setReadOnly(readOnly: boolean): void {
    this.readOnly = readOnly;
    // TODO: 스프레드시트 읽기 전용 모드 설정
  }

  private refreshSpreadsheet() {
    if (!this.spreadsheet) return;
    
    // 데이터 다시 준비
    const data = this.translations.map((translation) => {
      const row: any[] = [
        translation.key,
        translation.context || '',
      ];
      
      this.languages.forEach((lang) => {
        row.push(translation.values[lang] || '');
      });
      
      return row;
    });

    // 스프레드시트 데이터 업데이트
    this.spreadsheet.setData(data);
  }
}

