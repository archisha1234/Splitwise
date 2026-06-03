"use client";

import { useActionState, useState } from "react";
import { createGroupAction, joinGroupAction, type FormState } from "@/app/actions";
import { ErrorText, Input, Label, PrimaryButton, Select, ShellCard } from "@/components/ui";

const initialState: FormState = {};
const categories = ["Household", "Travel", "Office", "Trip", "Other"];

export function GroupCreateForm() {
  const [state, action, pending] = useActionState(createGroupAction, initialState);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  return (
    <ShellCard className="max-w-2xl">
      <form action={action} className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Create a group</h1>
          <p className="mt-1 text-sm text-slate-600">Keep it focused and simple for the 3-day version.</p>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <div>
          <Label htmlFor="group-name">Group name</Label>
          <Input id="group-name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
          <ErrorText>{state.fieldErrors?.name}</ErrorText>
        </div>
        <div>
          <Label htmlFor="group-category">Category</Label>
          <Select id="group-category" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select optional category</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create group"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}

export function JoinGroupForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(joinGroupAction, initialState);
  const [inviteCode, setInviteCode] = useState(initialCode);
  return (
    <ShellCard className="max-w-2xl">
      <form action={action} className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Join a group</h1>
          <p className="mt-1 text-sm text-slate-600">Enter a 6-character invite code or use a shared link.</p>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <div>
          <Label htmlFor="invite-code">Invite code</Label>
          <Input id="invite-code" name="inviteCode" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          <ErrorText>{state.fieldErrors?.inviteCode}</ErrorText>
        </div>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Joining..." : "Join group"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}
