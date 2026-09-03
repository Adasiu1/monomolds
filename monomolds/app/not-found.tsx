import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export default function NotFound() {
  return <div className="site-container ui-page-shell"><p className="eyebrow">404</p><h1>Nie znaleźliśmy tej strony</h1><EmptyState title="Sprawdź adres lub wróć do początku" action={<LinkButton href="/">Strona główna</LinkButton>}>Ten adres nie prowadzi do dostępnej strony MonoMolds.</EmptyState></div>;
}
