"use client";

import { useEffect, useRef } from "react";

const GRID_SPACING = 36;
const REVEAL_RADIUS = 130;
const DOT_SIZE = 6;
const LERP_SPEED = 0.08;

/**
 * Signature pointer effect: a full-viewport grid of dots that reveals inside
 * a circular radius following the mouse (opacity-only mutations in a single
 * rAF loop). Disabled on coarse pointers and for reduced-motion users.
 * Adapted from the proven implementation in blackboxtech/app/components/CursorDots.tsx.
 */
export function CursorDots() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotData = useRef<
    { el: HTMLDivElement; baseX: number; baseY: number; currentOpacity: number }[]
  >([]);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const rafId = useRef<number>(0);

  useEffect(() => {
    try {
      const container = containerRef.current;
      if (!container) return;

      // Touch devices / reduced motion: no effect at all.
      if (
        window.matchMedia("(pointer: coarse)").matches ||
        !window.matchMedia("(hover: hover)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const buildGrid = () => {
        for (const dot of dotData.current) {
          dot.el.remove();
        }
        dotData.current = [];

        const w = window.innerWidth;
        const h = window.innerHeight;
        const cols = Math.ceil(w / GRID_SPACING) + 1;
        const rows = Math.ceil(h / GRID_SPACING) + 1;
        const offsetX = GRID_SPACING / 2;
        const offsetY = GRID_SPACING / 2;

        const dots: typeof dotData.current = [];
        let i = 0;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = offsetX + col * GRID_SPACING;
            const y = offsetY + row * GRID_SPACING;
            if (x > w || y > h) continue;

            const el = document.createElement("div");
            el.className = "absolute rounded-full";
            el.style.width = `${DOT_SIZE}px`;
            el.style.height = `${DOT_SIZE}px`;
            el.style.left = `${x - DOT_SIZE / 2}px`;
            el.style.top = `${y - DOT_SIZE / 2}px`;
            el.style.opacity = "0";
            // Alternate brand purple / cyan across the grid
            el.style.backgroundColor =
              i % 2 === 0 ? "rgba(167, 139, 250, 0.85)" : "rgba(34, 211, 238, 0.85)";
            el.style.willChange = "opacity";
            el.style.boxSizing = "border-box";
            container.appendChild(el);

            dots.push({ el, baseX: x, baseY: y, currentOpacity: 0 });
            i++;
          }
        }
        dotData.current = dots;
      };

      buildGrid();

      const onResize = () => buildGrid();
      const onMouseMove = (e: MouseEvent) => {
        mousePos.current = { x: e.clientX, y: e.clientY };
      };
      const onMouseLeave = () => {
        mousePos.current = { x: -9999, y: -9999 };
      };

      const animate = () => {
        const mx = mousePos.current.x;
        const my = mousePos.current.y;

        for (const dot of dotData.current) {
          const dx = dot.baseX - mx;
          const dy = dot.baseY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let target = 0;
          if (dist < REVEAL_RADIUS) {
            const t = 1 - dist / REVEAL_RADIUS;
            target = t * t * (3 - 2 * t);
          }

          dot.currentOpacity += (target - dot.currentOpacity) * LERP_SPEED;

          if (Math.abs(dot.currentOpacity - target) > 0.005 || target > 0.01) {
            dot.el.style.opacity = String(Math.max(0, dot.currentOpacity));
          }
        }

        rafId.current = requestAnimationFrame(animate);
      };

      window.addEventListener("mousemove", onMouseMove, { passive: true });
      document.addEventListener("mouseleave", onMouseLeave);
      window.addEventListener("resize", onResize);
      rafId.current = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseleave", onMouseLeave);
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(rafId.current);
        for (const dot of dotData.current) {
          dot.el.remove();
        }
        dotData.current = [];
      };
    } catch {
      // Decorative effect — never break the page because of it.
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="cursor-layer"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 60,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-hidden="true"
    />
  );
}
