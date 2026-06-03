import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { GhostButton } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Splitwise Clone",
  description: "Shared expenses and group debt tracking"
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        {user ? <RealtimeRefresh /> : null}
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8 rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-soft backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={user ? "/dashboard" : "/login"} className="text-lg font-semibold tracking-tight text-slate-950">
                  Splitwise Clone
                </Link>
                <p className="text-sm text-slate-600">Shared expenses, net balances, and settlements.</p>
              </div>
              {user ? (
                <nav className="flex flex-wrap items-center gap-3">
                  <Link href="/dashboard" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Dashboard
                  </Link>
                  <Link href="/profile" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Profile
                  </Link>
                  <form action={logoutAction}>
                    <GhostButton type="submit">Log out</GhostButton>
                  </form>
                </nav>
              ) : (
                <nav className="flex items-center gap-3">
                  <Link href="/login" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Log in
                  </Link>
                  <Link href="/register" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    Create account
                  </Link>
                </nav>
              )}
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
