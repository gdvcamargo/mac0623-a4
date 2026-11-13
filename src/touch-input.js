// Roteia os toques na tela durante a sessão AR.
//
// Usa os eventos de toque do DOM no overlay (WebXR dom-overlay), que dão vários
// dedos ao mesmo tempo, coisa que os eventos "select" do WebXR não dão bem.
//
//  - Todo dedo que encosta na tela (inclusive em botões) é contado em onTouchCount,
//    para a coluna touch_count.
//  - Dedos que começam fora dos controles (botões, painéis, barra do topo) são
//    "toques na cena": ficam em `sceneTouches` para a técnica de toque ler, e um toque
//    curto e parado vira onTap (seleção e colocação do alvo).

import { TAP_MAX_MOVE_PX, TAP_MAX_MS } from "./constants.js";

const UI_SELECTOR = "button, input, select, label, .panel, #topBar, #rotatePad";

export class TouchInput {
  /**
   * @param {HTMLElement} root  o elemento do dom-overlay
   * @param {object} handlers
   * @param {(count: number) => void} handlers.onTouchCount  dedos novos neste evento
   * @param {(x: number, y: number) => void} handlers.onTap
   */
  constructor(root, handlers) {
    this.handlers = handlers;
    /** @type {Map<number, {x: number, y: number, startX: number, startY: number, t0: number}>} */
    this.sceneTouches = new Map();
    /** Dedos na cena desde o último evento que mudou a quantidade; a técnica re-ancora quando muda. */
    this.version = 0;

    root.addEventListener("touchstart", (e) => this.onStart(e), {
      passive: false,
    });
    root.addEventListener("touchmove", (e) => this.onMove(e), {
      passive: false,
    });
    root.addEventListener("touchend", (e) => this.onEnd(e), { passive: false });
    root.addEventListener("touchcancel", (e) => this.onEnd(e, true), {
      passive: false,
    });
  }

  /**
   * Quantos dedos estão na cena agora.
   *
   * @returns {number} - Número de dedos na cena.
   */
  get count() {
    return this.sceneTouches.size;
  }

  /**
   * Os dedos da cena em ordem de chegada.
   *
   * @returns {Array<{x: number, y: number, startX: number, startY: number, t0: number}>} - Os dedos da cena.
   */
  list() {
    return [...this.sceneTouches.values()];
  }

  /**
   * Esquece todos os dedos (ao sair do AR).
   *
   * @returns {void}
   */
  clear() {
    this.sceneTouches.clear();
    this.version++;
  }

  /**
   * Inicia um toque na tela.
   * @param {TouchEvent} e - O evento de toque.
   * @returns {void}
   */
  onStart(e) {
    this.handlers.onTouchCount(e.changedTouches.length);
    for (const t of e.changedTouches) {
      if (t.target instanceof Element && t.target.closest(UI_SELECTOR))
        continue;
      this.sceneTouches.set(t.identifier, {
        x: t.clientX,
        y: t.clientY,
        startX: t.clientX,
        startY: t.clientY,
        t0: performance.now(),
      });
      this.version++;
    }
    // Sem isto, o navegador gera eventos de mouse e menus de toque longo na cena.
    if (!(e.target instanceof Element && e.target.closest(UI_SELECTOR)))
      e.preventDefault();
  }

  onMove(e) {
    for (const t of e.changedTouches) {
      const s = this.sceneTouches.get(t.identifier);
      if (s) {
        s.x = t.clientX;
        s.y = t.clientY;
      }
    }
    e.preventDefault();
  }

  onEnd(e, cancelled = false) {
    for (const t of e.changedTouches) {
      const s = this.sceneTouches.get(t.identifier);
      if (!s) continue;
      const wasAlone = this.sceneTouches.size === 1;
      this.sceneTouches.delete(t.identifier);
      this.version++;
      const short = performance.now() - s.t0 <= TAP_MAX_MS;
      const still =
        Math.hypot(t.clientX - s.startX, t.clientY - s.startY) <=
        TAP_MAX_MOVE_PX;
      if (!cancelled && wasAlone && short && still)
        this.handlers.onTap(t.clientX, t.clientY);
    }
  }
}
