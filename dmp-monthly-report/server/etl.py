"""ETL module — refactored from etl/build_data.py to be callable from FastAPI.

Reads every `Data Job done <YEAR>.xlsx|.xlsm` in `excel_dir`, transforms rows,
and writes the merged result to `out_path` as JSON.

Usage from Python:
    from server.etl import build_data_json
    info = build_data_json(excel_dir, out_path)
    # info = {"records": int, "date_min": "...", "date_max": "...", "files": [...]}
"""
from __future__ import annotations

import json
import re
import sys
import time as _time
from datetime import datetime, date, time, timedelta
from pathlib import Path

import openpyxl


# Bump whenever the shape or meaning of the emitted records changes. The backend
# compares this with the `etl_version` stored in data.json on startup and
# rebuilds automatically, so a deploy never serves data from an older ETL.
ETL_VERSION = 2

# Durations longer than this are data-entry errors (e.g. a blank ONSITE_DATE turns
# "Onsite to Done" into a 100+ day span). They are dropped instead of skewing means.
MAX_DURATION_SEC = 30 * 86400


# ---------- Filename / sheet helpers ----------

FILENAME_RE = re.compile(r"(?i)^Data\s+Job\s+done\s+(\d{4})\.xls[xm]$")


def parse_year_from_filename(name: str) -> int | None:
    m = FILENAME_RE.match(name.strip())
    return int(m.group(1)) if m else None


def list_excel_files(excel_dir: Path) -> list[tuple[Path, int]]:
    """Return [(path, year), ...] for valid year-named Excel files, sorted by year."""
    out: list[tuple[Path, int]] = []
    if not excel_dir.exists():
        return out
    for p in excel_dir.iterdir():
        if not p.is_file():
            continue
        year = parse_year_from_filename(p.name)
        if year is not None:
            out.append((p, year))
    out.sort(key=lambda x: x[1])
    return out


# ---------- Value parsers (identical semantics to etl/build_data.py) ----------

def parse_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day)
    if isinstance(v, str):
        s = v.strip()
        for fmt in (
            "%Y-%m-%d %H:%M:%S", "%Y-%m-%d",
            "%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y",
            "%d/%m/%Y %H:%M:%S", "%d/%m/%Y",
        ):
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                pass
    return None


def _excel_duration_datetime(v: datetime) -> int | None:
    """A duration cell of 1 day or more comes back from openpyxl as a datetime near
    the Excel epoch (e.g. 1900-01-01 20:49:07 = 1 day 20:49:07). openpyxl shifts
    serials below 60 by one day for Excel's fake 1900-02-29, so the base differs
    on either side of 1900-03-01. A real calendar date is not a duration."""
    if v.year > 1900:
        return None
    base = datetime(1899, 12, 31) if v < datetime(1900, 3, 1) else datetime(1899, 12, 30)
    return int((v - base).total_seconds())


def _raw_seconds(v):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return _excel_duration_datetime(v)
    if isinstance(v, time):
        return v.hour * 3600 + v.minute * 60 + v.second
    if isinstance(v, timedelta):
        return int(v.total_seconds())
    if isinstance(v, (int, float)):
        if 0 <= v <= 1:
            return int(round(v * 86400))
        return int(v)
    if isinstance(v, str):
        s = v.strip()
        m = re.match(r"^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$", s)
        if m:
            h, mi, sec = m.group(1), m.group(2), m.group(3) or "0"
            return int(h) * 3600 + int(mi) * 60 + int(sec)
    return None


def parse_seconds(v):
    """Duration cell -> seconds, or None when blank, an error like #VALUE!, a real
    calendar date, negative, or longer than MAX_DURATION_SEC."""
    s = _raw_seconds(v)
    if s is None or s < 0 or s > MAX_DURATION_SEC:
        return None
    return s


def _canon(v, choices):
    """Normalise a free-text status cell to its canonical spelling, ignoring case
    and surrounding spaces ("pass" -> "Pass"). Unknown values pass through as-is."""
    s = (v or "").strip()
    if not s:
        return None
    for c in choices:
        if s.lower() == c.lower():
            return c
    return s


BEFORE_WAIVE_VALUES = ("In Due", "Out Due")
AFTER_WAIVE_VALUES = ("Pass", "Not Waive")


def zone_of(assign_to: str | None, zone_id: str | None):
    if assign_to:
        a = assign_to.lower()
        if "dmplocallatkrabang" in a:
            return "Latkrabang"
        if "dmplocalpathumthani" in a:
            return "Pathumthani"
    return "Other"


def team_label(assign_to: str | None):
    if not assign_to:
        return None
    m = re.match(r"(?i)Dmplocal(latkrabang|pathumthani)\s*([A-Z])", assign_to)
    if m:
        zone = m.group(1).lower()
        return f"Dmplocal{zone} {m.group(2).upper()}"
    return assign_to


COL_MAP = {
    "z_create_date": ["Z_CREATE_DATE"],
    "report_date": ["REPORT_DATE"],
    "create_date": ["CREATE_DATE"],
    "assign_date": ["ASSIGN_DATE"],
    "accept_date": ["ACCEPT_DATE"],
    "initiate_date": ["INITIATE_DATE"],
    "onsite_date": ["ONSITE_DATE"],
    "finish_date": ["FINISH_DATE"],
    "zone_id": ["ZONE_BY_SITE", "ZONE_ID"],
    "wfm_company": ["WFM_COMPANY"],
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


def _iso_dt(v):
    """Parse a cell to ISO datetime string (YYYY-MM-DDTHH:MM:SS) or None."""
    dt = parse_date(v)
    if not dt:
        return None
    return dt.replace(microsecond=0).isoformat()


def _pick_sheet(wb, filename_stem: str) -> str:
    """Prefer sheet named exactly like the filename stem; else first sheet starting
    with 'Data Job done'; else the first sheet in the workbook."""
    names = wb.sheetnames
    if filename_stem in names:
        return filename_stem
    for n in names:
        if n.strip().lower().startswith("data job done"):
            return n
    return names[0]


def read_workbook(path: Path, log=print) -> list[dict]:
    log(f"  loading {path.name} ...")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = _pick_sheet(wb, path.stem)
    ws = wb[sheet]
    header = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    header = [str(h).strip() if h is not None else "" for h in header]
    idx: dict[str, int] = {}
    for key, names in COL_MAP.items():
        for nm in names:
            if nm in header:
                idx[key] = header.index(nm)
                break
    missing = [k for k in COL_MAP if k not in idx]
    if missing:
        log(f"    !!! missing columns in {path.name}: {missing}")
    rows: list[dict] = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        rows.append({k: (r[idx[k]] if k in idx else None) for k in COL_MAP})
    wb.close()
    return rows


def _total_seconds(r: dict):
    """Total Time. The 2025/2026 workbooks have no "Total Time" column, so derive it
    as REPORT_DATE - ACCEPT_DATE, which equals Accept->Depart + Depart->Onsite +
    Onsite->Done to within a minute on 98.5% of rows. A real column still wins."""
    if r.get("total_time") not in (None, ""):
        return parse_seconds(r.get("total_time"))
    accept = parse_date(r.get("accept_date"))
    report = parse_date(r.get("report_date") or r.get("finish_date"))
    if not accept or not report:
        return None
    secs = int((report - accept).total_seconds())
    return secs if 0 <= secs <= MAX_DURATION_SEC else None


def transform(raw: list[dict]) -> tuple[list[dict], tuple[str | None, str | None]]:
    out: list[dict] = []
    seen: list[date] = []
    for r in raw:
        dt = parse_date(r.get("report_date")) or parse_date(r.get("z_create_date"))
        if not dt:
            continue
        rec = {
            "d": dt.date().isoformat(),
            # Full timestamps (ISO strings) for the Gantt timeline view.
            #   ct = create, gt = assign (grant), at = accept,
            #   it = initiate (depart), nt = onsite, rt = report (finish)
            "ct": _iso_dt(r.get("create_date") or r.get("z_create_date")),
            "gt": _iso_dt(r.get("assign_date")),
            "at": _iso_dt(r.get("accept_date")),
            "it": _iso_dt(r.get("initiate_date")),
            "nt": _iso_dt(r.get("onsite_date")),
            "rt": _iso_dt(r.get("report_date") or r.get("finish_date")),
            "zid": (r.get("zone_id") or "").strip() or None,
            "c": (str(r["wfm_company"]).strip() if r.get("wfm_company") else None) or None,
            "a": (r.get("assign_to") or "").strip() or None,
            "p": (r.get("priority") or "").strip() or None,
            "bw": _canon(r.get("before_waive"), BEFORE_WAIVE_VALUES),
            "aw": _canon(r.get("after_waive"), AFTER_WAIVE_VALUES),
            "ro": (r.get("reason_overdue") or "").strip() or None,
            "sc": (r.get("subcause2") or "").strip() or None,
            "ad": parse_seconds(r.get("accept_to_depart")),
            "do": parse_seconds(r.get("depart_to_onsite")),
            "od": parse_seconds(r.get("onsite_to_done")),
            "tt": _total_seconds(r),
            "sol": (str(r["solution"]).strip() if r.get("solution") is not None else None) or None,
            "prb": (str(r["problem"]).strip() if r.get("problem") is not None else None) or None,
            "jb": (str(r["jb_id"]).strip() if r.get("jb_id") is not None else None) or None,
        }
        rec["z"] = zone_of(rec["a"], rec["zid"])
        rec["t"] = team_label(rec["a"])
        out.append(rec)
        seen.append(dt.date())
    dmin = min(seen).isoformat() if seen else None
    dmax = max(seen).isoformat() if seen else None
    return out, (dmin, dmax)


def _replace_retrying(src: Path, dst: Path, attempts: int = 20) -> None:
    """On Windows, replacing a file fails while another handle has it open, e.g. the
    API streaming data.json to a browser at that moment. Retry for ~5 s instead of
    failing the upload. (On macOS/Linux the first attempt always succeeds.)"""
    for i in range(attempts):
        try:
            src.replace(dst)
            return
        except PermissionError:
            if i == attempts - 1:
                raise
            _time.sleep(0.25)


# ---------- Public entry point ----------

def build_data_json(excel_dir: Path, out_path: Path, *, log=print) -> dict:
    """Build merged data.json from every `Data Job done YYYY.xls*` in `excel_dir`."""
    excel_dir = Path(excel_dir)
    out_path = Path(out_path)
    files = list_excel_files(excel_dir)
    if not files:
        raise FileNotFoundError(
            f"No 'Data Job done <YEAR>.xls[xm]' files in {excel_dir}"
        )

    all_rows: list[dict] = []
    file_info: list[dict] = []
    for path, year in files:
        rows = read_workbook(path, log=log)
        all_rows.extend(rows)
        st = path.stat()
        file_info.append({
            "name": path.name,
            "year": year,
            "size": st.st_size,
            "mtime": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
            "raw_rows": len(rows),
        })
    log(f"loaded {len(all_rows)} raw rows from {len(files)} file(s)")

    records, (dmin, dmax) = transform(all_rows)
    records.sort(key=lambda r: r["d"])
    log(f"emit {len(records)} records ({dmin} -> {dmax})")

    generated_at = datetime.now().isoformat(timespec="seconds")
    payload = {
        "etl_version": ETL_VERSION,
        "generated_at": generated_at,
        "date_min": dmin,
        "date_max": dmax,
        "total": len(records),
        "records": records,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    _replace_retrying(tmp, out_path)
    log(f"wrote {out_path} ({out_path.stat().st_size/1e6:.2f} MB)")

    return {
        "generated_at": generated_at,
        "date_min": dmin,
        "date_max": dmax,
        "total": len(records),
        "files": file_info,
        "out_size": out_path.stat().st_size,
    }


# ---------- CLI shim so this module can replace `python etl/build_data.py` ----------

def _cli():
    here = Path(__file__).resolve()
    excel_dir = here.parents[1] / "server" / "storage" / "excel"
    out_path = here.parents[1] / "server" / "storage" / "data.json"
    if not excel_dir.exists():
        # Fallback to legacy folder for parity with old npm run etl
        excel_dir = here.parents[2] / "Excel Data"
        out_path = here.parents[1] / "public" / "data.json"
    info = build_data_json(excel_dir, out_path, log=lambda m: print(m, file=sys.stderr))
    print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    _cli()
