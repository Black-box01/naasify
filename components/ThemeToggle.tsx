"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "naasify-theme";

/**
 * The active theme lives on `document.documentElement` (the `.dark` class),
 * which is seeded before first paint by the inline bootstrap script in
 * `app/layout.tsx`. We expose it to React as an external store so the toggle
 * stays in sync with OS changes without calling setState inside an effect.
 */
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  // Follow the OS live — but only until the user makes an explicit choice.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches);
      emit();
    }
  };
  mq.addEventListener("change", onChange);

  return () => {
    listeners.delete(onStoreChange);
    mq.removeEventListener("change", onChange);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

// Server / pre-hydration default. The bootstrap script sets the real value
// before paint, so React reconciles to it right after hydration with no flash.
function getServerSnapshot() {
  return true;
}

/**
 * Light/dark switch. On first visit the theme follows the OS
 * `prefers-color-scheme`; once the user toggles, the choice is stored in
 * localStorage and kept across sessions.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage may be unavailable (private mode) — still switch for the session.
    }
    applyTheme(next);
    emit();
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="pill glass flex items-center justify-center p-2.5 text-foreground transition-colors hover:bg-foreground/10"
    >
      {dark ? (
        // Sun — shown in dark mode (the action switches to light).
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon — shown in light mode (the action switches to dark).
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
