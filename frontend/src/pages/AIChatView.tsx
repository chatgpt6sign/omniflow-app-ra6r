import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { ChatMessage } from '@shared/types/api';
import { CATEGORIES, BILLING_CYCLES } from '@shared/types/api';

const SYSTEM_PROMPT = `你是一个智能记账助手，专门帮助用户管理软件订阅支出、分析消费规律、提供节省建议。请用中文回答，语言简洁友好。当用户询问订阅相关问题时，提供具体可执行的建议。`;

const QUICK_PROMPTS = [
  '分析我的订阅支出情况',
  '哪些订阅可以取消？',
  '如何制定合理的订阅预算？',
  '我的订阅费用偏高吗？',
];

async function buildSystemPrompt(): Promise<string> {
  try {
    const [subRes, budgetRes] = await Promise.all([apiService.getSubscriptions(), apiService.getBudget()]);
    const subs = subRes.success ? subRes.data : [];
    if (subs.length === 0) return `${SYSTEM_PROMPT}\n\n用户目前还没有任何订阅记录。`;
    const lines = subs.map(s => {
      const cat = CATEGORIES.find(c => c.value === s.category)?.label || s.category;
      const cycle = BILLING_CYCLES.find(b => b.value === s.billingCycle)?.label || s.billingCycle;
      return `- ${s.name}｜${cat}｜¥${s.amount}/${cycle}｜状态:${s.status}｜下次扣款:${s.nextBillingDate}`;
    });
    const limit = budgetRes.success && budgetRes.data ? budgetRes.data.monthlyLimit : '500';
    return `${SYSTEM_PROMPT}\n\n以下是用户当前的订阅数据，请基于这些数据回答：\n${lines.join('\n')}\n月度预算上限：¥${limit}`;
  } catch {
    return SYSTEM_PROMPT;
  }
}

let _msgCounter = 0;

function createMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return { id: `msg-${++_msgCounter}`, role, content, timestamp: 0 };
}

export default function AIChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', '你好！我是你的智能记账助手 🤖\n\n我可以帮你：\n• 分析订阅支出规律\n• 识别冗余订阅\n• 制定节省计划\n• 回答记账相关问题\n\n请问有什么我可以帮到你的？'),
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = createMessage('user', trimmed);
    const assistantMsg = createMessage('assistant', '');

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
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
            <p className="text-xs text-muted-foreground">智能分析订阅支出</p>
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

      {/* Quick Prompts */}
      {messages.length <= 1 && (
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
          placeholder="输入问题，按 Enter 发送..."
          className="resize-none min-h-[44px] max-h-[120px] text-sm"
          rows={1}
          disabled={isStreaming}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          className="cursor-pointer min-h-[44px] px-4 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
