// Sess~ão de tentativas, com todas as fases e a gravação do CSV.
//
// Fases (`this.phase`):
//   "idle":    fora do AR.
//   "place":   a retícula procura a superfície; um toque coloca o alvo e os objetos.
//   "select":  o participante toca no objeto da mesma cor do alvo. Objeto errado
//              conta em wrong_selections. O certo inicia o relógio.
//   "dock":    a técnica da vez move o objeto. Encaixa quando o erro está dentro da
//              tolerância E ninguém está manipulando (nenhum dedo na cena no touch,
//              botão e joystick soltos no custom carry): passar pelo alvo sem soltar não conta.
//   "result":  painel com o resultado; "Próxima" segue.
//   "fatigue": as 3 tentativas da técnica acabaram; pergunta o cansaço dos braços (1–5).
//   "done":    as duas técnicas acabaram para este participante.
//
// O progresso de cada participante é calculado a partir das linhas já gravadas, então
// sair do AR, recarregar a página ou o rastreamento travar não perde nada: a tentativa
// interrompida apenas recomeça.

import {
  ABBA,
  DOCK_VIBRATION_MS,
  TECHNIQUE,
  TRIALS_PER_TECHNIQUE,
  WRONG_FLASH_MS,
} from "./constants.js";
import { TECHNIQUE_LABEL, TEXTOS } from "./strings.js";
import { rayFromScreen } from "./utils.js";
import * as THREE from "three";

/** Colunas do CSV. As nove primeiras são as do enunciado; as outras são extras. */
const CSV_HEADER = [
  "participant_id",
  "technique",
  "trial",
  "completion_time_s",
  "pos_error_cm",
  "yaw_error_deg",
  "wrong_selections",
  "touch_count",
  "tracking_lost",
  "presentation_order",
  "arm_fatigue",
  "pose_lost",
  "env_note",
  "timestamp",
];
const STORAGE_KEY = "mac0623_a4_rows";

const other = (t) =>
  t === TECHNIQUE.TOUCH ? TECHNIQUE.CUSTOM_CARRY : TECHNIQUE.TOUCH;

/** Primeira técnica que o plano ABBA dá para um id ("P01" → touch), ou null. */
export function abbaFirstTechnique(pid) {
  const m = pid.match(/\d+/);
  if (!m) return null;
  return ABBA[(Number(m[0]) - 1 + ABBA.length * 1000) % ABBA.length];
}

function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export class TrialSession {
  /**
   * @param {object} deps
   * @param {import("./hud.js").Hud} deps.hud
   * @param {import("./workspace.js").Workspace} deps.workspace
   * @param {import("./placement.js").Placement} deps.placement
   * @param {import("./touch-technique.js").TouchTechnique} deps.touch
   * @param {import("./custom-carry.js").CustomCarryTechnique} deps.customCarry
   * @param {THREE.Camera} deps.camera
   */
  constructor({ hud, workspace, placement, touch, customCarry, camera }) {
    Object.assign(this, {
      hud,
      workspace,
      placement,
      touch,
      customCarry,
      camera,
    });
    this.phase = "idle";
    this.rows = this.loadRows();
    this.trial = null; // métricas da tentativa em andamento
    this.wrongFlashUntil = 0;
    this.raycaster = new THREE.Raycaster();
    this.lastResult = null;

    const el = hud.el;
    el.participantId.addEventListener("input", () =>
      this.onParticipantChanged(),
    );
    el.firstTechnique.addEventListener("change", () => this.refreshSetup());
    el.downloadBtn.addEventListener("click", () => this.downloadCsv());
    el.resetBtn.addEventListener("click", () => this.nextParticipant());
    document.getElementById("clearBtn").addEventListener("click", () => {
      if (!confirm(TEXTOS.confirmClear(this.rows.length))) return;
      this.rows = [];
      this.saveRows();
      this.onParticipantChanged();
    });
    el.nextBtn.addEventListener("click", () => this.onNext());
    el.replaceBtn.addEventListener("click", () => this.startPlacing());
    el.practiceToggle.addEventListener("change", () => {
      this.refreshPracticeUi();
      this.restartIfRunning();
    });
    el.practiceTechnique.addEventListener("click", () => {
      this.hud.setPracticeTechnique(other(this.hud.practiceTechnique));
      this.restartIfRunning();
    });
    for (const b of el.fatiguePanel.querySelectorAll("button[data-rating]")) {
      b.addEventListener("click", () =>
        this.onFatigue(Number(/** @type {HTMLElement} */ (b).dataset.rating)),
      );
    }
    this.onParticipantChanged();
    this.refreshPracticeUi();
  }

  // ------------------------------------------------------------------ progresso

  /** Ordem das técnicas deste participante: [primeira, segunda]. */
  get order() {
    const first = this.hud.firstTechnique;
    return [first, other(first)];
  }

  rowsFor(pid, technique) {
    return this.rows.filter(
      (r) => r.participant_id === pid && r.technique === technique,
    );
  }

  /**
   * Onde o participante está: { technique, trial, block, fatiguePending, done }.
   * Calculado das linhas gravadas.
   */
  progress() {
    const pid = this.hud.participant;
    for (let block = 0; block < 2; block++) {
      const technique = this.order[block];
      const rows = this.rowsFor(pid, technique);
      if (rows.length < TRIALS_PER_TECHNIQUE)
        return {
          technique,
          block,
          trial: rows.length + 1,
          fatiguePending: false,
          done: false,
        };
      if (rows.some((r) => r.arm_fatigue === ""))
        return {
          technique,
          block,
          trial: TRIALS_PER_TECHNIQUE,
          fatiguePending: true,
          done: false,
        };
    }
    return {
      technique: null,
      block: 2,
      trial: 0,
      fatiguePending: false,
      done: true,
    };
  }

  /** Técnica da tentativa atual (no treino, a escolhida no overlay). */
  get technique() {
    return this.hud.practice
      ? this.hud.practiceTechnique
      : this.progress().technique;
  }

  // ------------------------------------------------------------------ página de preparação

  onParticipantChanged() {
    const first = abbaFirstTechnique(this.hud.participant);
    if (first) this.hud.el.firstTechnique.value = first;
    // Se este id já tem linhas, a ordem é a que foi usada.
    const existing = this.rows.find(
      (r) =>
        r.participant_id === this.hud.participant && r.presentation_order === 1,
    );
    if (existing) this.hud.el.firstTechnique.value = existing.technique;
    this.refreshSetup();
  }

  refreshSetup() {
    const [a, b] = this.order;
    this.hud.el.orderHint.textContent = abbaFirstTechnique(this.hud.participant)
      ? TEXTOS.orderHint(TECHNIQUE_LABEL[a], TECHNIQUE_LABEL[b])
      : TEXTOS.orderHintNone;
    const pid = this.hud.participant;
    const done = this.rowsFor(pid, a).length + this.rowsFor(pid, b).length;
    this.hud.el.progress.textContent = TEXTOS.progress(
      done,
      2 * TRIALS_PER_TECHNIQUE,
    );
    this.hud.el.savedRows.textContent = TEXTOS.savedRows(this.rows.length);
    this.hud.el.firstTechnique.disabled = done > 0;
  }

  nextParticipant() {
    const pid = this.hud.participant;
    const m = pid.match(/^(\D*)(\d+)(.*)$/);
    this.hud.el.participantId.value = m
      ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, "0")}${m[3]}`
      : "P01";
    this.onParticipantChanged();
  }

  refreshPracticeUi() {
    this.hud.setPracticeTechniqueEnabled(this.hud.practice);
    if (this.hud.practice) {
      const t = this.progress().technique;
      if (t) this.hud.setPracticeTechnique(t);
    }
  }

  // ------------------------------------------------------------------ AR: entrar/sair

  onEnterAr() {
    this.hud.setOverlayActive(true);
    const p = this.progress();
    if (p.done && !this.hud.practice) this.showDone();
    else if (p.fatiguePending && !this.hud.practice) this.showFatigue();
    else this.startPlacing();
  }

  onExitAr() {
    this.endManipulation();
    this.workspace.hide();
    this.placement.showReticle = false;
    this.hud.setOverlayActive(false);
    this.hud.hideResult();
    this.hud.showFatigue(false);
    this.phase = "idle";
    this.trial = null;
    this.refreshSetup();
  }

  restartIfRunning() {
    if (["place", "select", "dock", "result"].includes(this.phase))
      this.startPlacing();
  }

  // ------------------------------------------------------------------ fases

  startPlacing() {
    const p = this.progress();
    if (!this.hud.practice && (p.done || p.fatiguePending)) {
      if (p.done) this.showDone();
      else this.showFatigue();
      return;
    }
    this.endManipulation();
    this.phase = "place";
    this.trial = null;
    this.workspace.hide();
    this.placement.showReticle = true;
    this.hud.hideResult();
    this.hud.showFatigue(false);
    this.hud.showCarryControls(false);
    this.hud.showReplaceButton(false);
    this.hud.setErrors(null);
    this.updateTrialLabel();
  }

  updateTrialLabel() {
    const label = TECHNIQUE_LABEL[this.technique];
    if (this.hud.practice) this.hud.setTrialLabel(TEXTOS.practiceLabel(label));
    else
      this.hud.setTrialLabel(
        TEXTOS.trialLabel(label, this.progress().trial, TRIALS_PER_TECHNIQUE),
      );
  }

  /** Toque curto na cena (vindo de TouchInput). */
  onTap(x, y) {
    if (this.phase === "place") {
      if (!this.placement.hasHit) return;
      this.workspace.spawn(
        this.placement.hitPoint.clone(),
        new THREE.Vector3().setFromMatrixPosition(this.camera.matrixWorld),
      );
      this.placement.showReticle = false;
      this.phase = "select";
      this.trial = {
        technique: this.technique,
        practice: this.hud.practice,
        wrong: 0,
        touches: 0,
        trackingLost: 0,
        poseLost: 0,
        t0: 0,
        lastTrackingOk: true,
        lastPoseLost: false,
      };
      this.hud.showReplaceButton(true);
    } else if (this.phase === "select") {
      const hit = this.pick(x, y);
      if (!hit) return;
      if (hit === this.workspace.correct) this.startDocking();
      else {
        this.trial.wrong++;
        hit.setWrongFlash(true);
        setTimeout(() => hit.setWrongFlash(false), WRONG_FLASH_MS);
        this.wrongFlashUntil = performance.now() + WRONG_FLASH_MS;
      }
    }
  }

  /** Raio pela câmera e pelo ponto tocado; devolve o primeiro objeto atingido. */
  pick(x, y) {
    rayFromScreen(this.camera, x, y, this.raycaster.ray);
    this.workspace.root.updateMatrixWorld(true); // os objetos podem ter acabado de ser sorteados
    const hits = this.raycaster.intersectObjects(
      this.workspace.pickMeshes,
      false,
    );
    return hits.length ? hits[0].object.userData.dockObject : null;
  }

  startDocking() {
    this.workspace.selectCorrect();
    this.phase = "dock";
    this.trial.t0 = performance.now();
    this.trial.lastTrackingOk = this.placement.trackingOk;
    this.trial.lastPoseLost = this.placement.poseLost;
    const obj = this.workspace.correct;
    if (this.trial.technique === TECHNIQUE.TOUCH)
      this.touch.attach(obj, this.workspace.surfaceY);
    else this.customCarry.attach(obj, this.workspace.surfaceY);
    this.hud.showCarryControls(this.trial.technique === TECHNIQUE.CUSTOM_CARRY);
  }

  endManipulation() {
    this.touch.detach();
    this.customCarry.detach();
    this.hud.showCarryControls(false);
  }

  /** Dedos novos na tela (qualquer lugar, inclusive botões). */
  onTouchCount(n) {
    if (this.phase === "dock" && this.trial) this.trial.touches += n;
  }

  /** Chamado a cada quadro do AR, depois do hit-test. */
  update() {
    const pl = this.placement;

    if (this.phase === "dock") {
      // Rastreamento: conta as transições bom → perdido durante a tentativa.
      if (this.trial.lastTrackingOk && !pl.trackingOk)
        this.trial.trackingLost++;
      if (!this.trial.lastPoseLost && pl.poseLost) this.trial.poseLost++;
      this.trial.lastTrackingOk = pl.trackingOk;
      this.trial.lastPoseLost = pl.poseLost;

      const tech =
        this.trial.technique === TECHNIQUE.TOUCH
          ? this.touch
          : this.customCarry;
      tech.update();
      const err = this.workspace.error();
      this.hud.setErrors(err);
      if (err.within && !tech.manipulating) this.finishTrial(err);
    }

    this.updateMessage();
  }

  finishTrial(err) {
    const time = (performance.now() - this.trial.t0) / 1000;
    this.endManipulation();
    this.workspace.setDocked(true);
    this.phase = "result";
    this.hud.showReplaceButton(false);
    if (navigator.vibrate) navigator.vibrate(DOCK_VIBRATION_MS);

    const t = this.trial;
    let buttonText = TEXTOS.nextTrial;
    if (!t.practice) {
      const p = this.progress();
      this.rows.push({
        participant_id: this.hud.participant,
        technique: t.technique,
        trial: p.trial,
        completion_time_s: time.toFixed(3),
        pos_error_cm: (err.posM * 100).toFixed(2),
        yaw_error_deg: err.yawDeg.toFixed(2),
        wrong_selections: t.wrong,
        touch_count: t.touches,
        tracking_lost: t.trackingLost,
        presentation_order: p.block + 1,
        arm_fatigue: "",
        pose_lost: t.poseLost,
        env_note: this.hud.envNote,
        timestamp: new Date().toISOString(),
      });
      this.saveRows();
      if (p.trial >= TRIALS_PER_TECHNIQUE) buttonText = TEXTOS.nextTechnique;
    }
    this.hud.showResult(
      t.practice ? TEXTOS.resultTitlePractice : TEXTOS.resultTitle,
      TEXTOS.resultBody(time, err.posM * 100, err.yawDeg),
      buttonText,
    );
  }

  onNext() {
    if (this.phase !== "result") return;
    const p = this.progress();
    if (!this.hud.practice && p.fatiguePending) this.showFatigue();
    else this.startPlacing();
  }

  showFatigue() {
    this.phase = "fatigue";
    this.endManipulation();
    this.workspace.hide();
    this.placement.showReticle = false;
    this.hud.hideResult();
    this.hud.showReplaceButton(false);
    this.hud.setErrors(null);
    this.hud.showFatigue(true);
    this.hud.setTrialLabel(TECHNIQUE_LABEL[this.progress().technique]);
  }

  onFatigue(rating) {
    if (this.phase !== "fatigue") return;
    const p = this.progress();
    for (const r of this.rowsFor(this.hud.participant, p.technique))
      r.arm_fatigue = rating;
    this.saveRows();
    this.hud.showFatigue(false);
    this.startPlacing();
  }

  showDone() {
    this.phase = "done";
    this.endManipulation();
    this.workspace.hide();
    this.placement.showReticle = false;
    this.hud.hideResult();
    this.hud.showFatigue(false);
    this.hud.showReplaceButton(false);
    this.hud.setErrors(null);
    this.hud.setTrialLabel(TEXTOS.doneLabel);
  }

  updateMessage() {
    const pl = this.placement;
    let text = "";
    let alert = false;
    if (this.phase === "place")
      text = pl.hasHit ? TEXTOS.tapToPlace : TEXTOS.findSurface;
    else if (this.phase === "select") {
      if (performance.now() < this.wrongFlashUntil) {
        text = TEXTOS.wrongObject;
        alert = true;
      } else text = TEXTOS.selectHint;
    } else if (this.phase === "dock") {
      if (pl.poseLost) {
        text = TEXTOS.trackingLost;
        alert = true;
      } else
        text =
          this.trial.technique === TECHNIQUE.TOUCH
            ? TEXTOS.dockTouch
            : TEXTOS.dockCarry;
    } else if (this.phase === "done") text = TEXTOS.done;
    if (text !== this.lastMessage || alert !== this.lastAlert) {
      this.hud.setMessage(text, alert);
      this.lastMessage = text;
      this.lastAlert = alert;
    }
  }

  // ------------------------------------------------------------------ CSV

  loadRows() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveRows() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rows));
    } catch {
      /* sem armazenamento: fica só na memória */
    }
    this.refreshSetup();
  }

  buildCsv() {
    const lines = [CSV_HEADER.join(",")];
    for (const r of this.rows)
      lines.push(CSV_HEADER.map((k) => csvField(r[k])).join(","));
    return lines.join("\n") + "\n";
  }

  downloadCsv() {
    const blob = new Blob([this.buildCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `a4_data_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
