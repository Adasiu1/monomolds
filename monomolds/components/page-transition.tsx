"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useEffect } from "react";

const EXIT_DURATION = 100;
const ENTER_DURATION = 220;

let pendingDestination: string | null = null;
let exitTimer: number | undefined;
let enterTimer: number | undefined;

type PageTransitionLinkProps = ComponentProps<typeof Link>;

function clearTransitionStyles(main: HTMLElement) {
  main.style.removeProperty("opacity");
  main.style.removeProperty("transform");
  main.style.removeProperty("transition");
  main.style.removeProperty("will-change");
  main.style.removeProperty("pointer-events");
}

function setTransition(
  main: HTMLElement,
  duration: number,
  opacity: string,
  transform: string,
) {
  main.style.transition = [
    `opacity ${duration}ms var(--ease-out)`,
    `transform ${duration}ms var(--ease-out)`,
  ].join(", ");
  main.style.willChange = "opacity, transform";
  main.style.pointerEvents = "none";
  main.style.opacity = opacity;
  main.style.transform = transform;
}

function prepareEntrance(main: HTMLElement) {
  main.style.transition = "none";
  main.style.opacity = "0";
  main.style.transform = "translateY(24px)";
  main.style.willChange = "opacity, transform";
  main.style.pointerEvents = "none";
}

function isPlainPointerClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    event.detail > 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function getInternalDestination(href: PageTransitionLinkProps["href"]) {
  if (typeof href !== "string" || href.startsWith("#")) {
    return null;
  }

  const destination = new URL(href, window.location.href);
  const currentRoute = `${window.location.pathname}${window.location.search}`;
  const nextRoute = `${destination.pathname}${destination.search}`;

  if (destination.origin !== window.location.origin || nextRoute === currentRoute) {
    return null;
  }

  return `${nextRoute}${destination.hash}`;
}

export function PageTransitionLink({ href, onClick, target, download, ...props }: PageTransitionLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      target === "_blank" ||
      download ||
      !isPlainPointerClick(event)
    ) {
      return;
    }

    const destination = getInternalDestination(href);

    if (!destination) {
      return;
    }

    event.preventDefault();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(destination);
      return;
    }

    const main = document.getElementById("main-content");

    if (!main) {
      router.push(destination);
      return;
    }

    pendingDestination = destination;
    window.clearTimeout(enterTimer);

    if (main.dataset.pageTransition === "exit") {
      return;
    }

    if (main.dataset.pageTransition === "waiting") {
      router.push(destination);
      return;
    }

    main.dataset.pageTransition = "exit";
    setTransition(
      main,
      EXIT_DURATION,
      "0",
      "translateY(-12px)",
    );
    window.clearTimeout(exitTimer);
    exitTimer = window.setTimeout(() => {
      main.dataset.pageTransition = "waiting";
      main.style.transition = "none";
      main.style.transform = "translateY(24px)";
      router.push(pendingDestination ?? destination);
    }, EXIT_DURATION);
  }

  return (
    <Link
      {...props}
      href={href}
      target={target}
      download={download}
      onClick={handleClick}
    />
  );
}

export function PageTransitionController() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById("main-content");

    if (!main || main.dataset.pageTransition !== "waiting") {
      return;
    }

    const mainElement = main;
    let frame: number | undefined;
    let observer: MutationObserver | undefined;

    function enterResolvedPage() {
      prepareEntrance(mainElement);
      frame = window.requestAnimationFrame(() => {
        mainElement.dataset.pageTransition = "enter";
        setTransition(mainElement, ENTER_DURATION, "1", "translateY(0)");
      });
      enterTimer = window.setTimeout(() => {
        delete mainElement.dataset.pageTransition;
        pendingDestination = null;
        clearTransitionStyles(mainElement);
      }, ENTER_DURATION);
    }

    if (mainElement.querySelector(".ui-site-loading")) {
      clearTransitionStyles(mainElement);
      mainElement.dataset.pageTransition = "loading";

      observer = new MutationObserver(() => {
        if (mainElement.querySelector(".ui-site-loading")) {
          return;
        }

        observer?.disconnect();
        enterResolvedPage();
      });
      observer.observe(mainElement, { childList: true, subtree: true });
    } else {
      enterResolvedPage();
    }

    return () => {
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
      }
      observer?.disconnect();
      window.clearTimeout(enterTimer);
    };
  }, [pathname]);

  return null;
}
