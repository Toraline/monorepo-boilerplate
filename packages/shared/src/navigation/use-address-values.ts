"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The values after `?` in the address of the page, and a function that
 * changes them. A page keeps its filters and its page number there, so a
 * reload, a link and the login return to the same list.
 */
export function useAddressValues() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Sets each named value; `null` or `""` removes it. The other values stay.
   * The address changes in place: the Back button does not step through the
   * filters.
   */
  function setValues(changes: Record<string, string | null>) {
    const nextParams = new URLSearchParams(searchParams.toString());
    for (const [name, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        nextParams.delete(name);
      } else {
        nextParams.set(name, value);
      }
    }
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return { searchParams, setValues };
}
