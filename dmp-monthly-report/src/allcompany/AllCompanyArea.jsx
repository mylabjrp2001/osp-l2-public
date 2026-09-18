import React from "react";
import PageHeader from "../components/PageHeader.jsx";
import AllCompanyFilterBar from "../components/AllCompanyFilterBar.jsx";
import { AllCompanyProvider, useAllCo } from "./context.jsx";
import { usePath, allCompanySlug } from "../router.js";
import { navItemForSlug } from "./nav.js";

// Container for the whole /allcompany area: shared filter bar + the active
// sub-page (chosen by URL slug). One AllCompanyProvider wraps everything so the
// zone/technician selection + computed records are shared across sub-pages.
export default function AllCompanyArea({ records }) {
  return (
    <AllCompanyProvider records={records}>
      <AreaInner />
    </AllCompanyProvider>
  );
}

function AreaInner() {
  const path = usePath();
  const item = navItemForSlug(allCompanySlug(path));
  const { zones, technicians } = useAllCo();
  const Active = item.c;

  const scope =
    zones.length === 0
      ? "ทุก Zone"
      : `${zones.length} zone` + (technicians.length ? ` · ${technicians.length} ช่าง` : " · ทุกช่าง");

  return (
    <div style={{ color: "#1f1f2c" }}>
      {/* The Cover page renders its own hero; other pages get the standard header. */}
      {!item.hero && <PageHeader title={`All Companies — ${item.t}`} subtitle={scope} />}
      <AllCompanyFilterBar />
      <Active />
    </div>
  );
}
