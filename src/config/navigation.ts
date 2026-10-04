/**
 * Arquitectura de navegación del aplicativo Money Path (Etapa 2).
 *
 * Fuente de verdad de rutas, agrupación, áreas principales (bottom nav
 * mobile) y protección por autenticación. Los textos visibles viven en el
 * diccionario de i18n bajo `nav.*` y `pages.*`.
 */

export type NavSectionId = "panorama" | "diaADia" | "crecimiento" | "herramientas" | "cuenta";

export type NavItemId =
  | "inicio"
  | "resumen"
  | "presupuesto"
  | "deudas"
  | "fondo"
  | "metas"
  | "inversiones"
  | "patrimonio"
  | "money_path"
  | "money_ai"
  | "calculadoras"
  | "academia"
  | "notificaciones"
  | "configuracion";

export interface NavSectionDef {
  id: NavSectionId;
}

export interface NavItemDef {
  id: NavItemId;
  href: string;
  section: NavSectionId;
  /** Aparece en la bottom navigation móvil (áreas principales). */
  main?: boolean;
  /**
   * Exigirá sesión cuando el sistema de autenticación esté implementado
   * (ver `src/lib/auth.ts`). Las páginas financieras están marcadas.
   */
  protected?: boolean;
  /** Módulo del producto al que corresponde (registro `MODULES`), si aplica. */
  moduleRef?: string;
}

export const NAV_SECTIONS: NavSectionDef[] = [
  { id: "panorama" },
  { id: "diaADia" },
  { id: "crecimiento" },
  { id: "herramientas" },
  { id: "cuenta" },
];

export const NAV_ITEMS: NavItemDef[] = [
  { id: "inicio", href: "/app", section: "panorama", main: true, protected: true },
  { id: "resumen", href: "/app/resumen", section: "panorama", main: true, protected: true },
  { id: "presupuesto", href: "/app/presupuesto", section: "diaADia", main: true, protected: true, moduleRef: "presupuesto" },
  { id: "deudas", href: "/app/deudas", section: "diaADia", protected: true, moduleRef: "deudas" },
  { id: "fondo", href: "/app/fondo", section: "diaADia", protected: true, moduleRef: "fondo_emergencia" },
  { id: "metas", href: "/app/metas", section: "crecimiento", main: true, protected: true, moduleRef: "metas" },
  { id: "inversiones", href: "/app/inversiones", section: "crecimiento", protected: true, moduleRef: "inversiones" },
  { id: "patrimonio", href: "/app/patrimonio", section: "crecimiento", protected: true, moduleRef: "patrimonio" },
  { id: "money_path", href: "/app/money-path", section: "herramientas", protected: true },
  { id: "money_ai", href: "/app/money-ai", section: "herramientas", protected: true },
  { id: "calculadoras", href: "/app/calculadoras", section: "herramientas", moduleRef: "calculadoras" },
  { id: "academia", href: "/app/academia", section: "herramientas", moduleRef: "educacion" },
  { id: "notificaciones", href: "/app/notificaciones", section: "cuenta" },
  { id: "configuracion", href: "/app/configuracion", section: "cuenta", protected: true },
];

/** Áreas principales de la bottom navigation móvil. */
export const MAIN_NAV_ITEMS = NAV_ITEMS.filter((item) => item.main);

/** Áreas secundarias (menú "Más" en móvil). */
export const SECONDARY_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.main);

export function getNavItem(id: NavItemId): NavItemDef {
  const item = NAV_ITEMS.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`Nav item desconocido: ${id}`);
  }
  return item;
}

export function getNavItemsBySection(section: NavSectionId): NavItemDef[] {
  return NAV_ITEMS.filter((item) => item.section === section);
}
