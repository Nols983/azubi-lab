import "server-only";

import {
  parseVapidPrivateKey,
  parseVapidPublicKey,
  parseVapidSubject,
  WebPushValidationError,
} from "../web-push-domain.ts";

export type WebPushConfiguration = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export class WebPushConfigurationError extends Error {
  constructor() {
    super("Web Push configuration is unavailable.");
    this.name = "WebPushConfigurationError";
  }
}

export function getWebPushConfiguration(
  environment: Record<string, string | undefined> = process.env,
): WebPushConfiguration {
  try {
    return {
      publicKey: parseVapidPublicKey(environment.WEB_PUSH_VAPID_PUBLIC_KEY),
      privateKey: parseVapidPrivateKey(environment.WEB_PUSH_VAPID_PRIVATE_KEY),
      subject: parseVapidSubject(environment.WEB_PUSH_VAPID_SUBJECT),
    };
  } catch (error) {
    if (error instanceof WebPushValidationError) throw new WebPushConfigurationError();
    throw error;
  }
}
