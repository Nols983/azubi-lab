"use client";

import { useActionState } from "react";
import {
  removeAccountProfileImageAction,
  type AdminAvatarActionState,
} from "../../actions/admin-actions";
import { ProfileAvatar } from "../profile/profile-avatar";

const initialState: AdminAvatarActionState = { status: "idle", message: "" };

export function AdminAvatarModeration({
  userId,
  displayName,
  initials,
  avatarSrc,
  isCurrentUser,
}: {
  userId: string;
  displayName: string;
  initials: string;
  avatarSrc?: string;
  isCurrentUser: boolean;
}) {
  const [state, action, pending] = useActionState(
    removeAccountProfileImageAction.bind(null, userId),
    initialState,
  );
  const visibleSrc = state.avatarRemoved ? undefined : avatarSrc;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <ProfileAvatar
        displayName={displayName}
        initials={initials}
        src={visibleSrc}
        size="medium"
      />
      {visibleSrc ? (
        <details className="text-center">
          <summary className="min-h-11 cursor-pointer rounded-lg px-2 py-3 text-xs font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Profilbild ansehen
          </summary>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ProfileAvatar
              displayName={displayName}
              initials={initials}
              src={visibleSrc}
              size="xlarge"
            />
            {!isCurrentUser ? (
              <form
                action={action}
                className="mt-4"
                onSubmit={(event) => {
                  if (!window.confirm(`Profilbild von ${displayName} wirklich entfernen?`)) {
                    event.preventDefault();
                  }
                }}
              >
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60"
                >
                  {pending ? "Profilbild wird entfernt …" : "Profilbild entfernen"}
                </button>
              </form>
            ) : (
              <p className="mt-4 max-w-48 text-xs leading-5 text-slate-600">
                Das eigene Profilbild verwaltest du im persönlichen Profil.
              </p>
            )}
          </div>
        </details>
      ) : (
        <p className="max-w-28 text-center text-xs leading-5 text-slate-500">Kein Profilbild</p>
      )}
      {state.status !== "idle" && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`max-w-64 rounded-xl border p-3 text-left text-xs font-semibold ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
