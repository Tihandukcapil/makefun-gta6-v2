// Keyboard and pointer input. Held keys give movement; one-shot presses (enter
// car, shoot, crew abilities, pause, weapon switch) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_CREW1 = 16;
export const ACTION_CREW2 = 32;
export const ACTION_CREW3 = 64;
export const ACTION_CYCLE_WEAPON = 128;
export const ACTION_RADIO = 256;
export const ACTION_GARAGE = 512;

const KEYS = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
};

export function createInput() {
  const held = { forward: false, back: false, left: false, right: false, sprint: false };
  let actions = 0;
  let weaponSlot = -1;

  window.addEventListener('keydown', (event) => {
    const move = KEYS[event.code];
    if (move) { held[move] = true; event.preventDefault(); return; }
    if (event.repeat) return;
    switch (event.code) {
      case 'Space': case 'Enter': actions |= ACTION_CONFIRM; event.preventDefault(); break;
      case 'KeyP': case 'Escape': actions |= ACTION_PAUSE; break;
      case 'KeyE': actions |= ACTION_ENTER; break;
      case 'KeyF': actions |= ACTION_SHOOT; break;
      case 'KeyZ': actions |= ACTION_CREW1; break;
      case 'KeyX': actions |= ACTION_CREW2; break;
      case 'KeyC': actions |= ACTION_CREW3; break;
      case 'KeyQ': actions |= ACTION_CYCLE_WEAPON; break;
      case 'KeyR': actions |= ACTION_RADIO; break;
      case 'KeyG': actions |= ACTION_GARAGE; break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
      case 'Digit5': case 'Digit6': case 'Digit7':
        weaponSlot = Number(event.code.slice(5)) - 1; break;
      default: break;
    }
  });
  window.addEventListener('keyup', (event) => {
    const move = KEYS[event.code];
    if (move) held[move] = false;
  });
  window.addEventListener('blur', () => {
    held.forward = held.back = held.left = held.right = held.sprint = false;
  });
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0) actions |= ACTION_SHOOT;
  });

  return {
    held,
    takeActions() { const taken = actions; actions = 0; return taken; },
    takeWeaponSlot() { const s = weaponSlot; weaponSlot = -1; return s; },
    // Test hook: drive keys from a script without a real keyboard.
    press(code) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    },
    hold(code, on) {
      window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, bubbles: true }));
    },
  };
}
