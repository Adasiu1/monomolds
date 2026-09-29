import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/contact/route.ts";

const validSubmission = {
  firstName: "Anna",
  lastName: "Nowak",
  email: "anna@example.com",
  orderNumber: "MON-000123",
  subject: "Pytanie o formę",
  message: "Czy jest dostępna?",
  consent: true,
  website: "",
  turnstileToken: "test-token",
};

function request(body) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("rejects invalid contact submissions before sending", async () => {
  for (const body of [
    { ...validSubmission, email: "invalid" },
    { ...validSubmission, consent: false },
    { ...validSubmission, website: "bot" },
    { ...validSubmission, subject: "hello\nBcc: attacker@example.com" },
  ]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "INVALID_INPUT");
  }
});

test("does not send email without a verified Turnstile token", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "re_test_only";
  process.env.TURNSTILE_SECRET_KEY = "turnstile_test_only";
  let emailCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("siteverify")) return Response.json({ success: false });
    emailCalls++;
    return Response.json({ id: "unexpected" });
  };
  try {
    for (const body of [{ ...validSubmission, turnstileToken: "" }, validSubmission]) {
      const response = await POST(request(body));
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "CAPTCHA_FAILED");
    }
    assert.equal(emailCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
  }
});

test("sends a contact submission to Proton with the visitor as Reply-To", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "re_test_only";
  process.env.TURNSTILE_SECRET_KEY = "turnstile_test_only";
  let sent;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("siteverify")) {
      assert.equal(new URLSearchParams(options.body).get("response"), "test-token");
      return Response.json({ success: true, hostname: "localhost" });
    }
    sent = options;
    return new Response(JSON.stringify({ id: "test-id" }), { status: 200 });
  };

  try {
    const response = await POST(request(validSubmission));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).code, "SENT");
    const email = JSON.parse(sent.body);
    assert.deepEqual(email.to, ["info@monomolds.com"]);
    assert.equal(email.from, "MonoMolds <info@monomolds.com>");
    assert.equal(email.reply_to, "anna@example.com");
    assert.match(email.text, /MON-000123/);
    assert.match(email.text, /Czy jest dostępna\?/);
    assert.equal(sent.headers.Authorization, "Bearer re_test_only");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousSecret;
  }
});

test("does not report success when the Resend key is missing", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const previousError = console.error;
  console.error = () => {};
  try {
    const response = await POST(request(validSubmission));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "UNAVAILABLE");
  } finally {
    console.error = previousError;
    if (previousKey !== undefined) process.env.RESEND_API_KEY = previousKey;
  }
});
