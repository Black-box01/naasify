import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import { cn, formatDate } from "@/lib/utils";

type Tone = "safe" | "warning" | "urgent";

const TONES: Record<
  Tone,
  { wrap: string; chip: string; icon: IconName; text: string }
> = {
  safe: {
    wrap: "border-emerald-400/25 bg-emerald-500/10",
    chip: "bg-emerald-500/15 text-emerald-300",
    icon: "check-circle",
    text: "text-emerald-300",
  },
  warning: {
    wrap: "border-amber-400/25 bg-amber-500/10",
    chip: "bg-amber-500/15 text-amber-300",
    icon: "clock",
    text: "text-amber-300",
  },
  urgent: {
    wrap: "border-red-400/30 bg-red-500/10",
    chip: "bg-red-500/15 text-red-300",
    icon: "alert-triangle",
    text: "text-red-300",
  },
};

/** green (>30 days) · amber (7–30) · red (<7). */
function toneFor(daysLeft: number): Tone {
  if (daysLeft > 30) return "safe";
  if (daysLeft >= 7) return "warning";
  return "urgent";
}

/**
 * Colour-coded renewal countdown for the soonest-expiring active plan.
 * Presentational only — the dashboard (server) computes `daysLeft`.
 */
export function ExpiryBanner({
  planName,
  endsAt,
  daysLeft,
}: {
  planName: string;
  endsAt: string;
  daysLeft: number;
}) {
  const tone = TONES[toneFor(daysLeft)];
  const remaining =
    daysLeft <= 0
      ? "expires today"
      : daysLeft === 1
        ? "1 day left"
        : `${daysLeft} days left`;

  return (
    <div
      role="status"
      className={cn(
        "glass shadow-layered mt-6 flex flex-wrap items-center gap-4 rounded-3xl border px-5 py-4",
        tone.wrap,
      )}
    >
      <span className={cn("pill inline-flex shrink-0 p-2.5", tone.chip)}>
        <Icon name={tone.icon} className="h-5 w-5" />
      </span>
      <p className="text-sm text-foreground/80">
        <span className="font-semibold text-foreground">
          Your {planName} plan expires on {formatDate(endsAt)}
        </span>{" "}
        <span className={cn("font-semibold", tone.text)}>— {remaining}</span>
      </p>
      <Link
        href="/pricing"
        className="pill ml-auto inline-flex shrink-0 items-center gap-2 bg-foreground/10 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/20"
      >
        Renew now
        <Icon name="arrow-right" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
