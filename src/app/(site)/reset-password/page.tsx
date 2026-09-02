"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type AuthFormState } from "@/app/(site)/actions/auth-actions";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resetPasswordAction, {});

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md animate-fade-up flex-col justify-center px-4 py-16">
      <p className="eyebrow text-center">Password Recovery</p>
      <h1 className="font-display mt-3 text-center text-3xl text-ivory">Set a New Password</h1>
      <div className="gold-rule mx-auto mt-6 w-24" />

      {state.ok ? (
        <div className="panel mt-10 p-6 text-sm text-travertine/80">
          <p>Password updated. All previous sessions were revoked.</p>
          <Link href="/login" className="btn-imperial btn-solid mt-5 w-full">
            Sign in
          </Link>
        </div>
      ) : (
        <form action={action} className="mt-10 space-y-5">
          <div>
            <label htmlFor="token" className="label-imperial">
              Reset token
            </label>
            <input
              id="token"
              name="token"
              required
              className="input-imperial font-mono text-xs"
              placeholder="Paste the token (dev console / inbox)"
            />
          </div>
          <div>
            <label htmlFor="password" className="label-imperial">
              New password
            </label>
            <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="input-imperial" />
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
          <button type="submit" disabled={pending} className="btn-imperial btn-solid w-full">
            {pending ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
