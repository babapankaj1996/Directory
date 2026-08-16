import { ImageResponse } from "next/og";

/**
 * Share image for links posted to WhatsApp, Facebook, X, Slack and the like.
 * Without one those previews render as a bare grey box, which costs clicks —
 * and for a directory, shared links are a meaningful referral path.
 *
 * Generated rather than shipped as a file so it always matches the site's
 * palette and never drifts out of date.
 */
export const runtime = "nodejs";
export const alt = "Profinr — verified service providers worldwide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f0d0b",
          padding: "72px",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#f4f0ea",
              color: "#1a120b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 700
            }}
          >
            P
          </div>
          <div
            style={{
              color: "#9c938a",
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              display: "flex"
            }}
          >
            Verified providers
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ color: "#f4f0ea", fontSize: 76, lineHeight: 1.05, fontWeight: 700, display: "flex" }}>
            Find trusted service
          </div>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1.05, fontWeight: 700 }}>
            <span style={{ color: "#f4f0ea" }}>providers&nbsp;</span>
            <span style={{ color: "#d68f52" }}>worldwide.</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#9c938a", fontSize: 26 }}>
          <div style={{ width: 48, height: 3, background: "#d68f52", display: "flex" }} />
          Compare ratings, reviews, availability and pricing
        </div>
      </div>
    ),
    size
  );
}
