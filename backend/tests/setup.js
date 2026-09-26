// Loads test env vars before anything else. Tests run against a real
// Postgres (point TEST_DATABASE_URL / DATABASE_URL at a throwaway DB —
// e.g. the same docker-compose `db` service with a different database name).
require("dotenv").config();
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
