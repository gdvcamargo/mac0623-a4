// Funções utilitárias para o A4.

import * as THREE from "three";

const _twist = new THREE.Quaternion();

/**
 * Yaw (rotação em torno da vertical do mundo, em radianos) de uma orientação.
 * Usa a decomposição swing-twist: o "twist" em torno de +Y é a parte (w, y) do
 * quatérnio. Diferente de olhar para o vetor "frente", isso continua bem definido
 * quando o celular aponta direto para baixo, para a mesa.
 * @param {THREE.Quaternion | DOMPointReadOnly} q
 * @returns {number} yaw em radianos, no intervalo (−π, π]
 */
export function yawOf(q) {
  _twist.set(0, q.y, 0, q.w);
  if (_twist.lengthSq() < 1e-12) return 0; // só acontece com 180° em torno de um eixo horizontal
  _twist.normalize();
  return 2 * Math.atan2(_twist.y, _twist.w);
}

/**
 * Ângulo em radianos levado para (−π, π].
 *
 * @param {number} a - Ângulo em radianos
 * @returns {number} - Ângulo equivalente em (−π, π]
 *
 */
export function wrapAngle(a) {
  let x = (a + Math.PI) % (2 * Math.PI);
  if (x < 0) x += 2 * Math.PI;
  return x - Math.PI;
}

export const RAD2DEG = 180 / Math.PI;
export const DEG2RAD = Math.PI / 180;

/**
 * Raio que sai da câmera e passa pelo ponto da tela tocado (clientX, clientY).
 * Monta a direção desprojetando com a projeção da própria câmera do XR, que o
 * three.js atualiza a cada quadro.
 * @param {THREE.Camera} camera
 * @param {number} clientX
 * @param {number} clientY
 * @param {THREE.Ray} out
 * @returns {THREE.Ray} - O raio criado.
 */
export function rayFromScreen(camera, clientX, clientY, out) {
  const ndcX = (clientX / window.innerWidth) * 2 - 1;
  const ndcY = -(clientY / window.innerHeight) * 2 + 1;
  const invProj = new THREE.Matrix4().copy(camera.projectionMatrix).invert();
  out.origin.setFromMatrixPosition(camera.matrixWorld);
  out.direction
    .set(ndcX, ndcY, 0.5)
    .applyMatrix4(invProj)
    .applyMatrix4(camera.matrixWorld)
    .sub(out.origin)
    .normalize();
  return out;
}

/**
 * Ponto onde o raio cruza o plano horizontal y = height, ou null se não cruza
 * (raio paralelo ou apontando para cima do plano).
 * @param {THREE.Ray} ray
 * @param {number} height
 * @param {THREE.Vector3} out
 */
export function intersectHorizontalPlane(ray, height, out) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height);
  return ray.intersectPlane(plane, out);
}

/** Número com vírgula decimal (para a tela). */
export function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits).replace(".", ",");
}
