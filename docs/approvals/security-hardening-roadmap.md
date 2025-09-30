# Approvals Security Hardening Roadmap

_Last updated: 2025-09-29_

## Phase 1: Immediate Controls (Week 1)
1. **Authentication & Authorization**
   - Implement OAuth2/JWT with FastAPI Security utilities.
   - Create user/role tables with password hashing (passlib).
   - Enforce RBAC on API endpoints (admin, approver, viewer roles).
2. **Input Validation**
   - Add Pydantic validators for workflow IDs, payload size, metadata structures.
   - Enforce JSON schema validation for workflow definitions.
3. **Secrets Management**
   - Replace default `ASSISTANTS_BASE` fallback with required environment variable.
   - Store secrets in Vault / AWS Secrets Manager.
4. **CORS & Security Headers**
   - Restrict allowed origins; set strict headers (HSTS, X-Frame-Options).
5. **Request Limits**
   - Configure maximum body size and request rate limiting (slowapi or starlette middleware).

## Phase 2: Infrastructure Hardening (Weeks 2-3)
1. **Database Migration**
   - Move from SQLite to PostgreSQL for concurrency and durability.
   - Implement Alembic migrations; enforce TLS for DB connections.
2. **Audit Log Integrity**
   - Add HMAC signatures to audit entries.
   - Store logs in append-only ledger (e.g., AWS QLDB) or external service.
3. **Network Segmentation**
   - Deploy approvals service in private subnet; expose via API gateway.
   - Enforce mTLS between services.
4. **Monitoring & Alerts**
   - Security-focused dashboards (failed auth attempts, unusual approval patterns).
   - Alerts for repetitive failed actions or anomalous auto-approvals.

## Phase 3: Advanced Protections (Weeks 4-6)
1. **Behavioral Analytics**
   - Machine learning to detect unusual approval behavior.
   - Integrate with SIEM for incident correlation.
2. **Data Protection**
   - Encrypt data at rest (PostgreSQL TDE or application-level encryption).
   - Mask sensitive fields in logs.
3. **Penetration Testing & Compliance**
   - Conduct regular pentests; remediate findings.
   - Align with SOC2/ISO27001 controls.
4. **Automated Incident Response**
   - Playbooks for rapid response to suspicious approvals.
   - Integrate with security orchestration platforms.

## Dependencies
- Tooling agent to complete repository cleanup before code changes.
- Coordination with security team for policy alignment.
- Infrastructure updates (Kubernetes, secrets manager, monitoring stack).

Prepared proactively pending next set of engineering tasks.
