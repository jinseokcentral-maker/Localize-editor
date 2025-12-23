/**
 * Translation 타입 정의
 *
 * i18n 번역 데이터의 구조를 정의합니다.
 */
export interface Translation {
  /** 번역 항목의 고유 ID (UUID) */
  readonly id: string;
  /** 번역 키 (예: "common.buttons.submit") */
  readonly key: string;
  /** 언어별 번역 값 (예: { en: "Submit", ko: "제출" }) */
  readonly values: Record<string, string>;
  /** 번역가를 위한 컨텍스트 설명 (선택적) */
  readonly context?: string;
  /** 생성 시간 (선택적) */
  readonly createdAt?: string;
  /** 수정 시간 (선택적) */
  readonly updatedAt?: string;
  /** 수정한 사용자 ID (선택적) */
  readonly updatedBy?: string;
}

/**
 * LocaleEditor 초기화 옵션
 */
export interface LocaleEditorOptions {
  /** 번역 데이터 배열 */
  readonly translations: readonly Translation[];
  /** 지원하는 언어 코드 배열 (예: ["en", "ko", "ja"]) */
  readonly languages: readonly string[];
  /** 기본 언어 코드 */
  readonly defaultLanguage: string;
  /** 그리드를 렌더링할 DOM 컨테이너 */
  readonly container: HTMLElement;
  /** 읽기 전용 모드 (선택적, 기본값: false) */
  readonly readOnly?: boolean;
  /** 셀 변경 시 호출되는 콜백 (선택적) */
  readonly onCellChange?: (id: string, lang: string, value: string) => void;
  /** 저장 시 호출되는 콜백 (선택적) */
  readonly onSave?: (changes: TranslationChange[]) => Promise<void>;
  /** 검색 시 호출되는 콜백 (선택적, 서버 검색용) */
  readonly onSearch?: (query: string) => Promise<Translation[]>;
  /** 편집 불가능한 필드에 표시할 tooltip 메시지 생성 함수 (선택적) */
  readonly getEditDisabledTooltip?: (field: string, rowId: string, rowData: any) => string;
}

/**
 * 번역 변경사항
 */
export interface TranslationChange {
  /** 번역 항목 ID */
  readonly id: string;
  /** 번역 키 */
  readonly key: string;
  /** 변경된 언어 코드 */
  readonly lang: string;
  /** 이전 값 */
  readonly oldValue: string;
  /** 새로운 값 */
  readonly newValue: string;
}

/**
 * Translation 타입 가드
 *
 * 주어진 객체가 올바른 Translation 구조인지 검증합니다.
 */
export function isTranslation(value: unknown): value is Translation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // 필수 필드 검증
  if (typeof obj.id !== "string") return false;
  if (typeof obj.key !== "string") return false;
  if (typeof obj.values !== "object" || obj.values === null) return false;

  // values가 Record<string, string>인지 검증
  const values = obj.values as Record<string, unknown>;
  for (const lang in values) {
    if (typeof values[lang] !== "string") {
      return false;
    }
  }

  // 선택적 필드 검증 (있으면 타입 체크)
  if (obj.context !== undefined && typeof obj.context !== "string") {
    return false;
  }
  if (obj.createdAt !== undefined && typeof obj.createdAt !== "string") {
    return false;
  }
  if (obj.updatedAt !== undefined && typeof obj.updatedAt !== "string") {
    return false;
  }
  if (obj.updatedBy !== undefined && typeof obj.updatedBy !== "string") {
    return false;
  }

  return true;
}

/**
 * LocaleEditorOptions 타입 가드
 *
 * 주어진 객체가 올바른 LocaleEditorOptions 구조인지 검증합니다.
 */
export function isValidLocaleEditorOptions(
  value: unknown
): value is LocaleEditorOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // 필수 필드 검증
  if (!Array.isArray(obj.translations)) return false;
  if (!Array.isArray(obj.languages)) return false;
  if (typeof obj.defaultLanguage !== "string") return false;
  if (!(obj.container instanceof HTMLElement)) return false;

  // translations 배열의 모든 요소가 Translation인지 검증
  for (const translation of obj.translations) {
    if (!isTranslation(translation)) {
      return false;
    }
  }

  // languages 배열의 모든 요소가 string인지 검증
  for (const lang of obj.languages) {
    if (typeof lang !== "string") {
      return false;
    }
  }

  // 선택적 필드 검증
  if (obj.readOnly !== undefined && typeof obj.readOnly !== "boolean") {
    return false;
  }
  if (
    obj.onCellChange !== undefined &&
    typeof obj.onCellChange !== "function"
  ) {
    return false;
  }
  if (obj.onSave !== undefined && typeof obj.onSave !== "function") {
    return false;
  }
  if (obj.onSearch !== undefined && typeof obj.onSearch !== "function") {
    return false;
  }

  return true;
}






