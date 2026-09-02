"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Custom confirmation dialog — replaces browser confirm() (spec §15).
 * Blocks the submit until the user explicitly confirms; focuses the cancel
 * button by default; supports Escape to dismiss.
 */
export function ConfirmSubmit({
  action,
  hidden,
  label,
  confirmTitle,
  confirmBody,
  confirmLabel = "Confirm",
  className = "btn-imperial !min-h-9 px-4 text-[10px]",
  danger = false,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  label: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel?: string;
  className?: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-haspopup="dialog">
        {label}
      </button>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="panel w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${danger ? "text-red-400" : "text-gold"}`} aria-hidden />
              <div>
                <h2 id="confirm-title" className="font-display text-sm tracking-[0.2em] text-gold">
                  {confirmTitle}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-travertine/75">{confirmBody}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                autoFocus
                className="btn-imperial btn-ghost !min-h-9 px-4 text-[10px]"
              >
                Cancel
              </button>
              <form
                action={async (fd) => {
                  setOpen(false);
                  await action(fd);
                }}
                className="inline"
              >
                {hidden &&
                  Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                {children}
                <button
                  type="submit"
                  className={`btn-imperial ${danger ? "btn-burgundy" : "btn-solid"} !min-h-9 px-4 text-[10px]`}
                >
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
