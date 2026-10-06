import "server-only";

import {
  createWebPushSubscriptionService,
  WebPushAccountUnavailableError,
} from "../web-push-service-core.ts";
import { requireAuthenticatedUser } from "./current-user.ts";
import { createWebPushDeliveryService } from "./web-push-delivery-service.ts";
import {
  deleteWebPushSubscriptionForUser,
  hasWebPushSubscriptionForUser,
  upsertWebPushSubscriptionForUser,
} from "./web-push-repository.ts";

const deliveryService = createWebPushDeliveryService();
const webPushSubscriptionService = createWebPushSubscriptionService({
  requireUser: requireAuthenticatedUser,
  upsertSubscription: upsertWebPushSubscriptionForUser,
  hasSubscription: hasWebPushSubscriptionForUser,
  deleteSubscription: deleteWebPushSubscriptionForUser,
  deliverTest: deliveryService.sendToUser,
});

export { WebPushAccountUnavailableError };

export const subscribeCurrentUserToWebPush = webPushSubscriptionService.subscribe;
export const getCurrentUserWebPushStatus = webPushSubscriptionService.status;
export const unsubscribeCurrentUserFromWebPush = webPushSubscriptionService.unsubscribe;
export const sendCurrentUserWebPushTest = webPushSubscriptionService.sendTest;
