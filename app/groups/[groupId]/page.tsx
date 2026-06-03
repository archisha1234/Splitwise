import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import {
  getGroupActivity,
  getGroupBalances,
  getGroupById,
  getGroupExpenses,
  getGroupMembers
} from "@/lib/queries";
import { deleteGroupAction, regenerateInviteCodeAction, leaveGroupAction, removeMemberAction } from "@/app/actions";
import { LocalTime } from "@/components/local-time";
import { PageTitle, SectionTitle, ShellCard } from "@/components/ui";

export default async function GroupDetailPage({
  params
}: {
  params: { groupId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { groupId } = params;

  const group = await getGroupById(groupId);
  if (!group) redirect("/dashboard");

  const members = await getGroupMembers(groupId);
  const activeMembers = members.filter((member) => member.status === "active");
  const currentMembership = activeMembers.find((member) => member.user_id === user.id);
  if (!currentMembership) redirect("/dashboard");

  const [balances, expenses, activity, spendingRes] = await Promise.all([
    getGroupBalances(groupId, user.id),
    getGroupExpenses(groupId, user.id),
    getGroupActivity(groupId),
    getGroupSpending(groupId)
  ]);

  const formerMembers = members.filter((member) => member.status === "left");
  const creator = group.creator_id === user.id;
  const inviteLink = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/join?code=${group.invite_code}`
    : `/join?code=${group.invite_code}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle title={group.name} subtitle={group.category ? `${group.category} group` : "Shared expense group"} />
        <div className="flex flex-wrap gap-3">
          <Link href={`/groups/${groupId}/expenses/new`} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
            Add expense
          </Link>
          <Link href={`/groups/${groupId}/settle`} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Settle up
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <ShellCard className="space-y-5">
          <SectionTitle title="Net balances" />
          <div className="space-y-3">
            {balances.pairwiseWithViewer.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-medium text-slate-900">{item.displayName}</span>
                <span className="text-sm text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Group spending</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatINR(spendingRes.total)}</p>
          </div>
        </ShellCard>

        <ShellCard className="space-y-5">
          <SectionTitle title="Invite code" />
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">Share this link</p>
            <Link href={inviteLink} className="mt-1 block break-all text-sm font-medium text-slate-900 underline underline-offset-4">
              {inviteLink}
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {creator ? (
              <form action={regenerateInviteCodeAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <button type="submit" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Regenerate code
                </button>
              </form>
            ) : null}
            {!creator ? (
              <form action={leaveGroupAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <button type="submit" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Leave group
                </button>
              </form>
            ) : null}
            {creator ? (
              <form action={deleteGroupAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <button type="submit" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100">
                  Delete group
                </button>
              </form>
            ) : null}
          </div>
        </ShellCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ShellCard className="space-y-5">
          <SectionTitle title="Members" />
          <div className="space-y-3">
            {balances.memberBalances.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{member.displayName}</p>
                  <p className="text-xs text-slate-500">{member.balanceType.replaceAll("_", " ")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-slate-700">
                    {member.balancePaise > 0n ? `+${formatINR(member.balancePaise)}` : member.balancePaise < 0n ? `-${formatINR(-member.balancePaise)}` : formatINR(0)}
                  </p>
                  {creator && member.id !== user.id ? (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <button type="submit" className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {formerMembers.length > 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Former members remain in the database for audit history.</div>
          ) : null}
        </ShellCard>

        <ShellCard className="space-y-5">
          <SectionTitle title="Activity feed" />
          <div className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.type}</p>
                      <p className="text-sm text-slate-600">{item.actor_name}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      <LocalTime iso={item.created_at} />
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ShellCard>
      </div>

      <ShellCard className="space-y-5">
        <SectionTitle title="Who owes whom" />
        {balances.pairwiseDebts.length === 0 ? (
          <p className="text-sm text-slate-500">No pairwise debts yet.</p>
        ) : (
          <div className="space-y-3">
            {balances.pairwiseDebts.map((item) => {
              const from = members.find((member) => member.user_id === item.fromUserId)?.display_name ?? "Unknown";
              const to = members.find((member) => member.user_id === item.toUserId)?.display_name ?? "Unknown";
              return (
                <div key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{from}</span> owes <span className="font-medium text-slate-900">{to}</span>
                  </p>
                  <p className="text-sm font-medium text-slate-700">{formatINR(item.amountPaise)}</p>
                </div>
              );
            })}
          </div>
        )}
      </ShellCard>

      <ShellCard className="space-y-5">
        <SectionTitle title="Expenses" />
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses yet. Add the first one.</p>
          ) : (
            expenses.map((expense) => (
              <Link key={expense.id} href={`/groups/${groupId}/expenses/${expense.id}`}>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{expense.description}</p>
                      {Number(expense.unread_count) > 0 ? <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-label="Unread messages" /> : null}
                    </div>
                    <p className="text-sm text-slate-500">
                      {expense.payer_name} paid - {expense.split_type} split - {expense.message_count} messages
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">{formatINR(expense.total_amount_paise)}</p>
                    <p className="text-xs text-slate-500">
                      <LocalTime iso={expense.expense_date} format="date" />
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </ShellCard>
    </div>
  );
}

async function getGroupSpending(groupId: string) {
  const { query } = await import("@/lib/db");
  const result = await query<{ total: string }>(`select coalesce(sum(total_amount_paise), 0)::text as total from expenses where group_id = $1`, [
    groupId
  ]);
  return { total: BigInt(result.rows[0]?.total ?? "0") };
}
