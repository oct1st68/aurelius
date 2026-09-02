"use client";

import { useActionState, useState } from "react";
import {
  adminSetUserStatusAction,
  adminSetUserRolesAction,
  adminVerifySellerAction,
  type AdminFormState,
} from "@/app/(site)/actions/admin-actions";
import { ConfirmSubmit } from "./confirm-submit";
import type { Role } from "@/domain/enums";

interface Props {
  user: {
    id: string;
    email: string;
    displayName: string;
    roles: Role[];
    status: "ACTIVE" | "BANNED";
  };
  isSelf: boolean;
}

const ALL_ROLES: Role[] = ["USER", "BUYER", "SELLER", "AUTHENTICATOR", "ADMIN"];

export function AdminUserRow({ user, isSelf }: Props) {
  const [open, setOpen] = useState(false);
  const [statusState, statusAction] = useActionState<AdminFormState, FormData>(adminSetUserStatusAction, {});
  const [rolesState, rolesAction] = useActionState<AdminFormState, FormData>(adminSetUserRolesAction, {});
  const [verifyState, verifyAction] = useActionState<AdminFormState, FormData>(adminVerifySellerAction, {});

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-ivory">
            {user.displayName}{" "}
            {isSelf && <span className="badge ml-2">you</span>}
            {user.status === "BANNED" && <span className="badge badge-bad ml-2">banned</span>}
          </p>
          <p className="text-xs text-bronze">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user.roles.map((role) => (
            <span key={role} className="badge">
              {role.toLowerCase()}
            </span>
          ))}
          {!isSelf && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="btn-imperial !min-h-9 px-4 text-[10px]"
              aria-expanded={open}
            >
              {open ? "Close" : "Manage"}
            </button>
          )}
        </div>
      </div>

      {open && !isSelf && (
        <div className="mt-5 space-y-5 border-t hairline pt-5">
          {/* Ban / unban — explicit confirm dialog */}
          <ConfirmSubmit
            action={statusAction}
            hidden={{ userId: user.id, status: user.status === "ACTIVE" ? "BANNED" : "ACTIVE" }}
            label={user.status === "ACTIVE" ? "Ban user" : "Unban user"}
            className={`btn-imperial ${user.status === "ACTIVE" ? "btn-burgundy" : "btn-solid"} !min-h-9 px-4 text-[10px]`}
            danger={user.status === "ACTIVE"}
            confirmTitle={user.status === "ACTIVE" ? "Ban this account?" : "Restore this account?"}
            confirmBody={
              user.status === "ACTIVE"
                ? "All sessions will be revoked immediately and the user will be unable to sign in. This action is audit-logged."
                : "The user will be able to sign in again. This action is audit-logged."
            }
            confirmLabel={user.status === "ACTIVE" ? "Ban account" : "Restore account"}
          >
            <input type="hidden" name="reason" value={`${user.status === "ACTIVE" ? "Ban" : "Unban"} by admin console`} />
          </ConfirmSubmit>
          {statusState.error && <p role="alert" className="text-xs text-red-400">{statusState.error}</p>}
          {statusState.ok && <p className="text-xs text-emerald-400">{statusState.message}</p>}

          {/* Roles */}
          <form action={rolesAction} className="space-y-3">
            <input type="hidden" name="userId" value={user.id} />
            <span className="label-imperial">Roles</span>
            <div className="flex flex-wrap gap-4">
              {ALL_ROLES.map((role) => (
                <label key={role} className="flex cursor-pointer items-center gap-2 text-sm text-travertine/85">
                  <input
                    type="checkbox"
                    name="roles"
                    value={role}
                    defaultChecked={user.roles.includes(role)}
                    className="h-4 w-4 accent-[#b89b5e]"
                  />
                  {role}
                </label>
              ))}
            </div>
            <ConfirmSubmit
              action={rolesAction}
              label="Save roles"
              confirmTitle="Change user roles?"
              confirmBody="Role changes take effect immediately and are audit-logged. Granting ADMIN gives full platform control."
              confirmLabel="Save roles"
            >
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="reason" value="Roles changed by admin console" />
            </ConfirmSubmit>
            {rolesState.error && <p role="alert" className="text-xs text-red-400">{rolesState.error}</p>}
            {rolesState.ok && <p className="text-xs text-emerald-400">{rolesState.message}</p>}
          </form>

          {/* Seller verification */}
          {user.roles.includes("SELLER") && (
            <div className="flex items-center gap-3">
              <ConfirmSubmit
                action={verifyAction}
                hidden={{ sellerId: user.id, status: "VERIFIED" }}
                label="Verify seller"
                confirmTitle="Mark seller verified?"
                confirmBody="The seller will be notified. This action is audit-logged."
                confirmLabel="Verify"
              >
                <input type="hidden" name="reason" value="Verified by admin console" />
              </ConfirmSubmit>
              <ConfirmSubmit
                action={verifyAction}
                hidden={{ sellerId: user.id, status: "REJECTED" }}
                label="Reject seller"
                className="btn-imperial btn-burgundy !min-h-9 px-4 text-[10px]"
                danger
                confirmTitle="Reject seller verification?"
                confirmBody="The seller will be notified of the rejection. This action is audit-logged."
                confirmLabel="Reject"
              >
                <input type="hidden" name="reason" value="Rejected by admin console" />
              </ConfirmSubmit>
              {verifyState.error && <span role="alert" className="text-xs text-red-400">{verifyState.error}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
