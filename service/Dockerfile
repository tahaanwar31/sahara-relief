# Build from the repo root:  docker build -f service/Dockerfile -t sahara-service .
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY service/requirements.txt /app/service/requirements.txt
RUN pip install --no-cache-dir -r /app/service/requirements.txt
COPY service/ /app/service/
COPY shared/ /app/shared/
# the built web app, if it exists (web/dist). The service serves it at "/".
COPY web/dist* /app/web/dist/
ENV SHARED_DIR=/app/shared PORT=8000
WORKDIR /app/service
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
