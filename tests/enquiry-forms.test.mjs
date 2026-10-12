import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { registerHooks, createRequire } from "node:module";
const require = createRequire(import.meta.url);
import { JSDOM } from "jsdom";
const { getPhoneError } = require("../lib/phone-validation.ts");
const { validateEnquiry } = require("../lib/enquiry-service.ts");

// DOM-only component tests: no browser, server or external requests.
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
  return nextLoad(url, context);
} });
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "location", "navigator", "sessionStorage", "FormData", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
process.env.NEXT_PUBLIC_FUNNEL_ENABLED = "false";
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ContactForm } = require("../components/ContactForm.tsx");
const { ExpeditionEnquiry } = require("../components/ExpeditionEnquiry.tsx");
const { PlannerForm } = require("../components/PlannerForm.tsx");
const { default: InternationalOrder } = require("../app/store/InternationalOrder.tsx");
let root;
let requests;
let response;
const savedFetch = globalThis.fetch;

async function mount(Component, props = {}) {
  document.body.innerHTML = '<div id="root"></div>';
  sessionStorage.clear();
  requests = [];
  response = { enquiryId: "SC-local-test", specialist: "Team" };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/enquiry");
    requests.push(JSON.parse(options.body));
    return Response.json(response, { status: response.error ? 400 : 200 });
  };
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(Component, props)));
}

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  globalThis.fetch = savedFetch;
});

async function fill(selector, value) {
  const input = document.querySelector(selector);
  assert.ok(input, selector);
  const prototype = input.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype
    : input.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
  return input;
}

async function click(button) {
  assert.ok(button);
  await act(async () => button.click());
}

function buttonWith(text) {
  return [...document.querySelectorAll("button")].find(button => button.textContent.includes(text));
}

async function details(phone = "+91 98765 43210") {
  await fill('[name="name"]', "Test Guest");
  await fill('[name="email"]', "guest@example.test");
  await fill('[name="phone"]', phone);
  if (document.querySelector('[name="message"]')) await fill('[name="message"]', "Please help plan a safari.");
  const consent = document.querySelector('input[type="checkbox"]');
  if (consent) await click(consent);
}

async function submit() {
  await act(async () => document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}

for (const preference of ["", "Email", "Phone", "WhatsApp"]) {
  test(`Contact submits the actual preferred-contact choice: ${preference || "no choice"}`, async () => {
    await mount(ContactForm);
    const select = document.querySelector('[name="contactPreference"]');
    assert.ok(select, "Contact must offer an explicit preferred-contact choice");
    assert.match(select.labels[0].textContent, /Preferred contact \(optional\)/);
    assert.equal(select.required, false);
    assert.equal(select.value, "");
    await fill('[name="contactPreference"]', preference);
    await details();
    assert.equal(select.value, preference, "entering a required phone must not change the preference");
    await submit();
    assert.equal(requests.length, 1);
    const result = validateEnquiry(requests[0]);
    assert.equal(result.ok, true);
    assert.equal(result.payload.contactPreference, preference);
    assert.match(document.body.textContent, /Your brief has been received/);
  });
}

test("Contact lets a guest clear an earlier preferred-contact choice", async () => {
  await mount(ContactForm);
  await details();
  await fill('[name="contactPreference"]', "Phone");
  await fill('[name="contactPreference"]', "");
  await submit();
  assert.equal(requests[0].contactPreference, "");
});

test("native form validation shows the shared error and allows submission after correction", async () => {
  await mount(ContactForm);
  await details("abc");
  const phone = document.querySelector('[name="phone"]');
  await act(async () => document.querySelector("form").requestSubmit());
  assert.equal(requests.length, 0);
  assert.equal(phone.getAttribute("aria-invalid"), "true");
  assert.equal(phone.validationMessage, getPhoneError("abc"));
  await fill('[name="phone"]', "(212) 555-0123");
  await act(async () => document.querySelector("form").requestSubmit());
  assert.equal(requests.length, 1);
});

const forms = [
  ["Contact", async () => mount(ContactForm)],
  ["Expedition", async () => mount(ExpeditionEnquiry, { title: "Test expedition", slug: "test", mentor: "Test Mentor", region: "India" })],
  ["Store", async () => { await mount(InternationalOrder); await click(buttonWith("International payments")); }],
  ["Planner", async () => {
    await mount(PlannerForm);
    await click(buttonWith("India"));
    await click(buttonWith("Not sure yet"));
    await click(buttonWith("Dates not decided"));
  }]
];

for (const [name, setup] of forms) {
  test(`${name}: accessible phone error blocks a bad number and clears on correction`, async () => {
    await setup();
    await details("not available");
    const phone = document.querySelector('[name="phone"]');
    assert.equal(phone.type, "tel");
    assert.equal(phone.autocomplete, "tel");
    assert.equal(phone.required, true);
    assert.equal(phone.maxLength, 60);
    await submit();
    assert.equal(requests.length, 0);
    assert.equal(document.activeElement, phone);
    assert.equal(phone.getAttribute("aria-invalid"), "true");
    const descriptions = phone.getAttribute("aria-describedby").split(" ").map(id => document.getElementById(id).textContent);
    assert.ok(descriptions.includes(getPhoneError("not available")));
    assert.equal(phone.validationMessage, getPhoneError("not available"));
    await fill('[name="phone"]', "+44 (20) 7946 0123 ext. 12");
    assert.equal(phone.validationMessage, "");
    assert.equal(phone.getAttribute("aria-invalid"), "false");
    await submit();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].phone, "+44 (20) 7946 0123 ext. 12");
    assert.equal(requests[0].contactPreference, name === "Contact" ? "" : "Email");
    assert.equal(validateEnquiry(requests[0]).ok, true);
  });
}

test("Planner retains the guest's explicit WhatsApp preference", async () => {
  await forms.find(([name]) => name === "Planner")[1]();
  await details();
  const select = [...document.querySelectorAll("select")].find(input => input.labels[0].textContent.includes("Preferred contact"));
  await act(async () => { select.value = "WhatsApp"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  await submit();
  assert.equal(requests[0].contactPreference, "WhatsApp");
});

for (const [name, setup] of forms) {
  test(`${name}: displays server phone validation feedback`, async () => {
    await setup();
    await details();
    response = { error: "Please review your details.", fields: { phone: getPhoneError("abc") } };
    await submit();
    assert.equal(requests.length, 1);
    assert.ok(document.body.textContent.includes(response.fields.phone));
    assert.ok(!document.body.textContent.includes("SC-local-test"));
  });
}
