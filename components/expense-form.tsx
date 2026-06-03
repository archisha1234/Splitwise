"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createExpenseAction, type FormState } from "@/app/actions";
import { ErrorText, Input, Label, PrimaryButton, Select, ShellCard } from "@/components/ui";

const initialState: FormState = {};
const splitTypes = [
  { value: "equal", label: "Equal" },
  { value: "percentage", label: "Percentage" },
  { value: "share", label: "Share" },
  { value: "unequal", label: "Unequal" }
] as const;

export function ExpenseForm({
  groupId,
  members,
  today
}: {
  groupId: string;
  members: { id: string; display_name: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState(createExpenseAction, initialState);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [splitType, setSplitType] = useState<(typeof splitTypes)[number]["value"]>("equal");
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState<string[]>(members.map((member) => member.id));
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (payerId && !selected.includes(payerId)) {
      setSelected((current) => Array.from(new Set([...current, payerId])));
    }
  }, [payerId, selected]);

  const participantOptions = useMemo(
    () => members.filter((member) => selected.includes(member.id) || member.id === payerId),
    [members, payerId, selected]
  );

  return (
    <ShellCard className="max-w-4xl">
      <form action={action} className="space-y-6">
        <input type="hidden" name="groupId" value={groupId} />
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Add expense</h1>
          <p className="mt-1 text-sm text-slate-600">Choose the split first, then enter the values that match that split.</p>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="expense-description">Description</Label>
            <Input id="expense-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <ErrorText>{state.fieldErrors?.description}</ErrorText>
          </div>
          <div>
            <Label htmlFor="expense-date">Date</Label>
            <Input id="expense-date" name="date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            <ErrorText>{state.fieldErrors?.date}</ErrorText>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="expense-split-type">Split type</Label>
            <Select id="expense-split-type" name="splitType" value={splitType} onChange={(e) => setSplitType(e.target.value as any)}>
              {splitTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <ErrorText>{state.fieldErrors?.splitType}</ErrorText>
          </div>
          <div>
            <Label htmlFor="expense-total">Total amount</Label>
            <Input id="expense-total" name="totalAmount" inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
            <ErrorText>{state.fieldErrors?.totalAmount}</ErrorText>
          </div>
        </div>
        <div>
          <Label htmlFor="expense-payer">Payer</Label>
          <Select id="expense-payer" name="payerId" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
          </Select>
          <ErrorText>{state.fieldErrors?.payerId}</ErrorText>
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Participants</h2>
            <p className="mt-1 text-sm text-slate-500">Select the people involved in this split. The payer is always included.</p>
          </div>
          <ErrorText>{state.fieldErrors?.participants}</ErrorText>
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member) => {
              const checked = selected.includes(member.id);
              return (
                <label key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    name="participants"
                    value={member.id}
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected((current) => Array.from(new Set([...current, member.id])));
                      } else if (member.id !== payerId) {
                        setSelected((current) => current.filter((id) => id !== member.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-800">{member.display_name}</span>
                  {member.id === payerId ? <span className="ml-auto text-xs uppercase tracking-wide text-slate-500">Payer</span> : null}
                </label>
              );
            })}
          </div>
        </div>
        {(splitType === "percentage" || splitType === "share" || splitType === "unequal") ? (
          <div className="space-y-4 rounded-3xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Split values</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {participantOptions.map((member) => (
                <div key={member.id}>
                  <Label htmlFor={`value_${member.id}`}>{member.display_name}</Label>
                  <Input
                    id={`value_${member.id}`}
                    name={`value_${member.id}`}
                    inputMode="decimal"
                    value={values[member.id] ?? ""}
                    onChange={(e) => setValues((current) => ({ ...current, [member.id]: e.target.value }))}
                    placeholder={
                      splitType === "percentage"
                        ? "Percentage"
                        : splitType === "share"
                          ? "Shares"
                          : "Amount"
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save expense"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}
