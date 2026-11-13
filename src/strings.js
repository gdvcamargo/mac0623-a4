// Textos das telas

import { formatNumber as n } from "./utils.js";

export const TECHNIQUE_LABEL = {
  touch: "Touch",
  custom_carry: "Custom Carry",
};

export const TEXTOS = {
  // ---- Página de preparação ----
  orderHint: (primeira, segunda) =>
    `Plano ABBA para este id: ${primeira} → ${segunda}`,
  orderHintNone: "Id sem número: escolha a primeira técnica à mão.",
  progress: (feitas, total) =>
    `Tentativas registradas deste participante: ${feitas}/${total}`,
  savedRows: (linhas) =>
    `${linhas} linha(s) no CSV (todos os participantes desta página).`,
  noXr: "Este navegador não tem WebXR AR. Use o Chrome no Android com o ARCore instalado, via HTTPS.",
  confirmClear: (linhas) =>
    `Apagar as ${linhas} linha(s) gravadas? Baixe o CSV antes se precisar delas.`,

  // ---- Barra do topo (no AR) ----
  trialLabel: (tecnica, numero, total) => `${tecnica} · ${numero}/${total}`,
  practiceLabel: (tecnica) => `${tecnica} · treino`,
  doneLabel: "Sessão concluída",
  errors: (posCm, posOk, yawDeg, yawOk) =>
    `<span class="${posOk ? "ok" : "bad"}">pos ${n(posCm, 1)} cm</span> · ` +
    `<span class="${yawOk ? "ok" : "bad"}">rot ${n(yawDeg, 0)}°</span>`,

  // ---- Mensagens no centro ----
  findSurface: "Aponte para a mesa ou o chão e mova o celular devagar",
  tapToPlace: "Toque na tela para colocar o alvo",
  selectHint: "Toque no objeto da mesma cor do alvo",
  wrongObject: "Objeto errado",
  dockTouch: "Arraste com um dedo · gire com dois dedos",
  dockCarry: "Segure o botão e mova o celular · gire com o joystick",
  trackingLost: "Rastreamento perdido — mova o celular devagar",
  done: "Fim! Obrigado. Saia do AR e baixe o CSV.",

  // ---- Painéis ----
  resultTitle: "Encaixado!",
  resultTitlePractice: "Encaixado! (treino)",
  resultBody: (tempo, posCm, yawDeg) =>
    `Tempo ${n(tempo, 1)} s · pos ${n(posCm, 1)} cm · rot ${n(yawDeg, 1)}°`,
  nextTrial: "Próxima",
  nextTechnique: "Avaliar cansaço",
  finish: "Concluir",
};
