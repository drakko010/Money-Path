import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { InvestmentsModule } from "@/components/investments/investments-client";
import { getSession } from "@/lib/auth";
import { getInvestmentsData } from "@/lib/investments";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inversiones — Money Path",
};

export default async function InversionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getInvestmentsData(session.user.id);
  if (!data) redirect("/onboarding");

  return (
    <PageShell navId="inversiones" active>
      <InvestmentsModule data={data} />
    </PageShell>
  );
}
