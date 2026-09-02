"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/app/(site)/actions/auth-actions";

interface Props {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}

export function ChangePasswordForm({ action }: Props) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});
  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div>
        <label htmlFor="current" className="label-imperial">
          Current password
        </label>
        <input id="current" name="current" type="password" required autoComplete="current-password" className="input-imperial" />
      </div>
      <div>
        <label htmlFor="next" className="label-imperial">
          New password
        </label>
        <input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" className="input-imperial" />
      </div>
      <div>
        <label htmlFor="confirm" className="label-imperial">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="input-imperial" />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-emerald-400">
          Password changed. Other sessions were revoked.
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-imperial w-full">
        {pending ? "Changing…" : "Change Password"}
      </button>
    </form>
  );
}
