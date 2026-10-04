import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { PatrimonioModule } from "@/components/patrimonio/patrimonio-client";
import { getSession } from "@/lib/auth";
import { getPatrimonioData } from "@/lib/patrimonio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Patrimonio — Money Path",
};

export default async function PatrimonioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getPatrimonioData(session.user.id);
  if (!data) redirect("/onboarding");

  return (
    <PageShell navId="patrimonio" active>
      <PatrimonioModule data={data} />
    </PageShell>
  );
}
