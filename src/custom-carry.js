// Custom Carry (carregar + joystick)
//
// Translação (Carry): enquanto o botão "Segurar" está pressionado, o objeto mantém a
// posição que tinha em relação ao celular no instante do toque: segue o celular como
// se o celular o segurasse. Soltar deixa o objeto onde está.

// Só a posição horizontal do celular e o yaw dele entram no mapeamento da posição;
// inclinar o celular para olhar a mesa não mexe o objeto.
//
// No toque:       offset = R(−ψ_cel) * (obj.xz − cel.xz)
// A cada quadro:  obj.xz = cel.xz + R(ψ_cel) · offset
//
// Rotação (Joystick): ela só muda pelo joystick horizontal, com o outro polegar: direita gira no sentido horário, esquerda no
// anti-horário (visto de cima).
//
// É controle de velocidade: quanto mais longe do centro, mais rápido, com curva quadrática
// (devagar perto do centro, para acertar os 10°).
//
// O joystick funciona com ou sem o botão "Segurar" pressionado.

import * as THREE from "three";
import { JOYSTICK_DEAD_ZONE, JOYSTICK_MAX_DEG_PER_S } from "./constants.js";
import { DEG2RAD, yawOf } from "./utils.js";

const UP = new THREE.Vector3(0, 1, 0);

export class CustomCarryTechnique {
  /**
   * @param {HTMLButtonElement} button  botão "Segurar"
   * @param {import("./joystick.js").Joystick} joystick
   * @param {() => XRViewerPose | null} getViewerPose  pose do celular no quadro atual
   */
  constructor(button, joystick, getViewerPose) {
    this.button = button;
    this.joystick = joystick;
    this.getViewerPose = getViewerPose;
    this.target = null; // DockObject
    this.surfaceY = 0;
    this.held = false;
    this.grabbed = false; // já capturou o offset (precisa de uma pose válida)
    this.touchId = null;
    this.offset = new THREE.Vector3();
    this.lastTime = 0;

    button.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (this.touchId !== null) return;
        this.touchId = e.changedTouches[0].identifier;
        this.press();
      },
      { passive: false },
    );
    const release = (e) => {
      for (const t of e.changedTouches)
        if (t.identifier === this.touchId) {
          this.touchId = null;
          this.release();
        }
    };
    button.addEventListener("touchend", release);
    button.addEventListener("touchcancel", release);
    button.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  attach(object, surfaceY) {
    this.target = object;
    this.surfaceY = surfaceY;
    this.lastTime = performance.now();
  }

  /**
   * Solta o objeto, reseta o joystick e remove a referência ao objeto.
   * @returns {void}
   */
  detach() {
    this.release();
    this.joystick.reset();
    this.target = null;
  }

  /**
   *  Botão pressionado ou polegar no joystick
   * @returns {boolean}
   */
  get manipulating() {
    return this.held || this.joystick.active;
  }

  /**
   * Pressiona o botão, atualiza as flags e adiciona a classe CSS
   * @returns {void}
   */
  press() {
    this.held = true;
    this.grabbed = false;
    this.button.classList.add("held");
  }

  /**
   * Solta o botão, atualiza as flags e remove a classe CSS
   * @returns {void}
   */
  release() {
    this.held = false;
    this.grabbed = false;
    this.button.classList.remove("held");
  }

  /**
   * Captura o offset do objeto no referencial "só yaw" do celular.
   *
   * @param {THREE.Vector3} phonePos - Posição do celular
   * @param {number} phoneYaw - Yaw do celular
   * @returns {void}
   */
  grab(phonePos, phoneYaw) {
    const p = this.target.root.position;
    this.offset
      .set(p.x - phonePos.x, 0, p.z - phonePos.z)
      .applyAxisAngle(UP, -phoneYaw);
    this.grabbed = true;
  }

  /**
   * Velocidade de giro (graus/s) para um valor do joystick em [−1, 1].
   *
   * @param {number} value - Valor do joystick
   * @returns {number} - Velocidade de giro em graus/s
   */
  static rotationSpeed(value) {
    const mag = Math.abs(value);
    if (mag <= JOYSTICK_DEAD_ZONE) return 0;

    // Reescala para [0, 1] e aplica curva quadrática
    const s = (mag - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE);
    return Math.sign(value) * JOYSTICK_MAX_DEG_PER_S * s * s;
  }

  /**
   * Atualiza a posição e o yaw do objeto, se houver um alvo e o botão estiver pressionado.
   *
   * @returns {void}
   */
  update() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // quadro travado não vira um giro enorme
    this.lastTime = now;
    if (!this.target) return;

    // Rotação: direita (valor > 0) = horário visto de cima = yaw negativo.
    this.target.yaw -=
      CustomCarryTechnique.rotationSpeed(this.joystick.value) * DEG2RAD * dt;

    if (!this.held) return;
    const pose = this.getViewerPose();

    // Sem pose real (rastreamento perdido), o objeto fica parado onde está.
    if (!pose || pose.emulatedPosition) return;

    const t = pose.transform;
    const phonePos = new THREE.Vector3(
      t.position.x,
      t.position.y,
      t.position.z,
    );
    const phoneYaw = yawOf(t.orientation);
    // Se ainda não capturou o offset, faz isso agora e sai
    if (!this.grabbed) {
      this.grab(phonePos, phoneYaw);
      return;
    }

    const rotated = this.offset.clone().applyAxisAngle(UP, phoneYaw);
    this.target.root.position.set(
      phonePos.x + rotated.x,
      this.surfaceY,
      phonePos.z + rotated.z,
    );
  }
}
