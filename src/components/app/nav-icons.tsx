import type { ComponentType } from "react";
import {
  IconBell,
  IconBook,
  IconCalculator,
  IconChart,
  IconCreditCard,
  IconHome,
  IconLandmark,
  IconRoute,
  IconSettings,
  IconShield,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
  IconWallet,
  type IconProps,
} from "@/components/icons";
import type { NavItemId } from "@/config/navigation";

/** Ícone consistente para cada área de navegación. */
export const NAV_ICONS: Record<NavItemId, ComponentType<IconProps>> = {
  inicio: IconHome,
  resumen: IconChart,
  presupuesto: IconWallet,
  deudas: IconCreditCard,
  fondo: IconShield,
  metas: IconTarget,
  inversiones: IconTrendingUp,
  patrimonio: IconLandmark,
  money_path: IconRoute,
  money_ai: IconSparkles,
  calculadoras: IconCalculator,
  academia: IconBook,
  notificaciones: IconBell,
  configuracion: IconSettings,
};
