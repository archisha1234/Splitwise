import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ExpenseForm } from "@/components/expense-form";
import { toDateInputValue } from "@/lib/money";

export default async function NewExpensePage({
  params
}: {
  params: { groupId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { groupId } = params;

  const membership = await query<{ id: string }>(
    `select id from group_members where group_id = $1 and user_id = $2 and status = 'active' limit 1`,
    [groupId, user.id]
  );
  if (membership.rows.length === 0) redirect("/dashboard");

  const members = await query<{ id: string; display_name: string }>(
    `
      select u.id, u.display_name
      from group_members gm
      join users u on u.id = gm.user_id
      where gm.group_id = $1 and gm.status = 'active'
      order by u.display_name asc
    `,
    [groupId]
  );

  return (
    <div className="flex justify-center">
      <ExpenseForm groupId={groupId} members={members.rows} today={toDateInputValue(new Date())} />
    </div>
  );
}
