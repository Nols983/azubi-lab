"use client";

import { useActionState, useState } from "react";
import {
  deleteProfileImageAction,
  selectActiveTitleAction,
  updatePinnedBadgesAction,
  uploadProfileImageAction,
  type ProfileActionState,
} from "../../actions/profile-actions.ts";
import {
  BADGE_CATEGORY_LABELS,
  BADGE_TIER_LABELS,
  filterBadgesByCategory,
  getBadgeCollectionGroups,
  getRepresentedBadgeCategories,
  MAX_PINNED_BADGES,
  type BadgeCategory,
  type LearnerRewardState,
  type ProfileBadgeState,
  type ProfileTitleState,
  type RewardCollectionItem,
} from "../../lib/progression-rewards.ts";
import { formatRewardUnlockDate } from "../../lib/reward-history.ts";
import { BadgeCard } from "./badge-card.tsx";

const initialState: ProfileActionState = { status: "idle", message: "" };

export function ProfileImageControls({ hasImage }: { hasImage: boolean }) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadProfileImageAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProfileImageAction, initialState);
  const [lastAction, setLastAction] = useState<"upload" | "delete">();
  return (
    <section aria-labelledby="profile-image-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-sm font-semibold text-blue-700">Persönliche Darstellung</p>
      <h2 id="profile-image-heading" className="mt-1 text-2xl font-bold text-slate-950">Profilbild</h2>
      <p id="profile-image-guidance" className="mt-3 text-sm leading-6 text-slate-600">JPEG, PNG oder WebP, maximal 5 MiB und mindestens 256 × 256 Pixel. Empfohlen sind 512 × 512 Pixel oder größer; ein quadratisches Motiv eignet sich am besten. Das Bild wird sicher zugeschnitten und als WebP gespeichert.</p>
      <form action={uploadAction} onSubmit={() => setLastAction("upload")} className="mt-5 space-y-4">
        <label className="block text-sm font-bold text-slate-800" htmlFor="profile-image">Bild auswählen</label>
        <input id="profile-image" name="profileImage" type="file" required accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-describedby="profile-image-guidance" className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-bold file:text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
        <button type="submit" disabled={uploadPending} className={primaryButton}>{uploadPending ? "Bild wird verarbeitet …" : hasImage ? "Profilbild ersetzen" : "Profilbild hochladen"}</button>
        <ActionMessage state={lastAction === "upload" ? uploadState : initialState} />
      </form>
      <form action={deleteAction} onSubmit={() => setLastAction("delete")} className="mt-4 border-t border-slate-100 pt-4">{hasImage && <button type="submit" disabled={deletePending} className={secondaryButton}>{deletePending ? "Bild wird entfernt …" : "Profilbild entfernen"}</button>}<ActionMessage state={lastAction === "delete" ? deleteState : initialState} /></form>
    </section>
  );
}
export function StaffTitleControls({ titleState }: { titleState: ProfileTitleState }) {
  const [state, action, pending] = useActionState(selectActiveTitleAction, initialState);
  return (
    <section aria-labelledby="staff-title-collection-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-sm font-semibold text-blue-700">Kosmetische Auszeichnung</p>
      <h2 id="staff-title-collection-heading" className="mt-1 text-2xl font-bold text-slate-950">Titel</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Alle kanonischen Titel stehen Mitarbeitenden kosmetisch zur Verfügung. Die Auswahl erzeugt weder XP noch Level, Erfolge oder Abzeichen.
      </p>
      <form action={action} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-bold text-slate-800">Aktiver Titel
          <select name="titleId" defaultValue={titleState.activeTitle?.id ?? ""} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <option value="">Keinen kosmetischen Titel anzeigen</option>
            {titleState.titles.map((title) => <option key={title.id} value={title.id}>{title.displayName}</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending} className={primaryButton}>{pending ? "Speichern …" : "Titel speichern"}</button>
      </form>
      <ActionMessage state={state} />
      <ul aria-label="Verfügbare Titel" className="mt-6 grid gap-3 sm:grid-cols-2">
        {titleState.titles.map((title) => (
          <li key={title.id} className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <span className="font-bold text-slate-950">{title.displayName}</span>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900">Verfügbar durch Staff-Rolle</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{title.type === "level" ? "Kanonischer Leveltitel" : "Kanonischer Erfolgstitel"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600"><span className="font-semibold">Kanonische Lernbedingung:</span> {title.unlockCondition}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StaffBadgeControls({ badgeState }: { badgeState: ProfileBadgeState }) {
  const [state, action, pending] = useActionState(updatePinnedBadgesAction, initialState);
  const [selectedBadges, setSelectedBadges] = useState(badgeState.pinnedBadges.map((badge) => badge.id));
  const [badgeFilter, setBadgeFilter] = useState<BadgeCategory | "all" | "pinned">("all");
  const representedCategories = getRepresentedBadgeCategories(badgeState.badges);
  const visibleBadges = badgeFilter === "pinned"
    ? badgeState.badges.filter((badge) => selectedBadges.includes(badge.id))
    : filterBadgesByCategory(badgeState.badges, badgeFilter);
  return (
    <section aria-labelledby="staff-badge-collection-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-sm font-semibold text-blue-700">Kosmetische Showcase-Auswahl</p>
      <h2 id="staff-badge-collection-heading" className="mt-1 text-2xl font-bold text-slate-950">Abzeichen</h2>
      <p id="staff-badge-pin-help" className="mt-3 text-sm leading-6 text-slate-600">
        Der vollständige Abzeichenkatalog steht hier als Staff-Vorschau zur Verfügung. Die Vorschau erzeugt weder Lernfortschritt noch XP, Freischaltungen oder Freischaltdaten. Bis zu drei Abzeichen können über die bestehende Profilauswahl angeheftet werden.
      </p>
      <div role="group" aria-label="Verfügbare Abzeichen filtern" className="mt-5 flex flex-wrap gap-2">
        <FilterButton selected={badgeFilter === "all"} onSelect={() => setBadgeFilter("all")}>Alle</FilterButton>
        <FilterButton selected={badgeFilter === "pinned"} onSelect={() => setBadgeFilter("pinned")}>📌 Angeheftet</FilterButton>
        {representedCategories.map((category) => (
          <FilterButton key={category} selected={badgeFilter === category} onSelect={() => setBadgeFilter(category)}>
            {BADGE_CATEGORY_LABELS[category]}
          </FilterButton>
        ))}
      </div>
      <form action={action} className="mt-5">
        {selectedBadges.map((id) => <input key={id} type="hidden" name="badgeId" value={id} />)}
        <BadgeSelectionGroups
          badges={visibleBadges}
          describedBy="staff-badge-pin-help"
          selectedBadges={selectedBadges}
          onToggle={setSelectedBadges}
          staffPreview
        />
        <button type="submit" disabled={pending} className={`mt-5 ${primaryButton}`}>{pending ? "Speichern …" : "Abzeichen speichern"}</button>
      </form>
      <ActionMessage state={state} />
    </section>
  );
}

export function RewardControls({ rewards }: { rewards: LearnerRewardState }) {
  const [titleState, titleAction, titlePending] = useActionState(selectActiveTitleAction, initialState);
  const [badgeState, badgeAction, badgePending] = useActionState(updatePinnedBadgesAction, initialState);
  const [selectedBadges, setSelectedBadges] = useState(rewards.pinnedBadges.map((badge) => badge.id));
  const [badgeFilter, setBadgeFilter] = useState<BadgeCategory | "all" | "pinned">("all");
  const unlockedTitles = rewards.titles.filter((title) => title.unlocked);
  const representedCategories = getRepresentedBadgeCategories(rewards.badges);
  const visibleBadges = badgeFilter === "pinned"
    ? rewards.badges.filter((badge) => selectedBadges.includes(badge.id))
    : filterBadgesByCategory(rewards.badges, badgeFilter);
  return (
    <div className="space-y-8">
      <section aria-labelledby="title-collection-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-blue-700">Kosmetische Auszeichnung</p>
        <h2 id="title-collection-heading" className="mt-1 text-2xl font-bold text-slate-950">Titel</h2>
        <form action={titleAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-bold text-slate-800">Aktiver Titel
            <select name="titleId" defaultValue={rewards.activeTitle?.id ?? ""} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <option value="">Höchsten Leveltitel automatisch verwenden</option>
              {unlockedTitles.map((title) => <option key={title.id} value={title.id}>{title.displayName}</option>)}
            </select>
          </label>
          <button type="submit" disabled={titlePending} className={primaryButton}>{titlePending ? "Speichern …" : "Titel speichern"}</button>
        </form>
        <ActionMessage state={titleState} />
        <TitleCollection items={rewards.titles} activeTitleId={rewards.activeTitle?.id} />
      </section>

      <section aria-labelledby="badge-collection-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-blue-700">Sammlung</p>
        <h2 id="badge-collection-heading" className="mt-1 text-2xl font-bold text-slate-950">Abzeichen</h2>
        <p id="badge-pin-help" className="mt-3 text-sm leading-6 text-slate-600">Wähle bis zu drei freigeschaltete Abzeichen. Die Auswahlreihenfolge wird beibehalten.</p>
        <div role="group" aria-label="Abzeichen filtern" className="mt-5 flex flex-wrap gap-2">
          <FilterButton selected={badgeFilter === "all"} onSelect={() => setBadgeFilter("all")}>Alle</FilterButton>
          <FilterButton selected={badgeFilter === "pinned"} onSelect={() => setBadgeFilter("pinned")}>📌 Angeheftet</FilterButton>
          {representedCategories.map((category) => (
            <FilterButton key={category} selected={badgeFilter === category} onSelect={() => setBadgeFilter(category)}>
              {BADGE_CATEGORY_LABELS[category]}
            </FilterButton>
          ))}
        </div>
        <form action={badgeAction} className="mt-5">
          {selectedBadges.map((id) => <input key={id} type="hidden" name="badgeId" value={id} />)}
          <BadgeSelectionGroups
            badges={visibleBadges}
            describedBy="badge-pin-help"
            selectedBadges={selectedBadges}
            onToggle={setSelectedBadges}
          />
          <button type="submit" disabled={badgePending} className={`mt-5 ${primaryButton}`}>{badgePending ? "Speichern …" : "Abzeichen speichern"}</button>
        </form>
        <ActionMessage state={badgeState} />
      </section>
    </div>
  );
}

function BadgeSelectionGroups({
  badges,
  describedBy,
  selectedBadges,
  onToggle,
  staffPreview = false,
}: {
  badges: readonly RewardCollectionItem[];
  describedBy: string;
  selectedBadges: readonly string[];
  onToggle: React.Dispatch<React.SetStateAction<string[]>>;
  staffPreview?: boolean;
}) {
  const groups = getBadgeCollectionGroups(badges);
  return (
    <ul aria-describedby={describedBy} className="space-y-5">
      {groups.map((group) => (
        <li key={group.id} className={group.familyId ? "rounded-2xl border border-blue-200 bg-blue-50/40 p-3 sm:p-4 dark:border-blue-800 dark:bg-slate-950" : ""}>
          {group.familyId ? (
            <div className="mb-3">
              <h3 className="text-lg font-black text-slate-950 dark:text-slate-50">{group.label}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {staffPreview ? "Bronze · Silber · Gold" : describeBadgeFamily(group.badges)}
              </p>
            </div>
          ) : <h3 className="sr-only">{group.label}</h3>}
          <ul className="grid gap-3 md:grid-cols-2">
            {group.badges.map((badge) => {
              const checked = selectedBadges.includes(badge.id);
              const maxReached = selectedBadges.length >= MAX_PINNED_BADGES;
              return (
                <li key={badge.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                  <BadgeCard badge={badge} variant="collection" showLocked={!staffPreview} showUnlockDate={!staffPreview} />
                  {staffPreview && <p className="mx-1 mt-3 inline-flex rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">Staff-Vorschau</p>}
                  <label className={`mt-4 flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${staffPreview || badge.unlocked ? "cursor-pointer" : "cursor-not-allowed text-slate-500 dark:text-slate-400"}`}>
                    <input type="checkbox" checked={checked} disabled={(!staffPreview && !badge.unlocked) || (!checked && maxReached)} onChange={() => onToggle((current) => checked ? current.filter((id) => id !== badge.id) : [...current, badge.id])} className="size-5 shrink-0 accent-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:accent-blue-400" />
                    {checked ? "Angeheftet" : !staffPreview && !badge.unlocked ? "Erst nach Freischaltung anheftbar" : maxReached ? "Maximalzahl erreicht" : "Im Profil anheften"}
                  </label>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function describeBadgeFamily(badges: readonly RewardCollectionItem[]) {
  const unlocked = badges.filter((badge) => badge.unlocked);
  const highest = unlocked.at(-1);
  const next = badges.find((badge) => !badge.unlocked);
  const currentText = highest?.tier ? `Aktuell: ${BADGE_TIER_LABELS[highest.tier]} – ${highest.displayName}.` : "Noch keine Stufe freigeschaltet.";
  const nextText = next?.tier ? ` Nächste Stufe: ${BADGE_TIER_LABELS[next.tier]} – ${next.displayName}.` : " Gold erreicht.";
  return `${currentText}${nextText}`;
}

function TitleCollection({ items, activeTitleId }: {
  items: LearnerRewardState["titles"];
  activeTitleId?: string;
}) {
  return (
    <ul aria-label="Titel-Sammlung" className="mt-6 grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const active = item.id === activeTitleId;
        return (
          <li key={item.id} className={`rounded-xl border p-4 ${item.unlocked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-950">{item.displayName}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.type === "level" ? "Level" : "Achievement"}</p>
              </div>
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                {active ? "Aktiv · " : ""}{formatUnlockText(item)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700"><span className="font-bold">Bedingung:</span> {item.unlockCondition}</p>
            {item.progress && !item.unlocked && (
              <p className="mt-2 text-sm font-semibold text-slate-600">Fortschritt: {item.progress.current} / {item.progress.target}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FilterButton({ selected, onSelect, children }: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected ? "border-blue-950 bg-blue-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}>
      {children}
    </button>
  );
}

function formatUnlockText(item: LearnerRewardState["titles"][number]) {
  if (!item.unlocked) return "Gesperrt";
  const date = item.unlockedAt ? formatRewardUnlockDate(item.unlockedAt) : undefined;
  return date ? `Freigeschaltet am ${date}` : "Freigeschaltet";
}

function ActionMessage({ state }: { state: ProfileActionState }) {
  return state.status === "idle" ? null : <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border p-3 text-sm font-semibold ${state.status === "error" ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{state.message}</p>;
}

const primaryButton = "inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60";
