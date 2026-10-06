import { buildNotificationWebPushPayload } from "./notification-push-domain.ts";
import type { NotificationType } from "./notification-domain.ts";
import type { WebPushPayload } from "./web-push-domain.ts";

type WebPushDeliveryResult = {
  attempted: number;
  delivered: number;
  failed: number;
  staleRemoved: number;
};

export type PersistedNotificationForPush = {
  id: string;
  userId: string;
  type: NotificationType;
  href: string | null;
};

type NotificationPushDependencies = {
  deliverToUser: (
    userId: string,
    payload: WebPushPayload,
  ) => Promise<WebPushDeliveryResult>;
  logError?: (message: string, errorName: string) => void;
};

export type NotificationPushDispatchResult = WebPushDeliveryResult & {
  eligibleNotifications: number;
  dispatchFailures: number;
};

export function createNotificationPushDispatchService(dependencies: NotificationPushDependencies) {
  return {
    async dispatchBestEffort(
      notifications: readonly PersistedNotificationForPush[],
    ): Promise<NotificationPushDispatchResult> {
      const jobs = notifications.flatMap((notification) => {
        const payload = buildNotificationWebPushPayload(notification);
        return payload ? [{ notification, payload }] : [];
      });
      const results = await Promise.all(jobs.map(async ({ notification, payload }) => {
        try {
          return await dependencies.deliverToUser(notification.userId, payload);
        } catch (error) {
          dependencies.logError?.(
            "[azubi-lab] notification web push dispatch failed",
            error instanceof Error ? error.name : "UnknownError",
          );
          return null;
        }
      }));
      return results.reduce<NotificationPushDispatchResult>((summary, result) => {
        if (!result) {
          summary.dispatchFailures += 1;
          return summary;
        }
        summary.attempted += result.attempted;
        summary.delivered += result.delivered;
        summary.failed += result.failed;
        summary.staleRemoved += result.staleRemoved;
        return summary;
      }, {
        eligibleNotifications: jobs.length,
        attempted: 0,
        delivered: 0,
        failed: 0,
        staleRemoved: 0,
        dispatchFailures: 0,
      });
    },
  };
}
