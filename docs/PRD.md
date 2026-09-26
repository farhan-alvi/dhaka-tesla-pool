# PRD Reference

The original brief is kept as `docs/PRD.pdf` (unmodified) for reference.
This file is a quick index of where each PRD requirement is satisfied in the repo.

| PRD Section | Where it's satisfied |
|---|---|
| §3 Passenger/Driver/Pool MVP | `backend/src/routes/*`, `frontend/app/*` |
| §4 Geography kept simple | `backend/src/config/zones.js` |
| §5 Fare model | `backend/src/services/fare.service.js`, `docs/FARE_AND_MATCHING.md` |
| §6 Stack (React/Next, Node, DB, Docker, deploy) | `frontend/`, `backend/`, `docker-compose.yml`, `docs/DEPLOYMENT.md` |
| §7 Tech justification | `README.md` §5, §12 |
| §8 AI usage | `docs/AI_USAGE.md` |
| §9 Architecture + ERD | `docs/ARCHITECTURE.md`, `docs/ERD.md` |
| §10-11 Git workflow / commits | `docs/GIT_WORKFLOW.md` |
| §12 README/testing/concurrency | `README.md`, `backend/tests/` |
| §13 Six-minute video | link placeholder in `README.md` §17 |
| §17 Assumptions | `docs/ASSUMPTIONS.md` |
| §12 bonus / viral scale | `docs/SCALING.md` |
