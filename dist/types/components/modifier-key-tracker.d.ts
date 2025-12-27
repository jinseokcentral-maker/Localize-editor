/**
 * Modifier 키 상태 추적 모듈
 *
 * IME/브라우저가 modifier 키를 소비하는 경우를 대비하여
 * Meta/Ctrl 키 상태를 수동으로 추적합니다.
 */
export declare class ModifierKeyTracker {
    private metaKeyPressed;
    private ctrlKeyPressed;
    private modifierKeyDownHandler;
    private modifierKeyUpHandler;
    /**
     * 키보드 이벤트 리스너 등록
     */
    attach(): void;
    /**
     * 키보드 이벤트 리스너 해제
     */
    detach(): void;
    /**
     * Meta/Ctrl 키가 눌려있는지 확인
     * Mac에서는 metaKey(Cmd), Windows/Linux에서는 ctrlKey(Ctrl) 우선 사용
     */
    isModifierPressed(e: KeyboardEvent): boolean;
    /**
     * 추적된 Meta 키 상태
     */
    get metaKey(): boolean;
    /**
     * 추적된 Ctrl 키 상태
     */
    get ctrlKey(): boolean;
    /**
     * 상태 리셋 (필요시 사용)
     */
    reset(): void;
}
//# sourceMappingURL=modifier-key-tracker.d.ts.map