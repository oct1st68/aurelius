"use client";

import { useActionState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { saveToVaultAction, removeFromVaultAction, type ActionState } from "@/app/(site)/actions/commerce-actions";

export function VaultSectionClient({ listingId }: { listingId: string }) {
  const [saveState, saveAction, savePending] = useActionState<ActionState, FormData>(saveToVaultAction, {});
  const [rmState, rmAction, rmPending] = useActionState<ActionState, FormData>(removeFromVaultAction, {});

  if (rmState.ok) {
    return (
      <form action={saveAction}>
        <input type="hidden" name="listingId" value={listingId} />
        <button type="submit" disabled={savePending} className="btn-imperial !min-h-10 px-5 text-[11px]">
          <Bookmark className="h-4 w-4" aria-hidden /> Save to Vault
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {saveState.ok ? (
        <>
          <form action={rmAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <button type="submit" disabled={rmPending} className="btn-imperial !min-h-10 px-5 text-[11px]">
              <BookmarkCheck className="h-4 w-4 text-gold" aria-hidden /> In your Vault — remove
            </button>
          </form>
          <a href="/vault" className="text-xs text-gold underline underline-offset-4">
            View Vault
          </a>
        </>
      ) : (
        <form action={saveAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <button type="submit" disabled={savePending} className="btn-imperial !min-h-10 px-5 text-[11px]">
            <Bookmark className="h-4 w-4" aria-hidden /> Save to Vault
          </button>
        </form>
      )}
      {(saveState.error || rmState.error) && (
        <p role="alert" className="text-sm text-red-400">
          {saveState.error ?? rmState.error}
        </p>
      )}
    </div>
  );
}
