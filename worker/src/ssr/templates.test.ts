import { describe, expect, it } from "vitest";
import { renderLayout } from "./engine";

describe("MyXL templates", () => {
  it("renders login page with OTP form", () => {
    const html = renderLayout("login", new Request("http://localhost/login"), {
      page_title: "Login",
      show_tab_login: true,
      pending_otp: false,
      phone: "",
      tabs: [{ id: "login", icon: "fa-solid fa-key", label: "Login", active: true, href: "?tab=login" }],
    });
    expect(html).toContain("Login pakai OTP");
    expect(html).toContain("/login/request-otp");
  });

  it("renders dashboard with active user", () => {
    const html = renderLayout("dashboard", new Request("http://localhost/"), {
      page_title: "Beranda",
      active_user: { number: 6281234567890, subscription_type: "PREPAID" },
      dashboard_stats: [{ label: "Pulsa", value: "Rp 10.000" }],
      active_packages_count: 2,
      has_tier: false,
    });
    expect(html).toContain("6281234567890");
    expect(html).toContain("Paket Aktif");
  });
});