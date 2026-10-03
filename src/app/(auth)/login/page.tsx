import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { getDictionary } from "@/lib/i18n";
import { getSession, safeNext } from "@/lib/auth";

export const metadata = {
  title: "Iniciar sesión — Money Path",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const dict = getDictionary();
  const params = await searchParams;
  const next = safeNext(params.next);

  // Si ya hay sesión, el login redirige directo al aplicativo.
  const session = await getSession();
  if (session) {
    redirect(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950">
          {dict.auth.login.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.auth.login.subtitle}</p>
      </header>
      <LoginForm next={next} />
    </div>
  );
}
