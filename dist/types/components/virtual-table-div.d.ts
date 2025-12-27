/**
 * Virtual Table (Div-based Grid) - @tanstack/virtual-core를 사용한 가상화 그리드
 *
 * 테이블 구조 대신 div 기반 그리드로 구현하여 가상 스크롤링과 완벽하게 호환
 */
import type { Translation, TranslationChange } from "@/types/translation";
import { type SearchMatch } from "./text-search-matcher";
import "@/styles/virtual-table-div.css";
import "@/styles/quick-search.css";
import "@/styles/status-bar.css";
import "@/styles/command-line.css";
export interface VirtualTableDivOptions {
    container: HTMLElement;
    translations: readonly Translation[];
    languages: readonly string[];
    defaultLanguage: string;
    readOnly?: boolean;
    onCellChange?: (id: string, lang: string, value: string) => void;
    rowHeight?: number;
    headerHeight?: number;
    columnWidths?: Map<string, number>;
}
export declare class VirtualTableDiv {
    private container;
    private scrollElement;
    private gridElement;
    private headerElement;
    private bodyElement;
    private options;
    private rowVirtualizer;
    private virtualizerCleanup;
    private renderScheduled;
    private resizeObserver;
    private columnWidths;
    private editableColumns;
    private rowHeight;
    private headerHeight;
    private changeTracker;
    private undoRedoManager;
    private modifierKeyTracker;
    private focusManager;
    private cellEditor;
    private keyboardHandlerModule;
    private columnResizer;
    private columnWidthCalculator;
    private gridRenderer;
    private commandRegistry;
    private commandPalette;
    private columnMinWidths;
    private originalTranslations;
    private currentTranslations;
    private currentFilter;
    private currentSearchKeyword;
    private filterManager;
    private currentGotoMatches;
    private quickSearch;
    private quickSearchUI;
    private currentQuickSearchMatches;
    private currentQuickSearchIndex;
    private statusBar;
    private findReplace;
    private vimCommandTracker;
    private commandLine;
    private vimKeyboardHandler;
    constructor(options: VirtualTableDivOptions);
    /**
     * 그리드 렌더링
     */
    render(): void;
    /**
     * 컨테이너 크기 변경 감지
     */
    private observeContainerResize;
    /**
     * 가상 스크롤링 초기화
     */
    private initVirtualScrolling;
    /**
     * 가상 행 렌더링
     */
    private renderVirtualRows;
    /**
     * 헤더 렌더링
     */
    private renderHeader;
    /**
     * 특정 컬럼의 너비를 모든 셀에 적용
     * 마지막 컬럼은 항상 끝까지 채워지도록 함
     */
    private applyColumnWidth;
    /**
     * 헤더에서 실제 컬럼 너비 가져오기
     */
    private getColumnWidthsFromHeader;
    /**
     * 편집 시작 (더블클릭 또는 키보드)
     */
    private startEditing;
    /**
     * 키보드로 편집 시작 (F2 또는 Enter)
     */
    private startEditingFromKeyboard;
    /**
     * 편집 중지
     */
    private stopEditing;
    /**
     * 셀 스타일 업데이트
     */
    private updateCellStyle;
    /**
     * 키보드 이벤트 리스너 추가
     */
    private attachKeyboardListeners;
    /**
     * Vim 키보드 이벤트 처리
     */
    private handleVimKeyboardEvent;
    /**
     * 셀에 포커스 설정
     */
    private focusCell;
    /**
     * Undo 처리
     */
    private handleUndo;
    /**
     * Redo 처리
     */
    private handleRedo;
    /**
     * Undo/Redo 액션 적용
     */
    private applyUndoRedoAction;
    /**
     * 컨테이너 너비 가져오기
     */
    private getContainerWidth;
    /**
     * 읽기 전용 모드 설정
     */
    setReadOnly(readOnly: boolean): void;
    /**
     * 변경사항 목록 반환
     */
    getChanges(): TranslationChange[];
    /**
     * 기본 명령어 등록
     */
    private registerDefaultCommands;
    /**
     * 특정 행으로 이동
     */
    private gotoRow;
    /**
     * 첫 번째 행으로 이동
     */
    private gotoTop;
    /**
     * 마지막 행으로 이동
     */
    private gotoBottom;
    /**
     * 텍스트로 매치 찾기 (fuzzy find)
     * @param keyword 검색 키워드
     * @returns 매치 결과 배열 (점수 순으로 정렬)
     */
    findMatches(keyword: string): SearchMatch[];
    /**
     * 검색 결과의 첫 번째 매치로 이동
     * @param match 검색 결과 매치
     */
    gotoToMatch(match: SearchMatch): void;
    /**
     * 다음 검색 결과로 이동
     */
    gotoToNextMatch(): void;
    /**
     * 이전 검색 결과로 이동
     */
    gotoToPrevMatch(): void;
    /**
     * 찾기/바꾸기 열기
     */
    private openFindReplace;
    /**
     * 찾기 매칭으로 이동
     */
    private gotoToFindMatch;
    /**
     * 찾기 매칭 바꾸기
     */
    private replaceFindMatch;
    /**
     * 모든 찾기 매칭 바꾸기
     */
    private replaceAllFindMatches;
    /**
     * 현재 검색 매칭 정보 가져오기
     */
    getCurrentMatchInfo(): {
        current: number;
        total: number;
    } | null;
    /**
     * 필터링된 translations 반환
     */
    private getFilteredTranslations;
    /**
     * 필터링된 translations로 그리드 업데이트
     */
    private applyFilter;
    /**
     * 키워드 검색
     */
    private searchKeyword;
    /**
     * 빈 번역 필터
     */
    private filterEmpty;
    /**
     * 변경된 셀 필터
     */
    private filterChanged;
    /**
     * 중복 Key 필터
     */
    private filterDuplicate;
    /**
     * 필터 제거
     */
    private clearFilter;
    /**
     * 도움말 표시 (모달 UI)
     */
    private showHelp;
    /**
     * 변경사항 초기화
     */
    clearChanges(): void;
    /**
     * 빠른 검색 모드 열기
     */
    private openQuickSearch;
    /**
     * 빠른 검색 모드 닫기
     */
    private closeQuickSearch;
    /**
     * 빠른 검색 실행
     */
    private handleQuickSearch;
    /**
     * 다음 매칭으로 이동
     */
    private goToNextQuickSearchMatch;
    /**
     * 이전 매칭으로 이동
     */
    private goToPrevQuickSearchMatch;
    /**
     * 특정 매칭으로 이동
     */
    private goToQuickSearchMatch;
    /**
     * 빠른 검색 하이라이트 적용
     */
    private applyQuickSearchHighlight;
    /**
     * 그리드 정리
     */
    destroy(): void;
    /**
     * 상태바 초기화
     */
    private initStatusBar;
    /**
     * CommandLine 명령어 실행
     */
    private executeCommandLineCommand;
    /**
     * 상태바 정보 수집 및 업데이트
     */
    private updateStatusBar;
    /**
     * 빈 번역 수 계산
     */
    private countEmptyTranslations;
    /**
     * 중복 Key 수 계산
     */
    private countDuplicateKeys;
}
//# sourceMappingURL=virtual-table-div.d.ts.map