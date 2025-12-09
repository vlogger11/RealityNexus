// scripts/seed.js
// Updated seed script - uses upsert/create (no createMany) to avoid client/schema mismatches.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // create demo org and director user
  const org = await prisma.organization.upsert({
    where: { slug: "demo-builder" },
    update: {},
    create: {
      name: "Demo Builder",
      slug: "demo-builder",
      about: "Demo builder org for staging",
      verified: false,
      plan: "trial"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "director@demo.local" },
    update: {},
    create: {
      name: "Demo Director",
      email: "director@demo.local",
      type: "builder_user"
    }
  });

  // Ensure a RoleMapping exists (safe across DB backends)
  const existingRole = await prisma.roleMapping.findFirst({
    where: {
      userId: user.id,
      organizationId: org.id,
      role: "director"
    }
  });

  if (!existingRole) {
    await prisma.roleMapping.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "director"
      }
    });
  }

  console.log("Seed done:", { orgId: org.id, directorId: user.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });