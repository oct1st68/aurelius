"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AppError, toUserMessage } from "@/core/errors";
import { enforceRateLimit } from "@/core/rate-limit";
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from "@/lib/auth/auth-service";
import {
  setSessionCookie,
  clearSessionCookie,
  clientKey,
  userAgent,
} from "@/lib/auth/request-context";
import { SESSION_COOKIE, revokeSession, resolveSession } from "@/lib/auth/session-service";
import { sendEmail } from "@/lib/services/email-service";
import { audit } from "@/lib/services/audit-service";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

function toState(error: unknown): AuthFormState {
  if (error instanceof AppError) {
    return { error: toUserMessage(error), fieldErrors: error.details };
  }
  const code = (error as { code?: string }).code;
  if (code === "RATE_LIMITED") {
    return { error: "Too many attempts. Please wait a moment and try again." };
  }
  return { error: toUserMessage(error) };
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/account");
  try {
    enforceRateLimit("login", await clientKey());
    const { user, sessionToken } = await login({ email, password, userAgent: await userAgent() });
    await setSessionCookie(sessionToken);
    await audit({
      actorType: "user",
      actorId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
    });
  } catch (error) {
    return toState(error);
  }
  redirect(redirectTo.startsWith("/") ? redirectTo : "/account");
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  try {
    enforceRateLimit("register", await clientKey());
    const { sessionToken } = await register({
      email,
      password,
      displayName,
      userAgent: await userAgent(),
    });
    await setSessionCookie(sessionToken);
  } catch (error) {
    return toState(error);
  }
  redirect("/account");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const resolved = await resolveSession(token);
    if (resolved) {
      await revokeSession(resolved.session.id);
      await audit({
        actorType: "user",
        actorId: resolved.user.id,
        action: "auth.logout",
        targetType: "user",
        targetId: resolved.user.id,
      });
    }
  }
  await clearSessionCookie();
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  try {
    enforceRateLimit("passwordReset", await clientKey());
    const rawToken = await requestPasswordReset(email);
    // MockEmailProvider only. The reset token is NEVER returned to the UI;
    // in development it is written to the dev inbox record's server log only.
    if (rawToken) {
      await sendEmail({
        to: email,
        subject: "AURELIUS — password reset",
        body: [
          "A password reset was requested for your account.",
          "",
          "To complete the reset, use the token from the",
          "server-side inbox (data/local/emails.json). Tokens are never",
          "exposed through the web UI.",
          "",
          "No real email is sent by this environment.",
        ].join("\n"),
        template: "password_reset",
      });
      // Dev-only convenience: log server-side, never expose in a response body.
      console.log(`[dev-only] password reset token for ${email}: ${rawToken}`);
    }
    return {
      ok: true,
      error: undefined,
    };
  } catch (error) {
    return toState(error);
  }
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }
  try {
    await resetPassword(token, password);
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}

export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next !== confirm) {
    return { error: "New passwords do not match." };
  }
  try {
    const { getSession } = await import("@/lib/auth/request-context");
    const auth = await getSession();
    if (!auth) return { error: "Please sign in first." };
    await changePassword(auth.user.id, current, next);
    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    return toState(error);
  }
}


