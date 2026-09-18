import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import PageHeader from "../components/PageHeader.jsx";
import { useFilters, applyFilters } from "../filters.jsx";
import { ZONES, COLORS } from "../theme.js";
import { targetForRange } from "../utils.js";

const TARGET_PER_AREA_MONTH = 260;

export default function Page02({ records }) {
  const f = useFilters();
  const rows = useMemo(() => {
    const filtered = applyFilters(records, f);
    return ZONES.filter((z) => f.zones.includes(z)).map((z) => ({
      zone: z,
      count: filtered.filter((r) => r.z === z).length,
    }));
  }, [records, f]);

  // 260 is per month; a quarter is judged against 780, half a month against 130.
  const TARGET_PER_AREA = Math.max(1, Math.round(targetForRange(TARGET_PER_AREA_MONTH, f.start, f.end)));
  const total = rows.reduce((s, r) => s + r.count, 0);
  const yMax = Math.max(TARGET_PER_AREA * 1.1, ...rows.map((r) => r.count * 1.2), 50);

  return (
    <div>
      <PageHeader
        title={`Job Total in Zone — Total ${total} Job`}
        subtitle={`ช่วง ${f.start} ถึง ${f.end} — เป้าหมาย ${TARGET_PER_AREA} งาน / โซน (${TARGET_PER_AREA_MONTH} งาน / เดือน)`}
      />
      <div
        style={{
          background: "#fff",
          color: "#1f1f2c",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#444",
            marginBottom: 12,
            letterSpacing: "0.05em",
          }}
        >
          JOB TOTAL IN ZONE
        </div>
        <ResponsiveContainer width="100%" height={460}>
          <BarChart data={rows} margin={{ top: 40, right: 30, left: 20, bottom: 20 }} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e2e2" vertical={false} />
            <XAxis dataKey="zone" tick={{ fill: "#444", fontSize: 13 }} axisLine={{ stroke: "#bbb" }} tickLine={false} />
            <YAxis
              domain={[0, Math.ceil(yMax / 50) * 50]}
              tick={{ fill: "#888", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              label={{ value: "Count of JB_ID", angle: -90, position: "insideLeft", offset: 0, style: { fill: "#888", fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6 }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <ReferenceLine
              y={TARGET_PER_AREA}
              stroke="#42a5f5"
              strokeDasharray="8 6"
              strokeWidth={2.5}
              label={({ viewBox }) => {
                const x = viewBox.x + 8;
                const y = viewBox.y - 8;
                const text = `Job Target ${TARGET_PER_AREA} Per Area`;
                return (
                  <g>
                    <rect
                      x={x - 6}
                      y={y - 12}
                      width={text.length * 6.8 + 12}
                      height={18}
                      rx={3}
                      fill="#ffffff"
                      stroke="#42a5f5"
                      strokeWidth={1}
                      opacity={0.95}
                    />
                    <text
                      x={x}
                      y={y + 1}
                      fill="#1e7fc7"
                      fontSize={12}
                      fontWeight={600}
                    >
                      {text}
                    </text>
                  </g>
                );
              }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={140}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.count >= TARGET_PER_AREA ? "#2ECC71" : "#E74C3C"} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                style={{ fill: "#1f1f2c", fontSize: 20, fontWeight: 700 }}
                offset={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${rows.length + 1}, 1fr)`,
          gap: 16,
          marginTop: 20,
        }}
      >
        {rows.map((r) => (
          <SummaryCard
            key={r.zone}
            label={r.zone}
            value={r.count}
            color={r.count >= TARGET_PER_AREA ? "#2ECC71" : "#E74C3C"}
            note={r.count >= TARGET_PER_AREA ? "ถึงเป้า" : `ต่ำกว่าเป้า ${TARGET_PER_AREA - r.count}`}
          />
        ))}
        <SummaryCard label="รวมทั้งหมด" value={total} color="#42a5f5" note="all selected zones" />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, note }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e6e6ea",
        borderRadius: 12,
        padding: 18,
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#8b8b96",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 11, color: "#8b8b96", marginTop: 2 }}>{note}</div>
    </div>
  );
}
