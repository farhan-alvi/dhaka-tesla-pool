const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { prisma } = require("../config/prisma");
const { asyncHandler } = require("../middleware/error.middleware");

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["PASSENGER", "DRIVER"]),
  phone: z.string().optional(),
});

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = new Error(parsed.error.errors.map((e) => e.message).join(", "));
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    const { name, email, password, role, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const err = new Error("Email already registered");
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, phone },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: toPublicUser(user) });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = new Error("email and password are required");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const err = new Error("Invalid credentials");
      err.code = "UNAUTHORIZED";
      throw err;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const err = new Error("Invalid credentials");
      err.code = "UNAUTHORIZED";
      throw err;
    }

    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  })
);

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function toPublicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = router;
