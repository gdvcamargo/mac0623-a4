// Hit-test contra a superfície real, retícula e estado do rastreamento.
//
// Baseado no exemplo webxr_ar_hittest do three.js: uma fonte de hit-test a partir do
// "viewer" (o centro da tela) roda a sessão inteira. A retícula só aparece quando a
// tentativa está esperando o toque para colocar o alvo.
//
// Também diz, a cada quadro, se o rastreamento está bom: há pose do celular, ela não
// é "emulada" (sem posição real) e o hit-test devolveu algum resultado. A sessão de
// tentativas conta as transições bom → perdido (coluna tracking_lost).

import * as THREE from "three";

export class Placement {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.055, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    scene.add(this.reticle);

    this.hitTestSource = null;
    this.requested = false;
    /** Ponto da superfície sob o centro da tela, se houver. */
    this.hasHit = false;
    this.hitPoint = new THREE.Vector3();
    /** Pose do celular neste quadro (XRViewerPose), ou null. */
    this.viewerPose = null;
    this.poseLost = false;
    this.trackingOk = false;
    this.showReticle = false;
  }

  /** Chamado ao fim da sessão AR: a fonte de hit-test morre com ela. */
  reset() {
    this.hitTestSource = null;
    this.requested = false;
    this.hasHit = false;
    this.trackingOk = false;
  }

  /**
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} refSpace
   * @param {XRSession} session
   */
  update(frame, refSpace, session) {
    if (!this.requested) {
      this.requested = true;
      session.requestReferenceSpace("viewer").then((viewerSpace) =>
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          this.hitTestSource = source;
        }),
      );
    }

    this.viewerPose = frame.getViewerPose(refSpace) ?? null;
    this.poseLost = !this.viewerPose || this.viewerPose.emulatedPosition;

    this.hasHit = false;
    if (this.hitTestSource) {
      const results = frame.getHitTestResults(this.hitTestSource);
      if (results.length > 0) {
        const pose = results[0].getPose(refSpace);
        if (pose) {
          this.hasHit = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
          this.hitPoint.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z,
          );
        }
      }
    }

    this.trackingOk = !this.poseLost && this.hasHit;
    this.reticle.visible = this.showReticle && this.hasHit;
  }
}
