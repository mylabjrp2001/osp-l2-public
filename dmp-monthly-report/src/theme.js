export const COLORS = {
  bg: "#0f0c29",
  panel: "rgba(255,255,255,0.03)",
  panelBorder: "rgba(255,255,255,0.08)",
  text: "#e6e6f0",
  textDim: "rgba(255,255,255,0.55)",
  textMute: "rgba(255,255,255,0.35)",
  grid: "rgba(255,255,255,0.07)",
  axis: "rgba(255,255,255,0.18)",
  brandGreen: "#A8D75A",
  brandOrange: "#F39C12",
  good: "#27AE60",
  goodLight: "#2ECC71",
  bad: "#E74C3C",
  warn: "#F39C12",
  target: "#42A5F5",
  // Priority palette (matches PDF)
  priority: {
    Critical: "#E74C3C",
    Major: "#F39C12",
    Minor: "#F1C40F",
    None: "#5DADE2",
  },
  // SLA states
  pass: "#27AE60",
  notWaive: "#E74C3C",
  inDue: "#27AE60",
  outDue: "#E74C3C",
};

export const PRIORITY_ORDER = ["Critical", "Major", "Minor", "None"];

// Business spec: SLA% counts Critical + Major jobs only. Page 22 is the exception —
// it deliberately follows whatever priorities the user picked in the filter bar.
export const SLA_PRIORITIES = new Set(["Critical", "Major"]);

export const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_TH = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export const ZONES = ["Latkrabang", "Pathumthani"];
export const TEAMS = {
  Latkrabang: ["Dmplocallatkrabang A", "Dmplocallatkrabang B", "Dmplocallatkrabang C"],
  Pathumthani: [
    "Dmplocalpathumthani A",
    "Dmplocalpathumthani B",
    "Dmplocalpathumthani C",
  ],
};
export const ALL_ZONE_TEAMS = [...TEAMS.Latkrabang, ...TEAMS.Pathumthani];
