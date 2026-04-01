import { describe, it, expect } from "vitest";
import { formatCurrency, formatServiceType, formatJobStatus, formatFinishType, formatSurfaceType } from "@/lib/format";
import { ServiceType, JobStatus, FinishType, SurfaceType } from "@/lib/types";

describe("formatCurrency", () => {
  it("formats dollars with commas", () => {
    expect(formatCurrency(2400)).toBe("$2,400.00");
    expect(formatCurrency(50)).toBe("$50.00");
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatServiceType", () => {
  it("formats enum to display string", () => {
    expect(formatServiceType(ServiceType.InteriorPaint)).toBe("Interior Paint");
    expect(formatServiceType(ServiceType.PowerWashing)).toBe("Power Washing");
    expect(formatServiceType(ServiceType.Handyman)).toBe("Handyman");
  });
});

describe("formatJobStatus", () => {
  it("formats status enum to display string", () => {
    expect(formatJobStatus(JobStatus.InProgress)).toBe("In Progress");
    expect(formatJobStatus(JobStatus.Lead)).toBe("Lead");
  });
});

describe("formatFinishType", () => {
  it("formats finish enum to display string", () => {
    expect(formatFinishType(FinishType.SemiGloss)).toBe("Semi-Gloss");
    expect(formatFinishType(FinishType.Eggshell)).toBe("Eggshell");
  });
});

describe("formatSurfaceType", () => {
  it("formats surface enum to display string", () => {
    expect(formatSurfaceType(SurfaceType.SmoothDrywall)).toBe("Smooth Drywall");
    expect(formatSurfaceType(SurfaceType.WoodDeck)).toBe("Wood/Deck");
    expect(formatSurfaceType(SurfaceType.TrimBaseboard)).toBe("Trim/Baseboard");
  });
});
