"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, registerAction, type FormState } from "@/app/actions";
import { ErrorText, Input, Label, PrimaryButton, ShellCard } from "@/components/ui";

const initialState: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state.redirectTo]);

  return (
    <ShellCard className="w-full max-w-md">
      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-950">Log in</h1>
          <p className="text-sm text-slate-600">Continue to your groups and balances.</p>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErrorText>{state.fieldErrors?.email}</ErrorText>
        </div>
        <div>
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorText>{state.fieldErrors?.password}</ErrorText>
        </div>
        <PrimaryButton type="submit" disabled={pending} className="w-full">
          {pending ? "Logging in..." : "Log in"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state.redirectTo]);

  return (
    <ShellCard className="w-full max-w-md">
      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-950">Create account</h1>
          <p className="text-sm text-slate-600">Set up your profile to start tracking shared expenses.</p>
        </div>
        {state.formError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.formError}</p> : null}
        <div>
          <Label htmlFor="register-name">Display name</Label>
          <Input id="register-name" name="displayName" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <ErrorText>{state.fieldErrors?.displayName}</ErrorText>
        </div>
        <div>
          <Label htmlFor="register-email">Email</Label>
          <Input id="register-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErrorText>{state.fieldErrors?.email}</ErrorText>
        </div>
        <div>
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ErrorText>{state.fieldErrors?.password}</ErrorText>
        </div>
        <PrimaryButton type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account..." : "Create account"}
        </PrimaryButton>
      </form>
    </ShellCard>
  );
}
