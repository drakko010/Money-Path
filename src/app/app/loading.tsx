import { getDictionary } from "@/lib/i18n";
import { Skeleton, Spinner } from "@/components/ui/loading-state";

/** Estado de carga del aplicativo durante la navegación entre rutas. */
export default function AppLoading() {
  const dict = getDictionary();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-3.5 w-64" />
          </div>
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-14">
        <Spinner size={22} />
        <p className="text-xs font-semibold text-muted">{dict.loadingScreen.title}</p>
      </div>

      <Skeleton className="h-[280px] w-full rounded-2xl" />
    </div>
  );
}
