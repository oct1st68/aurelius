import { getSession } from "@/lib/auth/request-context";
import { can } from "@/lib/auth/rbac";
import { unreadCount } from "@/lib/services/notification-service";
import { HeaderNav } from "./header-nav";
import { SearchButton } from "@/components/search/search-button";
import { AureliusLogo } from "@/components/brand/aurelius-logo";

/**
 * Server component: resolves the session server-side and renders the imperial
 * header. The client nav receives only non-sensitive display data.
 */
export async function SiteHeader() {
  const auth = await getSession();
  let unread = 0;
  if (auth) {
    unread = await unreadCount(auth.user.id);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-void/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[90rem] items-center gap-4 px-4 sm:px-6">
        <AureliusLogo className="shrink-0" />

        <div className="flex-1" />

        <SearchButton />

        <HeaderNav
          user={
            auth
              ? {
                  displayName: auth.user.displayName,
                  roles: auth.user.roles,
                  accent: auth.user.accent,
                }
              : null
          }
          unreadCount={unread}
          canSell={auth ? can(auth, "watch:create") : false}
          isAdmin={auth ? auth.user.roles.includes("ADMIN") : false}
          isAuthenticator={auth ? auth.user.roles.includes("AUTHENTICATOR") : false}
        />
      </div>
    </header>
  );
}
