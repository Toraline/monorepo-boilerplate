"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

import { loginPathFor, useCurrentUser } from "@repo/shared/auth";
import { StateMessage } from "@repo/ui/components";
import { Button } from "@toraline.tech/ui";

import { NoAccess } from "./no-access";

type RequireAdminProps = {
  children: ReactNode;
};

/**
 * Shows its content only to an admin. It asks the server "who am I".
 * - A person without a login is sent to the login page, whose address names
 *   this page, so the login returns here.
 * - A user who is not an admin sees the "no access" page, and nothing else.
 * The server checks the same rule for each request: this component only
 * chooses what the page shows.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const t = useTranslations("auth.session");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();

  const query = searchParams.toString();
  const currentPath = query ? `${pathname}?${query}` : pathname;
  const isLoggedOut = currentUser.isSuccess && currentUser.data === null;

  useEffect(() => {
    if (isLoggedOut) {
      router.replace(loginPathFor(currentPath));
    }
  }, [isLoggedOut, currentPath, router]);

  if (currentUser.isError) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 p-8">
        <StateMessage
          kind="error"
          action={
            <Button
              variant="secondary"
              loading={currentUser.isFetching}
              onClick={() => currentUser.refetch()}
            >
              {t("tryAgain")}
            </Button>
          }
        >
          {t("failed")}
        </StateMessage>
      </main>
    );
  }

  if (!currentUser.data) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 p-8">
        <StateMessage kind="loading">{t("checking")}</StateMessage>
      </main>
    );
  }

  if (!currentUser.data.isAdmin) {
    return <NoAccess user={currentUser.data} />;
  }

  return children;
}
