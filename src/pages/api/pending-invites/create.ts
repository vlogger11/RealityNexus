import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../server/db";
import { generateCode } from "../../../utils/code.ts";

/**
 * POST /api/pending-invites/create
 * Body:
 * {
 *   organizationId: string,
 *   role?: string (defaults to "staff"),
 *   invitedByUserId?: string
 * }
 *
 * Creates a PendingInvite (joining code) for the organization.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    const { organizationId, role = "staff", invitedByUserId } = req.body;
    if (!organizationId) return res.status(400).json({ error: "organizationId is required" });

    const code = generateCode(8);
    const invite = await prisma.pendingInvite.create({
      data: {
        code,
        role,
        organizationId,
        invitedByUserId: invitedByUserId || null,
      },
    });

    // In a real app you'd send this code via SMS/email. For now we return it in the response.
    return res.status(201).json({ invite });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal" });
  }
}