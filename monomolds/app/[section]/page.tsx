import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";

// Temporary navigation destinations. Dedicated routes will take precedence.
// These honest shells avoid blank pages while each feature gets its own story.
const sections: Record<string, { title: string; description: string }> = {
  zestawy: { title: "Zestawy", description: "Przygotowujemy kolekcję zestawów. Skład, ceny i dostępność podamy po uzupełnieniu katalogu. Zakupy nie są jeszcze dostępne." },
  "o-nas": { title: "O nas", description: "Przygotowujemy opowieść o MonoMolds i naszej pracowni ręcznie wykonywanych form silikonowych." },
  faq: { title: "FAQ", description: "Tutaj pojawią się odpowiedzi na pytania o formy, ich użytkowanie i zamówienia." },
  kontakt: { title: "Kontakt", description: "Strona kontaktowa jest w przygotowaniu. Na razie możesz odwiedzić nasz profil na Instagramie przez link w stopce." },
  koszyk: { title: "Koszyk", description: "Koszyk i składanie zamówień nie są jeszcze dostępne. Obecnie możesz obejrzeć stronę główną i zapowiedź kolekcji." },
  "dostawa-i-zwroty": { title: "Dostawa i zwroty", description: "Informacje o dostawie i zwrotach czekają na zatwierdzenie. Nie publikujemy jeszcze stawek ani warunków." },
  regulamin: { title: "Regulamin sklepu", description: "Regulamin jest w przygotowaniu i wymaga zatwierdzenia przed uruchomieniem sprzedaży. Ta strona nie zawiera obowiązujących warunków zakupów." },
  "polityka-prywatnosci": { title: "Polityka prywatności", description: "Dokument jest w przygotowaniu i wymaga zatwierdzenia przed uruchomieniem funkcji zbierających dane." },
};

function getSection(key: string) {
  if (!Object.hasOwn(sections, key)) notFound();
  return sections[key];
}

export function generateStaticParams() { return Object.keys(sections).map(section => ({ section })); }

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  return { title: getSection((await params).section).title, robots: { index: false, follow: false } };
}

export default async function PendingPage({ params }: { params: Promise<{ section: string }> }) {
  const section = getSection((await params).section);
  return <div className="site-container ui-page-shell"><p className="eyebrow">MonoMolds</p><h1>{section.title}</h1><Notice title="Strona w przygotowaniu" announce={false}>{section.description}</Notice><LinkButton href="/">Wróć na stronę główną <span aria-hidden="true" className="ui-arrow">→</span></LinkButton></div>;
}
