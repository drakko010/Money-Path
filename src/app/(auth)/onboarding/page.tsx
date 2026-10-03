import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { getSession } from "@/lib/auth";
import { getOnboarding } from "@/lib/onboarding";

export const metadata = {
  title: "Tu punto de partida — Money Path",
};

/**
 * Onboarding financiero (Etapa 5). Requiere sesión; precarga las respuestas
 * existentes para permitir actualizarlas.
 */
export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const initial = await getOnboarding(session.user.id);

  return <OnboardingWizard initial={initial} userName={session.user.name} />;
}
