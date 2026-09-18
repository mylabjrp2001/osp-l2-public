import React from "react";
import { useFilters } from "../filters.jsx";
import { ZONES, TEAMS, PRIORITY_ORDER, COLORS } from "../theme.js";
import { Chip, toggleKeepOne, buildPresets, labelStyle, inputStyle } from "./filterControls.jsx";

export default function FilterBar() {
  const f = useFilters();
  const visibleTeams = f.zones.flatMap((z) => TEAMS[z] || []);

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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* Date range */}
        <div>
          <div style={labelStyle}>ช่วงวันที่</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="date"
              value={f.start}
              min={f.dateMin}
              max={f.end}
              onChange={(e) => f.setStart(e.target.value)}
              style={inputStyle}
            />
            <span style={{ color: "#8b8b96" }}>—</span>
            <input
              type="date"
              value={f.end}
              min={f.start}
              max={f.dateMax}
              onChange={(e) => f.setEnd(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#8b8b96",
              marginTop: 4,
            }}
          >
            ข้อมูลพร้อม: {f.dateMin} → {f.dateMax}
          </div>
        </div>

        {/* Quick presets */}
        <div>
          <div style={labelStyle}>เลือกเร็ว</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {buildPresets(f.dateMin, f.dateMax).map(({ label, start, end }) => (
              <Chip
                key={label}
                active={f.start === start && f.end === end}
                onClick={() => {
                  f.setStart(start);
                  f.setEnd(end);
                }}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Zone */}
        <div>
          <div style={labelStyle}>โซน</div>
          <div style={{ display: "flex", gap: 6 }}>
            {ZONES.map((z) => (
              <Chip
                key={z}
                active={f.zones.includes(z)}
                onClick={() => {
                  const zones = toggleKeepOne(f.zones, z);
                  if (zones === f.zones) return;
                  f.setZones(zones);
                  // Removing a zone can hide every selected team; re-select the
                  // remaining zones' teams so the report doesn't go blank.
                  const shown = zones.flatMap((zz) => TEAMS[zz] || []);
                  if (!f.teams.some((t) => shown.includes(t))) {
                    f.setTeams([...new Set([...f.teams, ...shown])]);
                  }
                }}
              >
                {z}
              </Chip>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <div style={labelStyle}>ทีม</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {visibleTeams.map((t) => (
              <Chip
                key={t}
                active={f.teams.includes(t)}
                onClick={() => f.setTeams(toggleKeepOne(f.teams, t, visibleTeams))}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <div style={labelStyle}>Priority</div>
          <div style={{ display: "flex", gap: 6 }}>
            {PRIORITY_ORDER.map((p) => (
              <Chip
                key={p}
                color={COLORS.priority[p]}
                active={f.priorities.includes(p)}
                onClick={() => f.setPriorities(toggleKeepOne(f.priorities, p))}
              >
                {p}
              </Chip>
            ))}
          </div>
        </div>

        {/* Reset */}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={f.reset}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #d4d4dc",
              background: "#ffffff",
              color: "#555",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            รีเซ็ต
          </button>
        </div>
      </div>
    </div>
  );
}
