"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { EmptyState, LoadingState, Notice, ProductCardSkeleton } from "@/components/ui/feedback";
import { ProductCard, type ProductCardData } from "@/components/ui/product-card";
import { Price } from "@/components/ui/price";

// Made-up test examples, not the store's real products or prices.
const products: ProductCardData[] = [
  { name: "Forma Diament 100 ml", description: "Przykładowy produkt - cena demonstracyjna.", amountGrosze: 5000, available: true, href: "#demo-szczegoly" },
  { name: "Zestaw form do dekoracji świątecznych - gwiazdy i małe choinki", description: "Przykładowy zestaw - test długiej nazwy i obniżki.", amountGrosze: 25000, originalAmountGrosze: 30000, lowest30DaysGrosze: 27000, available: true, href: "#demo-szczegoly" },
  { name: "Forma Miś 130ml", description: "Przykład niedostępnego produktu.", amountGrosze: 6000, available: false, href: "#demo-szczegoly" },
];

type Result = "idle" | "loading" | "success" | "error";

/** Interactive manual test area. This fixture never calls an API or stores data. */
export function Showcase() {
  const [presses, setPresses] = useState(0);
  const [selected, setSelected] = useState(false);
  const [result, setResult] = useState<Result>("idle");
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});
  const [catalogue, setCatalogue] = useState<"ready" | "loading" | "empty" | "error">("ready");
  const formTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Cancel demo delays when leaving this page. Nothing is saved or sent to a server.
  useEffect(() => () => {
    if (formTimer.current) clearTimeout(formTimer.current);
    if (catalogueTimer.current) clearTimeout(catalogueTimer.current);
  }, []);

  // Check the form, then imitate the slow success or failure chosen by the visitor.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formTimer.current) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const nextErrors = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : "Wpisz poprawny adres e-mail, np. anna@example.com.",
      consent: data.get("consent") ? undefined : "Zaznacz pole, aby przetestować formularz.",
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.consent) {
      setResult("idle");
      const field = event.currentTarget.elements.namedItem(nextErrors.email ? "email" : "consent");
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setResult("loading");
    formTimer.current = setTimeout(() => {
      setResult(data.get("outcome") === "error" ? "error" : "success");
      formTimer.current = null;
    }, 1200);
  }

  function resetForm() {
    if (formTimer.current) clearTimeout(formTimer.current);
    formTimer.current = null;
    formRef.current?.reset();
    setErrors({});
    setResult("idle");
  }

  // Briefly show loading shapes before bringing back the sample cards.
  function loadCatalogue() {
    if (catalogueTimer.current) return;
    setCatalogue("loading");
    catalogueTimer.current = setTimeout(() => { setCatalogue("ready"); catalogueTimer.current = null; }, 1200);
  }

  return <>
    <section id="przyciski" className="ui-kit-section"><p className="eyebrow">01 / działania</p><h2>Jedna rodzina przycisków</h2><p className="ui-muted">Najedź kursorem, naciśnij lub użyj klawiatury. Kliknięcia liczymy tylko tutaj.</p>
      <div className="ui-row"><Button onClick={() => setPresses(n => n + 1)}>Główny przycisk</Button><Button variant="secondary" onClick={() => setPresses(n => n + 1)}>Drugorzędny</Button><Button variant="ghost" onClick={() => setPresses(n => n + 1)}>Dyskretny</Button><Button variant="danger" onClick={() => setPresses(0)}>Wyzeruj licznik</Button></div>
      <div className="ui-row"><LinkButton href="/sklep" variant="secondary">Link do Form <span aria-hidden="true" className="ui-arrow">→</span></LinkButton><Button disabled>Niedostępny</Button><Button loading loadingLabel="Wczytywanie…">Wczytaj</Button><IconButton label="Przełącz przykładowy filtr" variant="secondary" aria-pressed={selected} onClick={() => setSelected(v => !v)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg></IconButton></div>
      <p role="status" className="ui-muted">Kliknięcia: {presses}. Przykładowy filtr: {selected ? "włączony" : "wyłączony"}.</p>
    </section>

    <section id="formularz" className="ui-kit-section"><p className="eyebrow">02 / wprowadzanie danych</p><h2>Pola, które wyjaśniają</h2>
      <div className="ui-demo-grid"><form ref={formRef} onSubmit={submit} noValidate className="ui-stack">
        <TextField id="demo-email" name="email" label="Adres e-mail" type="email" autoComplete="email" required hint="Dane pozostają w przeglądarce. Niczego nie wysyłamy." error={errors.email} />
        <SelectField id="demo-outcome" name="outcome" label="Wynik symulacji" defaultValue="success"><option value="success">Udana próba</option><option value="error">Błąd połączenia</option></SelectField>
        <TextArea id="demo-message" name="message" label="Wiadomość" hint="Pole opcjonalne. Sprawdź również dłuższą treść." />
        <Checkbox id="demo-consent" name="consent" label="Rozumiem, że to test komponentów" required error={errors.consent} />
        <div className="ui-row"><Button type="submit" loading={result === "loading"} loadingLabel="Testujemy…">Przetestuj formularz</Button><Button variant="ghost" onClick={resetForm}>Wyczyść</Button></div>
        <div className="ui-demo-result" role="status" aria-live="polite" aria-atomic="true">{Object.values(errors).some(Boolean) ? <p className="ui-field-error">Popraw wskazane pola i spróbuj ponownie.</p> : null}
          {result === "loading" ? "Trwa symulacja. Niczego nie wysyłamy…" : null}
          {result === "success" ? <Notice tone="success" title="Test zakończony pomyślnie" announce={false}>To tylko podgląd. Wiadomość nie została wysłana.</Notice> : null}
          {result === "error" ? <Notice tone="error" title="Symulowany błąd połączenia" announce={false}>Zachowaliśmy wpisane dane. Wybierz udaną próbę i przetestuj ponownie.</Notice> : null}
        </div>
      </form><div className="ui-stack"><TextField id="demo-disabled" label="Pole wyłączone" disabled value="Chwilowo niedostępne" /><TextField id="demo-readonly" label="Pole tylko do odczytu" readOnly value="Możesz zaznaczyć i skopiować ten tekst" /><TextField id="demo-invalid" label="Przykładowy błąd" defaultValue="niepoprawny adres" error="Wpisz poprawny adres e-mail." /><SelectField id="demo-disabled-select" label="Wybór wyłączony" disabled><option>Brak dostępnych opcji</option></SelectField><Checkbox id="demo-disabled-checkbox" label="Opcja wyłączona" disabled /></div></div>
    </section>

    <section id="produkty" className="ui-kit-section"><p className="eyebrow">03 / produkty i ceny</p><h2>Gotowe na prawdziwy katalog</h2><p className="ui-muted">To demonstracja UI, nie oferta sklepu. Brak zdjęć jest celowo widoczny.</p>
      <div className="ui-row"><Button variant="secondary" onClick={loadCatalogue} loading={catalogue === "loading"}>Wczytaj przykłady</Button><Button variant="ghost" disabled={catalogue === "loading"} onClick={() => setCatalogue("empty")}>Puste wyniki</Button><Button variant="ghost" disabled={catalogue === "loading"} onClick={() => setCatalogue("error")}>Błąd katalogu</Button></div>
      <div role="status" className="sr-only">{catalogue === "ready" ? "Wyświetlono 3 przykładowe produkty." : catalogue === "empty" ? "Brak przykładowych wyników." : ""}</div>
      {catalogue === "loading" ? <LoadingState><div className="ui-product-grid"><ProductCardSkeleton /><ProductCardSkeleton /><ProductCardSkeleton /></div></LoadingState> : null}
      {catalogue === "ready" ? <div className="ui-product-grid">{products.map(product => <ProductCard key={product.name} product={product} action={product.available ? <LinkButton variant="secondary" href="#demo-szczegoly">Zobacz przykład <span className="ui-arrow" aria-hidden="true">→</span></LinkButton> : <Button disabled>Produkt niedostępny</Button>} />)}</div> : null}
      {catalogue === "empty" ? <EmptyState title="Brak wyników" action={<Button onClick={loadCatalogue}>Pokaż przykłady</Button>}>Spróbuj ponownie z przykładowym zestawem produktów.</EmptyState> : null}
      {catalogue === "error" ? <Notice tone="error" title="Nie udało się wczytać produktów"><p>To błąd demonstracyjny. Możesz ponowić próbę.</p><Button variant="secondary" onClick={loadCatalogue}>Spróbuj ponownie</Button></Notice> : null}
      <div id="demo-szczegoly" className="ui-demo-detail"><h3>Przykładowe szczegóły</h3><p className="ui-muted">Tutaj prowadzą karty demonstracyjne. Docelowo każda karta otworzy własną stronę produktu.</p><div className="ui-row"><Price amountGrosze={12900} /><Price amountGrosze={21900} originalAmountGrosze={25900} lowest30DaysGrosze={22900} /><Price amountGrosze={0} /><Price amountGrosze={123456789} /></div></div>
    </section>

    <section id="komunikaty" className="ui-kit-section"><p className="eyebrow">04 / informacja zwrotna</p><h2>Każdy stan ma wyjaśnienie</h2><div className="ui-stack"><Notice title="Przykład informacji" announce={false}>Szczegóły tej funkcji pojawią się w kolejnym etapie.</Notice><Notice tone="success" title="Przykład potwierdzenia" announce={false}>Zmiana została przyjęta w demonstracji.</Notice><Notice tone="error" title="Przykład błędu" announce={false}>Nie udało się wykonać testowej akcji. Spróbuj ponownie.</Notice></div></section>
  </>;
}
