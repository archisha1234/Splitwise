import { query, withTransaction } from "@/lib/db";
import { computeBalances } from "@/lib/balance";

export async function getDashboardData(userId: string) {
  const groups = await query<{
    id: string;
    name: string;
    category: string | null;
    invite_code: string;
    created_at: string;
    viewer_balance_paise: string | number;
  }>(
    `
    select g.id, g.name, g.category, g.invite_code, g.created_at,
      coalesce(sum(case when be.to_user_id = $1 then be.amount_paise else 0 end), 0)
      - coalesce(sum(case when be.from_user_id = $1 then be.amount_paise else 0 end), 0) as viewer_balance_paise
    from groups g
    join group_members gm on gm.group_id = g.id and gm.user_id = $1 and gm.status = 'active'
    left join balance_edges be on be.group_id = g.id
    group by g.id
    order by g.created_at desc
  `,
    [userId]
  );
  return groups.rows;
}

export async function getGroupById(groupId: string) {
  const result = await query<{
    id: string;
    name: string;
    category: string | null;
    invite_code: string;
    creator_id: string;
    created_at: string;
  }>("select id, name, category, invite_code, creator_id, created_at from groups where id = $1 limit 1", [groupId]);
  return result.rows[0] ?? null;
}

export async function getGroupMembers(groupId: string) {
  const result = await query<{
    id: string;
    user_id: string;
    display_name: string;
    role: string;
    status: string;
    joined_at: string;
  }>(
    `
    select gm.id, gm.user_id, u.display_name, gm.role, gm.status, gm.joined_at
    from group_members gm
    join users u on u.id = gm.user_id
    where gm.group_id = $1
    order by gm.status desc, gm.joined_at asc
  `,
    [groupId]
  );
  return result.rows;
}

export async function getGroupExpenses(groupId: string, viewerId: string) {
  const result = await query<{
    id: string;
    description: string;
    total_amount_paise: string | number;
    split_type: string;
    expense_date: string;
    created_at: string;
    payer_name: string;
    creator_name: string;
    message_count: string;
    unread_count: string;
    latest_message_at: string | null;
  }>(
    `
    select e.id, e.description, e.total_amount_paise, e.split_type, e.expense_date, e.created_at,
      payer.display_name as payer_name,
      creator.display_name as creator_name,
      coalesce(msg_counts.message_count, 0) as message_count,
      coalesce(unread_counts.unread_count, 0) as unread_count,
      msg_counts.latest_message_at
    from expenses e
    join users payer on payer.id = e.payer_id
    join users creator on creator.id = e.creator_id
    left join lateral (
      select count(*)::int as message_count, max(created_at) as latest_message_at
      from expense_messages em
      where em.expense_id = e.id
    ) msg_counts on true
    left join lateral (
      select count(*)::int as unread_count
      from expense_messages em
      left join expense_thread_reads r on r.expense_id = em.expense_id and r.user_id = $2
      where em.expense_id = e.id and em.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    ) unread_counts on true
    where e.group_id = $1
    order by e.expense_date desc, e.created_at desc
  `,
    [groupId, viewerId]
  );
  return result.rows;
}

export async function getGroupActivity(groupId: string) {
  const result = await query<{
    id: string;
    type: string;
    entity_type: string;
    entity_id: string | null;
    payload: any;
    created_at: string;
    actor_name: string;
  }>(
    `
    select ae.id, ae.type, ae.entity_type, ae.entity_id, ae.payload, ae.created_at, u.display_name as actor_name
    from activity_events ae
    join users u on u.id = ae.actor_id
    where ae.group_id = $1
    order by ae.created_at desc
  `,
    [groupId]
  );
  return result.rows;
}

export async function getGroupBalances(groupId: string, viewerId: string) {
  const [membersRes, expenseSharesRes, expensesRes, settlementsRes] = await Promise.all([
    query<{ id: string; display_name: string }>(
      `
      select u.id, u.display_name
      from group_members gm
      join users u on u.id = gm.user_id
      where gm.group_id = $1 and gm.status = 'active'
    `,
      [groupId]
    ),
    query<{ expense_id: string; user_id: string; allocated_amount_paise: string }>(
      `
      select es.expense_id, es.user_id, es.allocated_amount_paise::text
      from expense_shares es
      join expenses e on e.id = es.expense_id
      where e.group_id = $1
    `,
      [groupId]
    ),
    query<{ id: string; payer_id: string; total_amount_paise: string }>(
      `select id, payer_id, total_amount_paise::text from expenses where group_id = $1`,
      [groupId]
    ),
    query<{ payer_id: string; payee_id: string; amount_paise: string }>(
      `select payer_id, payee_id, amount_paise::text from settlements where group_id = $1`,
      [groupId]
    )
  ]);

  return computeBalances({
    members: membersRes.rows,
    expenseShares: expenseSharesRes.rows,
    expenses: expensesRes.rows,
    settlements: settlementsRes.rows,
    viewerId
  });
}

export async function getExpenseDetails(expenseId: string) {
  const expense = await query<{
    id: string;
    group_id: string;
    creator_id: string;
    payer_id: string;
    description: string;
    total_amount_paise: string;
    split_type: string;
    expense_date: string;
    created_at: string;
    payer_name: string;
    creator_name: string;
  }>(
    `
    select e.*, payer.display_name as payer_name, creator.display_name as creator_name
    from expenses e
    join users payer on payer.id = e.payer_id
    join users creator on creator.id = e.creator_id
    where e.id = $1
    limit 1
  `,
    [expenseId]
  );
  const shares = await query<{
    user_id: string;
    display_name: string;
    allocated_amount_paise: string;
    input_value: string | null;
  }>(
    `
    select es.user_id, u.display_name, es.allocated_amount_paise::text, es.input_value::text
    from expense_shares es
    join users u on u.id = es.user_id
    where es.expense_id = $1
    order by u.display_name asc
  `,
    [expenseId]
  );
  const messages = await query<{
    id: string;
    body: string;
    created_at: string;
    sender_id: string;
    sender_name: string;
  }>(
    `
    select em.id, em.body, em.created_at, em.sender_id, u.display_name as sender_name
    from expense_messages em
    join users u on u.id = em.sender_id
    where em.expense_id = $1
    order by em.created_at asc
  `,
    [expenseId]
  );
  return {
    expense: expense.rows[0] ?? null,
    shares: shares.rows,
    messages: messages.rows
  };
}

export async function isUserInGroup(groupId: string, userId: string) {
  const result = await query<{ id: string }>(
    `select id from group_members where group_id = $1 and user_id = $2 and status = 'active' limit 1`,
    [groupId, userId]
  );
  return result.rows.length > 0;
}

export async function getActiveMemberIds(groupId: string) {
  const result = await query<{ user_id: string }>(
    `select user_id from group_members where group_id = $1 and status = 'active' order by joined_at asc`,
    [groupId]
  );
  return result.rows.map((row) => row.user_id);
}
