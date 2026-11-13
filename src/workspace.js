// Espaço de trabalho de uma tentativa, colocado sobre a superfície real.
//
// Contém o alvo fantasma (translúcido, yaw sorteado) e os três objetos coloridos a
// 30–50 cm dele.
// Sabe sortear, destacar, medir o erro e mostrar o "encaixado".
//
//  Não conhece toque, técnica nem CSV.
//
// Todos os objetos ficam com y = altura da superfície; a tarefa é só x, z e yaw.

import * as THREE from "three";
import {
  GHOST_OPACITY,
  OBJECT_COLORS,
  OBJECT_HEIGHT,
  OBJECT_LENGTH,
  OBJECT_WIDTH,
  POS_TOLERANCE,
  SPAWN_EXCLUDED_HALF_ANGLE_DEG,
  SPAWN_MAX_DISTANCE,
  SPAWN_MIN_DISTANCE,
  SPAWN_MIN_SEPARATION,
  YAW_TOLERANCE_DEG,
} from "./constants.js";
import { DEG2RAD, RAD2DEG, wrapAngle } from "./utils.js";

const DOCKED_COLOR = 0x33ff66;
const HIGHLIGHT_EDGE_COLOR = 0xffffff;

/**
 * @description
 * Prisma em forma de "casinha" vista de cima:
 * retângulo com a ponta para a frente (−z local).
 * A ponta deixa o yaw legível e não tem simetria de rotação, então só um
 * yaw encaixa no alvo.
 *
 * @returns {THREE.ExtrudeGeometry} a geometria do objeto
 */
function buildObjectGeometry() {
  const halfW = OBJECT_WIDTH / 2;
  const back = OBJECT_LENGTH * 0.45;
  const shoulder = -OBJECT_LENGTH * 0.15;
  const tip = -OBJECT_LENGTH * 0.55;

  // A forma é desenhada no plano XY com y = −z do mundo, para a ponta ir para −z depois
  // de girar −90° em x.
  const shape = new THREE.Shape();
  shape.moveTo(-halfW, -back);
  shape.lineTo(halfW, -back);
  shape.lineTo(halfW, -shoulder);
  shape.lineTo(0, -tip);
  shape.lineTo(-halfW, -shoulder);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: OBJECT_HEIGHT,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2); // extrusão passa a ir para +y (para cima)
  return geometry;
}

/** Um objeto que pode ser movido: malha sólida + contorno (aceso quando selecionado). */
class DockObject {
  constructor(geometry, edges, color) {
    this.color = color;
    this.material = new THREE.MeshStandardMaterial({
      color: color.hex,
      roughness: 0.6,
      metalness: 0,
    });
    this.root = new THREE.Group();
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.userData.dockObject = this;
    this.outline = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: HIGHLIGHT_EDGE_COLOR }),
    );
    this.outline.scale.setScalar(1.04);
    this.outline.visible = false;
    this.root.add(this.mesh, this.outline);
  }

  get yaw() {
    return this.root.rotation.y;
  }
  set yaw(value) {
    this.root.rotation.y = wrapAngle(value);
  }

  setSelected(on) {
    this.outline.visible = on;
    this.material.emissive.setHex(on ? this.color.hex : 0x000000);
    this.material.emissiveIntensity = on ? 0.35 : 0;
  }

  /** Objeto que não é o certo, depois da seleção correta: fica apagado e translúcido. */
  setFaded(on) {
    this.material.transparent = on;
    this.material.opacity = on ? 0.25 : 1;
  }

  setWrongFlash(on) {
    this.material.emissive.setHex(on ? 0xff0000 : 0x000000);
    this.material.emissiveIntensity = on ? 0.9 : 0;
  }
}

export class Workspace {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    const geometry = buildObjectGeometry();
    const edges = new THREE.EdgesGeometry(geometry);

    this.root = new THREE.Group();
    this.root.visible = false;
    scene.add(this.root);

    this.objects = OBJECT_COLORS.map((c) => new DockObject(geometry, edges, c));
    for (const o of this.objects) this.root.add(o.root);

    // Alvo fantasma: mesma forma, translúcido e sem escrever profundidade (o objeto
    // continua visível dentro dele), com contorno para a borda ficar nítida.
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: GHOST_OPACITY,
      depthWrite: false,
    });
    this.ghostEdgeMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.9,
    });
    this.ghost = new THREE.Group();
    this.ghost.add(
      new THREE.Mesh(geometry, this.ghostMaterial),
      new THREE.LineSegments(edges, this.ghostEdgeMaterial),
    );
    this.root.add(this.ghost);

    /** @type {DockObject | null} o objeto da mesma cor do alvo */
    this.correct = null;
    this.surfaceY = 0;
  }

  get pickMeshes() {
    return this.objects.map((o) => o.mesh);
  }

  /**
   * Monta uma tentativa nova com o alvo em `center` (ponto da superfície). Os objetos
   * não nascem do lado do celular (`viewer`): ficam nas laterais e atrás do alvo, onde a
   * câmera já está olhando.
   * @param {THREE.Vector3} center
   * @param {THREE.Vector3} viewer  posição do celular
   */
  spawn(center, viewer) {
    const towardViewer = Math.atan2(viewer.z - center.z, viewer.x - center.x);
    const excluded = SPAWN_EXCLUDED_HALF_ANGLE_DEG * DEG2RAD;
    this.surfaceY = center.y;
    this.root.visible = true;

    this.ghost.position.copy(center);
    this.ghost.rotation.set(0, Math.random() * 2 * Math.PI - Math.PI, 0);

    this.correct =
      this.objects[Math.floor(Math.random() * this.objects.length)];
    this.ghostMaterial.color.setHex(this.correct.color.hex);
    this.ghostEdgeMaterial.color.setHex(this.correct.color.hex);

    const placed = [];
    for (const o of this.objects) {
      o.setSelected(false);
      o.setFaded(false);
      o.setWrongFlash(false);
      let p;
      for (let attempt = 0; attempt < 200; attempt++) {
        const angle =
          towardViewer +
          excluded +
          Math.random() * (2 * Math.PI - 2 * excluded);
        const r =
          SPAWN_MIN_DISTANCE +
          Math.random() * (SPAWN_MAX_DISTANCE - SPAWN_MIN_DISTANCE);
        p = new THREE.Vector3(
          center.x + r * Math.cos(angle),
          center.y,
          center.z + r * Math.sin(angle),
        );
        if (placed.every((q) => q.distanceTo(p) >= SPAWN_MIN_SEPARATION)) break;
      }
      placed.push(p);
      o.root.position.copy(p);
      o.yaw = Math.random() * 2 * Math.PI - Math.PI;
    }
    this.setDocked(false);
  }

  hide() {
    this.root.visible = false;
  }

  /** Seleção correta: destaca o certo e apaga os outros dois. */
  selectCorrect() {
    for (const o of this.objects) {
      o.setSelected(o === this.correct);
      o.setFaded(o !== this.correct);
    }
  }

  /** Erro do objeto certo em relação ao alvo: posição no plano (m) e yaw (graus). */
  error() {
    const o = this.correct.root.position;
    const t = this.ghost.position;
    const posM = Math.hypot(o.x - t.x, o.z - t.z);
    const yawDeg =
      Math.abs(wrapAngle(this.correct.yaw - this.ghost.rotation.y)) * RAD2DEG;
    return {
      posM,
      yawDeg,
      posOk: posM <= POS_TOLERANCE,
      yawOk: yawDeg <= YAW_TOLERANCE_DEG,
      within: posM <= POS_TOLERANCE && yawDeg <= YAW_TOLERANCE_DEG,
    };
  }

  /** Feedback de encaixe: o fantasma e o contorno ficam verdes. */
  setDocked(on) {
    const hex = on ? DOCKED_COLOR : (this.correct?.color.hex ?? 0xffffff);
    this.ghostEdgeMaterial.color.setHex(hex);
    this.ghostMaterial.color.setHex(hex);
    if (this.correct)
      this.correct.outline.material.color.setHex(
        on ? DOCKED_COLOR : HIGHLIGHT_EDGE_COLOR,
      );
  }
}
