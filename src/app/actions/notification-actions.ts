"use server";

import { revalidatePath } from "next/cache";
import {
  AdminAuthorizationError,
  AuthenticationRequiredError,
  LearnerAuthorizationError,
  PasswordChangeRequiredError,
} from "../lib/server/current-user.ts";
import {
  dismissOwnNotification,
  markOwnNotificationRead,
  markOwnVisibleNotificationsRead,
} from "../lib/server/notification-service.ts";

export type NotificationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function markNotificationReadAction(
  notificationId: string,
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  if (!hasNoPublicFields(formData)) return invalidRequest();
  try {
    const updated = await markOwnNotificationRead(notificationId);
    revalidateNotificationViews();
    return updated
      ? { status: "success", message: "Benachrichtigung als gelesen markiert." }
      : { status: "error", message: "Benachrichtigung nicht gefunden." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function markAllVisibleNotificationsReadAction(
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  if (!hasNoPublicFields(formData)) return invalidRequest();
  try {
    const updated = await markOwnVisibleNotificationsRead();
    revalidateNotificationViews();
    return {
      status: "success",
      message: updated > 0 ? "Alle sichtbaren Benachrichtigungen wurden als gelesen markiert." : "Es gab keine sichtbaren Benachrichtigungen zu aktualisieren.",
    };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function dismissNotificationAction(
  notificationId: string,
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  if (!hasNoPublicFields(formData)) return invalidRequest();
  try {
    const dismissed = await dismissOwnNotification(notificationId);
    revalidateNotificationViews();
    return dismissed
      ? { status: "success", message: "Benachrichtigung ausgeblendet." }
      : { status: "error", message: "Benachrichtigung nicht gefunden." };
  } catch (error) {
    return actionFailure(error);
  }
}

function revalidateNotificationViews() {
  revalidatePath("/benachrichtigungen");
  revalidatePath("/");
  revalidatePath("/admin");
}

function hasNoPublicFields(formData: FormData) {
  return [...formData.keys()].every((key) => key.startsWith("$ACTION_"));
}

function invalidRequest(): NotificationActionState {
  return { status: "error", message: "Die Anfrage enthält unerwartete Felder." };
}

function actionFailure(error: unknown): NotificationActionState {
  if (
    error instanceof AuthenticationRequiredError
    || error instanceof PasswordChangeRequiredError
    || error instanceof AdminAuthorizationError
    || error instanceof LearnerAuthorizationError
  ) {
    return { status: "error", message: "Diese Aktion erfordert ein aktuelles angemeldetes Konto." };
  }
  console.error("[azubi-lab] notification action failed", error instanceof Error ? error.name : "UnknownError");
  return { status: "error", message: "Die Benachrichtigung konnte nicht aktualisiert werden." };
}
