import { COMMERCE_CONFIG } from "@/lib/commerce/config";

export type ContactSubmission = {
  firstName: string;
  lastName: string;
  email: string;
  orderNumber: string;
  subject: string;
  message: string;
};

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function field(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}

export function parseContactSubmission(value: unknown): ContactSubmission | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const firstName = field(data.firstName, 100);
  const lastName = field(data.lastName, 100);
  const email = field(data.email, 254);
  const orderNumber = field(data.orderNumber, 100);
  const subject = field(data.subject, 150);
  const message = field(data.message, 10000);

  if (
    !firstName || lastName === null || !email || !emailPattern.test(email) ||
    orderNumber === null || !subject || !message || data.consent !== true ||
    typeof data.website !== "string" || data.website.length > 0 ||
    /[\r\n]/.test(firstName + lastName + email + orderNumber + subject)
  ) return null;

  return { firstName, lastName, email, orderNumber, subject, message };
}

export async function sendContactEmail(submission: ContactSubmission, apiKey: string): Promise<boolean> {
  const { firstName, lastName, email, orderNumber, subject, message } = submission;
  const text = [
    `Nowa wiadomość z formularza kontaktowego MonoMolds`,
    `Imię i nazwisko: ${[firstName, lastName].filter(Boolean).join(" ")}`,
    `Adres e-mail: ${email}`,
    `Numer zamówienia: ${orderNumber || "Nie podano"}`,
    `Temat: ${subject}`,
    "",
    "Wiadomość:",
    message,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `MonoMolds <${COMMERCE_CONFIG.contact.email}>`,
      to: [COMMERCE_CONFIG.contact.email],
      reply_to: email,
      subject: `Formularz kontaktowy: ${subject}`,
      text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  return response.ok;
}
