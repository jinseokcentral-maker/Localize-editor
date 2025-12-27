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
export declare function isTranslation(value: unknown): value is Translation;
/**
 * LocaleEditorOptions 타입 가드
 *
 * 주어진 객체가 올바른 LocaleEditorOptions 구조인지 검증합니다.
 */
export declare function isValidLocaleEditorOptions(value: unknown): value is LocaleEditorOptions;
//# sourceMappingURL=translation.d.ts.map