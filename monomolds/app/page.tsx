import Image from "next/image";
import Link from "next/link";

import { LinkButton } from "@/components/ui/button";
import { HeroMonkey } from "@/components/hero-monkey";

import "./home.css";

const brandBenefits = [
  {
    title: "Ręczna robota",
    description: "Każdą formę wykonujemy ręcznie w Polsce, z uwagą na detale.",
  },
  {
    title: "Kreatywne kształty",
    description: "Projektujemy formy do tworzenia charakterystycznych, dopracowanych deserów.",
  },
  {
    title: "Forma na zamówienie",
    description: "Możemy przygotować dowolny kształt na zamówienie. Minimalna liczba to 6 sztuk.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="site-container">
      {/* Explain the offer, link to the shop and show the 3D model. */}
      {/* Hero: explain the offer, link to Formy, and show the optional 3D model. */}
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-intro">
          <p className="eyebrow">Ręcznie wykonywane w Polsce</p>
          <h1 id="home-title">
            MonoMolds - więcej niż formy.
          </h1>
          <p className="home-description">
            Silikonowe formy do deserów - wykonywane z dbałością o każdy detal.
          </p>
          <div className="home-actions">
            <LinkButton href="/sklep">
              Poznaj nasze formy
              <span aria-hidden="true" className="ui-arrow">→</span>
            </LinkButton>
            <LinkButton href="/zestawy" variant="secondary">
              Zobacz zestawy
              <span aria-hidden="true" className="ui-arrow">→</span>
            </LinkButton>
          </div>
        </div>
        <HeroMonkey />
      </section>

      {/* These spaces will hold real photos when the catalogue is ready. */}
      {/* Reserved product spaces will receive real catalogue media later. */}
      <section id="poznaj-formy" className="home-products" aria-labelledby="products-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Od formy do deseru</p>
            <h2 id="products-title">Przyjrzyj się detalom.</h2>
          </div>
          <p>Wybierz pojedynczą formę albo gotowy zestaw i zacznij od kształtu, który pasuje do Twojego pomysłu.</p>
        </div>
        <div className="product-preview-grid">
          <article className="collection-placeholder">
            <Link href="/sklep" className="home-category-link">
              <div className="collection-placeholder-media">
                <Image
                  src="/images/packaging-main-page.png"
                  alt="Ręcznie wykonane silikonowe formy zapakowane w pudełku"
                  fill
                  sizes="(min-width: 640px) 55vw, 100vw"
                  className="home-category-image"
                />
              </div>
              <h3>Formy silikonowe</h3>
              <p>Zobacz pojedyncze formy i wybierz kształt do swojego kolejnego deseru.</p>
              <span className="home-category-action">Przejdź do form <span aria-hidden="true">→</span></span>
            </Link>
          </article>
          <article className="collection-placeholder">
            <Link href="/zestawy" className="home-category-link">
              <div className="collection-placeholder-media">
                <Image
                  src="/images/halloween-set.png"
                  alt="Halloweenowy zestaw trzech deserów: kociołek, kapelusz czarownicy i postać"
                  fill
                  sizes="(min-width: 640px) 45vw, 100vw"
                  className="home-category-image home-category-image--halloween"
                />
              </div>
              <h3>Zestawy form</h3>
              <p>Poznaj zestawy kilku form przygotowane do tworzenia spójnych kolekcji deserów.</p>
              <span className="home-category-action">Przejdź do zestawów <span aria-hidden="true">→</span></span>
            </Link>
          </article>
        </div>
      </section>

      <section className="home-benefits" aria-labelledby="benefits-title">
        <div className="home-benefits-heading">
          <p className="eyebrow">Formy po Twojemu</p>
          <h2 id="benefits-title">Od pomysłu do gotowego kształtu.</h2>
        </div>
        <ul className="home-benefits-list">
          {brandBenefits.map((benefit, index) => (
            <li key={benefit.title}>
              <span className="home-benefit-number" aria-hidden="true">0{index + 1}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
