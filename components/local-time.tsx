"use client";

import { useEffect, useState } from "react";

export function LocalTime({ iso, format = "dateTime" }: { iso: string; format?: "date" | "dateTime" }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const date = new Date(iso);
    const formatter =
      format === "date"
        ? new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          })
        : new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          });
    setLabel(formatter.format(date));
  }, [format, iso]);

  return <span suppressHydrationWarning>{label}</span>;
}
