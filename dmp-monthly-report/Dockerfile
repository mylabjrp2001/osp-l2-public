# DMP Monthly Report — Vite/React build + FastAPI runtime ในอิมเมจเดียว
# uvicorn เสิร์ฟทั้ง dist/ (SPA), /api/* และ /data.json จาก DMP_STORAGE

# ---------- stage 1: build frontend ----------
FROM node:20-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# ---------- stage 2: FastAPI runtime ----------
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=Asia/Bangkok \
    DMP_STORAGE=/data
WORKDIR /app

COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

COPY server/__init__.py server/app.py server/etl.py server/
COPY --from=web /app/dist dist/

# /data ถูก mount ทับด้วยโฟลเดอร์ข้อมูลของเครื่องที่รัน (Excel + data.json)
VOLUME ["/data"]
EXPOSE 8000
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]
