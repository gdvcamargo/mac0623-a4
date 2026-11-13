// MAC0623 A4
//
// Ponto de partida: o exemplo webxr_ar_hittest do three.js (sessão immersive-ar com
// hit-test e retícula).
//
// Aqui só se cria a cena e se ligam as peças:
//   placement.js        hit-test, retícula, estado do rastreamento
//   workspace.js        alvo fantasma + três objetos
//   touch-input.js      toques do DOM no overlay
//   touch-technique.js  técnica 1: arrastar com um dedo, girar com dois
//   custom-carry.js     técnica 2: carregar com o celular (botão "Segurar") + joystick de rotação
//   joystick.js         joystick horizontal na tela
//   trial-session.js    fases, métricas, CSV, ordem ABBA
//   hud.js              DOM (página de preparação e overlay)

import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { CustomCarryTechnique } from "./custom-carry.js";
import { Joystick } from "./joystick.js";
import { Hud } from "./hud.js";
import { Placement } from "./placement.js";
import { TEXTOS } from "./strings.js";
import { TouchInput } from "./touch-input.js";
import { TouchTechnique } from "./touch-technique.js";
import { TrialSession } from "./trial-session.js";
import { Workspace } from "./workspace.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  20,
);

scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(0.5, 1, 0.3);
scene.add(sun);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.domElement.id = "glCanvas"; // atrás de tudo; no AR quem mostra a imagem é o compositor do WebXR
document.body.appendChild(renderer.domElement);

const hud = new Hud();
const placement = new Placement(scene);
const workspace = new Workspace(scene);

let session = null;
const input = new TouchInput(hud.el.overlay, {
  onTouchCount: (n) => session.onTouchCount(n),
  onTap: (x, y) => session.onTap(x, y),
});
const touch = new TouchTechnique(input, camera);
const joystick = new Joystick(hud.el.rotatePad, hud.el.rotateKnob);
const customCarry = new CustomCarryTechnique(
  hud.el.carryBtn,
  joystick,
  () => placement.viewerPose,
);
session = new TrialSession({
  hud,
  workspace,
  placement,
  touch,
  customCarry,
  joystick,
  camera,
});

// ---- Botão de entrar no AR ----
const arButton = ARButton.createButton(renderer, {
  requiredFeatures: ["hit-test"],
  optionalFeatures: ["dom-overlay"],
  domOverlay: { root: hud.el.overlay },
});
document.getElementById("arButtonSlot").appendChild(arButton);

if (!navigator.xr) hud.el.xrMessage.textContent = TEXTOS.noXr;
else
  navigator.xr.isSessionSupported("immersive-ar").then((ok) => {
    if (!ok) hud.el.xrMessage.textContent = TEXTOS.noXr;
  });

document
  .getElementById("exitArBtn")
  .addEventListener("click", () => renderer.xr.getSession()?.end());

renderer.xr.addEventListener("sessionstart", () => {
  document.getElementById("setup").style.display = "none";
  session.onEnterAr();
});
renderer.xr.addEventListener("sessionend", () => {
  document.getElementById("setup").style.display = "";
  placement.reset();
  input.clear();
  session.onExitAr();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((_time, frame) => {
  if (frame) {
    placement.update(
      frame,
      renderer.xr.getReferenceSpace(),
      renderer.xr.getSession(),
    );
    session.update();
  }
  if (renderer.xr.isPresenting) renderer.render(scene, camera);
});

// Para depurar pelo chrome://inspect.
window.a4 = {
  scene,
  camera,
  renderer,
  placement,
  workspace,
  session,
  touch,
  customCarry,
  joystick,
  input,
};
