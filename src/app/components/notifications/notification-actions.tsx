"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  dismissNotificationAction,
  markAllVisibleNotificationsReadAction,
  markNotificationReadAction,
  type NotificationActionState,
} from "../../actions/notification-actions";

const idleState: NotificationActionState = { status: "idle", message: "" };

export function NotificationItemActions({ notificationId, unread }: { notificationId: string; unread: boolean }) {
  const markAction = markNotificationReadAction.bind(null, notificationId);
  const dismissAction = dismissNotificationAction.bind(null, notificationId);
  const [markState, submitMark] = useActionState(markAction, idleState);
  const [dismissState, submitDismiss] = useActionState(dismissAction, idleState);
  return (
    <div className="flex flex-wrap items-start gap-2">
      {unread && <ActionForm action={submitMark} label="Als gelesen markieren" />}
      <ActionForm action={submitDismiss} label="Ausblenden" secondary />
      <ActionMessage state={markState} />
      <ActionMessage state={dismissState} />
    </div>
  );
}

export function MarkAllNotificationsReadButton({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(markAllVisibleNotificationsReadAction, idleState);
  return (
    <div>
      <ActionForm action={action} label="Alle sichtbaren als gelesen markieren" secondary disabled={disabled} />
      <ActionMessage state={state} />
    </div>
  );
}

function ActionForm({
  action,
  label,
  secondary = false,
  disabled = false,
}: {
  action: (formData: FormData) => void;
  label: string;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return <form action={action}><SubmitButton label={label} secondary={secondary} disabled={disabled} /></form>;
}

function SubmitButton({ label, secondary, disabled }: { label: string; secondary: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${secondary ? "border border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-800" : "bg-blue-950 text-white hover:bg-blue-900"} inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? "Wird aktualisiert …" : label}
    </button>
  );
}

function ActionMessage({ state }: { state: NotificationActionState }) {
  if (state.status === "idle") return null;
  return <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`w-full text-sm font-semibold ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>;
}
