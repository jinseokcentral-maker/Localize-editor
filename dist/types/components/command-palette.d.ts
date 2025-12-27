/**
 * 명령 팔레트 컴포넌트
 *
 * VS Code 스타일의 명령 팔레트 UI
 */
import type { Command, EditorMode } from "./command-registry";
import { CommandRegistry } from "./command-registry";
import { type FuzzyFindMatch } from "./command-palette-fuzzy-find";
import "@/styles/command-palette.css";
export interface CommandPaletteCallbacks {
    onCommandExecute?: (command: Command, args?: string[]) => void;
    onClose?: () => void;
    onFindMatches?: (keyword: string) => FuzzyFindMatch[];
    onGotoMatch?: (match: FuzzyFindMatch) => void;
}
export declare class CommandPalette {
    private overlay;
    private container;
    private input;
    private list;
    private footer;
    private isOpen;
    private query;
    private filteredCommands;
    private selectedIndex;
    private currentMode;
    private commandRegistry;
    private callbacks;
    private isFuzzyFindMode;
    private fuzzyFindQuery;
    private fuzzyFindQuoteChar;
    private fuzzyFindResults;
    private fuzzyFindDebounceTimer;
    private inputOverlay;
    constructor(commandRegistry: CommandRegistry, callbacks?: CommandPaletteCallbacks);
    /**
     * 팔레트 열기
     */
    open(mode?: EditorMode): void;
    /**
     * 팔레트 닫기
     */
    close(): void;
    /**
     * UI 생성
     */
    private createUI;
    /**
     * UI 제거
     */
    private removeUI;
    /**
     * 이벤트 리스너 등록
     */
    private attachEventListeners;
    /**
     * 이벤트 리스너 해제
     */
    private detachEventListeners;
    /**
     * 입력 처리
     */
    private handleInput;
    /**
     * 입력 필드 스타일링 업데이트 (따옴표 이후 텍스트를 bold/italic로 표시)
     */
    private updateInputStyling;
    /**
     * Fuzzy find 결과 업데이트
     */
    private updateFuzzyFindResults;
    /**
     * Fuzzy find 결과 리스트 UI 업데이트
     */
    private updateFuzzyFindList;
    /**
     * 키보드 이벤트 처리
     */
    private handleKeyDown;
    /**
     * 명령 목록 업데이트
     */
    private updateCommands;
    /**
     * Footer 업데이트 (매칭 정보 표시)
     */
    private updateFooter;
    /**
     * 리스트 UI 업데이트
     */
    private updateList;
    /**
     * 선택된 항목으로 스크롤
     */
    private scrollToSelected;
    /**
     * 선택된 명령 실행
     */
    private executeSelectedCommand;
    /**
     * 명령 인자 파싱
     */
    private parseCommandArgs;
    /**
     * 팔레트가 열려있는지 확인
     */
    isPaletteOpen(): boolean;
    /**
     * Fuzzy find 모드인지 확인
     */
    getIsFuzzyFindMode(): boolean;
    /**
     * Fuzzy find 쿼리 가져오기
     */
    getFuzzyFindQuery(): string;
    /**
     * Fuzzy find 결과 가져오기
     */
    getFuzzyFindResults(): Array<{
        rowIndex: number;
        translation: any;
        score: number;
        matchedFields: Array<{
            field: string;
            matchedText: string;
            matchType: "exact" | "contains" | "fuzzy";
        }>;
    }>;
}
//# sourceMappingURL=command-palette.d.ts.map