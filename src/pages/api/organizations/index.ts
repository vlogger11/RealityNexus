import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../server/db";
import { generateCode } from "../../../utils/code.ts";

/**
 * POST /api/organizations
 * Body:
 * {
 *   name: string,
 *   slug: string,
 *   about?: string,
 *   director?: { name?: string, email?: string, phone?: string }
 * }
 *
 * Creates organization (verified=false), upserts director user (by email if provided),
 * creates RoleMapping (role: "director"), and creates an initial joining code (PendingInvite)
 * for staff invitations. Returns org, director, and joinCode.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const { name, slug, about, director } = req.body;
      if (!name || !slug) return res.status(400).json({ error: "name and slug are required" });

      const existing = await prisma.organization.findUnique({ where: { slug } });
      if (existing) return res.status(409).json({ error: "slug already exists" });

      const org = await prisma.organization.create({
        data: { name, slug, about, verified: false, plan: "trial" },
      });

      let user = null;
      if (director && (director.email || director.phone)) {
        const where = director.email ? { email: director.email } : { phone: director.phone };
        user = await prisma.user.upsert({
          where,
          update: {
            name: director.name || undefined,
            phone: director.phone || undefined,
          },
          create: {
            name: director.name || undefined,
            email: director.email || undefined,
            phone: director.phone || undefined,
            type: "builder_user",
          },
        });

        // create role mapping (director)
        await prisma.roleMapping.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: "director",
          },
        });
      }

      // create initial pending invite (joining code) for staff invites
      const code = generateCode(8);
      await prisma.pendingInvite.create({
        data: {
          code,
          role: "staff",
          organizationId: org.id,
          status: "pending",
        },
      });

      return res.status(201).json({ org, director: user, joinCode: code });
    }

    if (req.method === "GET") {
      const orgs = await prisma.organization.findMany({ take: 100 });
      return res.status(200).json({ orgs });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
}