import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import PageHeader from "../components/PageHeader.jsx";
import ChartCard from "../components/ChartCard.jsx";
import { useFilters, applyFilters } from "../filters.jsx";
import { COLORS, MONTHS_EN, TEAMS } from "../theme.js";
import { monthKey, pct } from "../utils.js";

const TEAM_COLORS = ["#E74C3C", "#F1C40F", "#27AE60"]; // A=red, B=yellow, C=green (PDF convention)

function lastSixMonths(endStr) {
  const [y, m] = endStr.slice(0, 7).split("-").map(Number);
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function buildSeries(records, months, teams, kind) {
  return months.map((mk) => {
    const [y, m] = mk.split("-").map(Number);
    const row = { mk, month: MONTHS_EN[m - 1] };
    for (const t of teams) {
      const recs = records.filter((r) => monthKey(r.d) === mk && r.t === t);
      const v =
        kind === "before"
          ? pct(recs.filter((r) => r.bw === "In Due").length, recs.length)
          : pct(recs.filter((r) => r.aw === "Pass").length, recs.length);
      row[t] = +v.toFixed(2);
    }
    return row;
  });
}

// Custom label renderer that anchors the value next to its dot
// and offsets vertically per team index so 3 close lines don't collide.
function makeTeamLabel(teamIndex, color) {
  return function TeamLabel(props) {
    const { x, y, value } = props;
    if (value == null || x == null || y == null) return null;
    // Team 0 -> above-right, Team 1 -> below-right, Team 2 -> above-left
    const offsets = [
      { dx: 8, dy: -8, anchor: "start" },
      { dx: 6, dy: 18, anchor: "start" },
      { dx: -8, dy: -8, anchor: "end" },
    ];
    const o = offsets[teamIndex % offsets.length];
    return (
      <text
        x={x + o.dx}
        y={y + o.dy}
        fill={color}
        fontSize={11}
        fontWeight={700}
        textAnchor={o.anchor}
      >
        {Number(value).toFixed(2)}%
      </text>
    );
  };
}

function TeamLineChart({ data, teams, label }) {
  return (
    <ChartCard title={`SLA% Performance ${label} Per team`}>
      <div style={{ padding: "4px 8px", fontSize: 11, color: "#555" }}>
        <strong>ASSIGN_TO</strong>
        {teams.map((t, i) => (
          <span key={t} style={{ marginLeft: 10, color: TEAM_COLORS[i % TEAM_COLORS.length], fontWeight: 600 }}>
            ● <span style={{ color: "#333" }}>{t}</span>
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 36, right: 36, left: 10, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#444", fontSize: 12 }} axisLine={{ stroke: "#bbb" }} tickLine={false} />
          <YAxis domain={[0, 115]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6 }}
            formatter={(v) => `${v}%`}
          />
          {teams.map((t, i) => {
            const color = TEAM_COLORS[i % TEAM_COLORS.length];
            return (
              <Line
                key={t}
                type="linear"
                dataKey={t}
                stroke={color}
                strokeWidth={2.5}
                dot={{ fill: color, r: 4 }}
                isAnimationActive={false}
              >
                <LabelList dataKey={t} content={makeTeamLabel(i, color)} />
              </Line>
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Business spec: SLA% is calculated using Critical + Major priority jobs only.
const SLA_PRIORITIES = new Set(["Critical", "Major"]);

export default function SlaPerTeamPage({ records, zone }) {
  const f = useFilters();
  const months = useMemo(() => lastSixMonths(f.end), [f.end]);
  const teams = TEAMS[zone];
  const filtered = useMemo(
    () =>
      applyFilters(records, f, ["date", "zone", "team", "priority"])
        .filter((r) => r.z === zone)
        .filter((r) => SLA_PRIORITIES.has(r.p)),
    [records, f, zone]
  );
  const beforeSeries = useMemo(() => buildSeries(filtered, months, teams, "before"), [filtered, months, teams]);
  const afterSeries = useMemo(() => buildSeries(filtered, months, teams, "after"), [filtered, months, teams]);

  return (
    <div>
      <PageHeader
        title={`SLA% Performance ${zone}`}
        subtitle={`Before & After per team — 6 เดือนสิ้นสุด ${f.end} · ใช้เฉพาะงาน Priority Critical + Major`}
      />
      <div style={{ display: "grid", gap: 16 }}>
        <TeamLineChart data={beforeSeries} teams={teams} label="Before" />
        <TeamLineChart data={afterSeries} teams={teams} label="After" />
      </div>
    </div>
  );
}
