import { describe, expect, it } from "vitest";
import { computeBalances } from "@/lib/balance";

describe("computeBalances", () => {
  it("nets expenses and settlements for the viewer", () => {
    const result = computeBalances({
      members: [
        { id: "a", display_name: "A" },
        { id: "b", display_name: "B" },
        { id: "c", display_name: "C" }
      ],
      expenses: [{ id: "e1", payer_id: "a", total_amount_paise: 3000 }],
      expenseShares: [
        { expense_id: "e1", user_id: "a", allocated_amount_paise: 1000 },
        { expense_id: "e1", user_id: "b", allocated_amount_paise: 1000 },
        { expense_id: "e1", user_id: "c", allocated_amount_paise: 1000 }
      ],
      settlements: [{ payer_id: "b", payee_id: "a", amount_paise: 500 }],
      viewerId: "a"
    });

    expect(result.viewerBalancePaise).toBe(1500n);
    expect(result.pairwiseWithViewer.find((item) => item.id === "b")?.balancePaise).toBe(-500n);
    expect(result.pairwiseWithViewer.find((item) => item.id === "c")?.balancePaise).toBe(-1000n);
  });
});
