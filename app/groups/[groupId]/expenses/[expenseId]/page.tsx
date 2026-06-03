import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getExpenseDetails } from "@/lib/queries";
import { formatINR } from "@/lib/money";
import { ExpenseMessageForm } from "@/components/message-form";
import { LocalTime } from "@/components/local-time";
import { ShellCard, SectionTitle } from "@/components/ui";

export default async function ExpenseDetailPage({
  params
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { groupId, expenseId } = await params;

  const membership = await query<{ id: string }>(
    `select id from group_members where group_id = $1 and user_id = $2 and status = 'active' limit 1`,
    [groupId, user.id]
  );
  if (membership.rows.length === 0) redirect("/dashboard");

  const { expense, shares, messages } = await getExpenseDetails(expenseId);
  type ExpenseShareRow = {
    user_id: string;
    display_name: string;
    allocated_amount_paise: string | number;
    input_value: string | null;
  };
  type ExpenseMessageRow = {
    id: string;
    body: string;
    created_at: string;
    sender_id: string;
    sender_name: string;
  };
  if (!expense || expense.group_id !== groupId) redirect(`/groups/${groupId}`);

  const latestMessageAt = messages[messages.length - 1]?.created_at ?? expense.created_at;
  const readState = await query<{ last_read_at: string | null }>(
    `select last_read_at::text from expense_thread_reads where expense_id = $1 and user_id = $2 limit 1`,
    [expenseId, user.id]
  );
  const lastReadAt = readState.rows[0]?.last_read_at;
  if (!lastReadAt || new Date(lastReadAt) < new Date(latestMessageAt)) {
    await query(
      `
        insert into expense_thread_reads (expense_id, user_id, last_read_at)
        values ($1, $2, now())
        on conflict (expense_id, user_id) do update set last_read_at = excluded.last_read_at
      `,
      [expenseId, user.id]
    );
  }

  return (
    <div className="space-y-6">
      <ShellCard className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">{expense.description}</h1>
            <p className="text-sm text-slate-600">
              {expense.creator_name} added this expense on <LocalTime iso={expense.created_at} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-slate-950">{formatINR(Number(expense.total_amount_paise))}</p>
            <p className="text-sm text-slate-500">{expense.split_type} split</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payer</p>
            <p className="mt-1 font-medium text-slate-900">{expense.payer_name}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
            <p className="mt-1 font-medium text-slate-900">
              <LocalTime iso={expense.expense_date} format="date" />
            </p>
          </div>
        </div>
      </ShellCard>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ShellCard className="space-y-4">
          <SectionTitle title="Split" />
          <div className="space-y-3">
            {shares.map((share: ExpenseShareRow) => (
              <div key={share.user_id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{share.display_name}</p>
                  {share.input_value ? <p className="text-xs text-slate-500">Input value: {share.input_value}</p> : null}
                </div>
                <p className="text-sm font-medium text-slate-700">{formatINR(Number(share.allocated_amount_paise))}</p>
              </div>
            ))}
          </div>
        </ShellCard>

        <ExpenseMessageForm expenseId={expenseId} />
      </div>

      <ShellCard className="space-y-4">
        <SectionTitle title="Messages" />
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message: ExpenseMessageRow) => (
              <div key={message.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-900">{message.sender_name}</p>
                  <p className="text-xs text-slate-500">
                    <LocalTime iso={message.created_at} />
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
              </div>
            ))}
          </div>
        )}
      </ShellCard>
    </div>
  );
}
