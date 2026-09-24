import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { ContactPage } from "@/features/contact/contact-page";
import { COMMERCE_CONFIG } from "@/lib/commerce/config";
import { formatPrice } from "@/lib/format-price";

export const dynamicParams = false;

type Question = { question: string; answer: React.ReactNode };
type ContentSection = {
  heading: string;
  body?: React.ReactNode;
  items?: readonly React.ReactNode[];
  questions?: readonly Question[];
};
type ContentPage = {
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  draft?: string;
  sections: readonly ContentSection[];
};

const seller = {
  name: "Marmurgranit.net Firstway Yan Orfin",
  nip: "8961104443",
  regon: "022523092",
  address: "Księcia Witolda 48 lok. A, 50-203 Wrocław",
} as const;
const emailLink = <a href={`mailto:${COMMERCE_CONFIG.contact.email}`}>{COMMERCE_CONFIG.contact.email}</a>;
const inpostPrice = formatPrice(COMMERCE_CONFIG.delivery.inpost_locker.priceGrosze);
const courierPrice = formatPrice(COMMERCE_CONFIG.delivery.courier.priceGrosze);

const pages: Record<string, ContentPage> = {
  "o-nas": {
    eyebrow: "Poznaj Mono Molds",
    title: "Mała marka dla wielkich pomysłów",
    description: "Poznaj Mono Molds - niezależną polską markę ręcznie wykonywanych form silikonowych dla cukierników.",
    intro: "Tworzymy formy silikonowe dla osób, które chcą nadawać deserom wyrazisty kształt i powtarzać dopracowany efekt bez przemysłowej skali.",
    sections: [
      { heading: "Od pomysłu do formy", body: <p>Mono Molds jest nową, niezależną marką. Każdą formę wykonujemy ręcznie w Polsce, w małych seriach. Skupiamy się na czytelnym detalu, wygodnej pracy i kształtach, które dobrze prezentują się na gotowym deserze.</p> },
      { heading: "Uczciwie o produkcie", body: <p>Formy są wykonane z silikonu. Dokładne wymiary, pojemność i zalecenia dotyczące pielęgnacji podajemy przy konkretnym produkcie. Ręczne wykonanie oznacza, że pomiędzy egzemplarzami mogą pojawić się drobne różnice, które nie wpływają na ich przeznaczenie.</p> },
      { heading: "Dopiero się rozkręcamy", body: <p>Rozwijamy katalog krok po kroku i wolimy pokazać mniej dobrze opisanych form niż obiecywać kolekcję, której jeszcze nie ma. Jeśli potrzebujesz informacji przed zakupem, napisz do nas na {emailLink}.</p> },
    ],
  },
  faq: {
    eyebrow: "Pomoc przed zakupem",
    title: "Najczęstsze pytania",
    description: "Odpowiedzi na pytania o formy Mono Molds, pielęgnację, realizację zamówień, dostawę i zwroty.",
    intro: "Krótko i konkretnie - od materiału po zwrot zamówienia. Jeśli nie znajdziesz odpowiedzi, napisz do nas.",
    sections: [
      { heading: "Formy i pielęgnacja", questions: [
        { question: "Z czego wykonane są formy?", answer: <>Formy Mono Molds są wykonane z silikonu. Dodatkowe, potwierdzone informacje o konkretnym modelu znajdziesz na jego stronie.</> },
        { question: "Do czego służą formy Mono Molds?", answer: <>Formy są przeznaczone wyłącznie do przygotowywania mrożonych monoporcji. Nie używaj ich do pieczenia.</> },
        { question: "Jak używać formy?", answer: <>Przed pierwszym użyciem umyj formę i pozostaw ją do całkowitego wyschnięcia. Napełnij ją przygotowaną masą, dokładnie zamroź deser, a następnie delikatnie wyjmij gotową monoporcję.</> },
        { question: "Jaki jest zakres temperatur?", answer: <>Materiał zachowuje właściwości w zakresie od -60°C do +250°C, ale forma nie jest przeznaczona do pieczenia. Podczas kontaktu z żywnością nie przekraczaj +120°C.</> },
        { question: "Jak myć i przechowywać formę?", answer: <>Formę możesz myć ręcznie lub w zmywarce. Przed przechowywaniem pozostaw ją do całkowitego wyschnięcia. Nie wymaga dodatkowego przygotowania.</> },
        { question: "Jak wykończyć monoporcję?", answer: <>Po wyjęciu z formy zamrożoną monoporcję możesz pokryć czekoladą albo udekorować zamszem cukierniczym.</> },
        { question: "Czy każda forma wygląda identycznie?", answer: <>Formy wykonujemy ręcznie, dlatego pomiędzy egzemplarzami mogą wystąpić niewielkie różnice, które nie wpływają na ich przeznaczenie.</> },
      ] },
      { heading: "Realizacja i dostawa", questions: [
        { question: "Ile trwa realizacja?", answer: <>Standardowo przygotowanie zamówienia obejmującego do {COMMERCE_CONFIG.largeOrderThresholdItems} form zajmuje do {COMMERCE_CONFIG.standardFulfilmentDays} dni. Przy większym zamówieniu termin potwierdzimy indywidualnie.</> },
        { question: "Jak mogę odebrać zamówienie?", answer: <>Wysyłamy zamówienia na terenie Polski do Paczkomatów InPost oraz kurierem InPost. Szczegóły i aktualne ceny znajdziesz na stronie dostawy.</> },
        { question: "Kiedy dostawa jest bezpłatna?", answer: <>Dostawa jest bezpłatna od {COMMERCE_CONFIG.freeShippingMinPhysicalItems} fizycznych form. Liczymy także formy znajdujące się w zestawach.</> },
      ] },
      { heading: "Zwroty i reklamacje", questions: [
        { question: "Czy mogę zwrócić formę?", answer: <>Tak. Konsument może odstąpić od umowy zawartej online w ciągu 14 dni od otrzymania zamówienia. Bezpośredni koszt odesłania ponosi klient.</> },
        { question: "Co zrobić, jeśli produkt ma wadę?", answer: <>Napisz na {emailLink}, podając numer zamówienia i opis problemu. Odpowiemy na reklamację w ciągu 14 dni od jej otrzymania.</> },
      ] },
    ],
  },
  "dostawa-i-zwroty": {
    eyebrow: "Informacje o zamówieniu",
    title: "Dostawa i zwroty",
    description: "Czas realizacji, metody i ceny dostawy oraz zasady odstąpienia od umowy w sklepie Mono Molds.",
    intro: "Zamówienia realizujemy na terenie Polski. Poniżej znajdziesz aktualne metody dostawy i najważniejsze zasady zwrotu.",
    sections: [
      { heading: "Realizacja", body: <p>Standardowy czas przygotowania zamówienia obejmującego do {COMMERCE_CONFIG.largeOrderThresholdItems} form wynosi do {COMMERCE_CONFIG.standardFulfilmentDays} dni. Przy większej liczbie form termin może się wydłużyć - poinformujemy o tym przed złożeniem zamówienia i skontaktujemy się w sprawie szczegółów.</p> },
      { heading: "Metody dostawy", items: [<>Paczkomat InPost - {inpostPrice}</>, <>Kurier InPost - {courierPrice}</>, <>Bezpłatna dostawa od {COMMERCE_CONFIG.freeShippingMinPhysicalItems} fizycznych form, także kupionych w zestawach.</>] },
      { heading: "Odstąpienie od umowy", body: <><p>Jeśli kupujesz jako konsument, możesz odstąpić od umowy zawartej online bez podawania przyczyny w ciągu 14 dni od otrzymania produktu. Aby zachować termin, wyślij oświadczenie przed jego upływem na {emailLink}.</p><p>Po odstąpieniu odeślij produkt w ciągu 14 dni na adres: {seller.name}, {seller.address}. Bezpośredni koszt opakowania i odesłania ponosi klient.</p></> },
      { heading: "Zwrot płatności", body: <p>Zwrócimy cenę produktu oraz koszt najtańszego zwykłego sposobu dostawy oferowanego przy zakupie, nie później niż 14 dni od otrzymania oświadczenia. Możemy wstrzymać zwrot do chwili otrzymania produktu lub dowodu jego odesłania. Klient odpowiada za zmniejszenie wartości wynikające z korzystania wykraczającego poza sprawdzenie charakteru, cech i działania produktu.</p> },
      { heading: "Reklamacje", body: <p>Jeśli produkt jest niezgodny z umową, napisz na {emailLink}. Podaj numer zamówienia, opisz problem i wskaż oczekiwany sposób rozwiązania. Odpowiemy na reklamację w ciągu 14 dni od jej otrzymania.</p> },
    ],
  },
  regulamin: {
    eyebrow: "Dokument sklepu",
    title: "Regulamin sklepu",
    description: "Projekt regulaminu sklepu internetowego Mono Molds - zasady zamówień, dostawy, płatności, zwrotów i reklamacji.",
    intro: "To roboczy projekt regulaminu. Wymaga weryfikacji prawnej i księgowej przed uruchomieniem sprzedaży.",
    draft: "Ta treść nie jest jeszcze finalnym regulaminem. Sprzedaż produkcyjna wymaga zatwierdzenia dokumentu.",
    sections: [
      { heading: "1. Sprzedawca i kontakt", body: <><p>Sprzedawcą jest {seller.name}, adres: {seller.address}, NIP: {seller.nip}, REGON: {seller.regon}. Mono Molds jest marką prowadzoną przez sprzedawcę.</p><p>Kontakt w sprawach zamówień: {emailLink}. Instagram jest kanałem pomocniczym i nie zastępuje formalnego kontaktu e-mail. Adres zwrotów jest taki sam jak adres sprzedawcy.</p></> },
      { heading: "2. Sklep i produkty", body: <p>Sklep prowadzi sprzedaż form silikonowych i zestawów na terenie Polski, w walucie PLN. Informacje o cenie brutto, cechach, dostępności i przewidywanym czasie realizacji są prezentowane przed złożeniem zamówienia. Ręczne wykonanie może powodować drobne różnice pomiędzy egzemplarzami.</p> },
      { heading: "3. Składanie zamówień", body: <p>Zamówienie można złożyć bez zakładania konta. Klient dodaje produkty do koszyka, wybiera dostawę, podaje dane potrzebne do realizacji, akceptuje regulamin i zatwierdza zamówienie przyciskiem wskazującym obowiązek zapłaty. Przed zatwierdzeniem można poprawić dane i zawartość koszyka.</p> },
      { heading: "4. Ceny i płatność", body: <p>Ceny produktów i końcowe podsumowanie są podawane w złotych polskich jako kwoty brutto. Dostępna metoda płatności, operator płatności i moment zawarcia umowy zostaną wskazane w finalnej wersji regulaminu przed uruchomieniem płatności.</p> },
      { heading: "5. Realizacja i dostawa", body: <p>Standardowy czas przygotowania zamówienia do {COMMERCE_CONFIG.largeOrderThresholdItems} form wynosi do {COMMERCE_CONFIG.standardFulfilmentDays} dni. Większe zamówienie wymaga potwierdzenia możliwego wydłużenia terminu. Dostawa odbywa się na terenie Polski do Paczkomatu InPost lub kurierem InPost, według stawek pokazanych w podsumowaniu zamówienia.</p> },
      { heading: "6. Odstąpienie od umowy", body: <p>Konsument może odstąpić od umowy zawartej online bez podawania przyczyny w ciągu 14 dni od otrzymania produktu. Oświadczenie można przesłać na {emailLink}. Konsument ponosi bezpośredni koszt zwrotu produktu na adres {seller.address}. Szczegółowy przebieg i zasady zwrotu płatności opisujemy na stronie <Link href="/dostawa-i-zwroty">Dostawa i zwroty</Link>.</p> },
      { heading: "7. Reklamacje", body: <p>Sprzedawca odpowiada za zgodność produktu z umową na zasadach wynikających z obowiązujących przepisów. Reklamację można przesłać na {emailLink}, podając numer zamówienia, opis niezgodności i oczekiwane rozwiązanie. Odpowiedź zostanie udzielona w ciągu 14 dni od otrzymania reklamacji.</p> },
      { heading: "8. Dane osobowe i postanowienia końcowe", body: <p>Zasady przetwarzania danych opisuje <Link href="/polityka-prywatnosci">polityka prywatności</Link>. Finalny regulamin wskaże datę wejścia w życie, dostępne metody płatności, moment zawarcia umowy oraz procedurę zmian dokumentu.</p> },
    ],
  },
  "polityka-prywatnosci": {
    eyebrow: "Dokument sklepu",
    title: "Polityka prywatności",
    description: "Projekt polityki prywatności Mono Molds - cele, podstawy i zakres przetwarzania danych klientów sklepu.",
    intro: "To roboczy projekt polityki prywatności. Wymaga ostatecznej weryfikacji używanych dostawców przed uruchomieniem sprzedaży.",
    draft: "Ta treść nie jest jeszcze finalną polityką prywatności. Sprzedaż produkcyjna wymaga zatwierdzenia dokumentu.",
    sections: [
      { heading: "1. Administrator danych", body: <p>Administratorem danych jest {seller.name}, adres: {seller.address}, NIP: {seller.nip}, REGON: {seller.regon}. Kontakt w sprawach prywatności: {emailLink}.</p> },
      { heading: "2. Jakie dane i po co przetwarzamy", items: [<>Dane kontaktowe i dane dostawy - aby przyjąć i zrealizować zamówienie.</>, <>Dane do faktury - jeśli klient prosi o jej wystawienie oraz w celu wykonania obowiązków podatkowych i księgowych.</>, <>Treść korespondencji - aby odpowiedzieć na pytanie, reklamację lub oświadczenie o odstąpieniu.</>, <>Dane techniczne, takie jak adres IP i informacje o żądaniu - w zakresie niezbędnym do bezpieczeństwa, działania i diagnozowania sklepu.</>] },
      { heading: "3. Podstawy przetwarzania", body: <p>Dane zamówienia przetwarzamy w celu zawarcia i wykonania umowy. Dane wymagane przez przepisy podatkowe i rachunkowe - w celu wykonania obowiązków prawnych. Dane potrzebne do bezpieczeństwa, obrony lub dochodzenia roszczeń oraz obsługi zwykłej korespondencji - na podstawie prawnie uzasadnionego interesu administratora.</p> },
      { heading: "4. Odbiorcy danych", body: <><p>W działającym sklepie dane techniczne i dane zamówień mogą być przetwarzane przez dostawców hostingu i infrastruktury: Vercel oraz Supabase. Korespondencja z formularza kontaktowego jest wysyłana przez Resend i odbierana w Proton Mail. Dane potrzebne do dostawy mogą zostać przekazane wybranemu przewoźnikowi InPost.</p><p>Dostawca płatności zostanie dopisany po uruchomieniu tej integracji. Nie sprzedajemy danych osobowych.</p></> },
      { heading: "5. Jak długo przechowujemy dane", body: <p>Dane przechowujemy nie dłużej, niż wymaga tego cel ich zebrania, a następnie przez okres wynikający z obowiązków podatkowych, rachunkowych lub możliwego dochodzenia roszczeń. Korespondencję niezwiązaną z zamówieniem usuwamy, gdy sprawa jest zakończona i dane nie są już potrzebne. Dokładne okresy zostaną potwierdzone w finalnej wersji dokumentu.</p> },
      { heading: "6. Twoje prawa", body: <p>Możesz zażądać dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, a w odpowiednich sytuacjach także przeniesienia danych albo wnieść sprzeciw. Masz również prawo złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych. Zakres każdego prawa zależy od podstawy i celu przetwarzania.</p> },
      { heading: "7. Koszyk i usługi zewnętrzne", body: <p>Koszyk jest zapisywany lokalnie w przeglądarce, aby zachować jego zawartość pomiędzy wizytami. Przed uruchomieniem analityki, marketingu, płatności lub dodatkowych narzędzi dokument zostanie uzupełniony o używane technologie, dostawców, podstawy prawne oraz - jeśli będzie to wymagane - mechanizm zgody.</p> },
    ],
  },
  kontakt: {
    eyebrow: "Kontakt",
    title: "Napisz do nas",
    description: "Dane kontaktowe Mono Molds. Pełna strona kontaktowa jest w przygotowaniu.",
    intro: "Pełna strona kontaktowa jest w przygotowaniu. W sprawie produktów lub zamówienia możesz już napisać do nas bezpośrednio.",
    draft: "To tymczasowy kontakt e-mail. Pełna strona kontaktowa powstanie w osobnym etapie.",
    sections: [
      { heading: "Kontakt e-mail", body: <p>Napisz na {emailLink}. Formularz kontaktowy i informację o przewidywanym czasie odpowiedzi dodamy w osobnym etapie.</p> },
    ],
  },
};

function sectionId(heading: string) {
  return heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
}

function getPage(key: string) {
  if (!Object.hasOwn(pages, key)) notFound();
  return pages[key];
}

export function generateStaticParams() {
  return Object.keys(pages).map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const page = getPage((await params).section);
  return { title: page.title, description: page.description, robots: page.draft ? { index: false, follow: false } : undefined };
}

export default async function ContentPage({ params }: { params: Promise<{ section: string }> }) {
  const key = (await params).section;
  if (key === "kontakt") return <ContactPage email={COMMERCE_CONFIG.contact.email} />;
  const page = getPage(key);

  return <article className="content-page">
    <header className="site-container content-page-header">
      <p className="eyebrow">{page.eyebrow}</p>
      <h1>{page.title}</h1>
      <p>{page.intro}</p>
    </header>

    <div className="site-container content-page-layout">
      <aside className="content-page-aside">
        <p>Na tej stronie</p>
        <ol>{page.sections.map((section) => <li key={section.heading}><a href={`#${sectionId(section.heading)}`}>{section.heading}</a></li>)}</ol>
      </aside>

      <div className="content-page-body">
        {page.draft ? <Notice title="Treść robocza" announce={false}>{page.draft}</Notice> : null}
        {page.sections.map((section) => <section key={section.heading} id={sectionId(section.heading)}>
          <h2>{section.heading}</h2>
          {section.body}
          {section.items ? <ul>{section.items.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
          {section.questions ? <div className="content-faq-list">{section.questions.map((item) => <details key={item.question}><summary>{item.question}</summary><div>{item.answer}</div></details>)}</div> : null}
        </section>)}
        <div className="content-page-actions">
          <LinkButton href="/sklep">Zobacz formy <span aria-hidden="true" className="ui-arrow">→</span></LinkButton>
          <a href={`mailto:${COMMERCE_CONFIG.contact.email}`}>Masz pytanie? Napisz do nas</a>
        </div>
      </div>
    </div>
  </article>;
}
