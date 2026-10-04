import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { DebtsModule } from "@/components/debts/debts-client";
import { getSession } from "@/lib/auth";
import { getDebtsData } from "@/lib/debts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deudas — Money Path",
};

export default async function DeudasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getDebtsData(session.user.id);
  if (!data) redirect("/onboarding");

  return (
    <PageShell navId="deudas" active>
      <DebtsModule
        currency={data.currency}
        debts={data.debts}
        summary={data.summary}
        alerts={data.alerts}
        surplusMinor={data.monthlySurplusMinor}
      />
    </PageShell>
  );
}
