"""FastAPI backend for DMP Monthly Report.

Endpoints:
  GET  /api/status            current uploaded Excel files + data.json info
  POST /api/upload            multipart upload of one Data Job done YYYY.xls* file
                              → saves to storage/excel/ → rebuilds data.json
  DELETE /api/files/{name}    remove an uploaded Excel (year) and rebuild
  GET  /data.json             current built dataset (also served as static)

In production also serves the Vite `dist/` build at `/`.

Run (dev):
    uvicorn server.app:app --reload --port 8000
Run (prod, Windows VPS):
    uvicorn server.app:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import threading
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from server.etl import (
    ETL_VERSION,
    build_data_json,
    list_excel_files,
    parse_year_from_filename,
)


ROOT = Path(__file__).resolve().parents[1]            # dmp-monthly-report/
STORAGE = Path(os.environ.get("DMP_STORAGE", ROOT / "server" / "storage"))
EXCEL_DIR = STORAGE / "excel"
DATA_JSON = STORAGE / "data.json"
DIST_DIR = ROOT / "dist"

EXCEL_DIR.mkdir(parents=True, exist_ok=True)
STORAGE.mkdir(parents=True, exist_ok=True)

# Rebuilds are serialized to avoid two uploads clobbering each other.
_BUILD_LOCK = threading.Lock()


def _rebuild_if_stale() -> None:
    """Rebuild data.json when it was produced by an older ETL (or is missing while
    Excel files exist). Runs in a background thread so startup is not delayed; the
    previous data.json keeps being served until the new one replaces it."""
    if not list_excel_files(EXCEL_DIR):
        return
    meta = _data_json_meta()
    if meta and meta.get("etl_version") == ETL_VERSION:
        return
    with _BUILD_LOCK:
        meta = _data_json_meta()
        if meta and meta.get("etl_version") == ETL_VERSION:
            return
        print(
            f"data.json etl_version={meta and meta.get('etl_version')} != {ETL_VERSION}; rebuilding",
            file=sys.stderr,
        )
        try:
            _rebuild()
        except Exception:
            traceback.print_exc()


@asynccontextmanager
async def _lifespan(app):
    threading.Thread(target=_rebuild_if_stale, name="etl-migrate", daemon=True).start()
    yield


app = FastAPI(title="DMP Monthly Report", lifespan=_lifespan)

# CORS — needed for dev (Vite on :5173 hitting FastAPI on :8000 directly without proxy).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- helpers ----------

def _file_stat(p: Path) -> dict:
    st = p.stat()
    return {
        "name": p.name,
        "year": parse_year_from_filename(p.name),
        "size": st.st_size,
        "mtime": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds"),
    }


# data.json is ~30 MB; parse it once per version of the file, not on every status call.
_META_CACHE: dict = {"key": None, "meta": None}


def _data_json_meta() -> dict | None:
    try:
        st = DATA_JSON.stat()
    except FileNotFoundError:
        return None
    key = (st.st_mtime_ns, st.st_size)
    if _META_CACHE["key"] == key:
        return _META_CACHE["meta"]
    try:
        with DATA_JSON.open("r", encoding="utf-8") as f:
            head = json.loads(f.read())
        meta = {
            "etl_version": head.get("etl_version"),
            "generated_at": head.get("generated_at"),
            "date_min": head.get("date_min"),
            "date_max": head.get("date_max"),
            "total": head.get("total"),
            "size": st.st_size,
        }
    except Exception:
        return None
    _META_CACHE.update(key=key, meta=meta)
    return meta


def _status_payload() -> dict:
    files = [_file_stat(p) for p, _ in list_excel_files(EXCEL_DIR)]
    return {
        "files": files,
        "data": _data_json_meta(),
        "storage_dir": str(STORAGE),
    }


def _rebuild() -> dict:
    """Rebuild data.json from files in EXCEL_DIR. Caller must hold lock."""
    return build_data_json(EXCEL_DIR, DATA_JSON, log=lambda m: print(m, file=sys.stderr))


# ---------- API ----------

@app.get("/api/status")
def api_status():
    return _status_payload()


# A plain `def` endpoint runs in FastAPI's threadpool. The save + ETL take ~10 s and
# are fully synchronous, so as `async def` they froze the event loop and every
# other request (other users loading the report) until the rebuild finished.
@app.post("/api/upload")
def api_upload(file: UploadFile = File(...)):
    fname = (file.filename or "").strip()
    if not fname:
        raise HTTPException(400, "missing filename")
    year = parse_year_from_filename(fname)
    if year is None:
        raise HTTPException(
            400,
            f"filename must look like 'Data Job done <YEAR>.xlsx' or '.xlsm' (got: {fname!r})",
        )

    dst = EXCEL_DIR / fname
    tmp = dst.with_suffix(dst.suffix + ".uploading")
    # Hold the lock from the first byte written: two uploads of the same year
    # would otherwise share one .uploading temp file.
    with _BUILD_LOCK:
        try:
            with tmp.open("wb") as out:
                shutil.copyfileobj(file.file, out, 1024 * 1024)
            tmp.replace(dst)
        except Exception as e:
            tmp.unlink(missing_ok=True)
            raise HTTPException(500, f"failed to save upload: {e}")

        # Remove other extensions for same year (e.g. uploading .xlsm to replace .xlsx)
        for other, oyear in list_excel_files(EXCEL_DIR):
            if oyear == year and other.name != dst.name:
                try:
                    other.unlink()
                except OSError:
                    pass

        try:
            info = _rebuild()
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(500, f"ETL failed: {e}")

    return {
        "ok": True,
        "saved": _file_stat(dst),
        "build": info,
        "status": _status_payload(),
    }


@app.delete("/api/files/{name}")
def api_delete(name: str):
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, "invalid name")
    target = EXCEL_DIR / name
    if not target.exists():
        raise HTTPException(404, "file not found")
    target.unlink()
    with _BUILD_LOCK:
        if list_excel_files(EXCEL_DIR):
            try:
                _rebuild()
            except Exception as e:
                raise HTTPException(500, f"ETL failed: {e}")
        else:
            # No files left → remove built data.json too
            DATA_JSON.unlink(missing_ok=True)
    return {"ok": True, "status": _status_payload()}


@app.get("/data.json")
def data_json():
    if not DATA_JSON.exists():
        return JSONResponse(
            {
                "generated_at": None,
                "date_min": None,
                "date_max": None,
                "total": 0,
                "records": [],
                "empty": True,
            }
        )
    return FileResponse(
        DATA_JSON,
        media_type="application/json",
        headers={"Cache-Control": "no-store"},
    )


# ---------- Static frontend (production) ----------

if DIST_DIR.exists():
    # SPA fallback: anything not matched above is served from dist/index.html
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # Prefer real file in dist/
        candidate = DIST_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST_DIR / "index.html")
else:

    @app.get("/")
    def root_no_dist():
        return {
            "ok": True,
            "msg": "Backend running. `npm run build` to enable static UI, or run Vite dev server.",
            "endpoints": ["/api/status", "/api/upload", "/data.json"],
        }
