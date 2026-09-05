import { CHECKOUT_ERROR_MESSAGES } from "@/lib/constants";
import { Icon } from "@/components/ui/icons";

/**
 * Danger-toned banner for recoverable checkout errors, driven by the `?error=`
 * query param that /checkout/start sets before bouncing back (plan_unavailable,
 * checkout_failed, invalid_plan). Server component; renders nothing when the
 * code is absent or unknown so callers can drop it in unconditionally.
 */
export function CheckoutErrorBanner({ code }: { code?: string | null }) {
  const message = CHECKOUT_ERROR_MESSAGES[code ?? ""];
  if (!message) return null;

  return (
    <div
      role="alert"
      className="glass shadow-layered mt-6 flex items-center gap-3 rounded-3xl border border-red-400/30 bg-red-500/10 px-5 py-4"
    >
      <span className="pill inline-flex shrink-0 bg-red-500/15 p-2.5 text-red-300">
        <Icon name="alert-triangle" className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-red-200">{message}</p>
    </div>
  );
}
