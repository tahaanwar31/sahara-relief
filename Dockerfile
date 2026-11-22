# One image for the live demo: the Python service serves the API and the built web app.
# NOT TESTED on this laptop (no Docker installed): the first cloud build is the test. Works on Railway and Render (both set $PORT).

FROM node:22-slim AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
ARG VITE_API_BASE=
ENV VITE_API_MODE=live VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

FROM python:3.14-slim
WORKDIR /app
COPY service/requirements.txt ./service/requirements.txt
# the server image has no screen libraries, so use the headless build of OpenCV (same code, no libGL needed)
RUN sed -i 's/^opencv-python==/opencv-python-headless==/' service/requirements.txt && pip install --no-cache-dir -r service/requirements.txt
COPY service/ ./service/
COPY shared/ ./shared/
COPY db/ ./db/
COPY --from=web /web/dist ./web/dist
# keep memory small on a free 512 MB host: one thread per maths library, one worker
ENV PYTHONUNBUFFERED=1 WEB_DIST=/app/web/dist OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 ORT_NUM_THREADS=1 MALLOC_ARENA_MAX=2 MALLOC_TRIM_THRESHOLD_=100000
EXPOSE 8000
# the host (Railway, Render) tells us the port in $PORT
CMD ["sh", "-c", "python -m uvicorn service.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
