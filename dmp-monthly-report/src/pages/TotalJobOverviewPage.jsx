import React, { useMemo, useState } from "react";
import { usePersistedState } from "../utils.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import PageHeader from "../components/PageHeader.jsx";
import ChartCard from "../components/ChartCard.jsx";
import EditableNote from "../components/EditableNote.jsx";
import { useFilters, applyFilters } from "../filters.jsx";
import { COLORS, PRIORITY_ORDER, TEAMS, SLA_PRIORITIES } from "../theme.js";
import { pct, fmtPct, rangeDays, dailyRows, targetForRange, DENSE_DAYS } from "../utils.js";

// Monthly targets; scaled to the selected range with targetForRange().
const TARGET_MAP = {
  zone: 260, // 260 jobs / zone / month (PDF page 2 target line)
  team: 86, // PDF pages 12-14 / 16-18
};

function Gauge({ value, max, color = "#8FA1E0" }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadialBarChart
        innerRadius="58%"
        outerRadius="100%"
        startAngle={180}
        endAngle={0}
        data={[{ name: "v", value: Math.min(value, max), fill: color }]}
      >
        <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
        <RadialBar background={{ fill: "#eee" }} dataKey="value" cornerRadius={8} isAnimationActive={false} />
        <text x="50%" y="68%" textAnchor="middle" style={{ fontSize: 44, fontWeight: 800, fill: "#222" }}>
          {value.toLocaleString()}
        </text>
        <text x="50%" y="80%" textAnchor="middle" style={{ fontSize: 12, fill: "#888" }}>
          {`from ${max.toLocaleString()} target`}
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

function JobsByTeam({ records, teams }) {
  const data = teams.map((t) => ({
    team: t,
    count: records.filter((r) => r.t === t).length,
  })).sort((a, b) => b.count - a.count);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 28, right: 28, left: 40, bottom: 40 }}
        barCategoryGap="25%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis
          dataKey="team"
          tick={{ fill: "#444", fontSize: 10 }}
          axisLine={{ stroke: "#bbb" }}
          tickLine={false}
          interval={0}
          angle={-18}
          textAnchor="end"
          height={70}
          padding={{ left: 28, right: 16 }}
        />
        <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          formatter={(v) => v.toLocaleString()}
          contentStyle={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6 }}
        />
        <Bar dataKey="count" fill="#8FB3D9" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          <LabelList dataKey="count" position="top" style={{ fill: "#333", fontSize: 13, fontWeight: 700 }} offset={6} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function JobByPriorityDonut({ records }) {
  const data = PRIORITY_ORDER.map((p) => ({
    name: p,
    value: records.filter((r) => r.p === p).length,
  })).filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  // All labels rendered OUTSIDE with leader lines and "value (%)" format.
  // Tiny slices (<3%) are hidden to avoid clutter.
  const renderLabel = (props) => {
    const { cx, cy, midAngle, outerRadius, value, fill, percent } = props;
    if (percent < 0.03) return null;
    const RAD = Math.PI / 180;
    const r = outerRadius + 14;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    const anchor = Math.cos(-midAngle * RAD) >= 0 ? "start" : "end";
    return (
      <text x={x} y={y} fill={fill} fontSize={11} fontWeight={700} textAnchor={anchor} dominantBaseline="central">
        <tspan x={x} dy="-0.4em">{value}</tspan>
        <tspan x={x} dy="1.1em">({(percent * 100).toFixed(2)}%)</tspan>
      </text>
    );
  };

  return (
    <div
      style={{
        height: 300,
        display: "flex",
        flexDirection: "column",
        padding: "2px 4px",
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 56, bottom: 20, left: 56 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="46%"
              outerRadius="72%"
              paddingAngle={1}
              isAnimationActive={false}
              label={renderLabel}
              labelLine={(props) => {
                if (props.percent < 0.03) return null;
                const { cx, cy, midAngle, outerRadius } = props;
                const RAD = Math.PI / 180;
                const x1 = cx + outerRadius * Math.cos(-midAngle * RAD);
                const y1 = cy + outerRadius * Math.sin(-midAngle * RAD);
                const x2 = cx + (outerRadius + 12) * Math.cos(-midAngle * RAD);
                const y2 = cy + (outerRadius + 12) * Math.sin(-midAngle * RAD);
                return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#888" strokeWidth={1} />;
              }}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS.priority[d.name]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [`${v} (${((v / total) * 100).toFixed(2)}%)`, n]}
              contentStyle={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
          fontSize: 12,
          padding: "4px 8px 6px",
          borderTop: "1px solid #f0f0f3",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#444" }}>PRIORITY_ID</span>
        {PRIORITY_ORDER.map((p) => {
          const d = data.find((x) => x.name === p);
          const present = !!d;
          return (
            <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: COLORS.priority[p],
                  opacity: present ? 1 : 0.25,
                }}
              />
              <span style={{ color: present ? "#1f1f2c" : "#aaa", fontWeight: 500 }}>{p}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function JobDonePerDayMini({ records, start, end, avg, height = 300 }) {
  const data = dailyRows(
    records,
    start,
    end,
    () => Object.fromEntries(PRIORITY_ORDER.map((p) => [p, 0])),
    (row, r) => {
      if (r.p) row[r.p] = (row[r.p] || 0) + 1;
    }
  );
  for (const r of data) r._total = PRIORITY_ORDER.reduce((s, p) => s + (r[p] || 0), 0);
  const dense = data.length > DENSE_DAYS;
  const hasAvg = Number.isFinite(avg) && avg > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", height }}>
      <div
        style={{
          padding: "4px 8px 2px",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, color: "#444" }}>PRIORITY_ID</span>
        {PRIORITY_ORDER.map((p) => (
          <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 5,
                background: COLORS.priority[p],
              }}
            />
            <span style={{ color: "#1f1f2c", fontWeight: 500 }}>{p}</span>
          </span>
        ))}
        {hasAvg && (
          <span
            style={{
              marginLeft: "auto",
              color: COLORS.target,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-block", width: 18, height: 0, borderTop: `2px dashed ${COLORS.target}` }} />
            AVG: {avg.toFixed(2)}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 16, left: 8, bottom: 8 }} barCategoryGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#555", fontSize: 10 }}
              interval={dense ? "preserveStartEnd" : 0}
              axisLine={{ stroke: "#bbb" }}
              tickLine={false}
              padding={{ left: 4, right: 4 }}
            />
            <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6 }} />
            {PRIORITY_ORDER.map((p, i) => (
              <Bar key={p} dataKey={p} stackId="d" fill={COLORS.priority[p]} isAnimationActive={false}>
                {!dense && i === PRIORITY_ORDER.length - 1 && (
                  <LabelList dataKey="_total" position="top" style={{ fill: "#333", fontSize: 10, fontWeight: 700 }} formatter={(v) => (v > 0 ? v : "")} offset={4} />
                )}
              </Bar>
            ))}
            {hasAvg && (
              <ReferenceLine
                y={avg}
                stroke={COLORS.target}
                strokeDasharray="3 3"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function JobOverduePerDayMini({ records, start, end }) {
  const data = dailyRows(
    records,
    start,
    end,
    () => ({ "In Due": 0, "Out Due": 0 }),
    (row, r) => {
      if (r.bw) row[r.bw] = (row[r.bw] || 0) + 1;
    }
  );
  for (const r of data) r._total = r["In Due"] + r["Out Due"];
  const dense = data.length > DENSE_DAYS;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: 300 }}>
      <div
        style={{
          padding: "4px 8px 2px",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, color: "#444" }}>Before Waive</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: COLORS.good }} />
          <span style={{ color: "#1f1f2c", fontWeight: 500 }}>In Due</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: COLORS.bad }} />
          <span style={{ color: "#1f1f2c", fontWeight: 500 }}>Out Due</span>
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 16, left: 8, bottom: 8 }} barCategoryGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#555", fontSize: 10 }}
              interval={dense ? "preserveStartEnd" : 0}
              axisLine={{ stroke: "#bbb" }}
              tickLine={false}
              padding={{ left: 4, right: 4 }}
            />
            <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6 }} />
            <Bar dataKey="In Due" stackId="d" fill={COLORS.good} isAnimationActive={false}>
              {!dense && <LabelList
                dataKey="In Due"
                position="center"
                style={{ fill: "#fff", fontSize: 10, fontWeight: 700 }}
                formatter={(v) => (v > 0 ? v : "")}
              />}
            </Bar>
            <Bar dataKey="Out Due" stackId="d" fill={COLORS.bad} isAnimationActive={false}>
              {!dense && <LabelList
                dataKey="Out Due"
                position="center"
                style={{ fill: "#fff", fontSize: 10, fontWeight: 700 }}
                formatter={(v) => (v > 0 ? v : "")}
              />}
              {!dense && <LabelList
                dataKey="_total"
                position="top"
                style={{ fill: "#333", fontSize: 10, fontWeight: 700 }}
                formatter={(v) => (v > 0 ? v : "")}
                offset={4}
              />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SlaPerformanceBars({ records, teams }) {
  const rows = teams.map((t) => {
    const recs = records.filter((r) => r.t === t);
    const passVal = pct(recs.filter((r) => r.aw === "Pass").length, recs.length) || 0;
    const notVal = pct(recs.filter((r) => r.aw === "Not Waive").length, recs.length) || 0;
    // Anything else ("รอ Defend", blank) is not a pass, but it is not "Not Waive" either.
    const otherVal = Math.max(0, 100 - passVal - notVal);
    return {
      team: t,
      Pass: +passVal.toFixed(2),
      "Not Waive": +notVal.toFixed(2),
      Other: +otherVal.toFixed(2),
      total: recs.length,
    };
  }).filter((r) => r.total > 0);
  if (!rows.length) return <div style={{ color: "#999", padding: 20, textAlign: "center" }}>ไม่มีข้อมูล</div>;
  return (
    <div style={{ padding: "8px 8px 4px" }}>
      {rows.map((r) => (
        <div key={r.team} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{r.team}</span>
            <span style={{ fontSize: 11, color: "#888" }}>N = {r.total.toLocaleString()}</span>
          </div>
          <div
            style={{
              display: "flex",
              height: 26,
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid #e6e6ea",
            }}
          >
            <div
              style={{
                width: `${r.Pass}%`,
                background: COLORS.good,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              {r.Pass >= 6 ? `${r.Pass.toFixed(2)}%` : ""}
            </div>
            {r["Not Waive"] > 0 && (
              <div
                style={{
                  width: `${r["Not Waive"]}%`,
                  background: COLORS.bad,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {r["Not Waive"] >= 6 ? `${r["Not Waive"].toFixed(2)}%` : ""}
              </div>
            )}
            {r.Other > 0 && (
              <div
                title={`รอ Defend / ว่าง ${r.Other.toFixed(2)}%`}
                style={{
                  width: `${r.Other}%`,
                  background: COLORS.warn,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {r.Other >= 6 ? `${r.Other.toFixed(2)}%` : ""}
              </div>
            )}
          </div>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "#666",
          marginTop: 6,
          justifyContent: "center",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: COLORS.good,
              borderRadius: 2,
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          Pass
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: COLORS.bad,
              borderRadius: 2,
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          Not Waive
        </span>
        {rows.some((r) => r.Other > 0) && (
          <span>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                background: COLORS.warn,
                borderRadius: 2,
                marginRight: 4,
                verticalAlign: "middle",
              }}
            />
            รอ Defend / ว่าง
          </span>
        )}
      </div>
    </div>
  );
}

function ReasonOverdueTable({ records }) {
  // "Waive" = aw === "Pass" (the row had a reason_overdue but was waived through).
  // "Not Waive" = aw === "Not Waive" (failed and not granted a waive).
  // Show both by default; user can hide either column (but not both — one stays
  // shown so the table isn't reduced to a single "Total" column).
  const [showWaive, setShowWaive] = usePersistedState(
    "dmp.overview.reasonOverdue.showWaive",
    true
  );
  const [showNotWaive, setShowNotWaive] = usePersistedState(
    "dmp.overview.reasonOverdue.showNotWaive",
    true
  );

  const allRows = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      if (!r.ro) continue;
      const e = map.get(r.ro) || { ro: r.ro, waive: 0, notWaive: 0, total: 0 };
      if (r.aw === "Not Waive") e.notWaive++;
      else if (r.aw === "Pass") e.waive++;
      e.total++;
      map.set(r.ro, e);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [records]);

  // Hide rows whose visible category columns are all zero, so toggling shows only
  // reasons that actually contributed to the chosen category.
  const rows = useMemo(
    () =>
      allRows.filter((r) => {
        if (showWaive && r.waive > 0) return true;
        if (showNotWaive && r.notWaive > 0) return true;
        return false;
      }),
    [allRows, showWaive, showNotWaive]
  );

  const total = rows.reduce((s, r) => s + r.total, 0);
  const sumWaive = rows.reduce((s, r) => s + r.waive, 0);
  const sumNotWaive = rows.reduce((s, r) => s + r.notWaive, 0);

  if (!allRows.length) {
    return <div style={{ color: "#999", padding: 20, textAlign: "center" }}>ไม่มี Overdue</div>;
  }

  // Guarantee at least one of waive/notWaive remains visible.
  const toggle = (which) => {
    if (which === "waive") {
      if (showWaive && !showNotWaive) return; // would hide both
      setShowWaive((v) => !v);
    } else {
      if (showNotWaive && !showWaive) return;
      setShowNotWaive((v) => !v);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px 10px",
          fontSize: 11,
          color: "#666",
        }}
      >
        <span style={{ fontWeight: 600, color: "#444" }}>แสดง:</span>
        <button
          onClick={() => toggle("waive")}
          style={pillBtn(showWaive, "#27AE60")}
          title="แสดง/ซ่อน คอลัมน์ Waive (aw=Pass)"
        >
          {showWaive ? "✓" : "○"} Waive
        </button>
        <button
          onClick={() => toggle("notWaive")}
          style={pillBtn(showNotWaive, "#E74C3C")}
          title="แสดง/ซ่อน คอลัมน์ Not Waive (aw=Not Waive)"
        >
          {showNotWaive ? "✓" : "○"} Not Waive
        </button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f4f4f4", color: "#444" }}>
            <th style={{ textAlign: "left", padding: 8 }}>สาเหตุ Over Due</th>
            {showWaive && (
              <th style={{ textAlign: "right", padding: 8, width: 90, color: "#1d6b3a" }}>
                Waive
              </th>
            )}
            {showNotWaive && (
              <th style={{ textAlign: "right", padding: 8, width: 90, color: "#9c2a18" }}>
                Not Waive
              </th>
            )}
            <th style={{ textAlign: "right", padding: 8, width: 70 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={1 + (showWaive ? 1 : 0) + (showNotWaive ? 1 : 0) + 1}
                style={{ padding: 16, textAlign: "center", color: "#999" }}
              >
                ไม่มีรายการใน {showWaive && !showNotWaive ? "Waive" : "Not Waive"}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.ro} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>{r.ro}</td>
              {showWaive && (
                <td style={{ padding: 8, textAlign: "right", color: "#1d6b3a" }}>
                  {r.waive || ""}
                </td>
              )}
              {showNotWaive && (
                <td style={{ padding: 8, textAlign: "right", color: "#9c2a18" }}>
                  {r.notWaive || ""}
                </td>
              )}
              <td style={{ padding: 8, textAlign: "right", fontWeight: 600 }}>{r.total}</td>
            </tr>
          ))}
          <tr style={{ background: "#fafafa", fontWeight: 700 }}>
            <td style={{ padding: 8 }}>Total</td>
            {showWaive && (
              <td style={{ padding: 8, textAlign: "right", color: "#1d6b3a" }}>{sumWaive}</td>
            )}
            {showNotWaive && (
              <td style={{ padding: 8, textAlign: "right", color: "#9c2a18" }}>{sumNotWaive}</td>
            )}
            <td style={{ padding: 8, textAlign: "right" }}>{total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const pillBtn = (active, color) => ({
  padding: "3px 10px",
  borderRadius: 12,
  border: active ? `1px solid ${color}` : "1px solid #d4d4dc",
  background: active ? `${color}15` : "#fff",
  color: active ? color : "#888",
  fontWeight: 600,
  fontSize: 11,
  cursor: "pointer",
  transition: "all 0.15s",
});

/** Subject is either { kind: "zone", zone: "Latkrabang" } or { kind: "team", zone, team: "Dmplocallatkrabang A" } */
export default function TotalJobOverviewPage({ records, subject }) {
  const f = useFilters();
  const filtered = useMemo(() => {
    let r = applyFilters(records, f, ["zone", "team"]);
    r = r.filter((x) => x.z === subject.zone);
    if (subject.kind === "team") r = r.filter((x) => x.t === subject.team);
    return r;
  }, [records, f, subject]);

  // SLA-only view — used for the SLA% bars and the SLA % shown in the page title.
  // Every other widget on this page (Total Job, Job by Priority, Job Done Per day)
  // keeps all priorities.
  const slaFiltered = useMemo(
    () => filtered.filter((r) => SLA_PRIORITIES.has(r.p)),
    [filtered]
  );

  const total = filtered.length;
  // Average jobs/day over the selected range — matches the "Job Done Per day"
  // AVG line on the dedicated Job-Per-day pages (total ÷ calendar days in range).
  const avgPerDay = total / rangeDays(f.start, f.end);
  const teamsToShow =
    subject.kind === "zone" ? TEAMS[subject.zone] : [subject.team];

  const passPct = useMemo(() => {
    const recs = slaFiltered;
    return pct(recs.filter((r) => r.aw === "Pass").length, recs.length);
  }, [slaFiltered]);

  const title =
    subject.kind === "zone"
      ? `Total Job Overview (${subject.zone}) ${total} job SLA ${fmtPct(passPct)}`
      : `Total Job Overview (${subject.team}) SLA ${fmtPct(passPct)}`;
  const maxGauge = Math.max(
    1,
    Math.round(targetForRange(subject.kind === "zone" ? TARGET_MAP.zone : TARGET_MAP.team, f.start, f.end))
  );

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`ช่วง ${f.start} ถึง ${f.end} · SLA% ใช้เฉพาะงาน Priority Critical + Major`}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 2fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <ChartCard title="Total Job">
          <Gauge value={total} max={maxGauge} />
        </ChartCard>
        <ChartCard title={subject.kind === "zone" ? "Jobs by Team" : "Job by Priority"}>
          {subject.kind === "zone" ? (
            <JobsByTeam records={filtered} teams={teamsToShow} />
          ) : (
            <JobByPriorityDonut records={filtered} />
          )}
        </ChartCard>
        <ChartCard title="Job Done Per day">
          <JobDonePerDayMini records={filtered} start={f.start} end={f.end} avg={avgPerDay} />
        </ChartCard>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <ChartCard title="SLA% Performance After (Critical + Major)">
          <SlaPerformanceBars records={slaFiltered} teams={teamsToShow} />
        </ChartCard>
        <ChartCard title={subject.kind === "zone" ? "Reason Overdue" : "Job Overdue / In Due Per day"}>
          {subject.kind === "zone" ? (
            <ReasonOverdueTable records={filtered} />
          ) : (
            <JobOverduePerDayMini records={filtered} start={f.start} end={f.end} />
          )}
        </ChartCard>
      </div>

      {subject.kind === "team" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ChartCard title="Reason overdue">
            <ReasonOverdueTable records={filtered} />
          </ChartCard>
          <ChartCard title="Problem and Solution">
            <EditableNote
              storageKey={`dmp.note.team.${subject.team}.${f.start.slice(0, 7)}`}
              placeholder={`บันทึกปัญหา / วิธีแก้ / หมายเหตุของทีม ${subject.team} สำหรับเดือน ${f.start.slice(0, 7)}…`}
              minHeight={180}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
