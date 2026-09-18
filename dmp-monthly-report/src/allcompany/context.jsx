import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useFilters, applyFilters } from "../filters.jsx";
import { PRIORITY_ORDER } from "../theme.js";
import { usePersistedState } from "../utils.js";
import { zoneInfo, ZONE_ORDER, makeRankColor } from "./zones.js";
import { techOf } from "./helpers.js";

const Ctx = createContext(null);

// Holds the page-local zone/technician selection (persisted separately from the
// global filter, since these are derived/dynamic values), and exposes records
// after date+priority+zone+technician filtering plus shared aggregates so every
// sub-page reuses one computation.
export function AllCompanyProvider({ records, children }) {
  const f = useFilters();
  const [sel, setSel] = usePersistedState("dmp.allcompany.v2", {
    zones: [],
    technicians: [],
  });
  const zones = sel?.zones ?? [];
  const technicians = sel?.technicians ?? [];
  const setZones = (next) => setSel((s) => ({ ...(s || {}), zones: next }));
  const setTechnicians = (next) => setSel((s) => ({ ...(s || {}), technicians: next }));

  // Date + priority only (span all org zones/teams). Attach derived zone/sub once.
  const scoped = useMemo(() => {
    const base = applyFilters(records, f, ["zone", "team"]);
    return base.map((r) => {
      const zi = zoneInfo(r);
      return { ...r, _zone: zi.zone, _sub: zi.sub };
    });
  }, [records, f]);

  const byZoneFilter = useMemo(
    () => (zones.length === 0 ? scoped : scoped.filter((r) => zones.includes(r._zone))),
    [scoped, zones]
  );

  // Drop selected technicians no longer present in the current zone set.
  const validTechSet = useMemo(() => {
    const s = new Set();
    for (const r of byZoneFilter) s.add(techOf(r));
    return s;
  }, [byZoneFilter]);
  useEffect(() => {
    if (technicians.length === 0) return;
    const pruned = technicians.filter((t) => validTechSet.has(t));
    if (pruned.length !== technicians.length) setTechnicians(pruned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTechSet]);

  const visible = useMemo(
    () =>
      technicians.length === 0
        ? byZoneFilter
        : byZoneFilter.filter((r) => technicians.includes(techOf(r))),
    [byZoneFilter, technicians]
  );

  // Per-zone aggregate shared by most pages (ordered by ZONE_ORDER).
  const byZone = useMemo(() => {
    const m = new Map();
    for (const r of visible) {
      const z = r._zone;
      if (!m.has(z)) {
        m.set(z, {
          name: z, total: 0, Critical: 0, Major: 0, Minor: 0, None: 0,
          passBefore: 0, passAfter: 0, dur: 0, durN: 0,
        });
      }
      const o = m.get(z);
      o.total++;
      if (r.p && PRIORITY_ORDER.includes(r.p)) o[r.p]++;
      if (r.bw === "In Due") o.passBefore++;
      if (r.aw === "Pass") o.passAfter++;
      if (r.tt) { o.dur += r.tt; o.durN++; }
    }
    return Array.from(m.values())
      .map((o) => ({
        ...o,
        slaBefore: o.total ? (o.passBefore / o.total) * 100 : 0,
        slaAfter: o.total ? (o.passAfter / o.total) * 100 : 0,
        avgDurSec: o.durN ? o.dur / o.durN : 0,
      }))
      .sort((a, b) => ZONE_ORDER.indexOf(a.name) - ZONE_ORDER.indexOf(b.name));
  }, [visible]);

  const colorFor = useMemo(() => makeRankColor(byZone), [byZone]);

  const value = {
    records, f,
    zones, technicians, setZones, setTechnicians,
    scoped, visible, byZone, colorFor,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAllCo() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAllCo must be inside <AllCompanyProvider />");
  return v;
}
