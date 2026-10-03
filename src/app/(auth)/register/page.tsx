import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/forms";
import { getDictionary } from "@/lib/i18n";
import { getSession, safeNext } from "@/lib/auth";

export const metadata = {
  title: "Crear cuenta — Money Path",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const dict = getDictionary();
  const params = await searchParams;
  const next = safeNext(params.next);

  const session = await getSession();
  if (session) {
    redirect(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950">
          {dict.auth.register.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.auth.register.subtitle}</p>
      </header>
      <RegisterForm next={next} />
    </div>
  );
}
