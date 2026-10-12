import assert from "node:assert/strict";
import test from "node:test";
import { validateEnquiry } from "../lib/enquiry-service.ts";

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
  for (const phone of ["+91 98765 43210", "+44 (20) 7946 0123", "  9876543210  "]) {
    const result = validateEnquiry({ ...enquiry, phone });
    assert.equal(result.ok, true);
    assert.equal(result.payload.phone, phone.trim());
  }
});
