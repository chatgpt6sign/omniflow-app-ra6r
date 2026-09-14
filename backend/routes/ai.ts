import { Router, Request, Response } from 'express';
import { createAIService } from '../services/aiService';

const router = Router();

// Streaming chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const aiService = createAIService();
    const appLink = req.get('Referer') || req.get('Origin') || `${req.protocol}://${req.get('host')}`;

    // Brief async pause required for Vercel streaming
    await new Promise((resolve) => setTimeout(resolve, 50));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    for await (const chunk of aiService.chatDefault(message, systemPrompt, appLink)) {
      if (clientDisconnected || res.writableEnded) break;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

export default router;
