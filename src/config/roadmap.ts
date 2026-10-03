/**
 * Ruta de desarrollo de Money Path.
 *
 * El producto crece etapa por etapa. Este registro es la fuente de verdad
 * de la UI (sección "Ruta de desarrollo") y del README. Las etapas futuras
 * se añaden aquí cuando el equipo de producto las define; nunca antes.
 */

export type StageStatus = "completa" | "en_curso" | "planificada" | "por_definir";

export interface StageDef {
  /** Número de etapa. */
  id: number;
  /** Estado actual de la etapa. */
  status: StageStatus;
}

/** Etapa que se está ejecutando en este momento. */
export const CURRENT_STAGE = 18;

export const STAGES: StageDef[] = [
  { id: 0, status: "completa" },
  { id: 1, status: "completa" },
  { id: 2, status: "completa" },
  { id: 3, status: "completa" },
  { id: 4, status: "completa" },
  { id: 5, status: "completa" },
  { id: 6, status: "completa" },
  { id: 7, status: "completa" },
  { id: 8, status: "completa" },
  { id: 9, status: "completa" },
  { id: 10, status: "completa" },
  { id: 11, status: "completa" },
  { id: 12, status: "completa" },
  { id: 13, status: "completa" },
  { id: 14, status: "completa" },
  { id: 15, status: "completa" },
  { id: 16, status: "completa" },
  { id: 17, status: "completa" },
  { id: 18, status: "completa" },
];
