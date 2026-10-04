import Link from "next/link";
import { IconChevronRight } from "@/components/icons";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Breadcrumbs simples com o último ítem marcado como página actual. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-xs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <IconChevronRight size={12} className="text-faint" /> : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded font-semibold text-muted transition-colors hover:text-primary-700"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={`font-semibold ${isLast ? "text-text" : "text-muted"}`}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
