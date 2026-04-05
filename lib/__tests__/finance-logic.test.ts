import { describe, it, expect } from "vitest";
import { calcBuckets, bucketUsagePct } from "../finance-logic";
import type { BudgetCategory, Transaction } from "../../types";

const makeTx = (partial: Partial<Transaction>): Transaction => ({
  id: "1", user_id: "u", description: "test", amount: -100,
  category: "Outros", bucket: "fixo", type: "despesa",
  date: "2025-01-01", created_at: "2025-01-01",
  ...partial,
});

const makeCat = (partial: Partial<BudgetCategory>): BudgetCategory => ({
  id: "c1", user_id: "u", name: "Aluguel", monthly_limit: 1000,
  bucket: "fixo", color: "#fff", icon: "🏠",
  ...partial,
});

describe("calcBuckets", () => {
  it("returns 4 buckets summing to salary when no transactions or categories", () => {
    const buckets = calcBuckets(5000, [], []);
    const total = buckets.reduce((s, b) => s + b.total, 0);
    expect(buckets).toHaveLength(4);
    expect(total).toBe(5000);
  });

  it("fixo remaining decreases when committed > txSpent", () => {
    const cats = [makeCat({ monthly_limit: 2000, bucket: "fixo" })];
    const [fixo] = calcBuckets(5000, [], cats).filter(b => b.bucket === "fixo");
    // total = 2500, committed = 2000, txSpent = 0 → spent = max(0, 2000) = 2000
    expect(fixo.committed).toBe(2000);
    expect(fixo.spent).toBe(2000);
    expect(fixo.remaining).toBe(500);
  });

  it("fixo uses txSpent when txSpent > committed", () => {
    const cats = [makeCat({ monthly_limit: 500, bucket: "fixo" })];
    const txs = [makeTx({ amount: -1800, bucket: "fixo", type: "despesa" })];
    const [fixo] = calcBuckets(5000, txs, cats).filter(b => b.bucket === "fixo");
    expect(fixo.spent).toBe(1800);
    expect(fixo.remaining).toBe(700); // 2500 - 1800
  });

  it("non-fixo buckets use txSpent only (committed does not affect spent)", () => {
    const cats = [makeCat({ monthly_limit: 400, bucket: "reserva" })];
    const [reserva] = calcBuckets(5000, [], cats).filter(b => b.bucket === "reserva");
    // committed = 400 but for non-fixo, spent = txSpent = 0
    expect(reserva.spent).toBe(0);
    expect(reserva.remaining).toBe(reserva.total); // 500
  });

  it("reserva remaining decreases when despesa tx is added", () => {
    const txs = [makeTx({ amount: -300, bucket: "reserva", type: "despesa" })];
    const [reserva] = calcBuckets(5000, txs, []).filter(b => b.bucket === "reserva");
    expect(reserva.spent).toBe(300);
    expect(reserva.remaining).toBe(200); // 500 - 300
  });

  it("total remaining across buckets = salary - committed fixo when no tx", () => {
    const cats = [makeCat({ monthly_limit: 2000, bucket: "fixo" })];
    const buckets = calcBuckets(5000, [], cats);
    const totalRemaining = buckets.reduce((s, b) => s + b.remaining, 0);
    expect(totalRemaining).toBe(3000); // 5000 - 2000
  });

  it("transfer: receita with category='Transferência' increases destination remaining", () => {
    const txs = [
      makeTx({ amount: -500, bucket: "fixo", type: "despesa", category: "Transferência" }),
      makeTx({ amount: 500, bucket: "livre", type: "receita", category: "Transferência" }),
    ];
    const buckets = calcBuckets(5000, txs, []);
    const fixo = buckets.find(b => b.bucket === "fixo")!;
    const livre = buckets.find(b => b.bucket === "livre")!;
    expect(fixo.remaining).toBe(2000); // 2500 - 500
    expect(livre.remaining).toBe(1750); // 1250 + 500 (transfer in)
  });

  it("transfer: non-Transferência receita does NOT affect remaining", () => {
    const txs = [makeTx({ amount: 500, bucket: "livre", type: "receita", category: "Outros" })];
    const [livre] = calcBuckets(5000, txs, []).filter(b => b.bucket === "livre");
    expect(livre.remaining).toBe(1250); // not affected
  });
});

describe("bucketUsagePct", () => {
  it("returns 0 when total is 0", () => {
    expect(bucketUsagePct({ bucket: "fixo", label: "", pct: 0, total: 0, spent: 0, remaining: 0, color: "" })).toBe(0);
  });

  it("caps at 100 when overspent", () => {
    expect(bucketUsagePct({ bucket: "fixo", label: "", pct: 0.5, total: 1000, spent: 1500, remaining: 0, color: "" })).toBe(100);
  });

  it("calculates correct percentage", () => {
    expect(bucketUsagePct({ bucket: "fixo", label: "", pct: 0.5, total: 1000, spent: 750, remaining: 250, color: "" })).toBe(75);
  });
});
