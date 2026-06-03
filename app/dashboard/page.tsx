import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { PageTitle, ShellCard } from "@/components/ui";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await getDashboardData(user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle
          title="Dashboard"
          subtitle="Track your groups, see your net balance, and jump into the next action."
        />
        <div className="flex gap-3">
          <Link href="/groups/new" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
            Create group
          </Link>
          <Link href="/join" className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-white hover:bg-amber-600">
            Join group
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <ShellCard className="flex min-h-56 items-center justify-center text-center">
          <div className="space-y-3">
            <p className="text-lg font-medium text-slate-900">No groups yet. Create your first one!</p>
            <p className="text-sm text-slate-600">After that, you can add members, expenses, and settlements.</p>
          </div>
        </ShellCard>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => {
            const balance = BigInt(group.viewer_balance_paise);
            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <ShellCard className="transition hover:-translate-y-0.5 hover:shadow-xl">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">{group.name}</h2>
                      <p className="text-sm text-slate-500">{group.category ?? "Uncategorized"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                      {balance > 0n ? `You are owed ${formatINR(balance)}` : balance < 0n ? `You owe ${formatINR(-balance)}` : "Settled"}
                    </div>
                  </div>
                </ShellCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
