import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

/** Subnavegación de la Academia: explorar el catálogo o revisar el progreso. */
export function AcademyTabs({ active }: { active: "explore" | "progress" }) {
  const dict = getDictionary();
  const items = [
    { id: "explore" as const, href: "/app/academia", label: dict.academy.tabs.explore },
    {
      id: "progress" as const,
      href: "/app/academia/mi-progreso",
      label: dict.academy.tabs.progress,
    },
  ];

  return (
    <nav aria-label={dict.academy.tabs.explore} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={item.id === active ? "page" : undefined}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
            item.id === active
              ? "border-primary bg-primary text-primary-50"
              : "border-line bg-surface text-muted hover:border-primary-300 hover:text-primary-700"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
