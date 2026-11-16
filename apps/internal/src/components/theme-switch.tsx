import { useTranslations } from "next-intl";

import { ThemeToggle } from "@repo/ui/components";

/**
 * The button that changes between the light theme and the dark theme. The
 * button itself is `ThemeToggle` of `packages/ui`; this component gives it its
 * texts in the language of the request.
 */
export function ThemeSwitch() {
  const t = useTranslations("themeSwitch");

  return (
    <ThemeToggle
      labels={{ light: t("light.label"), dark: t("dark.label") }}
      accessibleNames={{
        light: t("light.accessibleName"),
        dark: t("dark.accessibleName"),
      }}
    />
  );
}
