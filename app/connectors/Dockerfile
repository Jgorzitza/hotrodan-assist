FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (curl for health/debug, build deps if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY connectors ./connectors

EXPOSE 8003

# Default command (compose overrides with an explicit command as well)
CMD ["uvicorn", "connectors.main:app", "--host", "0.0.0.0", "--port", "8003"]
