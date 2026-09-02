"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Logs for the operator, offers the user a real
 * recovery path — never a dead end.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[aurelius] route error:", error.message, error.digest ?? "");
  }, [error]);

  return (
    <div className="museum-page flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">Service interruption</p>
      <h1 className="editorial-title mt-4 text-center text-bone">This page could not be served.</h1>
      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ash">
        The atelier is aware. You may retry immediately — your cart, Vault, and
        session are unaffected.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-ash/70">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-imperial btn-solid">
          Try again
        </button>
        <Link href="/" className="btn-imperial">
          Return to the entrance
        </Link>
      </div>
    </div>
  );
}
