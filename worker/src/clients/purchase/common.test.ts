import { describe, expect, it } from "vitest";
import { buildPaymentTargets, resolveAmount, resolveItemIndex } from "./common";
import type { PaymentItem } from "./types";

const items: PaymentItem[] = [
  {
    item_code: "OPT-A",
    product_type: "",
    item_price: 1000,
    item_name: "A",
    tax: 0,
    token_confirmation: "tok-a",
  },
  {
    item_code: "OPT-B",
    product_type: "",
    item_price: 2000,
    item_name: "B",
    tax: 0,
    token_confirmation: "tok-b",
  },
];

describe("purchase common", () => {
  it("buildPaymentTargets joins item codes", () => {
    expect(buildPaymentTargets(items)).toBe("OPT-A;OPT-B");
  });

  it("resolveItemIndex supports negative python-style indices", () => {
    expect(resolveItemIndex(items, -1)).toBe(1);
    expect(resolveItemIndex(items, 0)).toBe(0);
  });

  it("resolveAmount uses overwrite or indexed price", () => {
    expect(resolveAmount(items, 5000, -1)).toBe(5000);
    expect(resolveAmount(items, -1, 0)).toBe(1000);
    expect(resolveAmount(items, -1, -1)).toBe(2000);
  });
});