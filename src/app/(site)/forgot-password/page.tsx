"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type AuthFormState } from "@/app/(site)/actions/auth-actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(forgotPasswordAction, {});

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md animate-fade-up flex-col justify-center px-4 py-16">
      <p className="eyebrow text-center">Password Recovery</p>
      <h1 className="font-display mt-3 text-center text-3xl text-ivory">Forgot Password</h1>
      <div className="gold-rule mx-auto mt-6 w-24" />

      {state.ok ? (
        <div className="panel mt-10 p-6 text-sm leading-relaxed text-travertine/80">
          <p>
            If an account exists for that address, a reset email has been placed in the
            development inbox (<code className="text-bone">data/local/emails.json</code>).
          </p>
          <p className="mt-3 text-ash">
            For security the reset token is never shown in the web UI; during local
            development it is printed to the <em>server console</em> only.
          </p>
        </div>
      ) : (
        <form action={action} className="mt-10 space-y-5">
          <div>
            <label htmlFor="email" className="label-imperial">
              Account email
            </label>
            <input id="email" name="email" type="email" required className="input-imperial" />
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-red-400">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-imperial btn-solid w-full">
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-ash">
            <Link href="/reset-password" className="text-bone hover:text-bone-soft">
              I already have a token
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
