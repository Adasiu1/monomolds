import { Showcase } from "./showcase";
import "./showcase.css";

// Keep this test page out of search results. Its examples can be removed separately.
export const metadata = {
  title: "Pracownia UI - test komponentów",
  robots: { index: false, follow: false },
};

export default function UIKitPage() {
  return <div className="site-container ui-kit">
    <header className="ui-kit-intro"><p className="eyebrow">KAN-14 / środowisko demonstracyjne</p>
      <h1>Pracownia UI</h1><p>Przyciski, pola i stany, z których zbudujemy sklep. Wszystkie produkty i ceny na tej stronie są przykładowe. Formularz niczego nie wysyła ani nie zapisuje.</p>
      <nav aria-label="Sekcje pracowni" className="ui-row"><a href="#przyciski">Przyciski</a><a href="#formularz">Formularz</a><a href="#produkty">Karty i ceny</a><a href="#komunikaty">Komunikaty</a><a href="#weryfikacja">Jak testować</a></nav>
    </header>
    <Showcase />
    <section id="weryfikacja" className="ui-kit-section"><h2>Jak testować</h2>
      <ol className="ui-checklist"><li>Przejdź przez stronę klawiszem Tab i Shift+Tab. Fokus powinien być zawsze widoczny. Użyj Enter dla przycisków i linków, spacji dla pola wyboru.</li><li>Wyślij pusty formularz. Następnie popraw dane i sprawdź wynik udany oraz błąd. Dane pozostają w polach po błędzie.</li><li>Sprawdź przyciski podczas wczytywania, ponowienie próby oraz puste wyniki. Żadna z tych akcji nie składa zamówienia.</li><li>Sprawdź szerokości 390, 768, 1024 i 1440 px oraz powiększenie 200%. Nic nie powinno wychodzić poza ekran.</li><li>Włącz ograniczenie ruchu w systemie. Przyciski i zdjęcia nie powinny się poruszać. Stan nadal rozpoznasz po tekście, obramowaniu i fokusie.</li></ol>
    </section>
  </div>;
}
