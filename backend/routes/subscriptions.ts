import { Router, Request, Response } from 'express';
import { subscriptionRepository } from '../repositories/subscriptions';
import { insertSubscriptionSchema, updateSubscriptionSchema, insertBudgetSchema } from '../db/schema';

const router = Router();

// GET all subscriptions (current user)
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const data = await subscriptionRepository.findAll(userId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
});

// GET single subscription
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const id = req.params.id as string;
    const data = await subscriptionRepository.findById(id, userId);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
});

// POST create subscription
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const parsed = insertSubscriptionSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const data = await subscriptionRepository.create(parsed.data);
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to create subscription' });
  }
});

// PUT update subscription
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const id = req.params.id as string;
    const parsed = updateSubscriptionSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const data = await subscriptionRepository.update(id, userId, parsed.data);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to update subscription' });
  }
});

// DELETE subscription
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const id = req.params.id as string;
    const ok = await subscriptionRepository.delete(id, userId);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to delete subscription' });
  }
});

// GET budget
router.get('/budget/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const data = await subscriptionRepository.getBudget(userId);
    res.json({ success: true, data: data || { monthlyLimit: '500' } });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch budget' });
  }
});

// PUT upsert budget
router.put('/budget/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const parsed = insertBudgetSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.message });
    }
    const data = await subscriptionRepository.upsertBudget(userId, parsed.data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
});

export default router;
