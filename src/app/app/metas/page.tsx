import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { GoalsModule } from "@/components/goals/goals-client";
import { getSession } from "@/lib/auth";
import { getGoalsData } from "@/lib/goals";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Metas — Money Path",
};

export default async function MetasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getGoalsData(session.user.id);
  if (!data) redirect("/onboarding");

  return (
    <PageShell navId="metas" active>
      <GoalsModule data={data} />
    </PageShell>
  );
}
