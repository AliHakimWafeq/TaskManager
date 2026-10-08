"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isValidTimeZone } from "@/lib/dates";
import { SUBTASKS_COOKIE, TZ_COOKIE } from "@/lib/preferences";

const YEAR = 60 * 60 * 24 * 365;

export async function setShowSubtasks(show: boolean) {
  const jar = await cookies();
  jar.set(SUBTASKS_COOKIE, show ? "1" : "0", { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setTimeZone(tz: string) {
  if (!isValidTimeZone(tz)) return;
  const jar = await cookies();
  jar.set(TZ_COOKIE, tz, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}
