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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmission(initialState);
      return;
    }

    setSubmission({ status: "sending" });
    queueMicrotask(() => {
      setSubmission({
        status: "error",
        message:
          "Formularz nie jest jeszcze podłączony do obsługi zgłoszeń. Wyślij wiadomość bezpośrednio na podany adres e-mail.",
      });
    });
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
                required
                error={errors.firstName}
              />
              <TextField
                id="contact-last-name"
                name="lastName"
                label="Nazwisko"
                autoComplete="family-name"
              />
            </div>
            <TextField
              id="contact-email"
              name="email"
              label="E-mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              error={errors.email}
            />
            <TextField
              id="contact-order-number"
              name="orderNumber"
              label="Numer zamówienia"
              hint="Opcjonalnie. Jeśli go nie masz, sami odszukamy twoje zamówienie."
              autoComplete="off"
            />
            <TextField
              id="contact-subject"
              name="subject"
              label="Temat wiadomości"
              required
              error={errors.subject}
            />
            <TextArea
              id="contact-message"
              name="message"
              label="Wiadomość"
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
