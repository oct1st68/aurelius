"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Bookmark, Bell, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { logoutAction } from "@/app/(site)/actions/auth-actions";

interface Props {
  user: { displayName: string; roles: string[]; accent: string } | null;
  unreadCount: number;
  canSell: boolean;
  isAdmin: boolean;
  isAuthenticator: boolean;
}

const CATALOG_LINKS = [
  { href: "/watches", label: "All Watches" },
  { href: "/saturn", label: "Vintage — Saturn Collection" },
  { href: "/houses", label: "The Great Houses" },
  { href: "/archives", label: "Journal & Guides" },
];

const ACCOUNT_LINKS = [
  { href: "/vault", label: "Your Vault" },
  { href: "/cart", label: "Cart" },
  { href: "/account", label: "Account" },
];

export function HeaderNav({ user, unreadCount, canSell, isAdmin, isAuthenticator }: Props) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = drawerRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav aria-label="Main navigation" className="flex items-center gap-1">
      {/* Desktop */}
      <div className="hidden items-center gap-1 lg:flex">
        {CATALOG_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav-link px-3 py-2 text-[13px] tracking-wide text-ash transition-colors hover:text-bone"
          >
            {link.label}
          </Link>
        ))}
        {user && (
          <>
            <Link
              href="/vault"
              className="relative ml-2 px-3 py-2.5 text-ash transition-colors hover:text-bone"
              aria-label="Your Vault"
            >
              <Bookmark className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/account/notifications"
              className="relative px-3 py-2.5 text-ash transition-colors hover:text-bone"
              aria-label={`Notifications, ${unreadCount} unread`}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-burgundy px-1 text-[10px] font-medium text-ivory">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </>
        )}
        {canSell && (
          <Link
            href="/seller/dashboard"
            className="nav-link px-3 py-2 text-[13px] tracking-wide text-ash hover:text-bone"
          >
            Sell
          </Link>
        )}
        {isAuthenticator && (
          <Link
            href="/authenticator"
            className="nav-link flex items-center gap-1.5 px-3 py-2 text-[13px] tracking-wide text-ash hover:text-bone"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Atelier
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin"
            className="nav-link flex items-center gap-1.5 px-3 py-2 text-[13px] tracking-wide text-ash hover:text-bone"
          >
            <Scale className="h-4 w-4" aria-hidden />
            Admin
          </Link>
        )}
        {user ? (
          <UserMenu displayName={user.displayName} accent={user.accent} />
        ) : (
          <div className="ml-2 flex items-center gap-2">
            <Link href="/login" className="btn-imperial !min-h-10 px-4 text-xs">
              Sign in
            </Link>
            <Link href="/register" className="btn-imperial btn-solid !min-h-10 px-4 text-xs">
              Create account
            </Link>
          </div>
        )}
      </div>

      {/* Mobile */}
      <button
        ref={toggleRef}
        type="button"
        className="ml-1 flex h-11 w-11 items-center justify-center text-bone lg:hidden"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-[22px] w-[22px]" /> : <Menu className="h-[22px] w-[22px]" />}
      </button>

      {open && (
        <div
          id="mobile-nav"
          ref={drawerRef}
          className="absolute left-0 right-0 top-[72px] z-50 max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-white/10 bg-void px-5 pb-8 pt-2 shadow-2xl lg:hidden"
        >
          <p className="eyebrow mt-4">Browse</p>
          <div className="mt-2 flex flex-col">
            {CATALOG_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-gold/10 py-3.5 text-base text-bone"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {user ? (
            <>
              <p className="eyebrow mt-6">Your account</p>
              <div className="mt-2 flex flex-col">
                {ACCOUNT_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-gold/10 py-3.5 text-base text-bone"
                  >
                    {link.label}
                  </Link>
                ))}
                {canSell && (
                  <Link href="/seller/dashboard" onClick={() => setOpen(false)} className="border-b border-gold/10 py-3.5 text-base text-bone">
                    Seller dashboard
                  </Link>
                )}
                {isAuthenticator && (
                  <Link href="/authenticator" onClick={() => setOpen(false)} className="border-b border-gold/10 py-3.5 text-base text-bone">
                    Authentication atelier
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="border-b border-gold/10 py-3.5 text-base text-bone">
                    Admin console
                  </Link>
                )}
                <Link href="/account/notifications" onClick={() => setOpen(false)} className="border-b border-gold/10 py-3.5 text-base text-bone">
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </Link>
              </div>
              <form action={logoutAction} className="pt-6">
                <button type="submit" className="btn-imperial w-full">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <div className="flex gap-3 pt-6">
              <Link href="/login" onClick={() => setOpen(false)} className="btn-imperial flex-1">
                Sign in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} className="btn-imperial btn-solid flex-1">
                Create account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function UserMenu({ displayName, accent }: { displayName: string; accent: string }) {
  const [open, setOpen] = useState(false);
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <div className="relative ml-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 items-center gap-2 px-2"
        aria-label="Account menu"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-sm text-ivory"
          style={{ background: `${accent}33` }}
          aria-hidden
        >
          {initial}
        </span>
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 top-12 z-50 w-56 py-2 shadow-xl">
          {[
            { href: "/account", label: "Account" },
            { href: "/account/orders", label: "Orders" },
            { href: "/account/offers", label: "Offers" },
            { href: "/vault", label: "The Vault" },
            { href: "/cart", label: "Cart" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-[15px] text-bone hover:bg-gold/10 hover:text-bone"
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 gold-rule" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-3 text-left text-[15px] text-bone hover:bg-gold/10 hover:text-bone"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
