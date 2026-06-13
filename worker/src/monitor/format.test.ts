import { describe, expect, it } from "vitest";
import { renderLayout } from "../ssr/engine";
import { formatCacheCards } from "./format";

describe("monitor format", () => {
  it("renders quota names in monitoring cache cards", () => {
    const cards = formatCacheCards({
      "6281908004427": {
        updated_at: 1781353199,
        balance: { remaining: 0, expired_at: 2080141199 },
        quotas: [
          {
            name: "myPRIO Silver Talk+",
            benefits: [{ data_type: "DATA", remaining: 1000, total: 2000 }],
          },
        ],
      },
    });
    expect(cards[0].quotas[0].quota_name).toBe("myPRIO Silver Talk+");

    const html = renderLayout("monitoring", new Request("http://localhost/monitoring"), {
      page_title: "Monitoring",
      cache_cards: cards,
      has_cache: true,
      rules: [],
      has_rules: false,
      log_lines: [],
      has_log: false,
      tg_global_enabled: false,
      has_tg_chat_id: false,
      myxl_accounts: [],
      has_accounts: false,
    });
    expect(html).toContain("myPRIO Silver Talk+");
  });

  it("falls back to package family name and shows benefit labels", () => {
    const cards = formatCacheCards({
      "6281": {
        updated_at: 1,
        balance: null,
        quotas: [
          {
            group_name: "Add PRIO Add PRIO",
            package_family: { name: "Add PRIO" },
            benefits: [{ name: "Kuota Utama", data_type: "DATA", remaining: 500, total: 1000 }],
          },
        ],
      },
    });
    expect(cards[0].quotas[0].quota_name).toBe("Add PRIO");
    expect(cards[0].quotas[0].benefits[0].benefit_name).toBe("Kuota Utama");

    const html = renderLayout("monitoring", new Request("http://localhost/monitoring"), {
      page_title: "Monitoring",
      cache_cards: cards,
      has_cache: true,
      rules: [],
      has_rules: false,
      log_lines: [],
      has_log: false,
      tg_global_enabled: false,
      has_tg_chat_id: false,
      myxl_accounts: [],
      has_accounts: false,
    });
    expect(html).toContain("Add PRIO");
    expect(html).toContain("Kuota Utama");
  });
});