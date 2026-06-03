import { parseMoneyToPaise } from "@/lib/money";

export type SplitType = "equal" | "percentage" | "share" | "unequal";

export type SplitAllocation = {
  userId: string;
  allocatedAmountPaise: number;
  inputValue: number | null;
};

export function buildSplitAllocations(args: {
  splitType: SplitType;
  totalAmountPaise: number;
  payerId: string;
  participantIds: string[];
  inputValues: Record<string, string>;
}) {
  const uniqueParticipants = Array.from(new Set([...args.participantIds, args.payerId]));
  if (uniqueParticipants.length === 0) {
    return { error: "Select at least one participant.", allocations: [] as SplitAllocation[] };
  }

  if (args.splitType === "equal") {
    const base = Math.floor(args.totalAmountPaise / uniqueParticipants.length);
    const remainder = args.totalAmountPaise - base * uniqueParticipants.length;
    return {
      allocations: uniqueParticipants.map((userId) => ({
        userId,
        allocatedAmountPaise: base + (userId === args.payerId ? remainder : 0),
        inputValue: null
      }))
    };
  }

  if (args.splitType === "percentage") {
    const percentages = uniqueParticipants.map((userId) => {
      const raw = args.inputValues[userId];
      const parsed = raw ? Number(raw) : NaN;
      return { userId, percentage: parsed };
    });
    if (percentages.some((item) => !Number.isFinite(item.percentage) || item.percentage <= 0)) {
      return { error: "Enter valid percentage values for all selected people.", allocations: [] as SplitAllocation[] };
    }
    const total = percentages.reduce((sum, item) => sum + item.percentage, 0);
    if (total !== 100) {
      return { error: "Percentages must add up to 100.", allocations: [] as SplitAllocation[] };
    }
    const floorAllocations = percentages.map((item) => ({
      userId: item.userId,
      rawAmount: Math.floor((args.totalAmountPaise * item.percentage) / 100)
    }));
    const sum = floorAllocations.reduce((acc, item) => acc + item.rawAmount, 0);
    const remainder = args.totalAmountPaise - sum;
    return {
      allocations: floorAllocations.map((item) => ({
        userId: item.userId,
        allocatedAmountPaise: item.rawAmount + (item.userId === args.payerId ? remainder : 0),
        inputValue: percentages.find((p) => p.userId === item.userId)?.percentage ?? null
      }))
    };
  }

  if (args.splitType === "share") {
    const shares = uniqueParticipants.map((userId) => {
      const raw = args.inputValues[userId];
      const parsed = raw ? Number(raw) : NaN;
      return { userId, shares: parsed };
    });
    if (shares.some((item) => !Number.isFinite(item.shares) || item.shares <= 0)) {
      return { error: "Enter valid share values for all selected people.", allocations: [] as SplitAllocation[] };
    }
    const totalShares = shares.reduce((sum, item) => sum + item.shares, 0);
    const floorAllocations = shares.map((item) => ({
      userId: item.userId,
      rawAmount: Math.floor((args.totalAmountPaise * item.shares) / totalShares)
    }));
    const sum = floorAllocations.reduce((acc, item) => acc + item.rawAmount, 0);
    const remainder = args.totalAmountPaise - sum;
    return {
      allocations: floorAllocations.map((item) => ({
        userId: item.userId,
        allocatedAmountPaise: item.rawAmount + (item.userId === args.payerId ? remainder : 0),
        inputValue: shares.find((p) => p.userId === item.userId)?.shares ?? null
      }))
    };
  }

  const amounts = uniqueParticipants.map((userId) => {
    const raw = args.inputValues[userId];
    const parsed = raw ? parseMoneyToPaise(raw) : null;
    return { userId, amount: parsed };
  });
  if (amounts.some((item) => item.amount === null || item.amount < 0)) {
    return { error: "Enter valid amounts for all selected people.", allocations: [] as SplitAllocation[] };
  }
  const total = amounts.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  if (total !== args.totalAmountPaise) {
    return { error: "Unequal split amounts must add up to the total.", allocations: [] as SplitAllocation[] };
  }
  return {
    allocations: amounts.map((item) => ({
      userId: item.userId,
      allocatedAmountPaise: item.amount ?? 0,
      inputValue: item.amount ?? null
    }))
  };
}
