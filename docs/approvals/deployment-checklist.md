# Deployment Checklist

_Last updated: 2025-09-29_

## Pre-Deployment
- [ ] Verify repository clean: `git status`
- [ ] Run unit & integration tests
- [ ] Review change log & documentation updates
- [ ] Confirm configuration values (env vars, secrets)
- [ ] Backup current database

## Build & Package
- [ ] Build Docker image (`docker build ...`)
- [ ] Tag image with version
- [ ] Push to registry

## Deployment Execution
- [ ] Update image tag in deployment manifests
- [ ] Apply infrastructure changes (docker-compose/K8s)
- [ ] Run database migrations if needed
- [ ] Restart services in controlled order (dependencies first)

## Validation
- [ ] Check `/health`
- [ ] Run smoke tests (create workflow, submit approval)
- [ ] Verify logs for errors
- [ ] Confirm monitoring dashboards show healthy state

## Post-Deployment
- [ ] Notify stakeholders of completion
- [ ] Schedule follow-up review
- [ ] Document lessons learned

---

Prepared during overnight documentation sprint.
