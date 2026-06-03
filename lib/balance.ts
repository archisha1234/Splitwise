export type MemberRow = { id: string; display_name: string };
export type ExpenseShareRow = { expense_id: string; user_id: string; allocated_amount_paise: string | number };
export type ExpenseRow = { id: string; payer_id: string; total_amount_paise: string | number };
export type SettlementRow = { payer_id: string; payee_id: string; amount_paise: string | number };
export type BalanceMember = {
  id: string;
  displayName: string;
  balancePaise: bigint;
  balanceType: "owed_to_you" | "you_owe" | "settled";
};
export type BalanceViewer = {
  id: string;
  displayName: string;
  balancePaise: bigint;
  label: string;
};
export type BalanceDebt = {
  key: string;
  fromUserId: string;
  toUserId: string;
  amountPaise: bigint;
};
export type BalanceResult = {
  viewerBalancePaise: bigint;
  memberBalances: BalanceMember[];
  pairwiseWithViewer: BalanceViewer[];
  pairwiseDebts: BalanceDebt[];
};

type BalanceMap = Map<string, bigint>;
type PairKey = string;

function toBigInt(value: string | number | bigint) {
  return typeof value === "bigint" ? value : BigInt(value);
}

function pairKey(a: string, b: string): PairKey {
  return [a, b].sort().join("::");
}

export function computeBalances(args: {
  members: MemberRow[];
  expenseShares: ExpenseShareRow[];
  expenses: ExpenseRow[];
  settlements: SettlementRow[];
  viewerId: string;
}): BalanceResult {
  const net: BalanceMap = new Map(args.members.map((member) => [member.id, 0n]));
  const pairwise: Map<PairKey, Map<string, bigint>> = new Map();

  const addNet = (userId: string, amount: bigint) => {
    net.set(userId, (net.get(userId) ?? 0n) + amount);
  };

  const addPair = (fromUserId: string, toUserId: string, amount: bigint) => {
    const key = pairKey(fromUserId, toUserId);
    const bucket = pairwise.get(key) ?? new Map<string, bigint>();
    bucket.set(fromUserId, (bucket.get(fromUserId) ?? 0n) + amount);
    pairwise.set(key, bucket);
  };

  const expenseById = new Map(args.expenses.map((expense) => [expense.id, expense]));
  for (const share of args.expenseShares) {
    const amount = toBigInt(share.allocated_amount_paise);
    const expense = expenseById.get(share.expense_id);
    if (!expense) continue;
    if (share.user_id !== expense.payer_id) {
      addNet(share.user_id, -amount);
      addNet(expense.payer_id, amount);
      addPair(share.user_id, expense.payer_id, amount);
    }
  }

  for (const settlement of args.settlements) {
    const amount = toBigInt(settlement.amount_paise);
    addNet(settlement.payer_id, amount);
    addNet(settlement.payee_id, -amount);
    addPair(settlement.payee_id, settlement.payer_id, amount);
  }

  const memberById = new Map(args.members.map((member) => [member.id, member.display_name]));
  const memberBalances = args.members.map((member) => {
    const balance = net.get(member.id) ?? 0n;
    const balanceType: BalanceMember["balanceType"] = balance > 0n ? "owed_to_you" : balance < 0n ? "you_owe" : "settled";
    return {
      id: member.id,
      displayName: memberById.get(member.id) ?? "Unknown",
      balancePaise: balance,
      balanceType
    };
  });

  const viewerBalance = net.get(args.viewerId) ?? 0n;
  const pairwiseWithViewer = args.members
    .filter((member) => member.id !== args.viewerId)
    .map((member) => {
      const key = pairKey(args.viewerId, member.id);
      const bucket = pairwise.get(key) ?? new Map<string, bigint>();
      const viewerAmount = bucket.get(args.viewerId) ?? 0n;
      const otherAmount = bucket.get(member.id) ?? 0n;
      const viewerNet = viewerAmount - otherAmount;
      return {
        id: member.id,
        displayName: memberById.get(member.id) ?? "Unknown",
        balancePaise: viewerNet,
        label:
          viewerNet > 0n
            ? `You are owed ${viewerNet}`
            : viewerNet < 0n
              ? `You owe ${-viewerNet}`
              : "Settled"
      };
    });

  const pairs = Array.from(pairwise.entries())
    .map(([key, bucket]) => {
      const [a, b] = key.split("::");
      const aAmount = bucket.get(a) ?? 0n;
      const bAmount = bucket.get(b) ?? 0n;
      const netAmount = aAmount - bAmount;
      return {
        key,
        fromUserId: netAmount > 0n ? a : b,
        toUserId: netAmount > 0n ? b : a,
        amountPaise: netAmount < 0n ? -netAmount : netAmount
      };
    })
    .filter((item) => item.amountPaise > 0n);

  return {
    viewerBalancePaise: viewerBalance,
    memberBalances,
    pairwiseWithViewer,
    pairwiseDebts: pairs
  };
}
