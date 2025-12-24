/**
 * Modifier 키 상태 추적 모듈
 * 
 * IME/브라우저가 modifier 키를 소비하는 경우를 대비하여
 * Meta/Ctrl 키 상태를 수동으로 추적합니다.
 */

export class ModifierKeyTracker {
  private metaKeyPressed = false;
  private ctrlKeyPressed = false;
  private modifierKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private modifierKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  /**
   * 키보드 이벤트 리스너 등록
   */
  attach(): void {
    if (this.modifierKeyDownHandler || this.modifierKeyUpHandler) {
      // 이미 등록된 경우 중복 등록 방지
      return;
    }

    this.modifierKeyDownHandler = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "MetaLeft" || e.key === "MetaRight") {
        this.metaKeyPressed = true;
      }
      if (
        e.key === "Control" ||
        e.key === "ControlLeft" ||
        e.key === "ControlRight"
      ) {
        this.ctrlKeyPressed = true;
      }
    };

    this.modifierKeyUpHandler = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "MetaLeft" || e.key === "MetaRight") {
        this.metaKeyPressed = false;
      }
      if (
        e.key === "Control" ||
        e.key === "ControlLeft" ||
        e.key === "ControlRight"
      ) {
        this.ctrlKeyPressed = false;
      }
    };

    // Modifier 키 추적을 위해 capture phase에서 가장 먼저 등록
    window.addEventListener("keydown", this.modifierKeyDownHandler, true);
    window.addEventListener("keyup", this.modifierKeyUpHandler, true);
  }

  /**
   * 키보드 이벤트 리스너 해제
   */
  detach(): void {
    if (this.modifierKeyDownHandler) {
      window.removeEventListener("keydown", this.modifierKeyDownHandler, true);
      this.modifierKeyDownHandler = null;
    }

    if (this.modifierKeyUpHandler) {
      window.removeEventListener("keyup", this.modifierKeyUpHandler, true);
      this.modifierKeyUpHandler = null;
    }
  }

  /**
   * Meta/Ctrl 키가 눌려있는지 확인
   * Mac에서는 metaKey(Cmd), Windows/Linux에서는 ctrlKey(Ctrl) 우선 사용
   */
  isModifierPressed(e: KeyboardEvent): boolean {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    
    if (isMac) {
      return this.metaKeyPressed || e.metaKey || this.ctrlKeyPressed || e.ctrlKey;
    } else {
      return this.ctrlKeyPressed || e.ctrlKey || this.metaKeyPressed || e.metaKey;
    }
  }

  /**
   * 추적된 Meta 키 상태
   */
  get metaKey(): boolean {
    return this.metaKeyPressed;
  }

  /**
   * 추적된 Ctrl 키 상태
   */
  get ctrlKey(): boolean {
    return this.ctrlKeyPressed;
  }

  /**
   * 상태 리셋 (필요시 사용)
   */
  reset(): void {
    this.metaKeyPressed = false;
    this.ctrlKeyPressed = false;
  }
}

