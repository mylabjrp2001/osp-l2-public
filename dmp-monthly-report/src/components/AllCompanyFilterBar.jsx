import React, { useMemo } from "react";
import { useFilters } from "../filters.jsx";
import { PRIORITY_ORDER, COLORS } from "../theme.js";
import { Chip, toggle, toggleKeepOne, buildPresets, labelStyle, inputStyle } from "./filterControls.jsx";
import { techOf } from "../allcompany/helpers.js";
import { ZONE_ORDER, ZONE_COLORS } from "../allcompany/zones.js";
import { useAllCo } from "../allcompany/context.jsx";

// Shared filter bar for the whole All-Company area (all sub-pages).
// Date range + Priority come from the GLOBAL filter context (enumerable).
// Zone + Technician are page-local derived selections (from AllCompany context).
export default function AllCompanyFilterBar() {
  const f = useFilters();
  const { scoped, zones, setZones, technicians, setTechnicians } = useAllCo();

  // Zones present in the date/priority-scoped data, by job count desc, in ZONE_ORDER.
  const zoneOptions = useMemo(() => {
    const m = new Map();
    for (const r of scoped) m.set(r._zone, (m.get(r._zone) || 0) + 1);
    return ZONE_ORDER.filter((z) => m.has(z)).map((z) => ({ name: z, n: m.get(z) }));
  }, [scoped]);

  // Technicians within the selected zones (empty zones = all zones).
  const technicianOptions = useMemo(() => {
    const inSel =
      zones.length === 0 ? scoped : scoped.filter((r) => zones.includes(r._zone));
    const m = new Map();
    for (const r of inSel) {
      const a = techOf(r);
      m.set(a, (m.get(a) || 0) + 1);
    }
    return Array.from(m, ([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  }, [scoped, zones]);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e6e6ea",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        {/* Date range (global) */}
        <div>
          <div style={labelStyle}>ช่วงวันที่</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="date" value={f.start} min={f.dateMin} max={f.end}
              onChange={(e) => f.setStart(e.target.value)} style={inputStyle} />
            <span style={{ color: "#8b8b96" }}>—</span>
            <input type="date" value={f.end} min={f.start} max={f.dateMax}
              onChange={(e) => f.setEnd(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ fontSize: 11, color: "#8b8b96", marginTop: 4 }}>
            ข้อมูลพร้อม: {f.dateMin} → {f.dateMax}
          </div>
        </div>

        {/* Quick presets (global) */}
        <div>
          <div style={labelStyle}>เลือกเร็ว</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {buildPresets(f.dateMin, f.dateMax).map(({ label, start, end }) => (
              <Chip key={label} active={f.start === start && f.end === end}
                onClick={() => { f.setStart(start); f.setEnd(end); }}>
                {label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Priority (global) */}
        <div>
          <div style={labelStyle}>Priority</div>
          <div style={{ display: "flex", gap: 6 }}>
            {PRIORITY_ORDER.map((p) => (
              <Chip key={p} color={COLORS.priority[p]} active={f.priorities.includes(p)}
                onClick={() => f.setPriorities(toggleKeepOne(f.priorities, p))}>
                {p}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: "auto" }}>
          <button onClick={f.reset} style={resetBtn}>รีเซ็ตวันที่/Priority</button>
        </div>
      </div>

      {/* Zone (page-local, derived) */}
      <div style={{ marginTop: 16, borderTop: "1px solid #f0f0f3", paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>
            Zone ({zones.length === 0 ? "ทั้งหมด" : zones.length}/{zoneOptions.length})
          </div>
          {zones.length > 0 && (
            <button onClick={() => setZones([])} style={ghostBtn}>ล้าง Zone (= ทั้งหมด)</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {zoneOptions.map((z) => (
            <Chip key={z.name} color={ZONE_COLORS[z.name]} active={zones.includes(z.name)}
              onClick={() => setZones(toggle(zones, z.name))}>
              {z.name}
              <span style={{ opacity: 0.7, marginLeft: 4 }}>·{z.n.toLocaleString()}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* Technician (page-local, dependent on zone) */}
      {zones.length > 0 && (
        <div style={{ marginTop: 14, borderTop: "1px solid #f0f0f3", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>
              ช่าง ({technicians.length === 0 ? "ทั้งหมด" : technicians.length}/{technicianOptions.length})
            </div>
            {technicians.length > 0 && (
              <button onClick={() => setTechnicians([])} style={ghostBtn}>ล้างช่าง (= ทั้งหมด)</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 160, overflowY: "auto" }}>
            {technicianOptions.map((t) => (
              <Chip key={t.name} active={technicians.includes(t.name)}
                onClick={() => setTechnicians(toggle(technicians, t.name))}>
                {t.name}
                <span style={{ opacity: 0.7, marginLeft: 4 }}>·{t.n.toLocaleString()}</span>
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ghostBtn = {
  padding: "4px 10px", borderRadius: 12, border: "1px dashed #c4c4d0",
  background: "transparent", color: "#666", fontSize: 11, cursor: "pointer",
};
const resetBtn = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid #d4d4dc",
  background: "#ffffff", color: "#555", cursor: "pointer", fontSize: 12, fontWeight: 500,
};
