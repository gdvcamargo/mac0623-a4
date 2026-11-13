// Constantes
// Distâncias em metros, ângulos em graus, tempos em milissegundos.

/** Técnicas, pelo nome gravado na coluna `technique` do CSV. */
export const TECHNIQUE = {
  TOUCH: "touch",
  CUSTOM_CARRY: "custom_carry",
};

/** Tolerância do encaixe: 2 cm e 10° de yaw. */
export const POS_TOLERANCE = 0.02;
export const YAW_TOLERANCE_DEG = 10;

/** Tentativas registradas por técnica. */
export const TRIALS_PER_TECHNIQUE = 3;
/**
 * Ordem ABBA entre participantes: P01 começa por touch, P02 e P03 por custom carry,
 * P04 por touch, e repete.
 */
export const ABBA = [
  TECHNIQUE.TOUCH,
  TECHNIQUE.CUSTOM_CARRY,
  TECHNIQUE.CUSTOM_CARRY,
  TECHNIQUE.TOUCH,
];

// ---- Objeto (prisma em forma de "casinha" vista de cima, para o yaw ficar legível) ----
/** Comprimento (da traseira à ponta), largura e altura do objeto. */
export const OBJECT_LENGTH = 0.1;
export const OBJECT_WIDTH = 0.07;
export const OBJECT_HEIGHT = 0.03;
/** Cores dos três objetos. Sem verde: verde é a cor do "encaixado". */
export const OBJECT_COLORS = [
  { name: "red", hex: 0xe53935 },
  { name: "blue", hex: 0x1e88e5 },
  { name: "yellow", hex: 0xfdd835 },
];

/** Distância de cada objeto ao alvo quando a tentativa começa (enunciado: 30–50 cm). */
export const SPAWN_MIN_DISTANCE = 0.3;
export const SPAWN_MAX_DISTANCE = 0.5;

/**
 * Setor proibido no sorteio: nenhum objeto nasce a menos deste ângulo da direção
 * alvo → celular, para não ficar embaixo do celular ou fora da parte de baixo da tela.
 */
export const SPAWN_EXCLUDED_HALF_ANGLE_DEG = 70;
/** Distância mínima entre dois objetos no sorteio, para não se sobreporem. */
export const SPAWN_MIN_SEPARATION = 0.15;
/** Opacidade do alvo fantasma. */
export const GHOST_OPACITY = 0.35;

// ---- Entrada por toque ----
/** Um toque que dura menos que isso e anda menos que TAP_MAX_MOVE_PX é um "tap". */
export const TAP_MAX_MS = 350;
export const TAP_MAX_MOVE_PX = 14;

// ---- Joystick de rotação (Custom Carry) ----
/** Valor do joystick abaixo do qual nada gira (fração do curso). */
export const JOYSTICK_DEAD_ZONE = 0.1;
/** Velocidade de giro com o joystick no fim do curso (graus/s); curva quadrática até lá. */
export const JOYSTICK_MAX_DEG_PER_S = 120;

// ---- Feedback ----
/** Duração do aviso de "objeto errado". */
export const WRONG_FLASH_MS = 700;
/** Vibração quando encaixa (ms). */
export const DOCK_VIBRATION_MS = 120;
