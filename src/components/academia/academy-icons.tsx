import {
  IconBook,
  IconChart,
  IconCreditCard,
  IconLandmark,
  IconPlay,
  IconRefresh,
  IconShield,
  IconTarget,
  IconTrendingUp,
  IconWallet,
  type IconProps,
} from "@/components/icons";
import type { AcademyIconKey } from "@/lib/academy-shared";

/**
 * Íconos de la Academia (Etapa 19).
 *
 * Las categorías guardan una **clave** de ícono en la base de datos
 * (`academy-shared.ts` define las claves válidas) y aquí se traduce a los
 * íconos del Design System. Se resuelve con `switch` explícito —y no con un
 * mapa de componentes— para que el ícono siempre sea un componente estable
 * declarado en módulo.
 */

export function AcademyCategoryIcon({
  iconKey,
  size = 18,
  className,
}: {
  iconKey: AcademyIconKey | string;
  size?: number;
  className?: string;
}) {
  const props: IconProps = { size, className };
  switch (iconKey) {
    case "wallet":
      return <IconWallet {...props} />;
    case "chart":
      return <IconChart {...props} />;
    case "credit-card":
      return <IconCreditCard {...props} />;
    case "target":
      return <IconTarget {...props} />;
    case "shield":
      return <IconShield {...props} />;
    case "trending-up":
      return <IconTrendingUp {...props} />;
    case "landmark":
      return <IconLandmark {...props} />;
    case "refresh":
      return <IconRefresh {...props} />;
    default:
      return <IconBook {...props} />;
  }
}

/** Ícono por tipo de contenido (artículo, aula, guía, contenido corto). */
export function AcademyKindIcon({
  kind,
  size = 14,
  className,
}: {
  kind: string;
  size?: number;
  className?: string;
}) {
  const props: IconProps = { size, className };
  switch (kind) {
    case "lesson":
    case "video":
      return <IconPlay {...props} />;
    case "short":
      return <IconRefresh {...props} />;
    case "guide":
    case "article":
    default:
      return <IconBook {...props} />;
  }
}
