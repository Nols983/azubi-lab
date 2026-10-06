import {
  parseWebPushEndpoint,
  parseWebPushSubscription,
  WEB_PUSH_TEST_PAYLOAD,
  type ValidatedWebPushSubscription,
  type WebPushPayload,
} from "./web-push-domain.ts";

type AuthenticatedPushUser = {
  id: string;
  disabledAt: Date | null;
};

type WebPushDeliveryResult = {
  attempted: number;
  delivered: number;
  failed: number;
  staleRemoved: number;
};

export type WebPushServiceDependencies = {
  requireUser: () => Promise<AuthenticatedPushUser>;
  upsertSubscription: (userId: string, subscription: ValidatedWebPushSubscription) => Promise<string>;
  hasSubscription: (userId: string, endpoint: string) => Promise<boolean>;
  deleteSubscription: (userId: string, endpoint: string) => Promise<boolean>;
  deliverTest: (userId: string, payload: WebPushPayload) => Promise<WebPushDeliveryResult>;
};

export class WebPushAccountUnavailableError extends Error {
  constructor() {
    super("An active authenticated account is required for Web Push.");
    this.name = "WebPushAccountUnavailableError";
  }
}

export function createWebPushSubscriptionService(dependencies: WebPushServiceDependencies) {
  async function activeUser() {
    const user = await dependencies.requireUser();
    if (user.disabledAt) throw new WebPushAccountUnavailableError();
    return user;
  }

  return {
    async subscribe(input: unknown) {
      const user = await activeUser();
      const subscription = parseWebPushSubscription(input);
      await dependencies.upsertSubscription(user.id, subscription);
    },

    async status(endpointInput: unknown) {
      const user = await activeUser();
      const endpoint = parseWebPushEndpoint(endpointInput);
      return dependencies.hasSubscription(user.id, endpoint);
    },

    async unsubscribe(endpointInput: unknown) {
      const user = await activeUser();
      const endpoint = parseWebPushEndpoint(endpointInput);
      return dependencies.deleteSubscription(user.id, endpoint);
    },

    async sendTest() {
      const user = await activeUser();
      return dependencies.deliverTest(user.id, WEB_PUSH_TEST_PAYLOAD);
    },
  };
}
