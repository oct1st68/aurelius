"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/app/(site)/actions/auth-actions";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md animate-fade-up flex-col justify-center px-4 py-16">
      <p className="eyebrow text-center">Join the Empire</p>
      <h1 className="font-display mt-3 text-center text-3xl text-ivory">Create Account</h1>
      <div className="gold-rule mx-auto mt-6 w-24" />

      <form action={action} className="mt-10 space-y-5">
        <div>
          <label htmlFor="displayName" className="label-imperial">
            Display name
          </label>
          <input id="displayName" name="displayName" required minLength={2} maxLength={60} className="input-imperial" />
        </div>
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
            minLength={10}
            autoComplete="new-password"
            className="input-imperial"
          />
          <p className="mt-1.5 text-xs text-ash">
            At least 10 characters with upper, lower, and a digit.
          </p>
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-red-400">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-imperial btn-solid w-full">
          {pending ? "Forging…" : "Create Account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ash">
        Already a citizen?{" "}
        <Link href="/login" className="text-bone hover:text-bone-soft">
          Sign in
        </Link>
      </p>
      <p className="mt-6 text-center text-xs text-ash">
        Buyer accounts can upgrade to a seller storefront from the dashboard.
      </p>
    </div>
  );
}
