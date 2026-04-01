import { describe, it, expect } from "vitest";
import { renderTemplate, buildSmsUrl, buildMailtoUrl } from "@/lib/message-templates";

describe("renderTemplate", () => {
  it("replaces all placeholders", () => {
    const template = "Hi {customer_name}, your {service_type} quote is ${job_total}.";
    const result = renderTemplate(template, { customer_name: "John", service_type: "Interior Paint", job_total: "2,400" });
    expect(result).toBe("Hi John, your Interior Paint quote is $2,400.");
  });

  it("leaves unknown placeholders as-is", () => {
    const result = renderTemplate("Hi {customer_name}, {unknown_field}", { customer_name: "John" });
    expect(result).toBe("Hi John, {unknown_field}");
  });

  it("handles empty values", () => {
    const result = renderTemplate("At {job_address}", { job_address: "" });
    expect(result).toBe("At ");
  });
});

describe("buildSmsUrl", () => {
  it("builds sms: URL with phone and body", () => {
    const url = buildSmsUrl("555-1234", "Hello there");
    expect(url).toBe("sms:555-1234&body=Hello%20there");
  });
});

describe("buildMailtoUrl", () => {
  it("builds mailto: URL with email, subject, and body", () => {
    const url = buildMailtoUrl("john@example.com", "Your Quote", "Hi John");
    expect(url).toBe("mailto:john@example.com?subject=Your%20Quote&body=Hi%20John");
  });
});
