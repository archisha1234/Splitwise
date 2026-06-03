"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

const tables = [
  "groups",
  "group_members",
  "expenses",
  "expense_shares",
  "settlements",
  "balance_edges",
  "expense_messages",
  "expense_thread_reads",
  "activity_events"
] as const;

export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel("app-refresh");

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          router.refresh();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
