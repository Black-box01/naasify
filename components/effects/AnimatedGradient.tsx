import { cn } from "@/lib/utils";

/**
 * Decorative animated gradient backdrop: a slowly rotating conic gradient
 * plus two drifting blurred brand orbs. Compositor-only animations
 * (transform), killed automatically by the reduced-motion rule in globals.css.
 */
export function AnimatedGradient({
  className,
  orbs = true,
}: {
  className?: string;
  orbs?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      {/* Rotating conic gradient wash */}
      <div
        className="animate-gradient-rotate absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-25"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(124,58,237,0.55), rgba(34,211,238,0.35), rgba(139,92,246,0.45), rgba(6,182,212,0.4), rgba(124,58,237,0.55))",
          filter: "blur(90px)",
        }}
      />
      {orbs && (
        <>
          <div
            className="animate-blob-drift absolute -left-32 top-[-10%] h-[28rem] w-[28rem] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, rgba(139,92,246,0.8), rgba(124,58,237,0) 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="animate-blob-drift-slow absolute -right-32 bottom-[-15%] h-[26rem] w-[26rem] rounded-full opacity-35"
            style={{
              background:
                "radial-gradient(circle at 60% 40%, rgba(34,211,238,0.75), rgba(6,182,212,0) 70%)",
              filter: "blur(40px)",
            }}
          />
        </>
      )}
    </div>
  );
}
