"use client";

import { useEffect, useRef, useState } from "react";
import type { ModelViewerElement } from "@google/model-viewer";

// Starting camera view: sideways angle, vertical angle and distance from the model.
const DEFAULT_ORBIT = "65deg 75deg 100%";

export function HeroMonkey() {
  const mountRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<((instant?: boolean) => void) | null>(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let viewer: ModelViewerElement | undefined;
    let enabled = false;
    let start: { x: number; y: number; id: number } | undefined;
    let dragged = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Return by the shortest turn, even after the visitor spins the model several times.
    const reset = (instant = false) => {
      if (!viewer || !enabled) return;
      enabled = false;
      viewer.cameraControls = false;
      const currentDegrees = viewer.getCameraOrbit().theta * 180 / Math.PI;
      const nearestDefault = 65 + 360 * Math.round((currentDegrees - 65) / 360);
      viewer.interpolationDecay = 120;
      viewer.cameraOrbit = `${nearestDefault}deg 75deg 100%`;
      if (instant || reducedMotion.matches) viewer.jumpCameraToGoal();
      setActive(false);
    };
    const toggle = (instant = false) => {
      if (!viewer || !viewer.loaded) return;
      if (enabled) return reset(instant);
      // Freeze an in-progress return at the currently visible orientation.
      const orbit = viewer.getCameraOrbit();
      viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;
      viewer.jumpCameraToGoal();
      viewer.interpolationDecay = 50;
      enabled = true;
      viewer.cameraControls = true;
      setActive(true);
    };
    // Tell clicks from drags, so finishing a drag does not switch rotation off.
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) { dragged = true; return; }
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
      dragged = false;
    };
    const move = (event: PointerEvent) => {
      if (start && event.pointerId === start.id && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) dragged = true;
    };
    const click = (event: MouseEvent) => {
      if (!viewer || !viewer.loaded) return;
      if (event.composedPath().includes(viewer)) {
        if (dragged) return;
        // Clicking the monkey toggles rotation. Clicking empty space resets the view.
        const hit = viewer.positionAndNormalFromPoint(event.clientX, event.clientY);
        if (hit) toggle();
        else reset();
      } else if (!(event.target instanceof Element && event.target.closest(".hero-monkey-controls button") && mount.parentElement?.contains(event.target))) {
        reset();
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") reset(true);
    };
    const motionChanged = () => { if (reducedMotion.matches) viewer?.jumpCameraToGoal(); };
    const loaded = () => { if (!disposed) setStatus("ready"); };
    const failed = () => { if (!disposed) setStatus("error"); };

    async function load() {
      try {
        await import("@google/model-viewer");
        if (disposed || !mount) return;
        viewer = document.createElement("model-viewer") as ModelViewerElement;
        // Size the custom element explicitly as well as in CSS. Its native
        // 300 x 150 fallback otherwise makes the model look like a thumbnail.
        Object.assign(viewer.style, { display: "block", width: "100%", height: "100%", background: "transparent", border: "0", userSelect: "none" });
        viewer.src = "/Monkey.glb";
        viewer.alt = "Model 3D małpki. Włącz obracanie przyciskiem poniżej, a następnie przeciągnij model lub użyj strzałek.";
        viewer.cameraOrbit = DEFAULT_ORBIT;
        viewer.interactionPrompt = "none";
        viewer.disableZoom = true;
        viewer.disablePan = true;
        viewer.disableTap = true;
        viewer.touchAction = "pan-y";
        viewer.setAttribute("loading", "eager");
        viewer.setAttribute("shadow-intensity", "0");
        viewer.addEventListener("load", loaded);
        viewer.addEventListener("error", failed);
        viewer.addEventListener("pointerdown", down, true);
        mount.append(viewer);
        toggleRef.current = toggle;
        document.addEventListener("pointermove", move, true);
        document.addEventListener("click", click);
        document.addEventListener("keydown", key);
        reducedMotion.addEventListener("change", motionChanged);
      } catch { failed(); }
    }
    // Load the 3D viewer only when its space is close to appearing on screen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); void load(); }
    }, { rootMargin: "150px" });
    observer.observe(mount);
    // Remove listeners and the viewer when leaving the page or retrying a failed load.
    return () => {
      disposed = true;
      observer.disconnect();
      toggleRef.current = null;
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("click", click);
      document.removeEventListener("keydown", key);
      reducedMotion.removeEventListener("change", motionChanged);
      viewer?.removeEventListener("load", loaded);
      viewer?.removeEventListener("error", failed);
      viewer?.removeEventListener("pointerdown", down, true);
      viewer?.remove();
    };
  }, [attempt]);

  return (
    <div className="hero-monkey" data-active={active} style={{ width: "100%", minWidth: 0 }}>
      <div ref={mountRef} className="hero-monkey-canvas" data-ready={status === "ready"} inert={status !== "ready"} aria-hidden={status !== "ready"} style={{ width: "100%", height: "clamp(360px, 62vw, 680px)" }} />
      <div className="hero-monkey-controls" style={{ textAlign: "center", minHeight: 76 }}>
        <p role="status" className="text-xs text-[var(--muted)]">
          {status === "loading" ? "Ładowanie modelu 3D…" : status === "error" ? "Nie udało się wczytać modelu 3D." : active ? "Przeciągnij, aby obrócić. Kliknij ponownie lub poza modelem, aby zresetować." : "Kliknij małpkę, aby włączyć obracanie."}
        </p>
        {status === "ready" ? <button type="button" className="footer-link" aria-pressed={active} onClick={(event) => toggleRef.current?.(event.detail === 0)}>{active ? "Zresetuj widok" : "Włącz obracanie"}</button> : null}
        {status === "error" ? <button type="button" className="footer-link" onClick={() => { setStatus("loading"); setActive(false); setAttempt((value) => value + 1); }}>Spróbuj ponownie</button> : null}
      </div>
    </div>
  );
}
