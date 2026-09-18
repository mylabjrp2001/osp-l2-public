import React, { useEffect, useRef, useState } from "react";
import { useData } from "./data.js";
import { usePersistedState } from "./utils.js";
import { FilterProvider } from "./filters.jsx";
import FilterBar from "./components/FilterBar.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import { captureAllPages, exportToPDF, exportToPPTX } from "./export.js";
import { usePath, navigate, isAllCompanyPath, allCompanySlug } from "./router.js";
import AllCompanyArea from "./allcompany/AllCompanyArea.jsx";
import { ALLCO_NAV, urlForSlug } from "./allcompany/nav.js";

import Page02 from "./pages/Page02_JobTotalInZone.jsx";
import Page03 from "./pages/Page03_PriorityAllZone.jsx";
import Page04 from "./pages/Page04_JobPerTeamPriority.jsx";
import Page05 from "./pages/Page05_SlaByZone.jsx";
import Page06 from "./pages/Page06_JobPerDayLatkrabang.jsx";
import Page07 from "./pages/Page07_JobPerDayPathumthani.jsx";
import Page08 from "./pages/Page08_TopProblemReason.jsx";
import Page09 from "./pages/Page09_SlaPerTeamLatkrabang.jsx";
import Page10 from "./pages/Page10_SlaPerTeamPathumthani.jsx";
import Page11 from "./pages/Page11_OverviewZoneLatkrabang.jsx";
import Page12 from "./pages/Page12_OverviewTeamLatA.jsx";
import Page13 from "./pages/Page13_OverviewTeamLatB.jsx";
import Page14 from "./pages/Page14_OverviewTeamLatC.jsx";
import Page15 from "./pages/Page15_OverviewZonePathumthani.jsx";
import Page16 from "./pages/Page16_OverviewTeamPathA.jsx";
import Page17 from "./pages/Page17_OverviewTeamPathB.jsx";
import Page18 from "./pages/Page18_OverviewTeamPathC.jsx";
import Page19 from "./pages/Page19_AvgDurationLatkrabang.jsx";
import Page20 from "./pages/Page20_AvgDurationPathumthani.jsx";
import Page21 from "./pages/Page21_AvgRanking.jsx";
import Page22 from "./pages/Page22_KPISla.jsx";
import DashSolutionSummary from "./pages/DashSolutionSummary.jsx";
import DashPendingByTeam from "./pages/DashPendingByTeam.jsx";
import DashJobGantt from "./pages/DashJobGantt.jsx";
import DashAllCompanies from "./pages/DashAllCompanies.jsx";
import Page01Cover from "./pages/Page01_Cover.jsx";

const NAV = [
  { id: "p1", n: "1", t: "Cover / หน้าปก", c: Page01Cover },
  { id: "p2", n: "2", t: "Job Total in Zone", c: Page02 },
  { id: "p3", n: "3", t: "Priority All Zone", c: Page03 },
  { id: "p4", n: "4", t: "Job per team & priority", c: Page04 },
  { id: "p5", n: "5", t: "SLA% by Zone", c: Page05 },
  { id: "p6", n: "6", t: "Job per day — Latkrabang", c: Page06 },
  { id: "p7", n: "7", t: "Job per day — Pathumthani", c: Page07 },
  { id: "p8", n: "8", t: "TOP 5 Problem Reason", c: Page08 },
  { id: "p9", n: "9", t: "SLA% per team — Latkrabang", c: Page09 },
  { id: "p10", n: "10", t: "SLA% per team — Pathumthani", c: Page10 },
  { id: "p11", n: "11", t: "Overview — Latkrabang Zone", c: Page11 },
  { id: "p12", n: "12", t: "Overview — Latkrabang A", c: Page12 },
  { id: "p13", n: "13", t: "Overview — Latkrabang B", c: Page13 },
  { id: "p14", n: "14", t: "Overview — Latkrabang C", c: Page14 },
  { id: "p15", n: "15", t: "Overview — Pathumthani Zone", c: Page15 },
  { id: "p16", n: "16", t: "Overview — Pathumthani A", c: Page16 },
  { id: "p17", n: "17", t: "Overview — Pathumthani B", c: Page17 },
  { id: "p18", n: "18", t: "Overview — Pathumthani C", c: Page18 },
  { id: "p19", n: "19", t: "Avg Duration — Latkrabang", c: Page19 },
  { id: "p20", n: "20", t: "Avg Duration — Pathumthani", c: Page20 },
  { id: "p21", n: "21", t: "Avg Overall Ranking", c: Page21 },
  { id: "p22", n: "22", t: "KPI SLA % Per Team", c: Page22 },
];

const DASH = [
  { id: "d1", n: "D1", t: "Solution Summary", c: DashSolutionSummary },
  { id: "d2", n: "D2", t: "งานรอลงข้อมูล (รายทีม)", c: DashPendingByTeam },
  { id: "d3", n: "D3", t: "Job Timeline (Gantt)", c: DashJobGantt },
  { id: "d4", n: "D4", t: "ภาพรวมทุกบริษัท", c: DashAllCompanies },
];

const ALL_PAGES = [...NAV, ...DASH];

export default function App() {
  const { loading, data, error } = useData();
  const path = usePath();
  const onAllCompany = isAllCompanyPath(path);
  const allCoActiveId = onAllCompany
    ? (ALLCO_NAV.find((x) => x.slug === allCompanySlug(path)) || ALLCO_NAV[0]).id
    : null;
  const [activeId, setActiveId] = usePersistedState("dmp.activeId.v1", "p1");

  // Sidebar pick: all-company sub-pages route by URL; DMP pages use activeId.
  const handlePick = (id) => {
    const allco = ALLCO_NAV.find((x) => x.id === id);
    if (allco) {
      navigate(urlForSlug(allco.slug));
      return;
    }
    if (onAllCompany) navigate("/");
    setActiveId(id);
  };
  const [present, setPresent] = useState(false);
  const [exportState, setExportState] = useState(null); // { kind, i, total, label } | null
  const [uploadOpen, setUploadOpen] = useState(false);
  const exportTargetRef = useRef(null);

  const runExport = async (kind) => {
    if (exportState) return;
    setExportState({ kind, i: 0, total: NAV.length, label: "เริ่ม…" });
    const prevId = activeId;
    // The export captures the 21 report pages, which only mount on the report view.
    // From /allcompany the capture target never existed and the export silently
    // produced nothing, so switch views for the duration of the export.
    const prevPath = onAllCompany ? window.location.pathname : null;
    if (prevPath) navigate("/");
    try {
      const shots = await captureAllPages({
        nav: NAV,
        setActiveId,
        getTargetEl: () => exportTargetRef.current,
        onProgress: (i, total, label) => setExportState({ kind, i, total, label }),
      });
      setExportState({ kind, i: NAV.length, total: NAV.length, label: "กำลังสร้างไฟล์…" });
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "pdf") {
        await exportToPDF(shots, { filename: `DMP-Monthly-Report-${stamp}.pdf` });
      } else {
        await exportToPPTX(shots, { filename: `DMP-Monthly-Report-${stamp}.pptx` });
      }
    } catch (err) {
      console.error(err);
      alert("Export error: " + (err?.message || err));
    } finally {
      setActiveId(prevId);
      if (prevPath) navigate(prevPath);
      setExportState(null);
    }
  };

  // ESC to exit Present mode; arrow keys to navigate when in Present mode.
  useEffect(() => {
    const onKey = (e) => {
      // Arrow keys inside a note, date input or the page <select> belong to that
      // control — don't also flip the slide.
      const el = e.target;
      const typing =
        el instanceof HTMLElement &&
        (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
      if (e.key === "Escape" && present) {
        setPresent(false);
        if (document.fullscreenElement) document.exitFullscreen?.();
      } else if (typing) {
        return;
      } else if (present && (e.key === "ArrowRight" || e.key === "PageDown")) {
        e.preventDefault();
        const idx = NAV.findIndex((x) => x.id === activeId);
        setActiveId(NAV[Math.min(NAV.length - 1, idx + 1)].id);
      } else if (present && (e.key === "ArrowLeft" || e.key === "PageUp")) {
        e.preventDefault();
        const idx = NAV.findIndex((x) => x.id === activeId);
        setActiveId(NAV[Math.max(0, idx - 1)].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, activeId]);

  // Sync browser Fullscreen API state when user toggles via UI or ESC.
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && present) setPresent(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [present]);

  if (loading)
    return <div style={{ padding: 40, color: "#1f1f2c" }}>กำลังโหลดข้อมูล...</div>;
  if (error)
    return (
      <div style={{ padding: 40, color: "#c0392b" }}>
        Error: {String(error.message || error)}
      </div>
    );

  const active = ALL_PAGES.find((x) => x.id === activeId) || ALL_PAGES[0];
  const Active = active.c;

  const enterPresent = async () => {
    setPresent(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch (e) {
      /* ignore */
    }
  };
  const exitPresent = async () => {
    setPresent(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
    } catch (e) {
      /* ignore */
    }
  };

  if (present) {
    return (
      <FilterProvider dateMin={data.date_min} dateMax={data.date_max}>
        <PresentView
          activeId={activeId}
          setActiveId={setActiveId}
          Active={Active}
          activeTitle={active.t}
          activePageNum={active.n}
          totalPages={NAV[NAV.length - 1].n}
          records={data.records}
          onExit={exitPresent}
        />
      </FilterProvider>
    );
  }

  return (
    <FilterProvider dateMin={data.date_min} dateMax={data.date_max}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          sections={[
            { title: "Monthly Report", subtitle: "21 รายงาน · Team Performance", items: NAV },
            { title: "Dashboard (หลังบ้าน)", subtitle: "Solution / Pending data", items: DASH, accent: "#3498DB" },
            { title: "ทุกบริษัท", subtitle: "All companies · ตัวกรองบริษัท/ช่าง", items: ALLCO_NAV, accent: "#E67E22" },
          ]}
          activeId={onAllCompany ? allCoActiveId : activeId}
          onPick={handlePick}
        />
        <main
          style={{
            flex: 1,
            padding: "24px 32px",
            minWidth: 0,
            maxWidth: "calc(100vw - 280px)",
          }}
        >
          <TopBanner
            onPresent={enterPresent}
            onExportPDF={() => runExport("pdf")}
            onExportPPTX={() => runExport("pptx")}
            onUpload={() => setUploadOpen(true)}
            exporting={!!exportState}
          />
          {onAllCompany ? (
            <AllCompanyArea records={data.records} />
          ) : (
            <>
              <FilterBar />
              <div ref={exportTargetRef}>
                <Active records={data.records} />
              </div>
            </>
          )}
          <footer
            style={{
              marginTop: 32,
              padding: "16px 0",
              fontSize: 11,
              color: "#9a9aaf",
              textAlign: "center",
            }}
          >
            DMP Advance Solution Network (BKK) — generated {data.generated_at}
          </footer>
        </main>
      </div>
      {exportState && <ExportOverlay state={exportState} />}
      <UploadPanel open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </FilterProvider>
  );
}

function ExportOverlay({ state }) {
  const pct = state.total > 0 ? Math.round((state.i / state.total) * 100) : 0;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 12, 35, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "24px 32px",
          minWidth: 360,
          boxShadow: "0 16px 60px rgba(0,0,0,0.30)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>
          {state.kind === "pdf" ? "📄" : "🎞️"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1f1f2c", marginBottom: 4 }}>
          กำลัง Export {state.kind === "pdf" ? "PDF" : "PowerPoint"}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
          {state.i} / {state.total} · {state.label}
        </div>
        <div
          style={{
            height: 8,
            background: "#f0f0f3",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "linear-gradient(90deg, #A8D75A, #6fb720)",
              transition: "width 0.3s",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
          อย่าปิดหน้าระหว่างกำลังสร้างไฟล์
        </div>
      </div>
    </div>
  );
}

function PresentView({ activeId, setActiveId, Active, activeTitle, activePageNum, totalPages, records, onExit }) {
  const idx = NAV.findIndex((x) => x.id === activeId);
  const prev = NAV[Math.max(0, idx - 1)]?.id;
  const next = NAV[Math.min(NAV.length - 1, idx + 1)]?.id;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        padding: "20px 28px 24px",
        position: "relative",
      }}
    >
      <Active records={records} />

      {/* Floating control bar */}
      <div
        style={{
          position: "fixed",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(20, 22, 32, 0.92)",
          color: "#fff",
          padding: "8px 14px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          boxShadow: "0 8px 28px rgba(0,0,0,0.30)",
          zIndex: 1000,
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          onClick={() => prev && setActiveId(prev)}
          disabled={!prev || prev === activeId}
          style={pillBtnStyle}
          title="หน้าก่อน (← / PgUp)"
        >
          ‹
        </button>
        <span style={{ minWidth: 90, textAlign: "center", fontWeight: 600 }}>
          หน้า {activePageNum} / {totalPages}
        </span>
        <button
          onClick={() => next && setActiveId(next)}
          disabled={!next || next === activeId}
          style={pillBtnStyle}
          title="หน้าถัดไป (→ / PgDn)"
        >
          ›
        </button>
        <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />
        <select
          value={activeId}
          onChange={(e) => setActiveId(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 14,
            padding: "5px 10px",
            fontSize: 12,
            cursor: "pointer",
            maxWidth: 260,
          }}
        >
          {NAV.map((it) => (
            <option key={it.id} value={it.id} style={{ background: "#1a1a2e", color: "#fff" }}>
              {it.n}. {it.t}
            </option>
          ))}
        </select>
        <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />
        <button onClick={onExit} style={{ ...pillBtnStyle, color: "#FFD180" }} title="ออกจาก Present (ESC)">
          ✕ ออก
        </button>
      </div>

      {/* Small page label at top-right */}
      <div
        style={{
          position: "fixed",
          top: 14,
          right: 18,
          fontSize: 11,
          color: "#9a9aaf",
          background: "rgba(255,255,255,0.7)",
          padding: "4px 10px",
          borderRadius: 12,
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      >
        🎬 Present · ESC = ออก · ← → = เปลี่ยนหน้า
      </div>
    </div>
  );
}

const pillBtnStyle = {
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 14,
  padding: "4px 10px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  minWidth: 30,
};

function TopBanner({ onPresent, onExportPDF, onExportPPTX, onUpload, exporting }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #d6f0ad 0%, #ffe2a8 100%)",
        border: "1px solid #e6e6ea",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            color: "#6b6b78",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          DMP Advance Solution Network (BKK)
        </div>
        <div
          style={{ fontSize: 22, fontWeight: 700, color: "#4d6a1f", marginTop: 2 }}
        >
          Monthly Report — Team Performance
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onUpload}
          disabled={exporting}
          style={ghostBtn(exporting, "#2C7A4D")}
          title="อัพโหลดไฟล์ Excel เพื่ออัพเดตข้อมูล"
        >
          <span>📥</span>
          <span>Upload Excel</span>
        </button>
        <button
          onClick={onExportPDF}
          disabled={exporting}
          style={ghostBtn(exporting, "#C0392B")}
          title="Export ทุก 21 หน้ารายงานเป็นไฟล์ PDF"
        >
          <span>📄</span>
          <span>PDF</span>
        </button>
        <button
          onClick={onExportPPTX}
          disabled={exporting}
          style={ghostBtn(exporting, "#D35400")}
          title="Export ทุก 21 หน้ารายงานเป็นไฟล์ PowerPoint (.pptx)"
        >
          <span>🎞️</span>
          <span>PowerPoint</span>
        </button>
        <button
          onClick={onPresent}
          disabled={exporting}
          style={{
            background: exporting
              ? "#9aaa80"
              : "linear-gradient(135deg, #4d6a1f, #6fb720)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: 13,
            cursor: exporting ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(77,106,31,0.30)",
          }}
          title="Present (full screen) — ซ่อน sidebar/filter เพื่อนำเสนอ"
        >
          <span>🎬</span>
          <span>Present</span>
        </button>
      </div>
    </div>
  );
}

function ghostBtn(disabled, color) {
  return {
    background: "#fff",
    color: disabled ? "#aaa" : color,
    border: `1px solid ${disabled ? "#ddd" : color + "55"}`,
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s",
  };
}

function Sidebar({ sections, activeId, onPick }) {
  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #e6e6ea",
        padding: "16px 12px",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {sections.map((sec, sIdx) => {
        const accent = sec.accent || "#A8D75A";
        const accentText = sec.accent || "#4d6a1f";
        return (
          <div key={sec.title} style={{ marginBottom: 16 }}>
            <div
              style={{
                padding: "0 12px 10px",
                borderBottom: "1px solid #ececef",
                marginBottom: 8,
                marginTop: sIdx === 0 ? 0 : 6,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: accentText }}>
                {sIdx === 0 ? "📊 " : "🗄️ "}{sec.title}
              </div>
              <div style={{ fontSize: 11, color: "#8b8b96", marginTop: 2 }}>{sec.subtitle}</div>
            </div>
            {sec.items.map((it) => {
              const isActive = activeId === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => onPick(it.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 12px",
                    marginBottom: 2,
                    background: isActive ? `${accent}22` : "transparent",
                    color: isActive ? accentText : "#444",
                    border: "none",
                    borderLeft: isActive ? `3px solid ${accent}` : "3px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    borderRadius: "0 6px 6px 0",
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "#8b8b96",
                      fontWeight: 700,
                      minWidth: 24,
                    }}
                  >
                    {it.n}
                  </span>
                  <span style={{ flex: 1 }}>{it.t}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
