"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Checkbox, TextArea, TextField } from "@/components/ui/fields";
import { Notice } from "@/components/ui/feedback";

type ContactField = "firstName" | "email" | "subject" | "message" | "consent";
type ContactErrors = Partial<Record<ContactField, string>>;
type SubmissionState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const initialState: SubmissionState = { status: "idle" };

function validate(form: HTMLFormElement): ContactErrors {
  const errors: ContactErrors = {};
  const firstName = form.elements.namedItem("firstName") as HTMLInputElement;
  const email = form.elements.namedItem("email") as HTMLInputElement;
  const subject = form.elements.namedItem("subject") as HTMLInputElement;
  const message = form.elements.namedItem("message") as HTMLTextAreaElement;
  const consent = form.elements.namedItem("consent") as HTMLInputElement;

  if (!firstName.value.trim()) errors.firstName = "Podaj imię.";
  if (!email.value.trim()) errors.email = "Podaj adres e-mail.";
  else if (!email.validity.valid) errors.email = "Podaj poprawny adres e-mail.";
  if (!subject.value.trim()) errors.subject = "Podaj temat wiadomości.";
  if (!message.value.trim()) errors.message = "Napisz wiadomość.";
  if (!consent.checked) errors.consent = "Zaznacz zgodę na przetwarzanie danych.";
  return errors;
}

export function ContactPage({ email }: { email: string }) {
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submission, setSubmission] = useState<SubmissionState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmission(initialState);
      return;
    }

    const formData = new FormData(form);
    setSubmission({ status: "sending" });
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          orderNumber: formData.get("orderNumber"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          consent: formData.get("consent") === "on",
          website: formData.get("website"),
        }),
      });
      const result: { message?: string } = await response.json();
      if (!response.ok) {
        setSubmission({ status: "error", message: result.message ?? "Nie udało się wysłać wiadomości. Spróbuj ponownie." });
        return;
      }
      form.reset();
      setErrors({});
      setSubmission({ status: "success", message: result.message ?? "Wiadomość została wysłana." });
    } catch {
      setSubmission({ status: "error", message: "Nie udało się połączyć. Spróbuj ponownie lub napisz do nas bezpośrednio." });
    }
  }

  const isSending = submission.status === "sending";

  return (
    <div className="site-container contact-page">
      <header className="contact-heading">
        <p className="eyebrow">MonoMolds</p>
        <h1>Kontakt</h1>
        <p>
          Masz pytanie o produkt, czas realizacji,
          zamówienie albo spersonalizowaną formę? Napisz - chętnie pomożemy.
        </p>
      </header>

      <div className="contact-layout">
        <section className="contact-form-panel" aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading">Napisz do nas</h2>
          <p className="ui-field-note">Pola oznaczone jako wymagane muszą zostać uzupełnione.</p>
          <form className="contact-form" noValidate onSubmit={handleSubmit}>
            <div className="contact-form-name">
              <TextField
                id="contact-first-name"
                name="firstName"
                label="Imię"
                autoComplete="given-name"
                maxLength={100}
                required
                error={errors.firstName}
              />
              <TextField
                id="contact-last-name"
                name="lastName"
                label="Nazwisko"
                autoComplete="family-name"
                maxLength={100}
              />
            </div>
            <TextField
              id="contact-email"
              name="email"
              label="E-mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              required
              error={errors.email}
            />
            <TextField
              id="contact-order-number"
              name="orderNumber"
              label="Numer zamówienia"
              hint="Opcjonalnie. Jeśli go nie masz, sami odszukamy twoje zamówienie."
              autoComplete="off"
              maxLength={100}
            />
            <TextField
              id="contact-subject"
              name="subject"
              label="Temat wiadomości"
              maxLength={150}
              required
              error={errors.subject}
            />
            <TextArea
              id="contact-message"
              name="message"
              label="Wiadomość"
              maxLength={10000}
              required
              error={errors.message}
            />

            <Checkbox
              id="contact-consent"
              name="consent"
              label="Wyrażam zgodę na przetwarzanie moich danych w celu obsługi zapytania."
              required
              error={errors.consent}
            />
            <input type="hidden" name="website" value="" readOnly />
            <p className="contact-privacy">
              Szczegóły znajdziesz w{" "}
              <Link href="/polityka-prywatnosci">polityce prywatności</Link>.
            </p>

            {submission.status === "error" && (
              <Notice tone="error" title="Nie udało się wysłać wiadomości">
                {submission.message}
              </Notice>
            )}
            {submission.status === "success" && (
              <Notice tone="success" title="Otrzymaliśmy Twoją wiadomość">
                {submission.message}
              </Notice>
            )}

            <button
              className="ui-button ui-button--primary contact-submit"
              type="submit"
              disabled={isSending}
              aria-busy={isSending}
            >
              {isSending ? "Wysyłanie..." : "Wyślij wiadomość"}
            </button>
          </form>
        </section>

        <aside className="contact-details" aria-labelledby="contact-details-heading">
          <h2 id="contact-details-heading">Możesz też napisać e-mail</h2>
          <a className="contact-email" href={`mailto:${email}`}>
            {email}
          </a>
          <p>
            Przy spersonalizowanej formie opisz swoją wizję, inspiracje, pojemność,
            styl i ważne wymiary.
          </p>
        </aside>
      </div>
    </div>
  );
}
