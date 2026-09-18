import React from "react";
import { useFilters } from "../filters.jsx";
import { MONTHS_EN } from "../theme.js";

function periodLabel(start, end) {
  const [sy, sm] = start.slice(0, 7).split("-").map(Number);
  const [ey, em] = end.slice(0, 7).split("-").map(Number);
  if (sy === ey && sm === em) {
    return `${MONTHS_EN[sm - 1]} ${sy}`;
  }
  return `${MONTHS_EN[sm - 1]} ${sy} – ${MONTHS_EN[em - 1]} ${ey}`;
}

export default function Page01Cover() {
  const f = useFilters();
  const period = periodLabel(f.start, f.end);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "78vh",
        borderRadius: 16,
        overflow: "hidden",
        background:
          "linear-gradient(160deg, #f3fbf2 0%, #f7f8ef 35%, #fdf3e3 70%, #fce8cf 100%)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
        border: "1px solid #ececef",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Center title block */}
      <div style={{ textAlign: "center", padding: "0 24px", maxWidth: 900 }}>
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#5b5448",
            paddingBottom: 18,
            borderBottom: "1px solid rgba(0,0,0,0.12)",
            letterSpacing: "-0.01em",
          }}
        >
          DMP Advance Solution Network (BKK)
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 52,
            fontWeight: 900,
            color: "#7CC242",
            lineHeight: 1.22,
            letterSpacing: "-0.01em",
            textShadow: "0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          Monthly Report {period}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 44,
            fontWeight: 900,
            color: "#7CC242",
          }}
        >
          (Team Performance)
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 17,
            color: "#9a8f7d",
          }}
        >
          DMP Advance Solution Network · Bangkok · {f.start} → {f.end}
        </div>
      </div>
    </div>
  );
}
