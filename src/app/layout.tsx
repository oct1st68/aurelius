import type { Metadata } from "next";
import "@fontsource-variable/cinzel";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AURELIUS — The Empire of Time",
    template: "%s · AURELIUS",
  },
  description:
    "A multi-vendor marketplace for fine and vintage timepieces. Time is the only empire that never falls.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-obsidian"
        >
          Skip to content
        </a>
        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
