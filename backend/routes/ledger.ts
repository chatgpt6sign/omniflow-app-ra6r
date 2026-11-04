import { Router, Request, Response } from 'express';
import { ledgerRepository } from '../repositories/ledger';
import { insertLedgerSchema, updateLedgerSchema } from '../db/schema';

const router = Router();

// GET /api/ledger — list current user's entries
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const data = await ledgerRepository.findAll(userId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ledger' });
  }
});

// GET /api/ledger/summary?month=2026-11
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const data = await ledgerRepository.monthlySummary(userId, month);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching ledger summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ledger summary' });
  }
});

// GET /api/ledger/recent?limit=10 — recent entries for AI context
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const data = await ledgerRepository.recent(userId, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching recent ledger:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent ledger' });
  }
});

// POST /api/ledger — create entry (manual or AI)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const parsed = insertLedgerSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const data = await ledgerRepository.create(parsed.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    res.status(500).json({ success: false, message: 'Failed to create ledger entry' });
  }
});

// PUT /api/ledger/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const id = req.params.id as string;
    const parsed = updateLedgerSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const data = await ledgerRepository.update(id, userId, parsed.data);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating ledger entry:', error);
    res.status(500).json({ success: false, message: 'Failed to update ledger entry' });
  }
});

// DELETE /api/ledger/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const id = req.params.id as string;
    const ok = await ledgerRepository.delete(id, userId);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    res.status(500).json({ success: false, message: 'Failed to delete ledger entry' });
  }
});

export default router;
