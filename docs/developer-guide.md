# คู่มือคนพัฒนา — DMP Monthly Report

เอกสารนี้สำหรับคนที่จะมาแก้โค้ดต่อ วิธีติดตั้ง/ใช้งานอยู่ที่ [README หลัก](../README.md)

## หลักสำคัญที่ต้องรู้ก่อน

**ตัวเลขและกราฟทุกหน้าคำนวณในเบราว์เซอร์ด้วย JavaScript** ส่วน Python แค่อ่าน Excel มาทำความสะอาด
แล้วรวมเป็นไฟล์เดียว ถ้าจะแก้สูตร เกือบทั้งหมดอยู่ใน `dmp-monthly-report/src/pages/`

## การไหลของข้อมูล

```
Excel "Data Job done 2025/2026.xlsx"
   │  ผู้ใช้กดปุ่ม Upload Excel บนเว็บ
   ▼
Python · FastAPI (server/app.py)      รับไฟล์ เก็บที่ server/storage/excel/
   │
   ▼
Python · ETL (server/etl.py)          อ่าน Excel → ทำความสะอาด → server/storage/data.json (~30 MB)
   │
   ▼
เบราว์เซอร์โหลด /data.json ครั้งเดียว (src/data.js)
   │
   ▼
ตัวกรองกลาง (src/filters.jsx · applyFilters)     ช่วงวันที่ / โซน / ทีม / priority
   │
   ▼
แต่ละหน้า (src/pages/*.jsx) คำนวณเอง → วาดกราฟด้วย Recharts
```

## Node กับ Python ทำคนละหน้าที่

| | **Node.js** | **Python** |
|---|---|---|
| ใช้ตอนไหน | ตอน build และตอน dev เท่านั้น — เวลารันจริงไม่ได้ใช้ Node | รันตลอดเวลาที่เปิดโปรแกรม |
| หน้าที่ | Vite แปลงโค้ด React ใน `src/` เป็นไฟล์เว็บสำเร็จรูปใน `dist/` | FastAPI + uvicorn: เสิร์ฟหน้าเว็บ (`dist/`), API อัปโหลด/ลบไฟล์, `/data.json` และรัน ETL |
| ไลบรารีหลัก | React 18 · Recharts · jsPDF + html2canvas + pptxgenjs (export) | FastAPI · openpyxl |
| ไฟล์ | `src/` · `package.json` · `vite.config.js` | `server/app.py` · `server/etl.py` |

`Dockerfile` เป็นแบบ 2 ขั้น: ขั้นแรกใช้ Node build หน้าเว็บ แล้วคัดเฉพาะ `dist/` ไปใส่อิมเมจ Python
อิมเมจสุดท้ายจึงไม่มี Node อยู่เลย

## จะแก้อะไร ไปที่ไหน

### ฝั่ง Python (`dmp-monthly-report/server/`)

| เรื่อง | จุดในโค้ด |
|---|---|
| ชื่อคอลัมน์ Excel ที่อ่าน | `etl.py` → `COL_MAP` |
| แยกโซน / ทีม จาก ASSIGN_TO | `etl.py` → `zone_of()` · `team_label()` |
| แปลงค่าระยะเวลา + เพดาน 30 วัน | `etl.py` → `parse_seconds()` · `MAX_DURATION_SEC` |
| Total Time (= REPORT − ACCEPT) | `etl.py` → `_total_seconds()` |
| ปรับตัวพิมพ์ Pass / In Due ให้เป็นมาตรฐาน | `etl.py` → `_canon()` |
| API รับอัปโหลด / ลบไฟล์ / เสิร์ฟ data.json | `app.py` |

> ⚠️ **แก้ ETL แล้วต้องเพิ่มเลข `ETL_VERSION` ใน `etl.py` ทุกครั้ง**
> ตอน backend เริ่มทำงาน ถ้าเลขใน `data.json` ไม่ตรงกับในโค้ด มันจะสร้าง `data.json` ใหม่ให้เอง
> ถ้าลืมเพิ่มเลข เครื่องที่มีข้อมูลเก่าอยู่แล้วจะยังใช้สูตรเดิมต่อไป

### ฝั่ง JavaScript (`dmp-monthly-report/src/`)

| สูตร / ค่า | ไฟล์ |
|---|---|
| **SLA%** = `aw === "Pass"` ÷ จำนวนงาน (Before Waive ใช้ `bw === "In Due"`) นับเฉพาะ Critical + Major | `pages/Page05_SlaByZone.jsx` · `pages/SlaPerTeamPage.jsx` · `pages/TotalJobOverviewPage.jsx` |
| SLA หน้า 22 (ใช้ priority ตามที่ผู้ใช้เลือกในตัวกรอง) + เกณฑ์สี 90 / 80 / 60 | `pages/Page22_KPISla.jsx` |
| เป้าหมาย 260 งาน/โซน และ 86 งาน/ทีม **ต่อเดือน** | `pages/Page02_JobTotalInZone.jsx` · `pages/JobPerDayPage.jsx` · `TARGET_MAP` ใน `pages/TotalJobOverviewPage.jsx` |
| ปรับเป้าตามช่วงวันที่ · แกนรายวัน · การบวกลบวันที่ | `utils.js` → `targetForRange()` · `dailyRows()` · `addDaysISO()` |
| เกณฑ์เวลา 5 นาที / 45 นาที / 2 ชั่วโมง | `pages/AvgDurationPage.jsx` → `THRESHOLDS` (หน้า Gantt มีชุดของตัวเองชื่อ `TH_*`) |
| ชื่อโซน ทีม priority และสีทั้งหมด | `theme.js` |
| ตัวกรองกลาง + ช่วงวันที่เริ่มต้น | `filters.jsx` |
| คำว่า "รอลงข้อมูล" | `PENDING_TOKEN` ใน `pages/DashPendingByTeam.jsx` · `pages/DashSolutionSummary.jsx` |
| การจัดกลุ่มบริษัทเป็น 12 zone ในหน้า "ทุกบริษัท" | `allcompany/zones.js` → `zoneInfo()` |
| ลำดับหน้าและเมนูด้านซ้าย | `App.jsx` → `NAV` (21 หน้ารายงาน) และ `DASH` (Dashboard) |
| Export PDF / PowerPoint | `export.js` |

### กฎที่ใช้ร่วมกันหลายหน้า อยู่ที่เดียว

**ห้ามประกาศซ้ำในหน้าใดหน้าหนึ่ง ให้ import ไปใช้** (เคยก๊อปไว้ไฟล์ละชุด แล้วแก้ไม่ครบจนตัวเลขไม่ตรงกัน)

| ของ | อยู่ที่ | ใครใช้ |
|---|---|---|
| `SLA_PRIORITIES` = Critical + Major | `theme.js` | Page05 · SlaPerTeamPage (หน้า 9–10) · TotalJobOverviewPage (หน้า 11–18) |
| `lastSixMonths(end)` | `utils.js` | Page05 · Page08 · SlaPerTeamPage |
| `prevMonthRange(end)` | `utils.js` | Page21 · Page22 · AvgDurationPage |

ส่วนที่ **ตั้งใจให้ต่างกันรายหน้า** คือ argument `skip` ของ `applyFilters(records, f, skip)` เช่น
หน้า 5 ข้าม date + zone + priority เพราะใช้หน้าต่าง 6 เดือนตายตัว ส่วนหน้า 9–10 ข้าม team เพราะแยกเส้นรายทีมเองอยู่แล้ว
อันนี้ไม่ใช่โค้ดซ้ำ อย่าไปรวบให้เหลืออันเดียว

### โครงสร้างข้อมูลใน data.json

แต่ละงานเก็บด้วยคีย์สั้นเพื่อลดขนาดไฟล์ (ดู `transform()` ใน `etl.py`)

`d` วันที่ (REPORT_DATE) · `z` โซน · `t` ทีม · `p` priority · `c` บริษัท · `a` assign_to ·
`zid` zone by site · `bw` / `aw` before/after waive · `ro` เหตุผล overdue · `sc` subcause ·
`ad` `do` `od` `tt` ระยะเวลา **หน่วยวินาที** (accept→depart, depart→onsite, onsite→done, รวม) ·
`sol` `prb` `jb` solution / problem / job id · `ct gt at it nt rt` เวลาแบบเต็ม (create, assign,
accept, depart, onsite, finish) ใช้ในหน้า Gantt

## กับดักที่เคยเจอมาแล้ว

### Excel ส่งระยะเวลาที่เกิน 24 ชั่วโมงมาเป็นวันที่
คอลัมน์ Accept to Depart / Depart to Onsite / Onsite to Done ถ้าน้อยกว่า 24 ชม. openpyxl จะให้ค่าเป็น `time`
แต่ถ้า ≥ 24 ชม. จะให้เป็น `datetime(1900,1,1,20,49,7)` (แปลว่า 1 วัน 20:49:07)
โค้ดเดิมทิ้งค่าพวกนี้ทั้งหมด ทำให้งานที่ใช้เวลานานหายไปจากค่าเฉลี่ย — แก้แล้วใน `_excel_duration_datetime()`
ค่าที่เป็นวันที่จริง (ปีมากกว่า 1900 เกิดจาก ONSITE ว่างแล้วสูตรลบออกมาเป็นวันที่) และค่าที่เกิน 30 วัน
ถือว่าเป็นข้อมูลผิด ปล่อยว่าง เช่นเดียวกับ `#VALUE!`

### ไฟล์ Excel ไม่มีคอลัมน์ "Total Time"
ทั้งไฟล์ 2025 และ 2026 จึงคำนวณเอง `tt = REPORT_DATE − ACCEPT_DATE`
(ตรวจกับข้อมูลจริงแล้วเท่ากับ ad + do + od ภายใน 1 นาที 98.5% ของแถว)
ถ้าวันหลัง Excel มีคอลัมน์นี้กลับมา ระบบจะใช้ค่าจากคอลัมน์ก่อน

### ค่าใน After Waive สะกดไม่สม่ำเสมอ
ค่าที่เจอจริง: `Pass` · `Not Waive` · `รอ Defend` · และ `pass` ตัวพิมพ์เล็ก
ETL ปรับให้เป็นค่ามาตรฐานแล้ว โค้ดหน้าเว็บจึงเทียบ `=== "Pass"` ตรง ๆ ได้
**`รอ Defend` ไม่ใช่ `Not Waive`** — ไม่นับว่าผ่าน SLA แต่แสดงแยกเป็นสีส้มในแถบ SLA

### เป้าหมายเป็นค่าต่อเดือน
ต้องคูณด้วยจำนวนเดือนที่ช่วงวันที่ครอบคลุมเสมอ ใช้ `targetForRange()` (เดือนไม่เต็มคิดตามสัดส่วนวัน)
และกราฟ "ต่อวัน" ต้องใช้ `dailyRows()` ที่จัดกลุ่มด้วยวันที่เต็ม — ถ้ากลับไปจัดกลุ่มด้วยเลขวันที่ของเดือน
ช่วงหลายเดือนจะเอาวันที่ 5 ของทุกเดือนมาทับกัน

### ห้ามใช้ `toISOString()` กับวันที่
มันแปลงเป็นเวลา UTC พอเป็นเวลาไทย (UTC+7) จะได้วันก่อนหน้า 1 วัน (เคยทำให้ปุ่มเลือกช่วงในหน้า Gantt
เลือกเกินไป 1 วัน) ใช้ `addDaysISO()` / `toISODate()` ใน `utils.js` แทน

### หน้าจอ Windows (`scripts/start-windows.ps1`)
`start.bat` / `dev.bat` เป็นแค่ตัวเรียก PowerShell เพื่อให้มีสีและแบนเนอร์ ถ้าเครื่องปิด PowerShell
ไว้ .bat จะตกไปโหมดธรรมดาเอง
- ไฟล์ `.ps1` **ต้องมี UTF-8 BOM** ไม่งั้น PowerShell 5.1 อ่านเป็น ANSI แล้วตัวอักษรกรอบกลายเป็นขยะ
  (และห้ามใส่ `working-tree-encoding` ใน `.gitattributes` เพราะ git จะปฏิเสธไฟล์ที่มี BOM)
- ใช้อักขระที่ฟอนต์ Consolas มีเท่านั้น: `│ ─ ┌ █ ╗ • · → *` ได้ ส่วน `● › ✖` ไม่มี จะขึ้นเป็นสี่เหลี่ยม
- ความกว้างกรอบต้องเท่ากันทุกบรรทัด 66 ตัวอักษร
- ห้ามจบสคริปต์ทันทีหลังเซิร์ฟเวอร์หยุด ต้องมี `Read-Host` / `pause` ปิดท้ายเสมอ ไม่งั้นหน้าต่างจะปิดจนอ่านไม่ทัน
- `stop.bat` เรียกสคริปต์เดียวกันด้วย `-Stop` หา process ที่ listen พอร์ต 8000/5173 แล้วสั่ง `taskkill /T /F`
  **เฉพาะ process ชื่อ python / pythonw / node เท่านั้น** ถ้าเป็นชื่ออื่นจะรายงานแล้วปล่อยไว้ กันไปปิดโปรแกรมของคนอื่น

### ไฟล์ .bat ของ Windows
- ต้องเป็น CRLF (บังคับไว้ใน `.gitattributes` แล้ว) ถ้าเป็น LF ตัว cmd จะอ่านบล็อกเพี้ยน
- เรียก npm ต้องมี `call` นำหน้าเสมอ (`call npm ci`) ไม่งั้น batch จะจบตรงนั้นทันที
- ข้อความใน .bat ใช้ภาษาอังกฤษล้วน เพราะภาษาไทยขึ้นกับ code page ของ console
- ห้ามใส่วงเล็บในข้อความ `echo` ที่อยู่ในบล็อก `if ( ... )`
- บน Windows แทนที่ไฟล์ที่โปรแกรมอื่นเปิดค้างอยู่ไม่ได้ ETL จึงมี retry ตอนเขียนทับ `data.json`

## สิ่งที่ตั้งใจให้เป็นแบบนี้ (ไม่ใช่บั๊ก)

- **หน้า 22 KPI SLA ใช้ priority ตามตัวกรอง** ต่างจากหน้า 5 และ 9–18 ที่ล็อกไว้เฉพาะ Critical + Major
  เพราะตั้งใจให้ผู้ใช้เลือกเองว่าจะนับจาก priority ไหน
- **หน้า D2 งานรอลงข้อมูล แสดงเฉพาะทีม DMP** (ตัวกรองโซนตัดทีมอื่นออก)
- **อัปโหลดไฟล์ปีเดิมจะเขียนทับของเดิมก่อนตรวจสอบ** ถ้าไฟล์ใหม่เสีย ไฟล์เก่าจะหายไปแล้ว
  — เก็บสำรองไฟล์ Excel ไว้เองด้วย
- **ไม่มีระบบ login** ตั้งใจให้รันบนเครื่องตัวเอง

## ไม่ได้ใช้แล้ว

`dmp-monthly-report/etl/build_data.py` เป็น ETL รุ่นแรกที่ยังไม่มีการแก้ล่าสุด
ตัวจริงที่ใช้งานคือ `server/etl.py` เท่านั้น
