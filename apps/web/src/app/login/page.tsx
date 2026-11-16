import { safeNextPath } from "@repo/shared/auth";

import { LoginScreen } from "@/features/auth";

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

// The login page. The value `next` of the address is the page to show after
// the login; only a path inside this app is accepted.
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return <LoginScreen nextPath={safeNextPath(next)} />;
}
