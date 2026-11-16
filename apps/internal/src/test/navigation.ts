import { useMemo, useSyncExternalStore } from "react";
import { vi } from "vitest";

type Listener = () => void;

const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Shows `path` as the address of the page, as the router of Next.js does. */
function goTo(path: string) {
  const [pathname, search = ""] = path.split("?");
  navigation.pathname = pathname;
  navigation.search = search;
  listeners.forEach((listener) => listener());
}

/**
 * What a test knows about the address of the page. A test file replaces
 * `next/navigation` with `navigationMock()`, sets `pathname` and `search`
 * before it renders, and reads the calls of `replace` and `push`. A call of
 * `replace` or `push` changes the address, and the components that read it
 * render again.
 */
export const navigation = {
  pathname: "/",
  search: "",
  replace: vi.fn<(path: string, options?: { scroll?: boolean }) => void>(goTo),
  push: vi.fn<(path: string, options?: { scroll?: boolean }) => void>(goTo),
};

/** Sets the address back to the start page and forgets the calls. */
export function resetNavigation() {
  navigation.pathname = "/";
  navigation.search = "";
  navigation.replace.mockClear();
  navigation.push.mockClear();
}

/** The replacement of the module `next/navigation` in a test. */
export function navigationMock() {
  return {
    useRouter: () => ({
      replace: navigation.replace,
      push: navigation.push,
    }),
    usePathname: () =>
      useSyncExternalStore(subscribe, () => navigation.pathname),
    useSearchParams: () => {
      const search = useSyncExternalStore(subscribe, () => navigation.search);
      return useMemo(() => new URLSearchParams(search), [search]);
    },
  };
}
