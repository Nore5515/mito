import { params } from "game/params";

// when you press one, the other one gets removed from the keyMap
const OPPOSITE_KEYS: Record<string, string> = {
  KeyS: "KeyW",
  KeyW: "KeyS",
  KeyA: "KeyD",
  KeyD: "KeyA",
};

/**
 * Singleton that listens to key events on window.
 */
export const Keyboard = new (class Keyboard {
  readonly keyMap = new Set<string>();

  constructor() {
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private handleBlur = () => {
    this.keyMap.clear();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    const { code } = event;

    const isTargetAnInput = event.target instanceof HTMLInputElement;
    const isOpeningDevtoolsOnChrome =
      (code === "KeyI" && event.shiftKey && event.ctrlKey) || (code === "KeyI" && event.altKey && event.metaKey);
    if (isTargetAnInput || isOpeningDevtoolsOnChrome) {
      return true;
    }
    this.keyMap.add(code);
    if (code in OPPOSITE_KEYS) {
      this.keyMap.delete(OPPOSITE_KEYS[code]);
    }
    if (code === "KeyH") {
      params.hud = !params.hud;
    }
    if (code === "KeyL") {
      params.debugLevel = !params.debugLevel;
    }
    if (code === "KeyN") {
      params.forceNight = !params.forceNight;
    }
    if (code === "Period") {
      params.showFPS = !params.showFPS;
    }
    if (code === "Slash") {
      params.showGodUI = !params.showGodUI;
    }

    event.preventDefault();
    return false;
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keyMap.delete(event.code);
  };
})();

export default Keyboard;
