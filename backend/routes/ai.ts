import { Router, Request, Response } from 'express';
import { createAIService } from '../services/aiService';
import { parseTransfer, ParsedTransfer } from '../services/transferParser';

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

// Parse transfer info from pasted phone/bank SMS text → structured ledger entry
router.post('/parse-transfer', async (req: Request, res: Response) => {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: '请输入转账/收支信息文本' });
    }
    const input = String(text).trim();

    // 1) Local deterministic parser (works offline, no AI credits needed)
    let parsed: ParsedTransfer = parseTransfer(input);

    // 2) If local parser misses and OmniFlow AI is configured, ask the LLM to extract
    if (!parsed.matched) {
      try {
        const aiService = createAIService();
        const appLink = req.get('Referer') || req.get('Origin') || `${req.protocol}://${req.get('host')}`;
        const prompt = `从下面的短信/转账文本中提取记账信息，只输出 JSON（不要多余文字），格式：{"type":"income|expense","amount":"数字","category":"other|food|transport|shopping|housing|entertainment|medical|education|salary|transfer","description":"简短备注","occurredAt":"YYYY-MM-DD"}。无法识别时输出 {"matched":false}。\n\n文本：${input}`;
        const reply = await aiService.chat(prompt, '你是记账信息解析助手，只输出 JSON。', appLink);
        const match = reply.match(/\{[\s\S]*\}/);
        if (match) {
          const json = JSON.parse(match[0]);
          if (json.matched === false) {
            parsed = { ...parsed, matched: false };
          } else if (json.type && json.amount) {
            const type = json.type === 'income' ? 'income' : 'expense';
            const amount = Number(String(json.amount).replace(/[^0-9.]/g, ''));
            if (!Number.isNaN(amount) && amount > 0) {
              parsed = {
                matched: true,
                type,
                amount: amount.toFixed(2),
                category: String(json.category || 'other'),
                description: String(json.description || (type === 'income' ? '转账收入' : '转账支出')),
                occurredAt: String(json.occurredAt || new Date().toISOString().slice(0, 10)).slice(0, 10),
                raw: input,
              };
            }
          }
        }
      } catch (llmError) {
        console.warn('LLM transfer parse failed, using local result:', llmError);
      }
    }

    res.json({ success: parsed.matched, data: parsed });
  } catch (error) {
    console.error('Parse transfer error:', error);
    res.status(500).json({ success: false, message: '解析失败，请稍后重试' });
  }
});

export default router;
