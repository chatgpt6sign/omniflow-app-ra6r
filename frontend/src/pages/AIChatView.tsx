import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Check, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { ChatMessage, ParsedTransfer } from '@shared/types/api';
import { CATEGORIES, BILLING_CYCLES, LEDGER_CATEGORIES } from '@shared/types/api';

const SYSTEM_PROMPT = `你是一个智能记账助手，专门帮助用户管理软件订阅支出、日常收支记录，分析消费规律、提供节省建议。请用中文回答，语言简洁友好。当用户询问订阅或记账相关问题时，提供具体可执行的建议。`;

// 触发 AI 自动记账的转账/收支关键词（与后端解析器保持一致）
const TRANSFER_KEYWORDS = /(转账|转帐|收入|入账|到账|收款|支出|消费|付款|支付|扣款|工资|退款|汇款|存入|充值|缴费|还款)/;

const QUICK_PROMPTS = [
  '分析我的订阅支出情况',
  '哪些订阅可以取消？',
  '帮我看看这个月花了多少',
  '我的订阅费用偏高吗？',
];

async function buildSystemPrompt(): Promise<string> {
  try {
    const [subRes, budgetRes, ledgerRes] = await Promise.all([
      apiService.getSubscriptions(),
      apiService.getBudget(),
      apiService.getRecentLedger(10),
    ]);
    const parts: string[] = [SYSTEM_PROMPT];

    const subs = subRes.success ? subRes.data : [];
    if (subs.length === 0) {
      parts.push('用户目前还没有任何订阅记录。');
    } else {
      const lines = subs.map(s => {
        const cat = CATEGORIES.find(c => c.value === s.category)?.label || s.category;
        const cycle = BILLING_CYCLES.find(b => b.value === s.billingCycle)?.label || s.billingCycle;
        return `- ${s.name}｜${cat}｜¥${s.amount}/${cycle}｜状态:${s.status}｜下次扣款:${s.nextBillingDate}`;
      });
      const limit = budgetRes.success && budgetRes.data ? budgetRes.data.monthlyLimit : '500';
      parts.push(`以下是用户当前的订阅数据，请基于这些数据回答：\n${lines.join('\n')}\n月度预算上限：¥${limit}`);
    }

    const ledger = ledgerRes.success ? ledgerRes.data : [];
    if (ledger.length > 0) {
      const lines = ledger.map(e => {
        const cat = LEDGER_CATEGORIES.find(c => c.value === e.category)?.label || e.category;
        return `- ${e.occurredAt}｜${e.type === 'income' ? '收入' : '支出'}｜¥${e.amount}｜${cat}｜${e.description || ''}｜来源:${e.source === 'ai' ? 'AI自动' : '手动'}`;
      });
      parts.push(`以下是用户最近的记账记录（最多10条）：\n${lines.join('\n')}`);
    }

    return parts.join('\n\n');
  } catch {
    return SYSTEM_PROMPT;
  }
}

let _msgCounter = 0;

function createMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return { id: `msg-${++_msgCounter}`, role, content, timestamp: 0 };
}

function getCategoryLabel(value: string) {
  return LEDGER_CATEGORIES.find(c => c.value === value)?.label || value;
}

export default function AIChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', '你好！我是你的智能记账助手 🤖\n\n我可以帮你：\n• 分析订阅支出规律\n• 识别冗余订阅\n• 制定节省计划\n• **自动识别手机转账/收支短信并帮你记一笔**\n\n你可以直接把银行/支付宝/微信的转账短信粘贴给我，例如：「您的尾号1234卡于11月1日向张三转账支出500.00元」，我会自动识别并确认入账。'),
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<ParsedTransfer | null>(null);
  const [addingTransfer, setAddingTransfer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingTransfer, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = createMessage('user', trimmed);
    const assistantMsg = createMessage('assistant', '');

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    // AI 自动记账：检测转账/收支信息
    if (TRANSFER_KEYWORDS.test(trimmed)) {
      try {
        const parsedRes = await apiService.parseTransfer(trimmed);
        if (parsedRes.success && parsedRes.data.matched) {
          setPendingTransfer(parsedRes.data);
          setMessages(prev => prev.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: '我检测到这是一条转账/收支信息 ✅\n请确认下方的识别结果，点击「确认记账」即可自动入账；如果识别有误，也可以点击「取消」。' }
              : m
          ));
          setIsStreaming(false);
          return;
        }
      } catch {
        // 解析失败时继续走普通对话
      }
    }

    try {
      const prompt = await buildSystemPrompt();
      await apiService.sendChatMessage(trimmed, prompt, (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
        ));
      });
    } catch {
      toast.error('AI 回复失败，请重试');
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id ? { ...m, content: '抱歉，我遇到了一些问题。请稍后重试。' } : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  const handleConfirmTransfer = async () => {
    if (!pendingTransfer || addingTransfer) return;
    setAddingTransfer(true);
    try {
      const res = await apiService.createLedger({
        type: pendingTransfer.type,
        amount: pendingTransfer.amount,
        category: pendingTransfer.category,
        description: pendingTransfer.description,
        occurredAt: pendingTransfer.occurredAt,
        source: 'ai',
      });
      if (res.success) {
        toast.success('已自动添加一笔记账 ✅');
        const sign = pendingTransfer.type === 'income' ? '+' : '-';
        setMessages(prev => [...prev, createMessage(
          'assistant',
          `已为你自动入账：\n${pendingTransfer.type === 'income' ? '收入' : '支出'} ${sign}¥${Number(pendingTransfer.amount).toFixed(2)}\n分类：${getCategoryLabel(pendingTransfer.category)}\n日期：${pendingTransfer.occurredAt}\n备注：${pendingTransfer.description}\n\n你可以到「记账」页面查看和管理所有记录。`
        )]);
        setPendingTransfer(null);
      }
    } catch {
      toast.error('入账失败，请稍后重试');
    } finally {
      setAddingTransfer(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    setPendingTransfer(null);
    setMessages([createMessage('assistant', '对话已清空。有什么我可以帮到你的？')]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">AI 记账助手</h2>
            <p className="text-xs text-muted-foreground">智能分析 + 自动识别转账入账</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClear} className="cursor-pointer text-muted-foreground">
          <RefreshCw className="w-4 h-4 mr-1" />清空
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-primary' : 'bg-muted'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-primary-foreground" />
                : <Bot className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            }`}>
              {msg.content === '' && isStreaming ? (
                <div className="flex gap-1 items-center py-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Transfer Confirmation Card */}
      {pendingTransfer && pendingTransfer.matched && (
        <div className="mt-3 border-2 border-primary/40 bg-primary/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">AI 识别到转账信息</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">类型</span>
              {pendingTransfer.type === 'income' ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  <ArrowDownLeft className="w-3.5 h-3.5" />收入
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-red-500">
                  <ArrowUpRight className="w-3.5 h-3.5" />支出
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">金额</span>
              <span className="font-bold text-foreground">
                {pendingTransfer.type === 'income' ? '+' : '-'}¥{Number(pendingTransfer.amount).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">分类</span>
              <span className="font-medium text-foreground">{getCategoryLabel(pendingTransfer.category)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">日期</span>
              <span className="font-medium text-foreground">{pendingTransfer.occurredAt}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-3 truncate">
            备注：{pendingTransfer.description || '—'}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirmTransfer} disabled={addingTransfer} className="cursor-pointer flex-1">
              <Check className="w-4 h-4 mr-1" />
              {addingTransfer ? '入账中...' : '确认记账'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingTransfer(null)} disabled={addingTransfer} className="cursor-pointer flex-1">
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Quick Prompts */}
      {messages.length <= 1 && !pendingTransfer && (
        <div className="flex flex-wrap gap-2 my-3">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题，或直接粘贴手机转账/收支短信（Enter 发送）..."
          className="resize-none min-h-[44px] max-h-[120px] text-sm"
          rows={1}
          disabled={isStreaming || !!pendingTransfer}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming || !!pendingTransfer}
          className="cursor-pointer min-h-[44px] px-4 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
