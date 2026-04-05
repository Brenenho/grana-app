import { describe, it, expect } from "vitest";
import { GOAL_BUCKET_MAP, BUCKET_GOAL_MAP, isSavingsTx } from "../goal-sync";

describe("GOAL_BUCKET_MAP", () => {
  it("maps Reserva de Emergência to reserva", () => {
    expect(GOAL_BUCKET_MAP["Reserva de Emergência"]).toBe("reserva");
  });

  it("maps Caixa Empreendedor to empreendedor", () => {
    expect(GOAL_BUCKET_MAP["Caixa Empreendedor"]).toBe("empreendedor");
  });

  it("returns undefined for unknown goals", () => {
    expect(GOAL_BUCKET_MAP["Meta Qualquer"]).toBeUndefined();
  });
});

describe("BUCKET_GOAL_MAP", () => {
  it("maps reserva to Reserva de Emergência", () => {
    expect(BUCKET_GOAL_MAP["reserva"]).toBe("Reserva de Emergência");
  });

  it("maps empreendedor to Caixa Empreendedor", () => {
    expect(BUCKET_GOAL_MAP["empreendedor"]).toBe("Caixa Empreendedor");
  });

  it("GOAL_BUCKET_MAP and BUCKET_GOAL_MAP are inverse of each other", () => {
    for (const [goalName, bucket] of Object.entries(GOAL_BUCKET_MAP)) {
      expect(BUCKET_GOAL_MAP[bucket]).toBe(goalName);
    }
  });
});

describe("isSavingsTx", () => {
  it("returns true for reserva despesa", () => {
    expect(isSavingsTx("reserva", "despesa")).toBe(true);
  });

  it("returns true for empreendedor despesa", () => {
    expect(isSavingsTx("empreendedor", "despesa")).toBe(true);
  });

  it("returns false for reserva receita", () => {
    expect(isSavingsTx("reserva", "receita")).toBe(false);
  });

  it("returns false for fixo despesa", () => {
    expect(isSavingsTx("fixo", "despesa")).toBe(false);
  });

  it("returns false for livre despesa", () => {
    expect(isSavingsTx("livre", "despesa")).toBe(false);
  });
});
