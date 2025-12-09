import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../server/db";

/**
 * POST /api/pending-invites/accept
 * Body:
 * {
 *   code: string,
 *   user: { name?: string, email?: string, phone?: string }
 * }
 *
 * Accepts a joining code: verifies PendingInvite exists and pending,
 * upserts the user and creates the RoleMapping for the invite.role.
 * Marks the invite as accepted.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { code, user: userPayload } = req.body;
    if (!code || !userPayload) return res.status(400).json({ error: "code and user are required" });

    const invite = await prisma.pendingInvite.findUnique({ where: { code } });
    if (!invite) return res.status(404).json({ error: "invalid code" });
    if (invite.status !== "pending") return res.status(400).json({ error: "invite not pending" });

    // upsert user
    const where = userPayload.email ? { email: userPayload.email } : userPayload.phone ? { phone: userPayload.phone } : null;
    if (!where) return res.status(400).json({ error: "provide email or phone for user" });

    const user = await prisma.user.upsert({
      where,
      update: { name: userPayload.name || undefined, phone: userPayload.phone || undefined },
      create: {
        name: userPayload.name || undefined,
        email: userPayload.email || undefined,
        phone: userPayload.phone || undefined,
        type: "user",
      },
    });

    // create role mapping
    await prisma.roleMapping.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });

    // mark invite accepted
    await prisma.pendingInvite.update({ where: { code }, data: { status: "accepted", acceptedAt: new Date() } });

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
}