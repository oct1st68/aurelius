import Link from "next/link";
import { AureliusLogo } from "@/components/brand/aurelius-logo";

const COLUMNS = [
  {
    title: "Collection",
    links: [
      { href: "/watches", label: "All Watches" },
      { href: "/saturn", label: "Vintage — Saturn Collection" },
      { href: "/houses", label: "The Great Houses" },
      { href: "/janus", label: "Compare Watches" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/certificate", label: "Authentication & Certificates" },
      { href: "/archives", label: "Journal & Guides" },
      { href: "/about", label: "About AURELIUS" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/seller/dashboard", label: "Sell a Watch" },
      { href: "/account", label: "Your Account" },
      { href: "/vault", label: "Your Vault" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-void">
      <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 lg:py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <AureliusLogo />
            <p className="mt-4 max-w-xs font-serif-lux text-lg leading-snug text-ash">
              Time is the only empire that never falls.
            </p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ash/70">
              Every watch is inspected and certified before dispatch. Insured
              delivery, escrow-style custody, and a digital passport of
              provenance with every purchase.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="taste-link text-[15px] text-ash transition-colors hover:text-antique-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-sm text-ash/70 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} AURELIUS.</p>
          <p>Certified authentication · Insured delivery · Secure checkout</p>
        </div>
      </div>
    </footer>
  );
}
