import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { validateEnquiry } = require("../lib/enquiry-service.ts");
const { getPhoneError, PHONE_ERROR } = require("../lib/phone-validation.ts");
const { POST } = require("../app/api/enquiry/route.ts");

const enquiry = {
  source: "planner", name: "Test Guest", email: "guest@example.com",
  region: "India", types: ["Private"], experiences: ["Wildlife"],
  months: ["Flexible"], consent: true
};

test("new enquiries require a nonempty phone number", () => {
  for (const phone of [undefined, "", "   ", "\n\t", null, 1234]) {
    const result = validateEnquiry({ ...enquiry, phone });
    assert.equal(result.ok, false);
    assert.ok(result.fields.phone);
  }
});

test("phone numbers retain international formatting in the stored payload", () => {
  for (const phone of ["+91 98765 43210", "+44 (20) 7946 0123", "  9876543210  ",
    "020 7946 0123", "0044 20 7946 0123", "+44 (0)20 7946 0123", "(212) 555-0123",
    "+1.212.555.0123", "+33\u00a01\u00a042\u00a068\u00a053\u00a000", "+91\u202f98765\u202f43210",
    "+1 212 555 0123 ext. 456", "020 7946 0123 x12", "+44 20 7946 0123 #123",
    "2345678", "+123456789012345", "00123456789012345"]) {
    const result = validateEnquiry({ ...enquiry, phone });
    assert.equal(result.ok, true, phone);
    assert.equal(getPhoneError(phone), "", phone);
    assert.equal(result.payload.phone, phone.trim());
  }
});

const invalidPhones = ["-", "abc", "not available", "1", "123456", "1234567890123456",
  "0000000000", "1111111111", "+000 000 0000", "00 0123456789", "++91 9876543210",
  "91+9876543210", "+44 (20 7946 0123", "+44 20) 7946 0123", "(()) 12345678",
  "1234567-", "---1234567", "1234567/890", "+91 98765abc43210", "123\n4567890",
  "1234567 ext abc", "1234567 x1234567", "1234567 ext", "1234567\next 12", "9".repeat(61)];

test("obvious non-numbers, malformed formatting and implausible lengths are rejected consistently", () => {
  for (const phone of invalidPhones) {
    const result = validateEnquiry({ ...enquiry, phone });
    assert.equal(result.ok, false, phone);
    assert.equal(result.fields.phone, PHONE_ERROR, phone);
    assert.equal(getPhoneError(phone), result.fields.phone, phone);
  }
});

test("no contact choice remains empty and explicit preferences survive server validation", () => {
  for (const contactPreference of [undefined, "", "Email", "Phone", "WhatsApp"]) {
    const result = validateEnquiry({ ...enquiry, phone: "+91 98765 43210", sourceType: "contact", contactPreference });
    assert.equal(result.ok, true);
    assert.equal(result.payload.contactPreference, contactPreference || "");
  }
});

test("API rejects invalid phones before any database or email request", async () => {
  const savedFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("Unexpected network request"); };
  try {
    for (const phone of [...invalidPhones, undefined, "", null, 1234]) {
      const response = await POST(new Request("http://localhost/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "12345678-1234-4123-8123-123456789012" },
        body: JSON.stringify({ ...enquiry, phone })
      }));
      assert.equal(response.status, 400, String(phone));
      const result = await response.json();
      assert.equal(result.fields.phone, getPhoneError(phone));
    }
    assert.equal(requests, 0);
  } finally { globalThis.fetch = savedFetch; }
});
