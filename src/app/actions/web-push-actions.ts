"use server";

import {
  AuthenticationRequiredError,
  PasswordChangeRequiredError,
} from "../lib/server/current-user.ts";
import { WebPushSubscriptionOwnershipError } from "../lib/server/web-push-repository.ts";
import {
  getCurrentUserWebPushStatus,
  sendCurrentUserWebPushTest,
  subscribeCurrentUserToWebPush,
  unsubscribeCurrentUserFromWebPush,
  WebPushAccountUnavailableError,
} from "../lib/server/web-push-service.ts";
import { WebPushValidationError } from "../lib/web-push-domain.ts";

export type WebPushActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type WebPushStatusActionResult =
  | { ok: true; subscribed: boolean }
  | { ok: false; message: string };

export async function getOwnWebPushStatusAction(endpoint: unknown): Promise<WebPushStatusActionResult> {
  try {
    return { ok: true, subscribed: await getCurrentUserWebPushStatus(endpoint) };
  } catch (error) {
    return actionFailure("read web push status", error);
  }
}

export async function subscribeOwnWebPushAction(subscription: unknown): Promise<WebPushActionResult> {
  try {
    await subscribeCurrentUserToWebPush(subscription);
    return { ok: true, message: "Benachrichtigungen sind auf diesem Gerät aktiviert." };
  } catch (error) {
    return actionFailure("subscribe web push", error);
  }
}

export async function unsubscribeOwnWebPushAction(endpoint: unknown): Promise<WebPushActionResult> {
  try {
    await unsubscribeCurrentUserFromWebPush(endpoint);
    return { ok: true, message: "Benachrichtigungen sind auf diesem Gerät deaktiviert." };
  } catch (error) {
    return actionFailure("unsubscribe web push", error);
  }
}

export async function sendOwnTestWebPushAction(): Promise<WebPushActionResult> {
  try {
    const result = await sendCurrentUserWebPushTest();
    if (result.delivered > 0) {
      const devices = result.delivered === 1 ? "ein aktiviertes Gerät" : `${result.delivered} aktivierte Geräte`;
      return { ok: true, message: `Testbenachrichtigung wurde an ${devices} gesendet.` };
    }
    if (result.staleRemoved > 0) {
      return { ok: false, message: "Das Geräte-Abo war nicht mehr gültig und wurde entfernt. Aktiviere Benachrichtigungen erneut." };
    }
    if (result.attempted === 0) {
      return { ok: false, message: "Für dein Konto ist kein aktives Geräte-Abo gespeichert." };
    }
    return { ok: false, message: "Die Testbenachrichtigung konnte gerade nicht zugestellt werden." };
  } catch (error) {
    return actionFailure("send test web push", error);
  }
}

function actionFailure(area: string, error: unknown): { ok: false; message: string } {
  if (error instanceof AuthenticationRequiredError
    || error instanceof PasswordChangeRequiredError
    || error instanceof WebPushAccountUnavailableError) {
    return { ok: false, message: "Diese Aktion erfordert ein aktuelles aktives Konto." };
  }
  if (error instanceof WebPushValidationError) {
    return { ok: false, message: "Die Geräteangaben sind ungültig. Lade die Seite neu und versuche es erneut." };
  }
  if (error instanceof WebPushSubscriptionOwnershipError) {
    return { ok: false, message: "Dieses Geräte-Abo kann für dein Konto nicht übernommen werden. Aktiviere es erneut." };
  }
  console.error(`[azubi-lab] ${area} failed`, error instanceof Error ? error.name : "UnknownError");
  return { ok: false, message: "Die Push-Einstellung konnte gerade nicht sicher aktualisiert werden." };
}
