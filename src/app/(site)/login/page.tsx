"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/(site)/actions/auth-actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md animate-fade-up flex-col justify-center px-4 py-16">
      <p className="eyebrow text-center">Return to the Empire</p>
      <h1 className="font-display mt-3 text-center text-3xl text-ivory">Sign In</h1>
      <div className="gold-rule mx-auto mt-6 w-24" />

      <form action={action} className="mt-10 space-y-5">
        <div>
          <label htmlFor="email" className="label-imperial">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input-imperial" />
        </div>
        <div>
          <label htmlFor="password" className="label-imperial">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input-imperial"
          />
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-red-400">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-imperial btn-solid w-full">
          {pending ? "Verifying…" : "Sign In"}
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-ash hover:text-bone">
          Forgot password?
        </Link>
        <Link href="/register" className="text-bone hover:text-bone-soft">
          Create account
        </Link>
      </div>

      <div className="panel mt-10 p-4 text-xs leading-relaxed text-ash">
        <p className="font-semibold text-bone-soft">Staff accounts for review:</p>
        <p className="mt-1">buyer@aurelius.local · seller@aurelius.local</p>
        <p>authenticator@aurelius.local · admin@aurelius.local</p>
      </div>
    </div>
  );
}
