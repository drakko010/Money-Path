import { ForgotForm } from "@/components/auth/forms";
import { getDictionary } from "@/lib/i18n";

export const metadata = {
  title: "Recuperar contraseña — Money Path",
};

export default function ForgotPasswordPage() {
  const dict = getDictionary();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950">
          {dict.auth.forgot.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.auth.forgot.subtitle}</p>
      </header>
      <ForgotForm />
    </div>
  );
}
