import Link from "next/link";
import { IconRoute } from "@/components/icons";
import { getDictionary } from "@/lib/i18n";

/** Ruta inexistente dentro del aplicativo: 404 con la navegación visible. */
export default function AppNotFound() {
  const dict = getDictionary();

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-700">
        <IconRoute size={26} />
      </span>
      <p className="mt-5 font-display text-4xl font-bold tracking-tight text-primary-950">
        {dict.notFound.code}
      </p>
      <h1 className="mt-2 font-display text-lg font-semibold text-text">
        {dict.notFound.title}
      </h1>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        {dict.notFound.description}
      </p>
      <Link
        href="/app"
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-50 shadow-sm transition-colors hover:bg-primary-hover"
      >
        {dict.notFound.backApp}
      </Link>
    </div>
  );
}
