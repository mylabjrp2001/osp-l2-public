import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts";
import ChartCard from "../components/ChartCard.jsx";
import { COLORS, PRIORITY_ORDER } from "../theme.js";
import { fmtPct, formatSeconds } from "../utils.js";
import { useAllCo } from "./context.jsx";
import { techOf, fmtHr, slaColor } from "./helpers.js";
import { ZONE_COLORS } from "./zones.js";
import {
  KpiCard, EmptyBox, kpiRow, twoCol, cardGap, tbl, th, td, tdMute, numTd,
} from "./ui.jsx";

// ---------- shared aggregates ----------
function useKpi() {
  const { visible } = useAllCo();
  return useMemo(() => {
    const total = visible.length;
    const passedBefore = visible.filter((r) => r.bw === "In Due").length;
    const passedAfter = visible.filter((r) => r.aw === "Pass").length;
    const techCount = new Set(visible.map((r) => r.a).filter(Boolean)).size;
    const durSum = visible.reduce((a, r) => a + (r.tt || 0), 0);
    const durN = visible.filter((r) => r.tt).length;
    return {
      total,
      slaBefore: total ? (passedBefore / total) * 100 : 0,
      slaAfter: total ? (passedAfter / total) * 100 : 0,
      passedBefore, passedAfter, techCount,
      avgDur: durN ? durSum / durN : 0,
    };
  }, [visible]);
}

function KpiStrip() {
  const k = useKpi();
  const { byZone } = useAllCo();
  return (
    <div style={kpiRow}>
      <KpiCard label="งานทั้งหมด" value={k.total.toLocaleString()} sub={`${k.techCount} ช่าง · ${byZone.length} zone`} />
      <KpiCard label="SLA Before Waive" value={fmtPct(k.slaBefore, 1)} sub={`${k.passedBefore.toLocaleString()} / ${k.total.toLocaleString()} In Due`} tint={slaColor(k.slaBefore)} />
      <KpiCard label="SLA After Waive" value={fmtPct(k.slaAfter, 1)} sub={`${k.passedAfter.toLocaleString()} / ${k.total.toLocaleString()} Pass`} tint={slaColor(k.slaAfter)} />
      <KpiCard label="เฉลี่ย Total Time" value={fmtHr(k.avgDur)} sub="(rows ที่มี total_time)" />
    </div>
  );
}

// Per-technician aggregate over the visible set.
function useTechRows() {
  const { visible } = useAllCo();
  return useMemo(() => {
    const m = new Map();
    for (const r of visible) {
      const name = techOf(r);
      if (!m.has(name)) m.set(name, { name, zone: r._zone, sub: r._sub || "", total: 0, passBefore: 0, passAfter: 0, dur: 0, durN: 0 });
      const o = m.get(name); o.total++;
      if (r.bw === "In Due") o.passBefore++;
      if (r.aw === "Pass") o.passAfter++;
      if (r.tt) { o.dur += r.tt; o.durN++; }
    }
    return Array.from(m.values()).map((o) => ({
      ...o,
      slaBefore: o.total ? (o.passBefore / o.total) * 100 : 0,
      slaAfter: o.total ? (o.passAfter / o.total) * 100 : 0,
      avgDurSec: o.durN ? o.dur / o.durN : 0,
    })).sort((a, b) => b.total - a.total);
  }, [visible]);
}

// ============ 1. Cover ============
export function AcCover() {
  const { f, byZone, visible } = useAllCo();
  const k = useKpi();
  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg, #2C3E50 0%, #4CA1AF 100%)",
        borderRadius: 16, padding: "48px 40px", color: "#fff", textAlign: "center",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)", marginBottom: 20,
      }}>
        <div style={{ fontSize: 14, letterSpacing: "0.15em", opacity: 0.85, textTransform: "uppercase" }}>
          Monthly Report — All Companies
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, marginTop: 10 }}>
          ภาพรวมทุก Zone / ทุกบริษัท
        </div>
        <div style={{ fontSize: 15, opacity: 0.9, marginTop: 12 }}>
          ช่วง {f.start} ถึง {f.end} · {k.total.toLocaleString()} งาน · {byZone.length} zone · {k.techCount} ช่าง
        </div>
      </div>
      <KpiStrip />
      {visible.length > 0 && (
        <ChartCard title="จำนวนงานต่อ Zone">
          <ResponsiveContainer width="100%" height={Math.max(280, byZone.length * 30)}>
            <BarChart data={byZone} layout="vertical" margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <Bar dataKey="total" name="งาน" label={{ position: "right", formatter: (v) => v.toLocaleString(), fontSize: 11, fill: "#555" }}>
                {byZone.map((z) => (<Cell key={z.name} fill={ZONE_COLORS[z.name] || "#888"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

// ============ 2. Job Total in Zone ============
export function AcJobTotal() {
  const { byZone, colorFor, visible } = useAllCo();
  const total = visible.length;
  if (!total) return <EmptyBox />;
  return (
    <>
      <ChartCard style={cardGap} title={`Job Total in Zone — รวม ${total.toLocaleString()} งาน`}>
        <ResponsiveContainer width="100%" height={Math.max(320, byZone.length * 40)}>
          <BarChart data={byZone} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="total" name="งานทั้งหมด" label={{ position: "right", formatter: (v) => v.toLocaleString(), fontSize: 11, fill: "#555" }}>
              {byZone.map((z) => (<Cell key={z.name} fill={colorFor(z.name)} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {byZone.map((z) => (
          <div key={z.name} style={{ background: "#fff", border: "1px solid #e6e6ea", borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#8b8b96", marginBottom: 6 }}>{z.name}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: colorFor(z.name) }}>{z.total.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{fmtPct(total ? (z.total / total) * 100 : 0, 1)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ============ 3. Priority in Zone ============
export function AcPriority() {
  const { byZone, visible } = useAllCo();
  const overall = useMemo(() => {
    const o = { Critical: 0, Major: 0, Minor: 0, None: 0 };
    for (const r of visible) if (PRIORITY_ORDER.includes(r.p)) o[r.p]++;
    return PRIORITY_ORDER.map((p) => ({ priority: p, count: o[p] }));
  }, [visible]);
  if (!visible.length) return <EmptyBox />;
  return (
    <>
      <ChartCard style={cardGap} title="จำนวนงานแยกตาม Priority (รวมทุก zone ที่เลือก)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={overall} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="count" name="จำนวนงาน" label={{ position: "top", formatter: (v) => v.toLocaleString(), fontSize: 11, fill: "#555" }}>
              {overall.map((o) => (<Cell key={o.priority} fill={COLORS.priority[o.priority]} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="สัดส่วน Priority ต่อ Zone (stacked)">
        <ResponsiveContainer width="100%" height={Math.max(300, byZone.length * 34)}>
          <BarChart data={byZone} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {PRIORITY_ORDER.map((p) => (<Bar key={p} dataKey={p} stackId="prio" fill={COLORS.priority[p]} name={p} />))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

// ============ 4. Job per Technician & Priority ============
export function AcJobPerTech() {
  const { visible } = useAllCo();
  const data = useMemo(() => {
    const m = new Map();
    for (const r of visible) {
      const name = techOf(r);
      if (!m.has(name)) m.set(name, { name, Critical: 0, Major: 0, Minor: 0, None: 0, total: 0 });
      const o = m.get(name); o.total++;
      if (PRIORITY_ORDER.includes(r.p)) o[r.p]++;
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 40);
  }, [visible]);
  if (!visible.length) return <EmptyBox />;
  return (
    <ChartCard title={`Job per ช่าง & Priority — Top ${data.length} ช่าง`}>
      <ResponsiveContainer width="100%" height={Math.max(360, data.length * 22)}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {PRIORITY_ORDER.map((p) => (<Bar key={p} dataKey={p} stackId="prio" fill={COLORS.priority[p]} name={p} />))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// shared SLA-by-zone chart
function SlaByZoneChart() {
  const { byZone } = useAllCo();
  return (
    <ChartCard style={cardGap} title="SLA Pass % ต่อ Zone — Before Waive (In Due) vs After Waive (Pass)">
      <ResponsiveContainer width="100%" height={Math.max(280, byZone.length * 44)}>
        <BarChart data={byZone} layout="vertical" margin={{ top: 10, right: 80, left: 10, bottom: 10 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="slaBefore" name="Before Waive (In Due)" fill="#42A5F5" label={{ position: "right", formatter: (v) => `${v.toFixed(1)}%`, fontSize: 10, fill: "#555" }} />
          <Bar dataKey="slaAfter" name="After Waive (Pass)" fill="#27AE60" label={{ position: "right", formatter: (v) => `${v.toFixed(1)}%`, fontSize: 10, fill: "#555" }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ============ 5. SLA% by Zone ============
export function AcSla() {
  const { visible } = useAllCo();
  if (!visible.length) return (<><KpiStrip /><EmptyBox /></>);
  return (<><KpiStrip /><SlaByZoneChart /></>);
}

// ============ 6. Job per Day ============
export function AcJobPerDay() {
  const { visible } = useAllCo();
  const data = useMemo(() => {
    const m = new Map();
    for (const r of visible) {
      const day = r.d;
      if (!m.has(day)) m.set(day, { day, Critical: 0, Major: 0, Minor: 0, None: 0, overdue: 0, total: 0 });
      const o = m.get(day); o.total++;
      if (PRIORITY_ORDER.includes(r.p)) o[r.p]++;
      if (r.bw === "Out Due") o.overdue++;
    }
    return Array.from(m.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [visible]);
  if (!visible.length) return <EmptyBox />;
  return (
    <ChartCard title={`Job per Day — ${data.length} วัน · รวม ${visible.length.toLocaleString()} งาน (เลือก Zone/ช่างด้านบน)`}>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60}
            tickFormatter={(d) => d.slice(5)} interval={Math.max(0, Math.floor(data.length / 31))} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {PRIORITY_ORDER.map((p) => (<Bar key={p} dataKey={p} stackId="d" fill={COLORS.priority[p]} name={p} />))}
          <Line type="monotone" dataKey="overdue" name="Over Due" stroke="#E74C3C" strokeWidth={2} dot={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ============ 7. TOP Problem Reason ============
export function AcProblem() {
  const { visible } = useAllCo();
  const reasons = useMemo(() => {
    const m = new Map();
    for (const r of visible) { if (!r.ro) continue; m.set(r.ro, (m.get(r.ro) || 0) + 1); }
    return Array.from(m, ([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 15);
  }, [visible]);
  const subcauses = useMemo(() => {
    const m = new Map();
    for (const r of visible) { if (!r.sc) continue; m.set(r.sc, (m.get(r.sc) || 0) + 1); }
    return Array.from(m, ([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 15);
  }, [visible]);
  if (!visible.length) return <EmptyBox />;
  if (!reasons.length && !subcauses.length) return <EmptyBox>ไม่มีข้อมูลสาเหตุ Over Due ในเงื่อนไขที่เลือก</EmptyBox>;
  return (
    <>
      {reasons.length > 0 && (
        <ChartCard style={cardGap} title="TOP สาเหตุ Over Due">
          <ResponsiveContainer width="100%" height={Math.max(240, reasons.length * 30)}>
            <BarChart data={reasons} layout="vertical" margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={240} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <Bar dataKey="n" name="จำนวน" fill="#E67E22" label={{ position: "right", fontSize: 10, fill: "#555" }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
      {subcauses.length > 0 && (
        <ChartCard title="TOP Subcause">
          <ResponsiveContainer width="100%" height={Math.max(240, subcauses.length * 30)}>
            <BarChart data={subcauses} layout="vertical" margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={240} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <Bar dataKey="n" name="จำนวน" fill="#9B59B6" label={{ position: "right", fontSize: 10, fill: "#555" }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </>
  );
}

// ============ 8. SLA% Performance per Technician ============
export function AcSlaPerTech() {
  const rows = useTechRows().filter((t) => t.total >= 10);
  const chart = rows.slice(0, 30).map((t) => ({ name: t.name, slaBefore: +t.slaBefore.toFixed(1), slaAfter: +t.slaAfter.toFixed(1) }));
  if (!rows.length) return <EmptyBox>ไม่มีช่างที่งาน ≥ 10 ในเงื่อนไขที่เลือก</EmptyBox>;
  return (
    <ChartCard title="SLA% Performance ต่อช่าง (≥10 งาน · Top 30) — Before vs After Waive">
      <ResponsiveContainer width="100%" height={Math.max(360, chart.length * 26)}>
        <BarChart data={chart} layout="vertical" margin={{ top: 10, right: 70, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="slaBefore" name="Before Waive" fill="#42A5F5" />
          <Bar dataKey="slaAfter" name="After Waive" fill="#27AE60" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ============ 9. Avg Duration ============
export function AcAvgDuration() {
  const { visible, byZone, colorFor } = useAllCo();
  const durByPriority = useMemo(() => {
    const acc = {};
    for (const p of PRIORITY_ORDER) acc[p] = { priority: p, ad: 0, adN: 0, do: 0, doN: 0, od: 0, odN: 0, tt: 0, ttN: 0, n: 0 };
    for (const r of visible) {
      const p = PRIORITY_ORDER.includes(r.p) ? r.p : null;
      if (!p) continue;
      const o = acc[p]; o.n++;
      if (r.ad != null) { o.ad += r.ad; o.adN++; }
      if (r.do != null) { o.do += r.do; o.doN++; }
      if (r.od != null) { o.od += r.od; o.odN++; }
      if (r.tt != null) { o.tt += r.tt; o.ttN++; }
    }
    return PRIORITY_ORDER.map((p) => {
      const o = acc[p];
      return { priority: p, n: o.n, ad: o.adN ? o.ad / o.adN : null, do: o.doN ? o.do / o.doN : null, od: o.odN ? o.od / o.odN : null, tt: o.ttN ? o.tt / o.ttN : null };
    }).filter((o) => o.n > 0);
  }, [visible]);
  const durData = useMemo(() => byZone.filter((z) => z.avgDurSec > 0).map((z) => ({ name: z.name, hr: +(z.avgDurSec / 3600).toFixed(2) })), [byZone]);
  if (!visible.length) return <EmptyBox />;
  return (
    <>
      <ChartCard style={cardGap} title="ระยะเวลาเฉลี่ยตาม Priority">
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead>
              <tr style={{ background: "#fafafc" }}>
                <th style={th}>Priority</th>
                <th style={{ ...th, textAlign: "right" }}>งาน</th>
                <th style={{ ...th, textAlign: "right" }}>Accept→Depart</th>
                <th style={{ ...th, textAlign: "right" }}>Depart→Onsite</th>
                <th style={{ ...th, textAlign: "right" }}>Onsite→Done</th>
                <th style={{ ...th, textAlign: "right" }}>Total Time</th>
              </tr>
            </thead>
            <tbody>
              {durByPriority.map((o) => (
                <tr key={o.priority} style={{ borderBottom: "1px solid #f0f0f3" }}>
                  <td style={td}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: COLORS.priority[o.priority], marginRight: 6 }} />{o.priority}</td>
                  <td style={numTd}>{o.n.toLocaleString()}</td>
                  <td style={numTd}>{formatSeconds(o.ad)}</td>
                  <td style={numTd}>{formatSeconds(o.do)}</td>
                  <td style={numTd}>{formatSeconds(o.od)}</td>
                  <td style={{ ...numTd, fontWeight: 700 }}>{formatSeconds(o.tt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      {durData.length > 0 && (
        <ChartCard title="Total Time เฉลี่ยต่อ Zone (ชั่วโมง)">
          <ResponsiveContainer width="100%" height={Math.max(280, durData.length * 32)}>
            <BarChart data={durData} layout="vertical" margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v} hr`} />
              <Bar dataKey="hr" name="Avg Total Time (hr)" label={{ position: "right", formatter: (v) => `${v}h`, fontSize: 10, fill: "#555" }}>
                {durData.map((z) => (<Cell key={z.name} fill={colorFor(z.name)} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </>
  );
}

// ============ 10. Ranking ============
export function AcRanking() {
  const { byZone, visible } = useAllCo();
  const techs = useTechRows();
  const eligible = techs.filter((t) => t.total >= 20);
  const bestTech = [...eligible].sort((a, b) => b.slaAfter - a.slaAfter).slice(0, 10);
  const worstTech = [...eligible].sort((a, b) => a.slaAfter - b.slaAfter).slice(0, 10);
  const zoneRank = [...byZone].sort((a, b) => b.slaAfter - a.slaAfter);
  if (!visible.length) return <EmptyBox />;
  return (
    <>
      <ChartCard style={cardGap} title="อันดับ Zone — เรียงตาม SLA After Waive (Pass %)">
        <div style={{ overflowX: "auto" }}>
          <table style={tbl}>
            <thead><tr style={{ background: "#fafafc" }}>
              <th style={th}>#</th><th style={th}>Zone</th>
              <th style={{ ...th, textAlign: "right" }}>งาน</th>
              <th style={{ ...th, textAlign: "right" }}>SLA Before</th>
              <th style={{ ...th, textAlign: "right" }}>SLA After</th>
              <th style={{ ...th, textAlign: "right" }}>Avg Time</th>
            </tr></thead>
            <tbody>
              {zoneRank.map((z, i) => (
                <tr key={z.name} style={{ borderBottom: "1px solid #f0f0f3" }}>
                  <td style={tdMute}>{i + 1}</td>
                  <td style={td}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: ZONE_COLORS[z.name] || "#888", marginRight: 6 }} />{z.name}</td>
                  <td style={numTd}>{z.total.toLocaleString()}</td>
                  <td style={{ ...numTd, color: slaColor(z.slaBefore), fontWeight: 600 }}>{z.slaBefore.toFixed(1)}%</td>
                  <td style={{ ...numTd, color: slaColor(z.slaAfter), fontWeight: 600 }}>{z.slaAfter.toFixed(1)}%</td>
                  <td style={numTd}>{fmtHr(z.avgDurSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      <div style={twoCol}>
        <ChartCard title="TOP 10 ช่าง (SLA After สูงสุด · ≥20 งาน)"><RankTable rows={bestTech} /></ChartCard>
        <ChartCard title="ช่างที่ต้องพัฒนา (SLA After ต่ำสุด · ≥20 งาน)"><RankTable rows={worstTech} /></ChartCard>
      </div>
    </>
  );
}

function RankTable({ rows }) {
  if (!rows.length) return <div style={{ padding: 20, color: "#888", fontSize: 12 }}>ไม่มีช่างที่งาน ≥ 20</div>;
  return (
    <div style={{ maxHeight: 360, overflowY: "auto" }}>
      <table style={tbl}>
        <thead><tr style={{ background: "#fafafc", position: "sticky", top: 0 }}>
          <th style={th}>#</th><th style={th}>ช่าง</th><th style={th}>Zone</th>
          <th style={{ ...th, textAlign: "right" }}>งาน</th>
          <th style={{ ...th, textAlign: "right" }}>SLA After</th>
        </tr></thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.name} style={{ borderBottom: "1px solid #f0f0f3" }}>
              <td style={tdMute}>{i + 1}</td>
              <td style={td}>{t.name}</td>
              <td style={tdMute}>{t.zone}</td>
              <td style={numTd}>{t.total.toLocaleString()}</td>
              <td style={{ ...numTd, color: slaColor(t.slaAfter), fontWeight: 700 }}>{t.slaAfter.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ 11. KPI SLA per Zone ============
export function AcKpiSla() {
  const { byZone, visible } = useAllCo();
  if (!visible.length) return <EmptyBox />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
      {byZone.map((z) => (
        <div key={z.name} style={{ background: "#fff", border: "1px solid #e6e6ea", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: ZONE_COLORS[z.name] || "#888", color: "#fff", padding: "10px 14px", fontWeight: 700, fontSize: 14 }}>{z.name}</div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div><div style={{ fontSize: 11, color: "#888" }}>งานทั้งหมด</div><div style={{ fontSize: 22, fontWeight: 800 }}>{z.total.toLocaleString()}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#888" }}>Avg Time</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{fmtHr(z.avgDurSec)}</div></div>
            </div>
            <SlaBar label="Before Waive" v={z.slaBefore} />
            <SlaBar label="After Waive" v={z.slaAfter} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SlaBar({ label, v }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 700, color: slaColor(v) }}>{v.toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: "#f0f0f3", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, v)}%`, height: "100%", background: slaColor(v) }} />
      </div>
    </div>
  );
}

// ============ 12. Technicians table ============
export function AcTechnicians() {
  const rows = useTechRows();
  const { visible } = useAllCo();
  if (!visible.length) return <EmptyBox />;
  return (
    <ChartCard title={`ช่างทั้งหมด (${rows.length})`}>
      <div style={{ maxHeight: 600, overflowY: "auto" }}>
        <table style={tbl}>
          <thead><tr style={{ background: "#fafafc", position: "sticky", top: 0 }}>
            <th style={th}>#</th><th style={th}>ช่าง</th><th style={th}>Zone</th><th style={th}>Sub</th>
            <th style={{ ...th, textAlign: "right" }}>งาน</th>
            <th style={{ ...th, textAlign: "right" }}>SLA Before</th>
            <th style={{ ...th, textAlign: "right" }}>SLA After</th>
            <th style={{ ...th, textAlign: "right" }}>Avg Time</th>
          </tr></thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={a.name} style={{ borderBottom: "1px solid #f0f0f3" }}>
                <td style={tdMute}>{i + 1}</td>
                <td style={td}>{a.name}</td>
                <td style={td}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: ZONE_COLORS[a.zone] || "#888", marginRight: 6, verticalAlign: "middle" }} />{a.zone}</td>
                <td style={tdMute}>{a.sub || "—"}</td>
                <td style={numTd}>{a.total.toLocaleString()}</td>
                <td style={{ ...numTd, color: slaColor(a.slaBefore), fontWeight: 600 }}>{a.slaBefore.toFixed(1)}%</td>
                <td style={{ ...numTd, color: slaColor(a.slaAfter), fontWeight: 600 }}>{a.slaAfter.toFixed(1)}%</td>
                <td style={numTd}>{fmtHr(a.avgDurSec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
