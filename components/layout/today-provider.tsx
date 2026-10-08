"use client";

import { createContext, useContext, useEffect } from "react";
import { setTimeZone } from "@/lib/actions/preferences";

const TodayContext = createContext<string>("");

/** "Today" (YYYY-MM-DD) in the viewer's time zone; identical on server and client renders. */
export function useToday() {
  return useContext(TodayContext);
}

export function TodayProvider({
  today,
  timeZone,
  children,
}: {
  today: string;
  timeZone: string | null;
  children: React.ReactNode;
}) {
  // Tell the server our time zone once, so due dates and "overdue" use local days.
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== timeZone) void setTimeZone(tz);
  }, [timeZone]);
  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>;
}
