"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BrandLogo } from "./brand-logo";

export function FooterLogo() {
  const logoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const logo = logoRef.current;
    if (!logo || !window.IntersectionObserver) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    let keyboardNavigation = false;
    const onKeyDown = () => { keyboardNavigation = true; };
    const onPointerDown = () => { keyboardNavigation = false; };
    const stop = () => { if (reducedMotion.matches) animation?.cancel(); };
    // Bounce once when the logo appears, unless the visitor wants less movement.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (reducedMotion.matches || keyboardNavigation) return;
      animation = logo.animate([
        { transform: "translateY(0)", offset: 0 },
        { transform: "translateY(-5px)", offset: 0.35 },
        { transform: "translateY(1px)", offset: 0.7 },
        { transform: "translateY(0)", offset: 1 },
      ], { duration: 700, easing: "cubic-bezier(0.77, 0, 0.175, 1)" });
    }, { threshold: 0.8 });
    observer.observe(logo);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    reducedMotion.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animation?.cancel();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      reducedMotion.removeEventListener("change", stop);
    };
  }, []);

  return (
    <Link href="/" className="inline-flex" aria-label="Mono Molds - strona główna">
      <span ref={logoRef} className="inline-block"><BrandLogo footer /></span>
    </Link>
  );
}
