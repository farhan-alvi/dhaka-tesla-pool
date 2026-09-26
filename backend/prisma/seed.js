// Seed data using the PRD's own cast — Jashim/Bullet, Nusrat, Rafiq, Shirin —
// per Section 18: "spare the evaluator another user1/driver1."
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("Seeding Jashim (driver) + Bullet (vehicle)...");
  const jashim = await prisma.user.upsert({
    where: { email: "jashim@teslapool.dhaka" },
    update: {},
    create: {
      name: "Jashim",
      email: "jashim@teslapool.dhaka",
      passwordHash,
      role: "DRIVER",
      phone: "+8801700000001",
    },
  });

  await prisma.vehicle.upsert({
    where: { driverId: jashim.id },
    update: {},
    create: {
      driverId: jashim.id,
      name: "Bullet",
      capacity: 3,
      isOnline: true,
    },
  });

  console.log("Seeding Nusrat, Rafiq, Shirin (passengers)...");
  const cast = [
    { name: "Nusrat", email: "nusrat@teslapool.dhaka", phone: "+8801700000002" },
    { name: "Rafiq", email: "rafiq@teslapool.dhaka", phone: "+8801700000003" },
    { name: "Shirin", email: "shirin@teslapool.dhaka", phone: "+8801700000004" },
  ];
  for (const person of cast) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: {},
      create: {
        name: person.name,
        email: person.email,
        passwordHash,
        role: "PASSENGER",
        phone: person.phone,
      },
    });
  }

  console.log("Seed complete. Demo password for everyone: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
