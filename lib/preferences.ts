import { cookies } from "next/headers";
import { isValidTimeZone, todayIso } from "@/lib/dates";

export const TZ_COOKIE = "tm_tz";
export const SUBTASKS_COOKIE = "tm_show_subtasks";

export type Preferences = { timeZone: string | null; today: string; showSubtasks: boolean };

/** Per-viewer display preferences, stored in cookies so server components can read them. */
export async function getPreferences(): Promise<Preferences> {
  const jar = await cookies();
  const tz = jar.get(TZ_COOKIE)?.value;
  const timeZone = isValidTimeZone(tz) ? tz : null;
  return {
    timeZone,
    today: todayIso(timeZone),
    showSubtasks: jar.get(SUBTASKS_COOKIE)?.value === "1",
  };
}
