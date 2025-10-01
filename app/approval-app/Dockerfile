FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=5173
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD curl -fsS http://localhost:${PORT}/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5173"]
