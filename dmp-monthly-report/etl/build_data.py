#!/usr/bin/env python3
"""ETL: Excel (2025 + 2026) -> public/data.json for the React app.

Output schema (one record per JB_ID):
  date            ISO date string (Z_CREATE_DATE)
  zone            "Latkrabang" | "Pathumthani" | "Other (<zone_id>)"
  zone_id         raw ZONE_ID/ZONE_BY_SITE
  assign_to       raw ASSIGN_TO
  team            "Dmplocallatkrabang A" / ... or raw ASSIGN_TO when not a zone team
  priority        "Critical" | "Major" | "Minor" | "None"
  before_waive    "In Due" | "Out Due" | null
  after_waive     "Pass" | "Not Waive" | null
  reason_overdue  string | null
  subcause2       string | null
  accept_to_depart_s  int seconds | null
  depart_to_onsite_s  int seconds | null
  onsite_to_done_s    int seconds | null
  total_time_s        int seconds | null
"""
import json
import re
import sys
from datetime import datetime, date, time, timedelta
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[2]
EXCEL_DIR = ROOT / "Excel Data"
OUT = Path(__file__).resolve().parents[1] / "public" / "data.json"


def parse_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day)
    if isinstance(v, str):
        s = v.strip()
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y %I:%M:%S %p",
                    "%m/%d/%Y %H:%M:%S", "%m/%d/%Y", "%d/%m/%Y %H:%M:%S",
                    "%d/%m/%Y"):
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                pass
    return None


def parse_seconds(v):
    """Convert various time representations to seconds (int) or None."""
    if v is None or v == "":
        return None
    if isinstance(v, time):
        return v.hour * 3600 + v.minute * 60 + v.second
    if isinstance(v, timedelta):
        return int(v.total_seconds())
    if isinstance(v, (int, float)):
        # Excel time fraction of a day
        if 0 <= v <= 1:
            return int(round(v * 86400))
        # Otherwise treat as seconds already
        return int(v)
    if isinstance(v, str):
        s = v.strip()
        m = re.match(r"^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$", s)
        if m:
            h, mi, sec = m.group(1), m.group(2), m.group(3) or "0"
            return int(h) * 3600 + int(mi) * 60 + int(sec)
    return None


def zone_of(assign_to: str | None, zone_id: str | None):
    if assign_to:
        a = assign_to.lower()
        if "dmplocallatkrabang" in a:
            return "Latkrabang"
        if "dmplocalpathumthani" in a:
            return "Pathumthani"
    # Fall back to bucket-by zone_id
    return f"Other"


def team_label(assign_to: str | None):
    if not assign_to:
        return None
    m = re.match(r"(?i)Dmplocal(latkrabang|pathumthani)\s*([A-Z])", assign_to)
    if m:
        zone = m.group(1).lower()  # keep lowercase: matches theme.js TEAMS constants
        return f"Dmplocal{zone} {m.group(2).upper()}"
    return assign_to


def read_workbook(path: Path, sheet: str, col_map: dict):
    """Read rows from sheet using a header-name -> internal-key map."""
    print(f"  loading {path.name}/{sheet} ...", file=sys.stderr)
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet]
    header = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    header = [str(h).strip() if h is not None else "" for h in header]
    idx = {}
    for key, names in col_map.items():
        for nm in names:
            if nm in header:
                idx[key] = header.index(nm)
                break
    missing = [k for k in col_map if k not in idx]
    if missing:
        print(f"    !!! missing columns in {path.name}: {missing}", file=sys.stderr)
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        get = lambda k: r[idx[k]] if k in idx else None
        rows.append({k: get(k) for k in col_map})
    wb.close()
    return rows


COL_MAP = {
    "z_create_date": ["Z_CREATE_DATE"],
    "report_date": ["REPORT_DATE"],
    "zone_id": ["ZONE_BY_SITE", "ZONE_ID"],
    "assign_to": ["ASSIGN_TO"],
    "priority": ["PRIORITY_ID"],
    "before_waive": ["Before Waive"],
    "after_waive": ["Team After Waive", "After Waive"],
    "reason_overdue": ["สาเหตุ Over Due"],
    "subcause2": ["SUBCAUSE2"],
    "accept_to_depart": ["Accept to Depart"],
    "depart_to_onsite": ["Depart to Onsite"],
    "onsite_to_done": ["Onsite to Done"],
    "total_time": ["Total Time"],
    "jb_id": ["JB_ID"],
    "solution": ["Solution"],
    "problem": ["Problem"],
}


def transform(raw):
    out = []
    seen_dates = []
    for r in raw:
        # Use REPORT_DATE as the primary "completion date" so monthly totals match
        # the Power BI report (which buckets by report/finish month, not create month).
        dt = parse_date(r.get("report_date")) or parse_date(r.get("z_create_date"))
        if not dt:
            continue
        rec = {
            "d": dt.date().isoformat(),
            "zid": (r.get("zone_id") or "").strip() or None,
            "a": (r.get("assign_to") or "").strip() or None,
            "p": (r.get("priority") or "").strip() or None,
            "bw": (r.get("before_waive") or "").strip() or None,
            "aw": (r.get("after_waive") or "").strip() or None,
            "ro": (r.get("reason_overdue") or "").strip() or None,
            "sc": (r.get("subcause2") or "").strip() or None,
            "ad": parse_seconds(r.get("accept_to_depart")),
            "do": parse_seconds(r.get("depart_to_onsite")),
            "od": parse_seconds(r.get("onsite_to_done")),
            "tt": parse_seconds(r.get("total_time")),
            "sol": (str(r.get("solution")).strip() if r.get("solution") is not None else None) or None,
            "prb": (str(r.get("problem")).strip() if r.get("problem") is not None else None) or None,
            "jb": (str(r.get("jb_id")).strip() if r.get("jb_id") is not None else None) or None,
        }
        rec["z"] = zone_of(rec["a"], rec["zid"])
        rec["t"] = team_label(rec["a"])
        out.append(rec)
        seen_dates.append(dt.date())
    return out, (min(seen_dates).isoformat() if seen_dates else None,
                 max(seen_dates).isoformat() if seen_dates else None)


def main():
    all_rows = []
    sources = [
        (EXCEL_DIR / "Data Job done 2025.xlsx", "Data Job done 2025"),
        (EXCEL_DIR / "Data Job done 2026.xlsm", "Data Job done 2026"),
    ]
    for path, sheet in sources:
        raw = read_workbook(path, sheet, COL_MAP)
        all_rows.extend(raw)
    print(f"loaded {len(all_rows)} raw rows", file=sys.stderr)
    records, (dmin, dmax) = transform(all_rows)
    print(f"emit {len(records)} records ({dmin} -> {dmax})", file=sys.stderr)

    # Sort by date for convenience
    records.sort(key=lambda r: r["d"])

    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "date_min": dmin,
        "date_max": dmax,
        "total": len(records),
        "records": records,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT} ({OUT.stat().st_size/1e6:.2f} MB)", file=sys.stderr)


if __name__ == "__main__":
    main()
