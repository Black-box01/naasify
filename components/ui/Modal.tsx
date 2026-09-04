"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/** Accessible modal built on the native <dialog> element (no extra deps). */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`glass-strong shadow-layered-lg w-full rounded-3xl border border-brand-400/25 p-0 text-foreground backdrop:bg-black/60 backdrop:backdrop-blur-sm ${
        wide ? "max-w-2xl" : "max-w-md"
      }`}
    >
      <div className="flex items-center justify-between px-6 pt-5">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="pill glass p-2 text-foreground/70 transition-colors hover:text-foreground"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </dialog>
  );
}
