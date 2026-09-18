// Organizational zone classifier for the All-Company area.
//
// The source data only has assign_to (`a`) + company (`c`). The reporting org
// chart groups technicians into Zones (DMP, Origin, SCT, BPL, CWT, TLC, EDS BKK,
// สำรอง Express, 3BB, AIS, FASTTEL) and, where derivable, a Sub-zone.
//
// zoneInfo(record) -> { zone, sub }  (sub is "" when none applies)

export const ZONE_ORDER = [
  "DMP", "Origin", "SCT", "BPL", "CWT", "TLC",
  "EDS BKK", "สำรอง Express", "3BB", "AIS", "FASTTEL", "Other",
];

export const ZONE_COLORS = {
  DMP: "#E67E22",
  Origin: "#5DADE2",
  SCT: "#E59866",
  BPL: "#58D68D",
  CWT: "#5499C7",
  TLC: "#F4D03F",
  "EDS BKK": "#F9E79F",
  "สำรอง Express": "#AAB7B8",
  "3BB": "#EB984E",
  AIS: "#82E0AA",
  FASTTEL: "#BB8FCE",
  Other: "#CACFD2",
};

// Express team groups embedded in assign_to (e.g. "Expressmacrocwt Boonsong").
const EXPRESS_GROUPS = ["sct", "bpl", "cwt", "tlc"];

function expressTier(a) {
  if (a.includes("macro") || a.includes("marco")) return "Macro";
  if (a.includes("mini")) return "Mini";
  if (a.includes("local")) return "Local";
  return "";
}

export function zoneInfo(r) {
  const a = (r.a || "").toLowerCase().trim();
  const c = r.c || "";

  if (a.startsWith("dmplocal")) {
    let sub = "";
    if (a.includes("latkrabang")) sub = "Latkrabang";
    else if (a.includes("pathumthani")) sub = "Pathumthani";
    return { zone: "DMP", sub };
  }
  if (a.startsWith("originlocal")) {
    let sub = "Center";
    if (a.includes("thungkhru")) sub = "Thungkhru";
    else if (a.includes("nonthaburi")) sub = "Nonthaburi";
    return { zone: "Origin", sub };
  }
  if (a.startsWith("expresseds")) return { zone: "EDS BKK", sub: "" };
  if (a.startsWith("express") && EXPRESS_GROUPS.some((g) => a.includes(g))) {
    const g = EXPRESS_GROUPS.find((x) => a.includes(x));
    return { zone: g.toUpperCase(), sub: expressTier(a) };
  }
  if (a.startsWith("afasttel") || a.startsWith("bfasttel") || c === "FASTTEL") {
    return { zone: "FASTTEL", sub: expressTier(a) };
  }
  // Ex-Press company members without a group prefix → reserve pool.
  if (a.startsWith("express") || c === "Ex-Press Data Network" || c === "Express Data Network") {
    return { zone: "สำรอง Express", sub: "" };
  }
  if (c === "3BB") return { zone: "3BB", sub: "" };
  if (c === "NY CABLE") return { zone: "AIS", sub: "" };
  return { zone: "Other", sub: "" };
}

export function zoneOf(r) {
  return zoneInfo(r).zone;
}

export function zoneColor(zone) {
  return ZONE_COLORS[zone] || "#CACFD2";
}

// Stable color for a list of {name} sorted by rank, falling back to palette.
const FALLBACK = [
  "#6fb720", "#42A5F5", "#F39C12", "#E74C3C", "#9B59B6",
  "#1ABC9C", "#E67E22", "#34495E", "#F1C40F", "#D35400",
];
export function makeRankColor(rows) {
  return (name) => {
    if (ZONE_COLORS[name]) return ZONE_COLORS[name];
    const i = rows.findIndex((x) => x.name === name);
    return FALLBACK[(i < 0 ? 0 : i) % FALLBACK.length];
  };
}
