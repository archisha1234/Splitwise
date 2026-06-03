"use client";

import { useActionState, useState } from "react";
import { createSettlementAction, type FormState } from "@/app/actions";
import { ErrorText, Input, Label, PrimaryButton, Select, ShellCard } from "@/components/ui";

const initialState: FormState = {};

export function SettlementForm({
  groupId,
  members,
  today
}: {
  groupId: string;
  members: { id: string; display_name: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState(createSettlementAction, initialState);
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [payeeId, setPayeeId] = useState(members[1]?.id ?? members[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);

  return (
    <ShellCard className="max-w-2xl">
      <form action={action} className="space-y-5">
        <input type="hidden" name="groupId" value={groupId} />
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Settle up</h1>
          <p className="mt-1 text-sm text-slate-600">Record a direct payment between two members.</p>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="settlement-payer">Payer</Label>
            <Select id="settlement-payer" name="payerId" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.display_name}
                </option>
              ))}
            </Select>
            <ErrorText>{state.fieldErrors?.payerId}</ErrorText>
          </div>
          <div>
            <Label htmlFor="settlement-payee">Payee</Label>
            <Select id="settlement-payee" name="payeeId" value={payeeId} onChange={(e) => setPayeeId(e.target.value)}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.display_name}
                </option>
              ))}
            </Select>
            <ErrorText>{state.fieldErrors?.payeeId}</ErrorText>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="settlement-amount">Amount</Label>
            <Input id="settlement-amount" name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            <ErrorText>{state.fieldErrors?.amount}</ErrorText>
          </div>
          <div>
            <Label htmlFor="settlement-date">Date</Label>
            <Input id="settlement-date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} />
            <ErrorText>{state.fieldErrors?.date}</ErrorText>
          </div>
        </div>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving..." : "Record settlement"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}
