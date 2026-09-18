import React from "react";

// Small shared presentational bits + styles for All-Company sub-pages.

export function KpiCard({ label, value, sub, tint }) {
  return (
    <div style={kpiCard}>
      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tint || "#1f1f2c", marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function EmptyBox({ children }) {
  return <div style={emptyBox}>{children || "ไม่มีข้อมูลในเงื่อนไขที่เลือก — ปรับช่วงวัน/บริษัท/ช่าง"}</div>;
}

export const kpiRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginBottom: 14,
};
export const kpiCard = { background: "#fff", border: "1px solid #e6e6ea", borderRadius: 10, padding: "14px 16px" };
export const twoCol = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 };
export const cardGap = { marginBottom: 14 };
export const emptyBox = { padding: 60, textAlign: "center", color: "#888", background: "#fff", borderRadius: 10, border: "1px solid #e6e6ea" };

export const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
export const th = { padding: "8px 10px", textAlign: "left", color: "#666", fontWeight: 600, fontSize: 11, borderBottom: "1px solid #e6e6ea" };
export const td = { padding: "7px 10px", color: "#1f1f2c" };
export const tdMute = { padding: "7px 10px", color: "#888", fontSize: 11 };
export const numTd = { padding: "7px 10px", color: "#1f1f2c", textAlign: "right", fontVariantNumeric: "tabular-nums" };
