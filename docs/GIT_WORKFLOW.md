# Git Workflow

This repo follows the branch/commit process required by PRD §10-11. This file
is your checklist — follow it in order as you build.

## Branches

- `master` — always in a working state; feature branches merge here once done.
- `pre-release` — cut from `master` once all MVP features are integrated;
  used for integration fixes, docs polish, deployment checks.
- `release/v1.0.0` — cut from `pre-release`; this is the version you record
  the demo video against and point the submission at.
- `feature/*` — one branch per logical unit of work, e.g.:
  - `feature/project-scaffold` (this initial structure, Docker, Prisma schema)
  - `feature/passenger-auth`
  - `feature/driver-auth`
  - `feature/ride-request-and-fare`
  - `feature/tesla-pooling` (matching + atomic capacity claim)
  - `feature/driver-flow` (accept/arrived/start/complete)
  - `feature/frontend-passenger-ui`
  - `feature/frontend-driver-ui`
  - `feature/tests`
  - `feature/docs`

## Suggested step-by-step sequence

```bash
git init
git checkout -b master
git add .
git commit -m "chore: initial project scaffold (docker, prisma schema, folders)"

git checkout -b feature/passenger-auth
# ...edit backend/src/routes/auth.routes.js etc...
git add backend/src/routes/auth.routes.js backend/src/middleware/auth.middleware.js
git commit -m "feat(auth): add signup and login endpoints with JWT"
git checkout master && git merge feature/passenger-auth

git checkout -b feature/tesla-pooling
# ...edit pool.service.js, driver.routes.js accept handler...
git add backend/src/services/pool.service.js
git commit -m "feat(pool): enforce Bullet's seat capacity atomically"
git add backend/src/routes/driver.routes.js
git commit -m "feat(pool): let a driver accept and pool compatible ride requests"
git checkout master && git merge feature/tesla-pooling

# ... repeat per feature branch above ...

# once all MVP features are merged into master and working end-to-end:
git checkout master
git checkout -b pre-release
# fix any integration bugs, finish README, add deployment config here
git commit -m "docs: finalize README and architecture docs"

git checkout -b release/v1.0.0
git tag v1.0.0
git push origin master pre-release release/v1.0.0 --tags
```

## Commit message rules (PRD §11)

Format: `<type>(<scope>): <short description>`
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`.

Good:
```
feat(auth): add passenger login endpoint
feat(pool): enforce Bullet's seat capacity
fix(pool): prevent overbooking available seats
build(docker): add compose setup for api and postgres
test(rides): cover concurrent last-seat race
docs(readme): document fare model with worked example
```

Avoid: `update`, `changes`, `fix`, `final`, `latest`, `working now`, `asdf` —
and avoid fifty tiny commits just to satisfy the rule. One commit = one
understandable logical change.

## What NOT to do (PRD §16)

- Don't push directly to `master` for feature work — always branch first.
- Don't squash your whole build into one giant "initial commit".
- Don't commit `.env` files — only `.env.example` (already gitignored).
