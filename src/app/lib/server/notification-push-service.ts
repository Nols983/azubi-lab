import "server-only";

import { filterVisiblePersistedNotifications, type InsertedNotificationRecord } from "./notification-repository.ts";
import { createNotificationPushDispatchService } from "../notification-push-service-core.ts";
import { createWebPushDeliveryService } from "./web-push-delivery-service.ts";

const webPushDelivery = createWebPushDeliveryService();
const notificationPushDispatch = createNotificationPushDispatchService({
  deliverToUser: webPushDelivery.sendToUser,
  logError: (message, errorName) => console.error(message, errorName),
});

export async function dispatchPersistedNotificationPushBestEffort(notifications: readonly InsertedNotificationRecord[]) {
  try {
    return await notificationPushDispatch.dispatchBestEffort(await filterVisiblePersistedNotifications(notifications));
  } catch (error) {
    console.error("[azubi-lab] notification push scope check failed", error instanceof Error ? error.name : "UnknownError");
    return notificationPushDispatch.dispatchBestEffort([]);
  }
}
