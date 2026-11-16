"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// The three areas of the app, in the order of the menu.
const AREAS = [
  { id: "tags", path: "/tags" },
  { id: "todos", path: "/todos" },
  { id: "history", path: "/history" },
] as const;

/**
 * The menu of the app: one link per area. The link of the area that is open
 * has `aria-current="page"` and the main color.
 */
export function AdminMenu() {
  const t = useTranslations("menu");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="mx-auto w-full max-w-5xl px-8 pt-2"
    >
      <ul className="m-0 flex list-none flex-wrap gap-1 border-b-2 border-b-default p-0">
        {AREAS.map((area) => {
          const isOpen =
            pathname === area.path || pathname.startsWith(`${area.path}/`);
          return (
            <li key={area.id}>
              <Link
                href={area.path}
                aria-current={isOpen ? "page" : undefined}
                className="-mb-[2px] block rounded-t-md border-b-4 border-b-transparent px-6 py-2 font-heading font-medium text-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-[current=page]:border-b-brand aria-[current=page]:text-brand"
              >
                {t(area.id)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
