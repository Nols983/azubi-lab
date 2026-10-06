"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOwnWebPushStatusAction,
  sendOwnTestWebPushAction,
  subscribeOwnWebPushAction,
  unsubscribeOwnWebPushAction,
} from "../../actions/web-push-actions";

type DevicePushState =
  | "checking"
  | "unsupported"
  | "not-requested"
  | "denied"
  | "enabled"
  | "stale"
  | "error";

const stateCopy: Record<DevicePushState, { label: string; description: string }> = {
  checking: {
    label: "Wird geprüft",
    description: "Der Status dieses Browsers wird ermittelt.",
  },
  unsupported: {
    label: "Nicht unterstützt",
    description: "Dieser Browser stellt die benötigten Push- und Service-Worker-Funktionen nicht bereit.",
  },
  "not-requested": {
    label: "Noch nicht angefragt",
    description: "Azubi Lab fragt erst nach deiner ausdrücklichen Auswahl nach der Browser-Berechtigung.",
  },
  denied: {
    label: "Im Browser blockiert",
    description: "Die Berechtigung ist abgelehnt. Ändere sie bei Bedarf in den Website-Einstellungen des Browsers.",
  },
  enabled: {
    label: "Auf diesem Gerät aktiviert",
    description: "Dieses Browser-Abo ist deinem aktuellen Azubi-Lab-Konto zugeordnet.",
  },
  stale: {
    label: "Abo fehlt oder ist veraltet",
    description: "Die Browser-Berechtigung ist vorhanden, aber dieses Gerät hat kein passendes gespeichertes Abo.",
  },
  error: {
    label: "Status nicht verfügbar",
    description: "Der Geräte-Status konnte gerade nicht sicher geprüft werden.",
  },
};

export function PushNotificationSettings() {
  const [deviceState, setDeviceState] = useState<DevicePushState>("checking");
  const [pendingAction, setPendingAction] = useState<"enable" | "disable" | "test" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const inspectDevice = useCallback(async () => {
    if (!supportsWebPush()) {
      setDeviceState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setDeviceState("denied");
      return;
    }
    try {
      const registration = await ensureServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (Notification.permission === "default") {
        setDeviceState("not-requested");
        return;
      }
      if (!subscription) {
        setDeviceState("stale");
        return;
      }
      const result = await getOwnWebPushStatusAction(subscription.endpoint);
      setDeviceState(result.ok ? (result.subscribed ? "enabled" : "stale") : "error");
    } catch {
      setDeviceState("error");
    }
  }, []);

  useEffect(() => {
    const inspection = window.setTimeout(() => void inspectDevice(), 0);
    return () => window.clearTimeout(inspection);
  }, [inspectDevice]);

  async function enableNotifications() {
    if (!supportsWebPush()) return;
    setPendingAction("enable");
    setMessage(null);
    try {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") {
        setDeviceState(permission === "denied" ? "denied" : "not-requested");
        setMessage({ kind: "error", text: "Ohne Browser-Berechtigung können keine Push-Benachrichtigungen aktiviert werden." });
        return;
      }
      const registration = await ensureServiceWorker();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const status = await getOwnWebPushStatusAction(subscription.endpoint);
        if (!status.ok) throw new Error("status_unavailable");
        if (!status.subscribed) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      if (!subscription) {
        const publicKey = await fetchVapidPublicKey();
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64Url(publicKey),
        });
      }
      const keys = subscription.toJSON().keys;
      const result = await subscribeOwnWebPushAction({
        endpoint: subscription.endpoint,
        keys: { p256dh: keys?.p256dh, auth: keys?.auth },
      });
      if (!result.ok) {
        await subscription.unsubscribe().catch(() => false);
        throw new Error(result.message);
      }
      setDeviceState("enabled");
      setMessage({ kind: "success", text: result.message });
    } catch {
      setDeviceState("error");
      setMessage({ kind: "error", text: "Benachrichtigungen konnten auf diesem Gerät nicht aktiviert werden." });
    } finally {
      setPendingAction(null);
    }
  }

  async function disableNotifications() {
    if (!supportsWebPush()) return;
    setPendingAction("disable");
    setMessage(null);
    try {
      const registration = await ensureServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const result = await unsubscribeOwnWebPushAction(subscription.endpoint);
        if (!result.ok) throw new Error(result.message);
        await subscription.unsubscribe();
        setMessage({ kind: "success", text: result.message });
      } else {
        setMessage({ kind: "success", text: "Auf diesem Gerät ist kein aktives Browser-Abo vorhanden." });
      }
      setDeviceState(Notification.permission === "denied" ? "denied" : "not-requested");
    } catch {
      setDeviceState("error");
      setMessage({ kind: "error", text: "Benachrichtigungen konnten auf diesem Gerät nicht sicher deaktiviert werden." });
    } finally {
      setPendingAction(null);
    }
  }

  async function sendTestNotification() {
    if (!supportsWebPush()) return;
    setPendingAction("test");
    setMessage(null);
    try {
      const registration = await ensureServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setDeviceState("stale");
        setMessage({ kind: "error", text: "Für dieses Gerät fehlt ein aktives Browser-Abo." });
        return;
      }
      const result = await sendOwnTestWebPushAction();
      setMessage({ kind: result.ok ? "success" : "error", text: result.message });
      if (!result.ok) await inspectDevice();
    } catch {
      setMessage({ kind: "error", text: "Die Testbenachrichtigung konnte gerade nicht gesendet werden." });
    } finally {
      setPendingAction(null);
    }
  }

  const copy = stateCopy[deviceState];
  const busy = pendingAction !== null;
  return (
    <section aria-labelledby="push-settings-heading" className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">Dieses Gerät</p>
          <h2 id="push-settings-heading" className="mt-2 text-2xl font-bold text-slate-950">Push-Benachrichtigungen</h2>
          <p className="mt-3 leading-7 text-slate-700">Du entscheidest pro Browser und Gerät. Die Berechtigungsfrage erscheint nur, wenn du die Aktivierung selbst startest.</p>
          <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
            <p className="font-bold text-slate-950">Status: {copy.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{copy.description}</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-72">
          {(deviceState === "not-requested" || deviceState === "stale" || deviceState === "error") && (
            <PushButton onClick={() => void enableNotifications()} disabled={busy}>
              {pendingAction === "enable" ? "Wird aktiviert …" : "Benachrichtigungen aktivieren"}
            </PushButton>
          )}
          {deviceState === "enabled" && (
            <>
              <PushButton onClick={() => void sendTestNotification()} disabled={busy}>
                {pendingAction === "test" ? "Wird gesendet …" : "Testbenachrichtigung senden"}
              </PushButton>
              <PushButton onClick={() => void disableNotifications()} disabled={busy} secondary>
                {pendingAction === "disable" ? "Wird deaktiviert …" : "Benachrichtigungen auf diesem Gerät deaktivieren"}
              </PushButton>
            </>
          )}
          {deviceState === "denied" && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-slate-700">Azubi Lab kann eine blockierte Browser-Berechtigung nicht selbst zurücksetzen.</p>
          )}
        </div>
      </div>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} aria-live="polite" className={`mt-4 text-sm font-semibold ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

function PushButton({ children, disabled, onClick, secondary = false }: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${secondary ? "border border-blue-300 bg-white text-blue-950 hover:border-blue-500" : "bg-blue-950 text-white hover:bg-blue-900"} inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function supportsWebPush() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

async function ensureServiceWorker() {
  const current = await navigator.serviceWorker.getRegistration("/");
  return current ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function fetchVapidPublicKey() {
  const response = await fetch("/api/web-push/public-key", {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("push_configuration_unavailable");
  const body = await response.json() as { publicKey?: unknown };
  if (typeof body.publicKey !== "string") throw new Error("push_configuration_invalid");
  return body.publicKey;
}

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
