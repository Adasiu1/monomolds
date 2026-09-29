"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import { Checkbox, TextArea, TextField } from "@/components/ui/fields";
import { Notice } from "@/components/ui/feedback";

type ContactField = "firstName" | "email" | "subject" | "message" | "consent";
type ContactErrors = Partial<Record<ContactField, string>>;
type SubmissionState =
  | { status: "idle" }
  | { status: "verifying" }
  | { status: "sending" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

const initialState: SubmissionState = { status: "idle" };
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    execution: "execute";
    appearance: "interaction-only";
    callback: (token: string) => void;
    "before-interactive-callback": () => void;
    "after-interactive-callback": () => void;
    "error-callback": () => void;
  }) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

function turnstile(): Turnstile | undefined {
  return (window as Window & { turnstile?: Turnstile }).turnstile;
}

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
  const [scriptReady, setScriptReady] = useState(false);
  const [challengeVisible, setChallengeVisible] = useState(false);
  const challengeRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingRef = useRef<{ resolve: (token: string) => void; reject: (reason?: unknown) => void } | null>(null);

  useEffect(() => {
    const api = turnstile();
    const container = challengeRef.current;
    if (!scriptReady || !siteKey || !api || !container) return;
    const widgetId = api.render(container, {
      sitekey: siteKey,
      execution: "execute",
      appearance: "interaction-only",
      callback: (token) => pendingRef.current?.resolve(token),
      "before-interactive-callback": () => setChallengeVisible(true),
      "after-interactive-callback": () => setChallengeVisible(false),
      "error-callback": () => pendingRef.current?.reject(new Error("turnstile_failed")),
    });
    widgetIdRef.current = widgetId;
    return () => {
      pendingRef.current?.reject(new Error("turnstile_closed"));
      api.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [scriptReady]);

  useEffect(() => {
    if (challengeVisible) popupRef.current?.focus();
  }, [challengeVisible]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmission(initialState);
      return;
    }

    const api = turnstile();
    const widgetId = widgetIdRef.current;
    if (!api || !widgetId) {
      setSubmission({ status: "error", message: "Weryfikacja jest chwilowo niedostępna. Spróbuj ponownie później." });
      return;
    }

    const formData = new FormData(form);
    setSubmission({ status: "verifying" });
    try {
      const turnstileToken = await new Promise<string>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        api.execute(widgetId);
      });
      setChallengeVisible(false);
      setSubmission({ status: "sending" });
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
          turnstileToken,
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
    } catch (error) {
      setSubmission(error === null ? initialState : {
        status: "error",
        message: "Nie udało się zweryfikować lub połączyć. Spróbuj ponownie lub napisz do nas bezpośrednio.",
      });
    } finally {
      pendingRef.current = null;
      setChallengeVisible(false);
      api.reset(widgetId);
    }
  }

  const isSending = submission.status === "sending" || submission.status === "verifying";

  return (
    <div className="site-container contact-page">
      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
      )}
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

            <div
              ref={popupRef}
              className={`contact-challenge${challengeVisible ? " contact-challenge--open" : ""}`}
              role={challengeVisible ? "dialog" : undefined}
              aria-label={challengeVisible ? "Potwierdź, że nie jesteś robotem" : undefined}
              tabIndex={challengeVisible ? -1 : undefined}
              onKeyDown={(event) => {
                if (event.key === "Escape") pendingRef.current?.reject(null);
              }}
            >
              {challengeVisible && <p>Potwierdź, że nie jesteś robotem.</p>}
              <div ref={challengeRef} />
              {challengeVisible && (
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={() => pendingRef.current?.reject(null)}
                >
                  Anuluj
                </button>
              )}
            </div>

            <button
              className="ui-button ui-button--primary contact-submit"
              type="submit"
              disabled={isSending}
              aria-busy={isSending}
            >
              {submission.status === "verifying" ? "Weryfikowanie..." : submission.status === "sending" ? "Wysyłanie..." : "Wyślij wiadomość"}
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
