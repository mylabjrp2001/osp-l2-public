import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import PageHeader from "../components/PageHeader.jsx";
import ChartCard from "../components/ChartCard.jsx";
import { useFilters, applyFilters } from "../filters.jsx";
import { COLORS, PRIORITY_ORDER } from "../theme.js";
import { fmtPct, monthKey, usePersistedState } from "../utils.js";

// Company comes straight from Excel's WFM_COMPANY column (stored as `c` in records).
const COMPANY_PALETTE = [
  "#6fb720", // green
  "#42A5F5", // blue
  "#F39C12", // orange
  "#E74C3C", // red
  "#9B59B6", // purple
  "#1ABC9C", // teal
  "#E67E22", // dark orange
  "#34495E", // navy
  "#F1C40F", // yellow
  "#D35400", // brown
];

function companyOf(rec) {
  return rec.c || "(ไม่ระบุ)";
}

function fmtHr(sec) {
  if (!sec) return "—";
  const h = sec / 3600;
  if (h >= 10) return `${h.toFixed(1)} hr`;
  return `${h.toFixed(2)} hr`;
}

export default function DashAllCompanies({ records }) {
  const f = useFilters();
  const [selected, setSelected] = usePersistedState(
    "dmp.allco.selected",
    null
  ); // null = use default top 10

  // Apply date + priority filters; skip zone/team (we're filtering by company)
  const candidates = useMemo(
    () => applyFilters(records, f, ["zone", "team"]),
    [records, f]
  );

  // All companies in the current candidate set, sorted by job count
  const allCompanies = useMemo(() => {
    const m = new Map();
    for (const r of candidates) {
      const c = companyOf(r);
      m.set(c, (m.get(c) || 0) + 1);
    }
    return Array.from(m, ([name, n]) => ({ name, n })).sort(
      (a, b) => b.n - a.n
    );
  }, [candidates]);

  const defaultSelection = useMemo(
    () => allCompanies.slice(0, 10).map((c) => c.name),
    [allCompanies]
  );
  const effective = selected ?? defaultSelection;
  const selSet = useMemo(() => new Set(effective), [effective]);

  const visible = useMemo(
    () => candidates.filter((r) => selSet.has(companyOf(r))),
    [candidates, selSet]
  );

  // KPIs
  const kpi = useMemo(() => {
    const total = visible.length;
    const passedBefore = visible.filter((r) => r.bw === "In Due").length;
    const passedAfter = visible.filter((r) => r.aw === "Pass").length;
    const slaBefore = total ? (passedBefore / total) * 100 : 0;
    const slaAfter = total ? (passedAfter / total) * 100 : 0;
    const teams = new Set(visible.map((r) => r.a).filter(Boolean)).size;
    const durSum = visible.reduce((a, r) => a + (r.tt || 0), 0);
    const durCount = visible.filter((r) => r.tt).length;
    const avgDur = durCount ? durSum / durCount : 0;
    return {
      total,
      slaBefore,
      slaAfter,
      teams,
      avgDur,
      passedBefore,
      passedAfter,
    };
  }, [visible]);

  // Aggregate by company
  const byCompany = useMemo(() => {
    const m = new Map();
    for (const r of visible) {
      const c = companyOf(r);
      if (!m.has(c)) {
        m.set(c, {
          name: c,
          total: 0,
          Critical: 0,
          Major: 0,
          Minor: 0,
          None: 0,
          passBefore: 0,
          passAfter: 0,
          dur: 0,
          durN: 0,
        });
      }
      const o = m.get(c);
      o.total++;
      if (r.p && PRIORITY_ORDER.includes(r.p)) o[r.p]++;
      if (r.bw === "In Due") o.passBefore++;
      if (r.aw === "Pass") o.passAfter++;
      if (r.tt) {
        o.dur += r.tt;
        o.durN++;
      }
    }
    const arr = Array.from(m.values()).map((o) => ({
      ...o,
      slaBefore: o.total ? (o.passBefore / o.total) * 100 : 0,
      slaAfter: o.total ? (o.passAfter / o.total) * 100 : 0,
      avgDurSec: o.durN ? o.dur / o.durN : 0,
    }));
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [visible]);

  const top5Names = useMemo(
    () => byCompany.slice(0, 5).map((c) => c.name),
    [byCompany]
  );

  // Monthly trend for top 5
  const monthly = useMemo(() => {
    const m = new Map();
    for (const r of visible) {
      const c = companyOf(r);
      if (!top5Names.includes(c)) continue;
      const mk = monthKey(r.d);
      if (!m.has(mk)) m.set(mk, { month: mk });
      m.get(mk)[c] = (m.get(mk)[c] || 0) + 1;
    }
    return Array.from(m.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }, [visible, top5Names]);

  // Top assignees within selection
  const topAssignees = useMemo(() => {
    const m = new Map();
    for (const r of visible) {
      const name = r.a || "(blank)";
      if (!m.has(name)) {
        m.set(name, {
          name,
          company: companyOf(r),
          region: r.zid || r.z || null,
          total: 0,
          passBefore: 0,
          passAfter: 0,
          dur: 0,
          durN: 0,
        });
      }
      const o = m.get(name);
      o.total++;
      if (r.bw === "In Due") o.passBefore++;
      if (r.aw === "Pass") o.passAfter++;
      if (r.tt) {
        o.dur += r.tt;
        o.durN++;
      }
    }
    const arr = Array.from(m.values()).map((o) => ({
      ...o,
      slaBefore: o.total ? (o.passBefore / o.total) * 100 : 0,
      slaAfter: o.total ? (o.passAfter / o.total) * 100 : 0,
      avgDurSec: o.durN ? o.dur / o.durN : 0,
    }));
    arr.sort((a, b) => b.total - a.total);
    return arr.slice(0, 25);
  }, [visible]);

  const toggleCompany = (name) => {
    const cur = effective;
    const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    setSelected(next);
  };

  const colorFor = (name) => {
    const i = byCompany.findIndex((c) => c.name === name);
    return COMPANY_PALETTE[i % COMPANY_PALETTE.length];
  };

  return (
    <div style={{ color: "#1f1f2c" }}>
      <PageHeader
        title="All Companies Overview"
        subtitle="ภาพรวมทุกบริษัท · ใช้ filter ด้านบนเพื่อเลือกช่วงวัน/Priority · เลือกบริษัทด้านล่างเพื่อกรองเพิ่ม"
      />

      {/* Company chip selector */}
      <div style={chipBar}>
        <div style={ctrlLabel}>บริษัท ({effective.length}/{allCompanies.length})</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {allCompanies.slice(0, 25).map((c) => {
            const active = selSet.has(c.name);
            const color = active ? colorFor(c.name) : null;
            return (
              <button
                key={c.name}
                onClick={() => toggleCompany(c.name)}
                style={chip(active, color)}
              >
                {c.name} <span style={{ opacity: 0.7, marginLeft: 4 }}>·{c.n.toLocaleString()}</span>
              </button>
            );
          })}
          <button
            onClick={() => setSelected(allCompanies.map((c) => c.name))}
            style={ghostBtn}
          >
            เลือกทั้งหมด
          </button>
          <button onClick={() => setSelected([])} style={ghostBtn}>
            ล้าง
          </button>
          <button onClick={() => setSelected(null)} style={ghostBtn}>
            Default (top 10)
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={kpiRow}>
        <KpiCard label="งานทั้งหมด" value={kpi.total.toLocaleString()} sub={`${kpi.teams} assignees`} />
        <KpiCard
          label="SLA Before Waive"
          value={fmtPct(kpi.slaBefore, 1)}
          sub={`${kpi.passedBefore.toLocaleString()} / ${kpi.total.toLocaleString()} In Due`}
          tint={kpi.slaBefore >= 90 ? "#27AE60" : kpi.slaBefore >= 75 ? "#F39C12" : "#E74C3C"}
        />
        <KpiCard
          label="SLA After Waive"
          value={fmtPct(kpi.slaAfter, 1)}
          sub={`${kpi.passedAfter.toLocaleString()} / ${kpi.total.toLocaleString()} Pass`}
          tint={kpi.slaAfter >= 90 ? "#27AE60" : kpi.slaAfter >= 75 ? "#F39C12" : "#E74C3C"}
        />
        <KpiCard
          label="เฉลี่ย Total Time"
          value={fmtHr(kpi.avgDur)}
          sub="(rows ที่มี total_time)"
        />
        <KpiCard
          label="บริษัทที่เลือก"
          value={effective.length}
          sub={`${byCompany.length} active`}
        />
      </div>

      {visible.length === 0 ? (
        <div style={emptyBox}>กรุณาเลือกบริษัท หรือปรับ filter ด้านบน</div>
      ) : (
        <>
          {/* Row: Job count + Priority breakdown side by side */}
          <div style={twoCol}>
            <ChartCard title="จำนวนงานต่อบริษัท">
              <ResponsiveContainer width="100%" height={Math.max(280, byCompany.length * 24)}>
                <BarChart
                  data={byCompany}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v, name) => [v.toLocaleString(), name]}
                  />
                  <Bar dataKey="total" name="งานทั้งหมด">
                    {byCompany.map((c, i) => (
                      <Cell key={c.name} fill={colorFor(c.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="สัดส่วน Priority ต่อบริษัท">
              <ResponsiveContainer width="100%" height={Math.max(280, byCompany.length * 24)}>
                <BarChart
                  data={byCompany}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {PRIORITY_ORDER.map((p) => (
                    <Bar
                      key={p}
                      dataKey={p}
                      stackId="prio"
                      fill={COLORS.priority[p]}
                      name={p}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row: SLA % — Before vs After Waive */}
          <ChartCard title="SLA Pass % ต่อบริษัท — Before Waive (In Due) vs After Waive (Pass)">
            <ResponsiveContainer width="100%" height={Math.max(280, byCompany.length * 40)}>
              <BarChart
                data={byCompany}
                layout="vertical"
                margin={{ top: 10, right: 80, left: 10, bottom: 10 }}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="slaBefore"
                  name="Before Waive (In Due)"
                  fill="#42A5F5"
                  label={{
                    position: "right",
                    formatter: (v) => `${v.toFixed(1)}%`,
                    fontSize: 10,
                    fill: "#555",
                  }}
                />
                <Bar
                  dataKey="slaAfter"
                  name="After Waive (Pass)"
                  fill="#27AE60"
                  label={{
                    position: "right",
                    formatter: (v) => `${v.toFixed(1)}%`,
                    fontSize: 10,
                    fill: "#555",
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 11, color: "#888", padding: "0 12px 8px" }}>
              ส้ม = Before Waive (SLA ก่อน waiver) · เขียว = After Waive (SLA หลังพิจารณา waiver)
            </div>
          </ChartCard>

          {/* Row: Monthly trend */}
          {monthly.length > 1 && (
            <ChartCard title={`Trend รายเดือน — Top ${top5Names.length} บริษัทที่เลือก`}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthly} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {top5Names.map((c) => (
                    <Line
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stroke={colorFor(c)}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Row: Top assignees */}
          <ChartCard title={`Top ${topAssignees.length} Assignees ในบริษัทที่เลือก`}>
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              <table style={tbl}>
                <thead>
                  <tr style={{ background: "#fafafc", position: "sticky", top: 0 }}>
                    <th style={th}>#</th>
                    <th style={th}>Assignee</th>
                    <th style={th}>Company</th>
                    <th style={th}>Zone</th>
                    <th style={{ ...th, textAlign: "right" }}>Jobs</th>
                    <th style={{ ...th, textAlign: "right" }}>SLA Before</th>
                    <th style={{ ...th, textAlign: "right" }}>SLA After</th>
                    <th style={{ ...th, textAlign: "right" }}>Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {topAssignees.map((a, i) => (
                    <tr key={a.name} style={{ borderBottom: "1px solid #f0f0f3" }}>
                      <td style={tdMute}>{i + 1}</td>
                      <td style={td}>{a.name}</td>
                      <td style={td}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: colorFor(a.company),
                            marginRight: 6,
                            verticalAlign: "middle",
                          }}
                        />
                        {a.company}
                      </td>
                      <td style={tdMute}>{a.region || "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {a.total.toLocaleString()}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color:
                            a.slaBefore >= 90
                              ? "#27AE60"
                              : a.slaBefore >= 75
                              ? "#F39C12"
                              : "#E74C3C",
                          fontWeight: 600,
                        }}
                      >
                        {a.slaBefore.toFixed(1)}%
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color:
                            a.slaAfter >= 90
                              ? "#27AE60"
                              : a.slaAfter >= 75
                              ? "#F39C12"
                              : "#E74C3C",
                          fontWeight: 600,
                        }}
                      >
                        {a.slaAfter.toFixed(1)}%
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{fmtHr(a.avgDurSec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, tint }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: tint || "#1f1f2c",
          marginTop: 4,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ---------- styles ----------
const chipBar = {
  background: "#fff",
  border: "1px solid #e6e6ea",
  borderRadius: 10,
  padding: "12px 14px",
  marginBottom: 12,
};
const ctrlLabel = {
  fontSize: 11,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 8,
};
const chip = (active, color) => ({
  padding: "6px 12px",
  borderRadius: 14,
  border: active ? "none" : "1px solid #d4d4dc",
  background: active ? color || "#A8D75A" : "#fff",
  color: active ? "#fff" : "#555",
  fontWeight: active ? 700 : 500,
  fontSize: 12,
  cursor: "pointer",
});
const ghostBtn = {
  padding: "6px 12px",
  borderRadius: 14,
  border: "1px dashed #c4c4d0",
  background: "transparent",
  color: "#666",
  fontSize: 11,
  cursor: "pointer",
};
const kpiRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginBottom: 14,
};
const kpiCard = {
  background: "#fff",
  border: "1px solid #e6e6ea",
  borderRadius: 10,
  padding: "14px 16px",
};
const twoCol = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 14,
};
const emptyBox = {
  padding: 60,
  textAlign: "center",
  color: "#888",
  background: "#fff",
  borderRadius: 10,
  border: "1px solid #e6e6ea",
};

const tbl = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};
const th = {
  padding: "8px 10px",
  textAlign: "left",
  color: "#666",
  fontWeight: 600,
  fontSize: 11,
  borderBottom: "1px solid #e6e6ea",
};
const td = { padding: "7px 10px", color: "#1f1f2c" };
const tdMute = { padding: "7px 10px", color: "#888", fontSize: 11 };
