"use client";

import { useActionState, useState } from "react";
import { addExpenseMessageAction, type FormState } from "@/app/actions";
import { ErrorText, PrimaryButton, ShellCard, TextArea } from "@/components/ui";

const initialState: FormState = {};

export function ExpenseMessageForm({ expenseId }: { expenseId: string }) {
  const [state, action, pending] = useActionState(addExpenseMessageAction, initialState);
  const [body, setBody] = useState("");

  return (
    <ShellCard>
      <form action={action} className="space-y-4">
        <input type="hidden" name="expenseId" value={expenseId} />
        <div>
          <label htmlFor="message-body" className="block text-sm font-medium text-slate-700">
            Add a message
          </label>
          <TextArea
            id="message-body"
            name="body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share a note about this expense"
          />
          <ErrorText>{state.fieldErrors?.body}</ErrorText>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Posting..." : "Post message"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}
