const { PrismaClient } = require("@prisma/client");

// A single shared Prisma client for the whole app (recommended by Prisma docs
// to avoid exhausting Postgres connections in dev with hot-reload).
const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

module.exports = { prisma };
