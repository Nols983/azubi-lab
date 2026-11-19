import { isUuid, parseAccountRole } from "./account-security.ts";
import type { AccountRole } from "./auth-types.ts";

export type AccountDirectorySearch = Record<string, string | string[] | undefined>;
export type AccountDirectoryFilters = {
  query: string;
  team: string;
  role: AccountRole | "all";
  status: "all" | "active" | "disabled" | "password-change";
  sort: "name" | "newest" | "oldest";
  page: number;
  pageSize: number;
  withAvatar: boolean;
};
const first = (value: string | string[] | undefined) => typeof value === "string" ? value : value?.[0];
export function parseAccountDirectoryFilters(search: AccountDirectorySearch): AccountDirectoryFilters {
  const team = first(search.team) ?? "all";
  const status = first(search.status);
  const sort = first(search.sort);
  const page = first(search.page) ?? "1";
  const size = Number(first(search.pageSize));
  return {
    query: (first(search.q) ?? "").trim().slice(0, 120),
    team: ["all", "none"].includes(team) || isUuid(team) ? team : "invalid",
    role: parseAccountRole(first(search.role)) ?? "all",
    status: status === "active" || status === "disabled" || status === "password-change" ? status : "all",
    sort: sort === "newest" || sort === "oldest" ? sort : "name",
    page: /^[1-9][0-9]{0,8}$/.test(page) ? Number(page) : 1,
    pageSize: [10, 25, 50].includes(size) ? size : 25,
    withAvatar: first(search.profilbild) === "vorhanden",
  };
}

export function accountDirectoryHref(filters: AccountDirectoryFilters, patch: Partial<AccountDirectoryFilters> = {}) {
  const value = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (value.query) params.set("q", value.query);
  if (value.team !== "all") params.set("team", value.team);
  if (value.role !== "all") params.set("role", value.role);
  if (value.status !== "all") params.set("status", value.status);
  if (value.sort !== "name") params.set("sort", value.sort);
  if (value.page > 1) params.set("page", String(value.page));
  if (value.pageSize !== 25) params.set("pageSize", String(value.pageSize));
  if (value.withAvatar) params.set("profilbild", "vorhanden");
  return `/admin/konten${params.size ? `?${params}` : ""}`;
}

export function accountStatusLabel(account: { disabledAt: Date | null; mustChangePassword: boolean }) {
  return account.disabledAt ? "Gesperrt" : account.mustChangePassword ? "Passwortwechsel erforderlich" : "Aktiv";
}
