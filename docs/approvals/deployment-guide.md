# Approvals Service Deployment Guide

_Last updated: 2025-09-29_

## Purpose
Step-by-step instructions for deploying the Approval Workflow Service across environments (dev, staging, production). Assumes repository cleanup is pending; do not execute automated deploys until repo stability is confirmed.

---

## 1. Prerequisites
- Docker 24+
- docker-compose 2+
- Python 3.12 (for local tooling/tests)
- Access to assistants, inventory, and related services (per `docker-compose.yml`)
- Environment variables configured (see Configuration Guide)
- Database storage path writable by container host

## 2. Repository Preparation
1. Confirm repo clean: `git status --short`
2. Pull latest `main` (or release branch): `git pull origin main`
3. Validate prerequisites: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. Run unit tests: `python -m pytest tests/approvals/test_engine.py`

> **Note**: Until repository cleanup completes, avoid code changes. Documentation may proceed.

## 3. Build Artifacts
### Docker Image
```bash
docker build -f app/approval_app/Dockerfile -t approvals-service:latest app/approval_app
```
Ensure Dockerfile uses correct entrypoint (uvicorn) and environment variables.

### Python Package (Optional)
If packaging as wheel (for internal tooling):
```bash
python -m build app/approval_app
```
(Currently not standard; documented for future modularization.)

## 4. Environment Configuration
Set env vars in `.env` or deployment secrets manager:
- `APPROVAL_DB_PATH=/data/approval_workflows.db`
- `ASSISTANTS_BASE=http://assistants:8002`
- `APPROVAL_JWT_SECRET=<pending>`
- `APPROVAL_TOKEN_EXPIRE_MINUTES=60`

Persist secrets (JWT, API keys) using platform-specific vault (HashiCorp Vault, AWS Secrets Manager).

## 5. Local Development Deployment
```bash
docker-compose up approval-app
```
- Ensures dependencies (`assistants`, `db`, `redis`) running.
- Service listens on `http://localhost:5173` per compose mapping (update to 8003 if aligning with default uvicorn port).

## 6. Production Deployment
### Option A: Docker Compose (Single Host)
1. Copy `.env.production` to target host.
2. Build and push image to registry.
3. On host:
   ```bash
   docker-compose pull approval-app
   docker-compose up -d approval-app
   ```
4. Verify with `curl http://localhost:5173/health`.

### Option B: Kubernetes
1. Create deployment manifest (example skeleton):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: approvals-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: approvals
  template:
    metadata:
      labels:
        app: approvals
    spec:
      containers:
        - name: approvals
          image: registry/approvals:TAG
          ports:
            - containerPort: 8003
          envFrom:
            - secretRef:
                name: approvals-secrets
          volumeMounts:
            - name: approvals-data
              mountPath: /data
      volumes:
        - name: approvals-data
          persistentVolumeClaim:
            claimName: approvals-db-pvc
```
2. Add Service / Ingress definitions.
3. Configure readiness/liveness probes (pending enhanced `/health`).
4. Apply: `kubectl apply -f deployment.yaml`

### Option C: Serverless Containers (ECS/Fargate, Cloud Run)
- Build container, push to registry.
- Configure service with appropriate CPU/memory, set env vars.
- Mount persistent storage or migrate to managed DB (PostgreSQL recommended).

## 7. Post-Deployment Verification
1. Health check: `curl http://<host>:<port>/health`
2. Create smoke workflow via `/api/v1/workflows`.
3. Submit sample approval and ensure auto-approval logic triggers.
4. Check database entries to confirm persistence.

## 8. Operational Runbooks
- Monitor logs (stdout) for warnings, especially DB lock errors.
- Ensure scheduled tasks for SLA escalation (future Celery/RQ worker) are operational once implemented.

## 9. Rollout Strategy
- Blue/green or canary recommended due to workflow statefulness.
- Ensure idempotent migration scripts for DB changes.

## 10. Dependencies & External Services
- Assistants API (draft handling)
- Notification gateways (email/SMS providers) once integrated
- Monitoring stack (Prometheus/Grafana or equivalent)

---

Prepared for the overnight documentation sprint to accelerate production readiness.
