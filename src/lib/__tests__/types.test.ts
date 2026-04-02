import { describe, it, expect } from "vitest";
import {
  ServiceType,
  JobStatus,
  RoomType,
  FinishType,
  SurfaceType,
  JOB_STATUS_ORDER,
} from "@/lib/types";

describe("types", () => {
  it("ServiceType has all four service types", () => {
    expect(Object.values(ServiceType)).toEqual([
      "interior_paint",
      "exterior_paint",
      "power_washing",
      "handyman",
    ]);
  });

  it("JobStatus has correct progression order", () => {
    expect(JOB_STATUS_ORDER).toEqual([
      JobStatus.Lead,
      JobStatus.Quoted,
      JobStatus.Scheduled,
      JobStatus.InProgress,
      JobStatus.Complete,
      JobStatus.Paid,
    ]);
  });

  it("RoomType has walls, ceiling, walls_and_ceiling, exterior, other", () => {
    expect(Object.values(RoomType)).toEqual([
      "walls",
      "ceiling",
      "walls_and_ceiling",
      "exterior",
      "other",
    ]);
  });

  it("FinishType has all finish options", () => {
    expect(Object.values(FinishType)).toEqual([
      "flat",
      "eggshell",
      "satin",
      "semi_gloss",
      "gloss",
    ]);
  });

  it("SurfaceType has all surface options", () => {
    expect(Object.values(SurfaceType)).toHaveLength(9);
    expect(Object.values(SurfaceType)).toContain("smooth_drywall");
    expect(Object.values(SurfaceType)).toContain("stucco");
    expect(Object.values(SurfaceType)).toContain("wood_deck");
  });
});
