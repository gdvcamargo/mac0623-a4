// Joystick horizontal na tela
//
// Uma faixa com um pino no meio.
//
// O polegar encosta e arrasta: o valor vai de −1 (todo à esquerda) a +1 (todo à direita),
// medido a partir do centro da faixa, então encostar já num lado já gira para aquele lado.
//
// Soltar volta o valor a 0.

export class Joystick {
  /**
   * @param {HTMLElement} pad   a faixa
   * @param {HTMLElement} knob  o pino que acompanha o polegar
   */
  constructor(pad, knob) {
    this.pad = pad;
    this.knob = knob;
    this.value = 0;
    this.touchId = null;

    pad.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (this.touchId !== null) return;
        const t = e.changedTouches[0];
        this.touchId = t.identifier;
        this.move(t.clientX);
      },
      { passive: false },
    );
    pad.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        for (const t of e.changedTouches)
          if (t.identifier === this.touchId) this.move(t.clientX);
      },
      { passive: false },
    );
    const end = (e) => {
      for (const t of e.changedTouches)
        if (t.identifier === this.touchId) this.reset();
    };
    pad.addEventListener("touchend", end);
    pad.addEventListener("touchcancel", end);
    pad.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /** Polegar no joystick. */
  get active() {
    return this.touchId !== null;
  }

  /**
   * Move o pino para a posição do polegar.
   * @param {number} clientX - A coordenada x do toque na tela.
   * @returns {void}
   */
  move(clientX) {
    const r = this.pad.getBoundingClientRect();
    const range = (r.width - this.knob.offsetWidth) / 2;
    const dx = clientX - (r.left + r.width / 2);
    this.value = Math.max(-1, Math.min(1, dx / range));
    this.knob.style.transform = `translateX(${this.value * range}px)`;
  }

  reset() {
    this.touchId = null;
    this.value = 0;
    this.knob.style.transform = "";
  }
}
