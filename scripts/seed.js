// Simple seed script (Node) for dev/demo
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

  await prisma.roleMapping.createMany({
    data: [
      {
        userId: user.id,
        organizationId: org.id,
        role: "director"
      }
    ],
    skipDuplicates: true
  });

  console.log("Seed done:", { orgId: org.id, directorId: user.id });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit());