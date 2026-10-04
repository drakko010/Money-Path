import { redirect } from "next/navigation";
import { ResetForm } from "@/components/auth/forms";
import { getDictionary } from "@/lib/i18n";

export const metadata = {
  title: "Nueva contraseña — Money Path",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const dict = getDictionary();
  const params = await searchParams;

  // Sin token no hay nada que restablecer.
  if (!params.token) {
    redirect("/forgot-password");
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950">
          {dict.auth.reset.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.auth.reset.subtitle}</p>
      </header>
      <ResetForm token={params.token} />
    </div>
  );
}
