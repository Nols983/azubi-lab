import "server-only";

import webPush from "web-push";
import {
  parseWebPushEndpoint,
  validateWebPushPayload,
  type WebPushPayload,
} from "../web-push-domain.ts";
import { getWebPushConfiguration } from "./web-push-config.ts";
import {
  deleteWebPushSubscriptionByIdForUser,
  listWebPushSubscriptionsForUser,
  type WebPushSubscriptionRecord,
} from "./web-push-repository.ts";

type WebPushSender = (
  subscription: WebPushSubscriptionRecord,
  payload: string,
) => Promise<unknown>;

type WebPushDeliveryDependencies = {
  listSubscriptions: typeof listWebPushSubscriptionsForUser;
  removeSubscription: typeof deleteWebPushSubscriptionByIdForUser;
  send: WebPushSender;
};

export type WebPushDeliveryResult = {
  attempted: number;
  delivered: number;
  failed: number;
  staleRemoved: number;
};

const defaultDependencies: WebPushDeliveryDependencies = {
  listSubscriptions: listWebPushSubscriptionsForUser,
  removeSubscription: deleteWebPushSubscriptionByIdForUser,
  send: sendStandardsBasedWebPush,
};

export function createWebPushDeliveryService(
  dependencies: WebPushDeliveryDependencies = defaultDependencies,
) {
  return {
    async sendToUser(userId: string, rawPayload: WebPushPayload, endpoint?: string): Promise<WebPushDeliveryResult> {
      const payload = validateWebPushPayload(rawPayload);
      const selectedEndpoint = endpoint === undefined ? undefined : parseWebPushEndpoint(endpoint);
      const ownedSubscriptions = await dependencies.listSubscriptions(userId);
      const subscriptions = selectedEndpoint === undefined
        ? ownedSubscriptions
        : ownedSubscriptions.filter((subscription) => subscription.endpoint === selectedEndpoint);
      const results = await Promise.all(subscriptions.map(async (subscription) => {
        try {
          await dependencies.send(subscription, JSON.stringify(payload));
          return "delivered" as const;
        } catch (error) {
          if (isPermanentWebPushFailure(error)) {
            try {
              await dependencies.removeSubscription(userId, subscription.id);
              return "stale" as const;
            } catch (cleanupError) {
              console.error(
                "[azubi-lab] stale web push cleanup failed",
                cleanupError instanceof Error ? cleanupError.name : "UnknownError",
              );
              return "failed" as const;
            }
          }
          console.error(
            "[azubi-lab] web push delivery failed",
            error instanceof Error ? error.name : "UnknownError",
          );
          return "failed" as const;
        }
      }));
      return {
        attempted: subscriptions.length,
        delivered: results.filter((result) => result === "delivered").length,
        failed: results.filter((result) => result === "failed").length,
        staleRemoved: results.filter((result) => result === "stale").length,
      };
    },
  };
}

async function sendStandardsBasedWebPush(subscription: WebPushSubscriptionRecord, payload: string) {
  const configuration = getWebPushConfiguration();
  return webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    payload,
    {
      TTL: 60,
      urgency: "normal",
      vapidDetails: {
        subject: configuration.subject,
        publicKey: configuration.publicKey,
        privateKey: configuration.privateKey,
      },
    },
  );
}

function isPermanentWebPushFailure(error: unknown) {
  return isRecord(error) && (error.statusCode === 404 || error.statusCode === 410);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
