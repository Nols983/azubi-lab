import "server-only";

import { createNotificationPushDispatchService } from "../notification-push-service-core.ts";
import { createWebPushDeliveryService } from "./web-push-delivery-service.ts";

const webPushDelivery = createWebPushDeliveryService();
const notificationPushDispatch = createNotificationPushDispatchService({
  deliverToUser: webPushDelivery.sendToUser,
  logError: (message, errorName) => console.error(message, errorName),
});

export const dispatchPersistedNotificationPushBestEffort = notificationPushDispatch.dispatchBestEffort;
