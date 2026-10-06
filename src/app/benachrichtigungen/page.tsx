import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarkAllNotificationsReadButton, NotificationItemActions } from "../components/notifications/notification-actions";
import { PushNotificationSettings } from "../components/notifications/push-notification-settings";
import { getCurrentDatabaseUser, getSessionUserIdentity } from "../lib/server/current-user";
import { getNotificationCenter } from "../lib/server/notification-service";

export const metadata: Metadata = { title: "Benachrichtigungen" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSessionUserIdentity();
  if (!session) redirect("/login?callbackUrl=%2Fbenachrichtigungen");
  const user = await getCurrentDatabaseUser();
  if (!user) redirect("/login?callbackUrl=%2Fbenachrichtigungen");
  if (user.mustChangePassword) redirect("/konto/passwort-aendern?callbackUrl=%2Fbenachrichtigungen");
  const center = await getNotificationCenter();
  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Persönlicher Posteingang</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Benachrichtigungen</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">Fälligkeiten, Challenge-Reviews und interne Aktivitätshinweise für dein Konto. Das Öffnen dieser Seite markiert nichts automatisch als gelesen.</p>
        </div>
        <MarkAllNotificationsReadButton disabled={center.unreadCount === 0} />
      </header>

      <PushNotificationSettings />

      <section aria-labelledby="notification-list-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="notification-list-heading" className="text-2xl font-bold text-slate-950">Neu und zuletzt gelesen</h2>
          <p aria-live="polite" className="text-sm font-semibold text-slate-600">{center.unreadCount} ungelesen · {center.notifications.length} sichtbar</p>
        </div>
        {center.notifications.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-xl font-bold text-slate-950">Alles ruhig</h3>
            <p className="mt-2 leading-7 text-slate-600">Für dein Konto sind aktuell keine sichtbaren Benachrichtigungen vorhanden.</p>
          </div>
        ) : (
          <ol className="mt-5 space-y-4">
            {center.notifications.map((notification) => (
              <li key={notification.id}>
                <article className={`min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6 ${notification.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/60"}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notification.readAt && <span className="inline-flex min-h-7 items-center rounded-full bg-blue-950 px-3 text-xs font-bold text-white">Ungelesen</span>}
                        <time dateTime={notification.createdAt.toISOString()} className="text-sm font-medium text-slate-500">{formatNotificationDate(notification.createdAt)}</time>
                      </div>
                      <h3 className="mt-3 break-words text-xl font-bold text-slate-950">{notification.title}</h3>
                      <p className="mt-2 max-w-3xl break-words leading-7 text-slate-700">{notification.message}</p>
                      {notification.href && <Link href={notification.href} className="mt-4 inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Ziel öffnen <span aria-hidden="true" className="ml-2">→</span></Link>}
                    </div>
                    <NotificationItemActions notificationId={notification.id} unread={!notification.readAt} />
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function formatNotificationDate(value: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
