import { formatDate, formatRp, formatTs, humanizeBytes } from "../ssr/filters";
import type { MonitoringRule, QuotaCache } from "./types";

export interface CacheBenefitRow {
  benefit_name: string;
  has_benefit_name: boolean;
  pct: number;
  pct_width: number;
  bar_class: string;
  display: string;
}

export interface CacheQuotaRow {
  quota_name: string;
  has_quota_name: boolean;
  benefits: CacheBenefitRow[];
}

function resolveQuotaName(q: Record<string, unknown>): string {
  const direct = String(q.name ?? "").trim();
  if (direct) return direct;
  const family = (q.package_family as Record<string, unknown> | undefined)?.name;
  if (family) return String(family);
  const variant = (q.package_variants as Record<string, unknown> | undefined)?.display_name
    ?? (q.package_variants as Record<string, unknown> | undefined)?.name;
  if (variant) return String(variant);
  const group = String(q.group_name ?? "").trim();
  if (group) return group;
  return "-";
}

export interface CacheCardRow {
  msisdn: string;
  updated_at_disp: string;
  has_balance: boolean;
  balance_rp: string;
  balance_exp: string;
  has_quotas: boolean;
  quotas: CacheQuotaRow[];
}

export interface RuleRow {
  id: string;
  name: string;
  msisdn: number;
  enabled: boolean;
  disabled: boolean;
  last_status: string;
  status_ok: boolean;
  status_error: boolean;
  status_partial: boolean;
  match_kind: string;
  match_value: string;
  has_match_value: boolean;
  trigger_metric: string;
  trigger_op: string;
  trigger_value: number;
  cooldown_seconds: number;
  last_fired_disp: string;
  has_last_fired: boolean;
  last_msg: string;
  has_last_msg: boolean;
}

function barClass(pct: number): string {
  if (pct > 50) return "bg-emerald-400";
  if (pct > 20) return "bg-amber-400";
  return "bg-red-400";
}

export function formatCacheCards(cache: QuotaCache): CacheCardRow[] {
  return Object.entries(cache).map(([msisdn, data]) => {
    const bal = data.balance ?? {};
    const quotas: CacheQuotaRow[] = (data.quotas ?? []).slice(0, 6).map((q) => {
      const benefits: CacheBenefitRow[] = ((q.benefits as Record<string, unknown>[]) ?? [])
        .slice(0, 3)
        .map((b) => {
          const rem = Number(b.remaining ?? 0);
          const tot = Number(b.total ?? 0);
          const pct = tot ? (rem / tot) * 100 : 0;
          const dt = String(b.data_type ?? "");
          let display: string;
          if (dt === "DATA") display = `${humanizeBytes(rem)}/${humanizeBytes(tot)}`;
          else if (dt === "VOICE") display = `${Math.round(rem / 60)}m`;
          else display = String(rem);
          const benefitName = String(b.name ?? "").trim();
          return {
            benefit_name: benefitName,
            has_benefit_name: benefitName.length > 0,
            pct,
            pct_width: Math.min(pct, 100),
            bar_class: barClass(pct),
            display: `${display} (${pct.toFixed(0)}%)`,
          };
        });
      const quotaName = resolveQuotaName(q);
      return {
        quota_name: quotaName,
        has_quota_name: quotaName !== "-",
        benefits,
      };
    });

    return {
      msisdn,
      updated_at_disp: data.updated_at ? formatTs(data.updated_at) : "",
      has_balance: bal.remaining != null || bal.expired_at != null,
      balance_rp: bal.remaining != null ? formatRp(bal.remaining) : "—",
      balance_exp: bal.expired_at != null ? formatDate(bal.expired_at) : "",
      has_quotas: quotas.length > 0,
      quotas,
    };
  });
}

export function formatRuleRows(rules: MonitoringRule[]): RuleRow[] {
  return rules.map((r) => {
    const status = r.last_status ?? "";
    return {
      id: r.id,
      name: r.name || "Untitled",
      msisdn: r.msisdn,
      enabled: r.enabled,
      disabled: !r.enabled,
      last_status: status,
      status_ok: status === "ok",
      status_error: status === "error",
      status_partial: status === "partial",
      match_kind: r.match?.kind ?? "any",
      match_value: String(r.match?.value ?? ""),
      has_match_value: Boolean(r.match?.value),
      trigger_metric: r.trigger?.metric ?? "remaining_pct",
      trigger_op: r.trigger?.op ?? "lt",
      trigger_value: r.trigger?.value ?? 0,
      cooldown_seconds: r.cooldown_seconds,
      last_fired_disp: r.last_fired_at ? formatTs(r.last_fired_at) : "",
      has_last_fired: Boolean(r.last_fired_at),
      last_msg: r.last_msg ?? "",
      has_last_msg: Boolean(r.last_msg),
    };
  });
}

export function hourOptions(selected: number): Array<{ value: number; label: string; selected: boolean }> {
  return Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: String(h).padStart(2, "0"),
    selected: h === selected,
  }));
}

export function minuteOptions(selected: number): Array<{ value: number; label: string; selected: boolean }> {
  const out: Array<{ value: number; label: string; selected: boolean }> = [];
  for (let m = 0; m < 60; m += 5) {
    out.push({ value: m, label: String(m).padStart(2, "0"), selected: m === selected });
  }
  return out;
}