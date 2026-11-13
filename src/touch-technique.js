// Técnica 1 - Gestos de toque.
//
//  - Um dedo arrasta o objeto pela superfície: o raio que sai da câmera pelo ponto
//    tocado é cruzado com o plano da superfície (y = altura onde o alvo foi colocado).

//    O deslocamento entre o ponto tocado e o objeto é guardado quando o dedo encosta,
//    então o objeto não pula para baixo do dedo. O cálculo é refeito a cada quadro,
//    então mover o celular com o dedo parado também move o objeto, como no ARCore.

//  - Dois dedos giram o objeto em torno da vertical: o yaw muda o mesmo tanto que o
//    ângulo da reta entre os dois dedos na tela (ganho 1). Girar os dedos no sentido
//    horário gira o objeto no sentido horário visto de cima.
//
// Sempre que a quantidade de dedos muda, o gesto é re-ancorado, para nada pular ao
// passar de dois dedos para um.

import * as THREE from "three";
import { intersectHorizontalPlane, rayFromScreen } from "./utils.js";

const _ray = new THREE.Ray();
const _hit = new THREE.Vector3();

export class TouchTechnique {
  /**
   * @param {import("./touch-input.js").TouchInput} input
   * @param {THREE.Camera} camera
   */
  constructor(input, camera) {
    this.input = input;
    this.camera = camera;
    this.target = null; // DockObject
    this.surfaceY = 0;
    this.anchoredVersion = -1;
    this.mode = "idle";
    this.dragOffset = new THREE.Vector3();
    this.twistAngle0 = 0;
    this.yaw0 = 0;
  }

  /**
   * Começa a manipular `object` (chamado na seleção correta).
   * @param {import("./dock-object.js").DockObject} object
   * @param {number} surfaceY
   * @returns {void}
   */
  attach(object, surfaceY) {
    this.target = object;
    this.surfaceY = surfaceY;
    this.anchoredVersion = -1;
  }

  detach() {
    this.target = null;
    this.mode = "idle";
  }

  /**
   * Algum dedo na cena: o encaixe só vale com zero dedos.
   * @returns {boolean} - Verdadeiro se houver dedos na cena.
   */
  get manipulating() {
    return this.input.count > 0;
  }

  /**
   * Ponto da superfície sob um ponto da tela, ou null.
   * @param {number} x - A coordenada x do ponto na tela.
   * @param {number} y - A coordenada y do ponto na tela.
   * @returns {THREE.Vector3 | null} - O ponto na superfície, ou null se não houver interseção.
   */
  surfacePoint(x, y) {
    rayFromScreen(this.camera, x, y, _ray);
    return intersectHorizontalPlane(_ray, this.surfaceY, _hit);
  }

  screenAngle(touches) {
    return Math.atan2(touches[1].y - touches[0].y, touches[1].x - touches[0].x);
  }

  anchor(touches) {
    const pos = this.target.root.position;
    if (touches.length === 1) {
      const p = this.surfacePoint(touches[0].x, touches[0].y);
      this.mode = p ? "drag" : "idle";
      if (p) this.dragOffset.set(pos.x - p.x, 0, pos.z - p.z);
    } else if (touches.length >= 2) {
      this.mode = "twist";
      this.twistAngle0 = this.screenAngle(touches);
      this.yaw0 = this.target.yaw;
    } else {
      this.mode = "idle";
    }
  }

  update() {
    if (!this.target) return;
    const touches = this.input.list();
    if (this.input.version !== this.anchoredVersion) {
      this.anchoredVersion = this.input.version;
      this.anchor(touches);
      return;
    }
    if (this.mode === "drag" && touches.length === 1) {
      const p = this.surfacePoint(touches[0].x, touches[0].y);
      if (p)
        this.target.root.position.set(
          p.x + this.dragOffset.x,
          this.surfaceY,
          p.z + this.dragOffset.z,
        );
    } else if (this.mode === "twist" && touches.length >= 2) {
      // Na tela o y cresce para baixo, então o ângulo cresce no sentido horário; visto de
      // cima, yaw positivo é anti-horário. Daí o sinal de menos.
      this.target.yaw =
        this.yaw0 - (this.screenAngle(touches) - this.twistAngle0);
    }
  }
}
