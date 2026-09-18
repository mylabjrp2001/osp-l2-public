import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import PageHeader from "../components/PageHeader.jsx";
import ChartCard from "../components/ChartCard.jsx";
import { useFilters, applyFilters } from "../filters.jsx";
import { COLORS, PRIORITY_ORDER, ZONES, TEAMS } from "../theme.js";

function buildStack(records, teams) {
  return teams.map((t) => {
    const recs = records.filter((r) => r.t === t);
    const row = { team: t };
    let total = 0;
    for (const p of PRIORITY_ORDER) {
      const c = recs.filter((r) => r.p === p).length;
      row[p] = c;
      total += c;
    }
    row._total = total;
    row._label = total;
    return row;
  });
}

function StackedZone({ title, data }) {
  return (
    <ChartCard title={title}>
      <div style={{ fontSize: 11, padding: "4px 8px 6px", color: "#666", fontWeight: 600 }}>
        PRIORITY_ID
        {PRIORITY_ORDER.map((p) => (
          <span key={p} style={{ marginLeft: 12, color: COLORS.priority[p] }}>
            ● <span style={{ color: "#333" }}>{p}</span>
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data} margin={{ top: 30, right: 20, left: 10, bottom: 20 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis dataKey="team" tick={{ fill: "#444", fontSize: 11 }} axisLine={{ stroke: "#bbb" }} tickLine={false} interval={0} angle={-12} textAnchor="end" height={60} />
          <YAxis tick={{ fill: "#888", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6 }} />
          {PRIORITY_ORDER.map((p, i) => (
            <Bar key={p} dataKey={p} stackId="a" fill={COLORS.priority[p]} maxBarSize={80}>
              <LabelList
                dataKey={p}
                position="center"
                style={{ fill: "#fff", fontSize: 12, fontWeight: 700 }}
                formatter={(v) => (v > 0 ? v : "")}
              />
              {i === PRIORITY_ORDER.length - 1 && (
                <LabelList
                  dataKey="_label"
                  position="top"
                  style={{ fill: "#333", fontSize: 13, fontWeight: 700 }}
                  offset={6}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function Page04({ records }) {
  const f = useFilters();
  const filtered = useMemo(() => applyFilters(records, f), [records, f]);

  const data = useMemo(() => {
    const out = {};
    for (const z of ZONES) {
      if (f.zones.includes(z)) {
        const teamsInZone = TEAMS[z].filter((t) => f.teams.includes(t));
        out[z] = buildStack(filtered, teamsInZone);
      }
    }
    return out;
  }, [filtered, f.zones, f.teams]);

  const zoneEntries = Object.entries(data);

  return (
    <div>
      <PageHeader title="Job per Team and Priority" subtitle={`ช่วง ${f.start} ถึง ${f.end}`} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: zoneEntries.length === 2 ? "1fr 1fr" : "1fr",
          gap: 20,
        }}
      >
        {zoneEntries.map(([z, d]) => (
          <div key={z}>
            <div
              style={{
                background: "linear-gradient(90deg, #DDE9A0 0%, #E3CB8E 100%)",
                color: "#5b4d20",
                padding: "10px 16px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 18,
                textAlign: "center",
                marginBottom: 12,
                boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
              }}
            >
              PRIORITY {z}
            </div>
            <StackedZone title="Job Total and Priority" data={d} />
          </div>
        ))}
      </div>
    </div>
  );
}
