# AI Usage

AI tools was used during the development process to support initial project scaffolding, backend/frontend structure, Prisma schema drafting, and documentation. The generated suggestions were reviewed, modified, and integrated as needed. The final implementation, testing, debugging, and project decisions were completed and verified by me.

## What for

- Generating the initial project skeleton (folder structure, Express routing,
  Prisma schema, Next.js pages) so more time could go into the actual
  engineering decisions (matching rule, fare model, concurrency handling).
- Drafting documentation (architecture, ERD, fare worked example) to keep it
  consistent with the code as it was written.

## One accepted suggestion

- The atomic conditional `UPDATE ... WHERE seatsOccupied + $seats <= capacity
  RETURNING id` pattern for seat-claiming, instead of a `SELECT` then
  `UPDATE` with an application-level check. Accepted because it correctly
  handles the PRD's exact concurrency scenario without needing an external
  lock (Redis, etc.), verified with the parallel-request integration test.

## One rejected/changed suggestion

- I used AI to generate the initial code for this project, including the backend, frontend, database design, and documentation. Rather than writing every line myself, my focus was on understanding the code deeply enough to explain, defend, and modify it — particularly the concurrency-handling logic for seat capacity, the fare calculation formula, and the ride status lifecycle. If I were to continue building this further, one thing I'd reconsider is ['splitting the driver routes file into smaller files as it grows']

## Ownership

Every part of this codebase — the schema, the concurrency fix, the state
machine, the fare formula — was reviewed and is explainable line-by-line in
the demo video / interview, per PRD §8 and §18.
