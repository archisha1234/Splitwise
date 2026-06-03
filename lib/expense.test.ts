import { describe, expect, it } from "vitest";
import { buildSplitAllocations } from "@/lib/expense";

describe("buildSplitAllocations", () => {
  it("validates percentage totals", () => {
    const result = buildSplitAllocations({
      splitType: "percentage",
      totalAmountPaise: 10000,
      payerId: "a",
      participantIds: ["a", "b"],
      inputValues: { a: "60", b: "30" }
    });

    expect("error" in result).toBe(true);
  });

  it("distributes equal split remainder to the payer", () => {
    const result = buildSplitAllocations({
      splitType: "equal",
      totalAmountPaise: 1001,
      payerId: "a",
      participantIds: ["a", "b", "c"],
      inputValues: {}
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    const payer = result.allocations.find((item) => item.userId === "a");
    expect(payer?.allocatedAmountPaise).toBe(335);
  });
});
