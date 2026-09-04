import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/constants";

export const alt = `${SITE_NAME} — Backend-as-a-Service Marketplace`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic 1200×630 social card. Rendered at request/build time by next/og —
 * no binary asset to maintain, and it inherits to every route as the default
 * Open Graph image.
 */
export default function OpengraphImage() {
  const chips = ["9 cloud services", "99.9% uptime SLA", "Instant activation"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 88px",
          background: "linear-gradient(135deg,#070312 0%,#1b0b3a 48%,#3b0f63 100%)",
          color: "#f4f2ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "40px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", fontSize: "38px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "68px",
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            maxWidth: "960px",
          }}
        >
          Backend-as-a-Service, rebuilt for 2026
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "30px",
            fontSize: "30px",
            lineHeight: 1.4,
            color: "#cbb8ff",
            maxWidth: "900px",
          }}
        >
          Hosting, databases, email, storage, domains, compute, VPS &amp; VPN — one subscription.
        </div>

        <div style={{ display: "flex", gap: "14px", marginTop: "52px" }}>
          {chips.map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                fontSize: "24px",
                padding: "12px 24px",
                borderRadius: "999px",
                border: "1px solid rgba(167,139,250,0.45)",
                color: "#e9e2ff",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
