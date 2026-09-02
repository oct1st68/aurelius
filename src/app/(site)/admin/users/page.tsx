import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { isAdmin } from "@/lib/auth/rbac";
import { listUsers } from "@/lib/services/admin-service";
import { AdminUserRow } from "@/components/admin/admin-user-row";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/admin/users");
  if (!isAdmin(auth.user)) redirect("/account");

  const users = await listUsers();

  return (
    <div className="museum-page pb-24 md:pb-12">
      <p className="eyebrow">Senatus · Populusque</p>
      <h1 className="font-display mt-2 text-4xl text-ivory">Users & Roles</h1>
      <div className="gold-rule mt-6" />

      <div className="mt-8 space-y-4">
        {users.map((user) => (
          <AdminUserRow
            key={user.id}
            user={{
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              roles: user.roles,
              status: user.status,
            }}
            isSelf={user.id === auth.user.id}
          />
        ))}
      </div>
    </div>
  );
}
