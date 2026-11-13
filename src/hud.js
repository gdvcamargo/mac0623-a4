// MAC0623 A4 - HUD

import { TECHNIQUE_LABEL, TEXTOS } from "./strings.js";

const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export class Hud {
  constructor() {
    this.el = {
      participantId: /** @type {HTMLInputElement} */ ($("participantId")),
      firstTechnique: /** @type {HTMLSelectElement} */ ($("firstTechnique")),
      envNote: /** @type {HTMLInputElement} */ ($("envNote")),
      orderHint: $("orderHint"),
      progress: $("progress"),
      savedRows: $("savedRows"),
      xrMessage: $("xrMessage"),
      downloadBtn: $("downloadBtn"),
      resetBtn: $("resetBtn"),
      overlay: $("overlay"),
      trialLabel: $("trialLabel"),
      errors: $("errors"),
      practiceToggle: /** @type {HTMLInputElement} */ ($("practiceToggle")),
      practiceTechnique: /** @type {HTMLButtonElement} */ (
        $("practiceTechnique")
      ),
      message: $("message"),
      resultPanel: $("resultPanel"),
      resultTitle: $("resultTitle"),
      resultBody: $("resultBody"),
      nextBtn: $("nextBtn"),
      fatiguePanel: $("fatiguePanel"),
      replaceBtn: $("replaceBtn"),
      carryBtn: /** @type {HTMLButtonElement} */ ($("carryBtn")),
      rotatePad: $("rotatePad"),
      rotateKnob: $("rotateKnob"),
    };
  }

  get participant() {
    return this.el.participantId.value.trim() || "P00";
  }
  get envNote() {
    return this.el.envNote.value.trim();
  }
  get firstTechnique() {
    return this.el.firstTechnique.value;
  }
  get practice() {
    return this.el.practiceToggle.checked;
  }
  get practiceTechnique() {
    return this.el.practiceTechnique.dataset.value;
  }

  /** Técnica do treino, mostrada no botão da barra do topo. */
  setPracticeTechnique(technique) {
    this.el.practiceTechnique.dataset.value = technique;
    this.el.practiceTechnique.textContent = `${TECHNIQUE_LABEL[technique]} ⇄`;
  }

  setOverlayActive(on) {
    this.el.overlay.classList.toggle("active", on);
  }

  setMessage(text, alert = false) {
    this.el.message.textContent = text;
    this.el.message.classList.toggle("alert", alert);
  }

  setTrialLabel(text) {
    this.el.trialLabel.textContent = text;
  }

  setErrors(err) {
    this.el.errors.innerHTML = err
      ? TEXTOS.errors(err.posM * 100, err.posOk, err.yawDeg, err.yawOk)
      : "";
  }

  showResult(title, body, buttonText) {
    this.el.resultTitle.textContent = title;
    this.el.resultBody.textContent = body;
    this.el.nextBtn.textContent = buttonText;
    this.el.resultPanel.classList.remove("hidden");
  }

  hideResult() {
    this.el.resultPanel.classList.add("hidden");
  }

  showFatigue(on) {
    this.el.fatiguePanel.classList.toggle("hidden", !on);
  }

  /** Botão "Segurar" + joystick do Custom Carry. */
  showCarryControls(on) {
    this.el.carryBtn.classList.toggle("hidden", !on);
    this.el.rotatePad.classList.toggle("hidden", !on);
  }

  showReplaceButton(on) {
    this.el.replaceBtn.classList.toggle("hidden", !on);
  }

  /** O botão da técnica do treino só aparece com o Treino marcado. */
  setPracticeTechniqueEnabled(on) {
    this.el.practiceTechnique.classList.toggle("hidden", !on);
  }
}
