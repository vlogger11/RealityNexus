import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, slug, about } = req.body;
      if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });

      const existing = await prisma.organization.findUnique({ where: { slug } });
      if (existing) return res.status(409).json({ error: 'slug already exists' });

      const org = await prisma.organization.create({
        data: { name, slug, about, verified: false, plan: 'trial' },
      });
      return res.status(201).json({ org });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal' });
    }
  } else if (req.method === 'GET') {
    try {
      const orgs = await prisma.organization.findMany({ take: 100 });
      return res.status(200).json({ orgs });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}