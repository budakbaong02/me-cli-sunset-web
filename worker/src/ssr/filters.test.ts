import { describe, expect, it } from "vitest";
import { formatDate, formatIsoDate, formatRp, formatTs, humanizeBytes, safeHtml } from "./filters";

describe("SSR filters", () => {
  it("formatRp", () => {
    expect(formatRp(15000)).toBe("Rp 15.000");
    expect(formatRp("x")).toBe("x");
  });

  it("formatTs", () => {
    expect(formatTs(1710000000)).toMatch(/^2024-/);
  });

  it("formatDate", () => {
    expect(formatDate(1710000000)).toMatch(/^2024-/);
  });

  it("humanizeBytes", () => {
    expect(humanizeBytes(1024)).toBe("1.00 KB");
  });

  it("safeHtml escapes", () => {
    expect(safeHtml('<script>"x"</script>')).toBe("&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  });

  it("formatIsoDate", () => {
    const out = formatIsoDate("2026-05-28T04:30:32.000+00:00");
    expect(out).toContain("2026");
    expect(out).toContain("WIB");
  });
});