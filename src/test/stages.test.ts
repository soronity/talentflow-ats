import { describe, expect, it } from "vitest";
import { clampScore, filterCandidates, isStage } from "@/lib/stages";

const list = [
  { full_name: "Anna Svensson", job_id: "j1", stage: "applied" as const },
  { full_name: "Erik Berg", job_id: "j2", stage: "interview" as const },
];

describe("kanban filtering", () => {
  it("filters by job", () => {
    expect(filterCandidates(list, "j2", "").map((c) => c.full_name)).toEqual(["Erik Berg"]);
  });
  it("filters by candidate name, case-insensitive", () => {
    expect(filterCandidates(list, "all", "anna").map((c) => c.full_name)).toEqual(["Anna Svensson"]);
  });
  it("combines job and name filters", () => {
    expect(filterCandidates(list, "j1", "erik")).toEqual([]);
  });
});

describe("stages and scores", () => {
  it("rejects unknown stages", () => {
    expect(isStage("hired")).toBe(true);
    expect(isStage("ghosted")).toBe(false);
  });
  it("clamps AI scores to 0-100", () => {
    expect(clampScore(140)).toBe(100);
    expect(clampScore(-3)).toBe(0);
    expect(clampScore("x")).toBeNull();
  });
});
