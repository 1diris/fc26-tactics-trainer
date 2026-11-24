import { describe, expect, it } from "bun:test";
import { missingFromImport } from "./missing-players";

describe("missingFromImport", () => {
  const squad = [{ name: "Lukas Brenner" }, { name: "Mateo Ferreira" }, { name: "Jonas Ekdahl" }];
  it("lists players not in the upload", () =>
    expect(missingFromImport(squad, [{ name: "Lukas Brenner" }, { name: "Jonas Ekdahl" }]).map((p) => p.name)).toEqual(["Mateo Ferreira"]));
  it("lists nobody when all are uploaded", () =>
    expect(missingFromImport(squad, squad)).toEqual([]));
});
