import type { NotificationType } from "./notification-domain.ts";
import { isSafeInternalNotificationHref } from "./notification-domain.ts";
import type { WebPushPayload } from "./web-push-domain.ts";

export type PushEligibleNotification = {
  id: string;
  type: NotificationType;
  href: string | null;
};

const pushCopy: Partial<Record<NotificationType, { title: string; body: string }>> = {
  "curriculum-assigned": {
    title: "Neuer Lernplan",
    body: "Dir wurde ein neuer Lernplan zugewiesen.",
  },
  "challenge-assigned": {
    title: "Neue Challenge",
    body: "Dir wurde eine neue Challenge zugewiesen.",
  },
  "challenge-revision": {
    title: "Überarbeitung erforderlich",
    body: "Für eine Challenge wurde eine Überarbeitung angefordert.",
  },
  "challenge-approved": {
    title: "Challenge bewertet",
    body: "Eine deiner Challenge-Abgaben wurde bewertet.",
  },
  "curriculum-due": {
    title: "Aufgabe bald fällig",
    body: "Ein Lernplan-Ziel wird bald fällig.",
  },
  "curriculum-overdue": {
    title: "Aufgabe überfällig",
    body: "Ein Lernplan-Ziel ist überfällig.",
  },
  "challenge-due": {
    title: "Aufgabe bald fällig",
    body: "Eine Challenge wird bald fällig.",
  },
  "challenge-overdue": {
    title: "Aufgabe überfällig",
    body: "Eine Challenge ist überfällig.",
  },
};

export function buildNotificationWebPushPayload(
  notification: PushEligibleNotification,
): WebPushPayload | null {
  const copy = pushCopy[notification.type];
  if (!copy || notification.href === null || !isSafeInternalNotificationHref(notification.href)) return null;
  return {
    title: copy.title,
    body: copy.body,
    target: notification.href,
    notificationId: notification.id,
  };
}
