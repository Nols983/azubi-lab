import Link from "next/link";
import type { NotificationRecord } from "../../lib/server/notification-repository";

export function NotificationSummary({
  unreadCount,
  notifications,
  heading = "Benachrichtigungen",
}: {
  unreadCount: number;
  notifications: readonly NotificationRecord[];
  heading?: string;
}) {
  return (
    <section aria-labelledby="notification-summary-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-700">Persönlich und intern</p>
          <h2 id="notification-summary-heading" className="mt-1 text-xl font-bold text-slate-950">{heading}</h2>
        </div>
        {unreadCount > 0 && <span className="inline-flex min-h-7 items-center rounded-full bg-blue-950 px-3 text-xs font-bold text-white">{unreadCount} ungelesen</span>}
      </div>
      {notifications.length === 0 ? (
        <p className="mt-4 leading-7 text-slate-600">Aktuell gibt es keine Benachrichtigungen.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {notifications.map((notification) => (
            <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
              <p className="break-words text-sm font-bold text-slate-950">{notification.title}</p>
              <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-slate-600">{notification.message}</p>
            </li>
          ))}
        </ul>
      )}
      <Link href="/benachrichtigungen" className="mt-5 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Alle Benachrichtigungen öffnen <span aria-hidden="true" className="ml-2">→</span></Link>
    </section>
  );
}
