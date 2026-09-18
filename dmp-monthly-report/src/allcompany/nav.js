// Sub-page registry for the All-Company area (axis = Zone + technician).
// slug "" => base path /allcompany/ ; others => /allcompany/<slug>
import {
  AcCover, AcJobTotal, AcPriority, AcJobPerTech, AcSla, AcJobPerDay,
  AcProblem, AcSlaPerTech, AcAvgDuration, AcRanking, AcKpiSla, AcTechnicians,
} from "./pages.jsx";

export const ALLCO_NAV = [
  { id: "ac-cover", slug: "", n: "A1", t: "หน้าปก (Cover)", c: AcCover, hero: true },
  { id: "ac-jobtotal", slug: "jobtotal", n: "A2", t: "Job Total in Zone", c: AcJobTotal },
  { id: "ac-priority", slug: "priority", n: "A3", t: "Priority in Zone", c: AcPriority },
  { id: "ac-jobpertech", slug: "jobpertech", n: "A4", t: "Job per ช่าง & Priority", c: AcJobPerTech },
  { id: "ac-sla", slug: "sla", n: "A5", t: "SLA% by Zone", c: AcSla },
  { id: "ac-jobperday", slug: "jobperday", n: "A6", t: "Job per Day", c: AcJobPerDay },
  { id: "ac-problem", slug: "problem", n: "A7", t: "TOP Problem Reason", c: AcProblem },
  { id: "ac-slapertech", slug: "slapertech", n: "A8", t: "SLA% Performance per ช่าง", c: AcSlaPerTech },
  { id: "ac-avgduration", slug: "avgduration", n: "A9", t: "Avg Duration", c: AcAvgDuration },
  { id: "ac-ranking", slug: "ranking", n: "A10", t: "Ranking Zone/ช่าง", c: AcRanking },
  { id: "ac-kpisla", slug: "kpisla", n: "A11", t: "KPI SLA % per Zone", c: AcKpiSla },
  { id: "ac-technicians", slug: "technicians", n: "A12", t: "ช่าง (Technicians)", c: AcTechnicians },
];

export const ALLCO_BASE = "/allcompany/";

export function urlForSlug(slug) {
  return slug ? `/allcompany/${slug}` : ALLCO_BASE;
}

export function navItemForSlug(slug) {
  return ALLCO_NAV.find((x) => x.slug === slug) || ALLCO_NAV[0];
}
