"use client";

import { useFormatter } from "next-intl";

/**
 * Returns a function that writes a date and time of the server (UTC, for
 * example "2026-11-15T17:40:00Z") in the format of the chosen language and
 * in the time zone of the browser: "Nov 15, 2026, 5:40 PM" in English,
 * "15 de nov. de 2026, 17:40" in Portuguese.
 */
export function useDateTimeFormat() {
  const format = useFormatter();

  return (isoDateTime: string) =>
    format.dateTime(new Date(isoDateTime), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
}
