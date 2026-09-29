import { parseContactSubmission, sendContactEmail } from "@/lib/contact/contact-email";

const maxBodyBytes = 16000;

function result(status: number, code: string, message: string) {
  return Response.json({ code, message }, { status });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return result(415, "INVALID_CONTENT_TYPE", "Nieprawidłowy format zgłoszenia.");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > maxBodyBytes) {
    return result(413, "TOO_LARGE", "Wiadomość jest za długa.");
  }

  let submission;
  let turnstileToken: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > maxBodyBytes) {
      return result(413, "TOO_LARGE", "Wiadomość jest za długa.");
    }
    const payload = JSON.parse(body);
    submission = parseContactSubmission(payload);
    turnstileToken = payload?.turnstileToken;
  } catch {
    return result(400, "INVALID_INPUT", "Sprawdź dane formularza i spróbuj ponownie.");
  }
  if (!submission) {
    return result(400, "INVALID_INPUT", "Sprawdź dane formularza i spróbuj ponownie.");
  }
  if (typeof turnstileToken !== "string" || !turnstileToken || turnstileToken.length > 2048) {
    return result(403, "CAPTCHA_FAILED", "Nie udało się potwierdzić weryfikacji. Spróbuj ponownie.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("contact_email_not_configured");
    return result(503, "UNAVAILABLE", "Wysyłanie jest chwilowo niedostępne. Napisz do nas bezpośrednio na adres e-mail.");
  }
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) {
    console.error("contact_turnstile_not_configured");
    return result(503, "UNAVAILABLE", "Wysyłanie jest chwilowo niedostępne. Napisz do nas bezpośrednio na adres e-mail.");
  }

  try {
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: turnstileSecret, response: turnstileToken }),
      signal: AbortSignal.timeout(10000),
    });
    if (!verification.ok) throw new Error("siteverify_unavailable");
    const verdict: { success?: boolean; hostname?: string } = await verification.json();
    if (!verdict.success || (
      process.env.NODE_ENV === "production" &&
      verdict.hostname !== "monomolds.com" && verdict.hostname !== "www.monomolds.com"
    )) {
      return result(403, "CAPTCHA_FAILED", "Nie udało się potwierdzić weryfikacji. Spróbuj ponownie.");
    }
  } catch {
    console.error("contact_turnstile_unavailable");
    return result(503, "CAPTCHA_UNAVAILABLE", "Weryfikacja jest chwilowo niedostępna. Spróbuj ponownie później.");
  }

  try {
    if (await sendContactEmail(submission, apiKey)) {
      return result(200, "SENT", "Wiadomość została wysłana. Odpowiemy na podany adres e-mail.");
    }
    console.error("contact_email_provider_rejected");
  } catch {
    console.error("contact_email_provider_unavailable");
  }
  return result(502, "SEND_FAILED", "Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz do nas bezpośrednio.");
}
