import { Suspense } from "react";

import { AdminMenu, RequireAdmin } from "@/features/auth";

// Every page in this folder is for admins only. A person without a login is
// sent to the login page. A user who is not an admin sees the "no access"
// page. An admin sees the menu and the page. The login page is outside this
// folder.
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense>
      <RequireAdmin>
        <AdminMenu />
        {children}
      </RequireAdmin>
    </Suspense>
  );
}
