"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, withTransaction } from "@/lib/db";
import {
  authSchema,
  expenseBaseSchema,
  groupSchema,
  joinSchema,
  loginSchema,
  messageSchema,
  profileSchema,
  settlementSchema
} from "@/lib/validators";
import { clearSession, createSession, loginUser, requireCurrentUser, registerAndLogin } from "@/lib/auth";
import { generateInviteCode, parseMoneyToPaise } from "@/lib/money";
import { buildSplitAllocations } from "@/lib/expense";
import { insertActivity } from "@/lib/activity";

export type FormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

function fieldError(fieldErrors: Record<string, string>, key: string, message: string) {
  fieldErrors[key] = message;
}

async function ensureActiveMembership(groupId: string, userId: string) {
  const result = await query<{ id: string }>(
    `select id from group_members where group_id = $1 and user_id = $2 and status = 'active' limit 1`,
    [groupId, userId]
  );
  return result.rows[0] ?? null;
}

async function getGroupByInviteCode(inviteCode: string) {
  const result = await query<{ id: string; creator_id: string; invite_code: string }>(
    `select id, creator_id, invite_code from groups where invite_code = $1 limit 1`,
    [inviteCode]
  );
  return result.rows[0] ?? null;
}

async function getCurrentOutstanding(groupId: string, payerId: string, payeeId: string) {
  const result = await query<{ net_amount: string }>(
    `
      select
        coalesce(sum(case when from_user_id = $2 and to_user_id = $3 then amount_paise else 0 end), 0)
        - coalesce(sum(case when from_user_id = $3 and to_user_id = $2 then amount_paise else 0 end), 0)
        as net_amount
      from balance_edges
      where group_id = $1 and (
        (from_user_id = $2 and to_user_id = $3) or
        (from_user_id = $3 and to_user_id = $2)
      )
    `,
    [groupId, payerId, payeeId]
  );
  return BigInt(result.rows[0]?.net_amount ?? "0");
}

export async function registerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName")
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }
  try {
    const user = await registerAndLogin(parsed.data.email, parsed.data.password, parsed.data.displayName);
    await createSession(user.id);
    revalidatePath("/dashboard");
    return { redirectTo: "/dashboard" };
  } catch (error) {
    return { formError: error instanceof Error ? error.message : "Could not create account." };
  }
}

export async function loginAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }
  const user = await loginUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return { formError: "Email or password is incorrect." };
  }
  await createSession(user.id);
  revalidatePath("/dashboard");
  return { redirectTo: "/dashboard" };
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function updateProfileAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName")
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }
  await query(`update users set display_name = $1 where id = $2`, [parsed.data.displayName.trim(), user.id]);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile");
}

export async function createGroupAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || null
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }

  const category = parsed.data.category ? String(parsed.data.category).trim() : null;
  let groupId = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    try {
      groupId = await withTransaction(async (client) => {
        const groupRes = await client.query<{ id: string }>(
          `
            insert into groups (name, category, creator_id, invite_code)
            values ($1, $2, $3, $4)
            returning id
          `,
          [parsed.data.name.trim(), category, user.id, inviteCode]
        );
        const createdGroupId = groupRes.rows[0].id;
        await client.query(
          `
            insert into group_members (group_id, user_id, role, status)
            values ($1, $2, 'admin', 'active')
          `,
          [createdGroupId, user.id]
        );
        await insertActivity(client, createdGroupId, user.id, "Member Added", "group_member", null, {
          displayName: user.display_name,
          joinedAs: "creator"
        });
        return createdGroupId;
      });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  if (!groupId) {
    return { formError: "Could not create group." };
  }
  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
}

export async function joinGroupAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const parsed = joinSchema.safeParse({
    inviteCode: String(formData.get("inviteCode") ?? "").trim().toUpperCase()
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }
  const group = await getGroupByInviteCode(parsed.data.inviteCode);
  if (!group) {
    return { formError: "Invite code is invalid." };
  }
  try {
    await withTransaction(async (client) => {
      const existing = await client.query<{ status: string }>(
        `select status from group_members where group_id = $1 and user_id = $2 limit 1`,
        [group.id, user.id]
      );
      if (existing.rows[0]?.status === "active") {
        throw new Error("You are already a member of this group.");
      }
      if (existing.rows[0]) {
        await client.query(
          `
            update group_members
            set status = 'active', role = 'member', joined_at = now(), left_at = null
            where group_id = $1 and user_id = $2
          `,
          [group.id, user.id]
        );
      } else {
        await client.query(
          `
            insert into group_members (group_id, user_id, role, status)
            values ($1, $2, 'member', 'active')
          `,
          [group.id, user.id]
        );
      }
      await insertActivity(client, group.id, user.id, "Member Added", "group_member", null, {
        displayName: user.display_name,
        joinedAs: "invite"
      });
    });
  } catch (error) {
    return { formError: error instanceof Error ? error.message : "Could not join group." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/groups/${group.id}`);
  redirect(`/groups/${group.id}`);
}

export async function regenerateInviteCodeAction(formData: FormData) {
  const user = await requireCurrentUser();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await query<{ id: string; creator_id: string }>(
    `select id, creator_id from groups where id = $1 limit 1`,
    [groupId]
  );
  const row = group.rows[0];
  if (!row) {
    return;
  }
  if (row.creator_id !== user.id) {
    return;
  }
  let newCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await query(`update groups set invite_code = $1 where id = $2`, [newCode, groupId]);
      break;
    } catch {
      newCode = generateInviteCode();
    }
  }
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function leaveGroupAction(formData: FormData) {
  const user = await requireCurrentUser();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await query<{ id: string; creator_id: string }>(
    `select id, creator_id from groups where id = $1 limit 1`,
    [groupId]
  );
  const row = group.rows[0];
  if (!row) {
    return;
  }
  if (row.creator_id === user.id) {
    return;
  }
  await query(
    `
      update group_members
      set status = 'left', left_at = now()
      where group_id = $1 and user_id = $2
    `,
    [groupId, user.id]
  );
  revalidatePath("/dashboard");
  revalidatePath(`/groups/${groupId}`);
  redirect("/dashboard");
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireCurrentUser();
  const groupId = String(formData.get("groupId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const group = await query<{ id: string; creator_id: string }>(
    `select id, creator_id from groups where id = $1 limit 1`,
    [groupId]
  );
  const row = group.rows[0];
  if (!row || row.creator_id !== user.id || memberId === row.creator_id) {
    return;
  }
  await withTransaction(async (client) => {
    const update = await client.query(
      `
        update group_members
        set status = 'left', left_at = now()
        where group_id = $1 and user_id = $2 and status = 'active'
      `,
      [groupId, memberId]
    );
    if ((update.rowCount ?? 0) > 0) {
      await insertActivity(client, groupId, user.id, "Member Removed", "group_member", null, {
        memberId
      });
    }
  });
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function deleteGroupAction(formData: FormData) {
  const user = await requireCurrentUser();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await query<{ id: string; creator_id: string }>(
    `select id, creator_id from groups where id = $1 limit 1`,
    [groupId]
  );
  const row = group.rows[0];
  if (!row) {
    return;
  }
  if (row.creator_id !== user.id) {
    return;
  }
  await query(`delete from groups where id = $1`, [groupId]);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createExpenseAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const groupId = String(formData.get("groupId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const totalAmount = String(formData.get("totalAmount") ?? "").trim();
  const payerId = String(formData.get("payerId") ?? "");
  const splitType = String(formData.get("splitType") ?? "") as "equal" | "percentage" | "share" | "unequal";
  const date = String(formData.get("date") ?? "").trim();

  const parsed = expenseBaseSchema.safeParse({
    description,
    totalAmount,
    payerId,
    splitType,
    date
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }
  const totalAmountPaise = parseMoneyToPaise(parsed.data.totalAmount);
  if (totalAmountPaise === null || totalAmountPaise <= 0) {
    return { fieldErrors: { totalAmount: "Enter a valid total amount." } };
  }
  if (new Date(parsed.data.date) > new Date()) {
    return { fieldErrors: { date: "Future dates are not allowed." } };
  }
  const memberResult = await query<{ user_id: string; display_name: string }>(
    `select u.id as user_id, u.display_name from group_members gm join users u on u.id = gm.user_id where gm.group_id = $1 and gm.status = 'active'`,
    [groupId]
  );
  const activeMembers = new Set(memberResult.rows.map((row: { user_id: string }) => row.user_id));
  if (!activeMembers.has(user.id)) {
    return { formError: "You are not a member of this group." };
  }
  if (!activeMembers.has(payerId)) {
    return { fieldErrors: { payerId: "Select a valid payer." } };
  }

  const participantIds = Array.from(
    new Set(
      formData
        .getAll("participants")
        .map((value) => String(value))
        .filter((value) => Boolean(value) && activeMembers.has(value))
    )
  );
  if (participantIds.length === 0) {
    return { fieldErrors: { participants: "Select at least one participant." } };
  }
  if (!participantIds.includes(payerId)) {
    participantIds.push(payerId);
  }

  const inputValues: Record<string, string> = {};
  for (const memberId of participantIds) {
    const value = String(formData.get(`value_${memberId}`) ?? "").trim();
    if (value) {
      inputValues[memberId] = value;
    }
  }

  const allocation = buildSplitAllocations({
    splitType,
    totalAmountPaise,
    payerId,
    participantIds,
    inputValues
  });
  if ("error" in allocation && allocation.error) {
    return { fieldErrors: { splitType: allocation.error } };
  }

  const expenseId = await withTransaction(async (client) => {
    const expenseRes = await client.query<{ id: string }>(
      `
        insert into expenses (group_id, creator_id, payer_id, description, total_amount_paise, split_type, expense_date)
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id
      `,
      [groupId, user.id, payerId, parsed.data.description, totalAmountPaise, splitType, parsed.data.date]
    );
    const createdExpenseId = expenseRes.rows[0].id;
    for (const row of allocation.allocations) {
      await client.query(
        `
          insert into expense_shares (expense_id, user_id, allocated_amount_paise, input_value)
          values ($1, $2, $3, $4)
        `,
        [createdExpenseId, row.userId, row.allocatedAmountPaise, row.inputValue]
      );
      if (row.userId !== payerId && row.allocatedAmountPaise > 0) {
        await client.query(
          `
            insert into balance_edges (group_id, from_user_id, to_user_id, amount_paise, source_type, source_id)
            values ($1, $2, $3, $4, 'expense', $5)
          `,
          [groupId, row.userId, payerId, row.allocatedAmountPaise, createdExpenseId]
        );
      }
    }
    await insertActivity(client, groupId, user.id, "Expense Created", "expense", createdExpenseId, {
      description: parsed.data.description,
      totalAmountPaise
    });
    return createdExpenseId;
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}/expenses/${expenseId}`);
}

export async function createSettlementAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const parsed = settlementSchema.safeParse({
    payerId: formData.get("payerId"),
    payeeId: formData.get("payeeId"),
    amount: formData.get("amount"),
    date: formData.get("date")
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }
  const groupId = String(formData.get("groupId") ?? "");
  const amountPaise = parseMoneyToPaise(parsed.data.amount);
  if (amountPaise === null || amountPaise <= 0) {
    return { fieldErrors: { amount: "Enter a valid amount." } };
  }
  if (parsed.data.payerId === parsed.data.payeeId) {
    return { fieldErrors: { payeeId: "Payer and payee must be different." } };
  }
  if (new Date(parsed.data.date) > new Date()) {
    return { fieldErrors: { date: "Future dates are not allowed." } };
  }

  const activeMembers = await query<{ user_id: string }>(
    `select user_id from group_members where group_id = $1 and status = 'active'`,
    [groupId]
  );
  const activeSet = new Set(activeMembers.rows.map((row: { user_id: string }) => row.user_id));
  if (!activeSet.has(user.id)) {
    return { formError: "You are not a member of this group." };
  }
  if (!activeSet.has(parsed.data.payerId) || !activeSet.has(parsed.data.payeeId)) {
    return { formError: "Choose active group members." };
  }

  const outstanding = await getCurrentOutstanding(groupId, parsed.data.payerId, parsed.data.payeeId);
  if (outstanding <= 0n) {
    return { formError: "There is no outstanding balance in this direction to settle." };
  }
  if (BigInt(amountPaise) > outstanding) {
    return { fieldErrors: { amount: "Settlement cannot exceed the outstanding balance." } };
  }

  const settlementId = await withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `
        insert into settlements (group_id, creator_id, payer_id, payee_id, amount_paise, settlement_date)
        values ($1, $2, $3, $4, $5, $6)
        returning id
      `,
      [groupId, user.id, parsed.data.payerId, parsed.data.payeeId, amountPaise, parsed.data.date]
    );
    const createdSettlementId = result.rows[0].id;
    await client.query(
      `
        insert into balance_edges (group_id, from_user_id, to_user_id, amount_paise, source_type, source_id)
        values ($1, $2, $3, $4, 'settlement', $5)
      `,
      [groupId, parsed.data.payeeId, parsed.data.payerId, amountPaise, createdSettlementId]
    );
    await insertActivity(client, groupId, user.id, "Settlement Recorded", "settlement", createdSettlementId, {
      payerId: parsed.data.payerId,
      payeeId: parsed.data.payeeId,
      amountPaise
    });
    return createdSettlementId;
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function addExpenseMessageAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const expenseId = String(formData.get("expenseId") ?? "");
  const parsed = messageSchema.safeParse({
    body: formData.get("body")
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldError(fieldErrors, String(issue.path[0]), issue.message);
    }
    return { fieldErrors };
  }

  const expense = await query<{ id: string; group_id: string }>(
    `select id, group_id from expenses where id = $1 limit 1`,
    [expenseId]
  );
  const row = expense.rows[0];
  if (!row) {
    return { formError: "Expense not found." };
  }
  const active = await ensureActiveMembership(row.group_id, user.id);
  if (!active) {
    return { formError: "You are not a member of this group." };
  }

  await withTransaction(async (client) => {
    await client.query(
      `insert into expense_messages (expense_id, sender_id, body) values ($1, $2, $3)`,
      [expenseId, user.id, parsed.data.body.trim()]
    );
    await client.query(
      `
        insert into expense_thread_reads (expense_id, user_id, last_read_at)
        values ($1, $2, now())
        on conflict (expense_id, user_id) do update set last_read_at = excluded.last_read_at
      `,
      [expenseId, user.id]
    );
  });

  revalidatePath(`/groups/${row.group_id}/expenses/${expenseId}`);
  redirect(`/groups/${row.group_id}/expenses/${expenseId}`);
}
