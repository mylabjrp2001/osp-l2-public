// Shared helpers for the All-Company area (sub-pages under /allcompany/).
// technician = record.a (Excel ASSIGN_TO). Zone is derived in zones.js.

export const TECH_BLANK = "(blank)";
export const techOf = (r) => r.a || TECH_BLANK;

export function fmtHr(sec) {
  if (!sec) return "—";
  const h = sec / 3600;
  return h >= 10 ? `${h.toFixed(1)} hr` : `${h.toFixed(2)} hr`;
}

export function slaColor(v) {
  return v >= 90 ? "#27AE60" : v >= 75 ? "#F39C12" : "#E74C3C";
}
