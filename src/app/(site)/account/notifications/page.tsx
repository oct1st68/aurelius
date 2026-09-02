import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/request-context";
import { listNotifications } from "@/lib/services/notification-service";
import { markAllReadAction } from "@/app/(site)/actions/notification-actions";
import { formatTimestamp } from "@/lib/services/admin-service";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const auth = await getSession();
  if (!auth) redirect("/login?redirectTo=/account/notifications");
  const notifications = await listNotifications(auth.user.id);

  return (
    <div className="museum-page pb-24 md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Acta Diurna</p>
          <h1 className="font-display mt-2 text-4xl text-ivory">Notifications</h1>
        </div>
        <form action={markAllReadAction}>
          <button type="submit" className="btn-imperial !min-h-10 px-5 text-[11px]">
            Mark all as read
          </button>
        </form>
      </div>
      <div className="gold-rule mt-6" />

      <ul className="mt-8 space-y-3">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`panel p-5 ${n.readAt ? "opacity-60" : "border-gold/40"}`}
          >
            <div className="flex items-center justify-between gap-4">
              <p className={`text-sm ${n.readAt ? "text-travertine/70" : "font-medium text-gold"}`}>
                {!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-burgundy" aria-hidden />}
                {n.title}
              </p>
              <time className="shrink-0 text-xs text-bronze" dateTime={n.createdAt}>
                {formatTimestamp(n.createdAt)}
              </time>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-travertine/65">{n.body}</p>
            {n.link && (
              <Link href={n.link} className="mt-2 inline-block text-xs text-gold underline underline-offset-4">
                View →
              </Link>
            )}
          </li>
        ))}
        {notifications.length === 0 && (
          <li className="panel p-12 text-center text-sm text-travertine/60">
            The empire has no news for you.
          </li>
        )}
      </ul>
    </div>
  );
}
