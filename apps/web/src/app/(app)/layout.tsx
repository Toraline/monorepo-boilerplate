import { Suspense } from "react";

import { RequireLogin } from "@/features/auth";

// Every page in this folder needs a login. A person without one is sent to
// the login page and returns here after the login. The login page is outside
// this folder.
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense>
      <RequireLogin>{children}</RequireLogin>
    </Suspense>
  );
}
