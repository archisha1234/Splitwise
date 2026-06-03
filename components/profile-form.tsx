"use client";

import { useActionState, useState } from "react";
import { updateProfileAction, type FormState } from "@/app/actions";
import { ErrorText, Input, Label, PrimaryButton, ShellCard } from "@/components/ui";

const initialState: FormState = {};

export function ProfileForm({ initialDisplayName }: { initialDisplayName: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);
  const [displayName, setDisplayName] = useState(initialDisplayName);

  return (
    <ShellCard className="max-w-2xl">
      <form action={action} className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Profile</h1>
          <p className="mt-1 text-sm text-slate-600">You can only update your display name in this MVP.</p>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <div>
          <Label htmlFor="profile-name">Display name</Label>
          <Input id="profile-name" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <ErrorText>{state.fieldErrors?.displayName}</ErrorText>
        </div>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}
