/**
 * Registro central de módulos planificados de Money Path.
 *
 * Cada módulo se construye en su propia etapa de desarrollo (regla 3).
 * Los textos visibles viven en el diccionario de i18n bajo
 * `modules.items.<id>`, de modo que este archivo solo describe estructura.
 */

export type ModuleStatus = "planificado" | "en_desarrollo" | "disponible";

export interface ModuleDef {
  /** Identificador estable del módulo (clave del diccionario de i18n). */
  id: string;
  /** Estado actual del módulo. */
  status: ModuleStatus;
  /** Etapa en la que se construirá; `null` = por definir. */
  etapa: number | null;
}

export const MODULES: ModuleDef[] = [
  { id: "presupuesto", status: "disponible", etapa: 7 },
  { id: "ingresos", status: "planificado", etapa: null },
  { id: "deudas", status: "disponible", etapa: 10 },
  { id: "gastos_fijos", status: "planificado", etapa: null },
  { id: "gastos_variables", status: "planificado", etapa: null },
  { id: "ingresos_recurrentes", status: "disponible", etapa: 8 },
  { id: "cobros_futuros", status: "disponible", etapa: 8 },
  { id: "plazos", status: "disponible", etapa: 9 },
  { id: "categorias", status: "planificado", etapa: null },
  { id: "fondo_emergencia", status: "disponible", etapa: 11 },
  { id: "metas", status: "disponible", etapa: 12 },
  { id: "inversiones", status: "disponible", etapa: 13 },
  { id: "patrimonio", status: "disponible", etapa: 14 },
  { id: "calculadoras", status: "disponible", etapa: 15 },
  { id: "educacion", status: "disponible", etapa: 19 },
  { id: "dashboard", status: "disponible", etapa: 6 },
];
