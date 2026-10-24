import axios from 'axios';
import FormData from 'form-data';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  appLink?: string;
}

interface SpeechToTextRequest {
  model?: string;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  appLink?: string;
}

interface SpeechToTextResponse {
  text: string;
}

interface SearchResult {
  text: string;
  score: number;
  fileId: string;
  fileName: string;
  metadata?: any;
  knowledgeBaseId?: string;
}

interface KnowledgeBaseConfig {
  id: string;
  weight: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamingChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

const DEFAULT_MODEL_NAME = 'gpt-4o-mini';

class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OMNIFLOW_API_KEY || '';
    this.baseUrl = process.env.OMNIFLOW_API_BASE_URL || 'https://app.omniflowai.com/api';
  }

  private isOmniflowConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() && this.baseUrl && this.baseUrl.trim());
  }

  private parseSubscriptionSummary(systemPrompt?: string): {
    totalMonthly: number;
    count: number;
    items: Array<{ name: string; category: string; amount: number; cycle: string; status: string }>; 
    budget: number;
  } {
    const items: Array<{ name: string; category: string; amount: number; cycle: string; status: string }> = [];
    let totalMonthly = 0;
    let budget = 500;

    if (!systemPrompt) {
      return { totalMonthly, count: 0, items, budget };
    }

    const budgetMatch = systemPrompt.match(/月度预算上限：¥\s*([0-9]+(?:\.\d+)?)/);
    if (budgetMatch?.[1]) {
      budget = Number(budgetMatch[1]);
    }

    const lines = systemPrompt
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '));

    lines.forEach((line) => {
      const cleaned = line.replace(/^-\s*/, '');
      const parts = cleaned.split('｜');
      if (parts.length < 5) return;

      const name = parts[0]?.trim() || '订阅';
      const category = parts[1]?.trim() || '其他';
      const amountPart = parts[2]?.trim() || '¥0/月';
      const status = (parts[3] || '').replace(/^状态:/, '').trim();
      const cycleMatch = amountPart.match(/¥\s*([0-9]+(?:\.\d+)?)\s*\/\s*(月|季|年|周)/);
      const amount = Number(cycleMatch?.[1] || amountPart.replace(/[^0-9.]/g, '') || '0');
      const cycle = cycleMatch?.[2] || '月';

      let monthlyValue = amount;
      if (cycle === '季') monthlyValue = amount / 3;
      if (cycle === '年') monthlyValue = amount / 12;
      if (cycle === '周') monthlyValue = amount * 4.33;

      totalMonthly += monthlyValue;
      items.push({ name, category, amount: monthlyValue, cycle, status });
    });

    return { totalMonthly, count: items.length, items, budget };
  }

  private async generateLocalFallbackReply(message: string, systemPrompt?: string): Promise<string> {
    const msg = message.toLowerCase();
    const summary = this.parseSubscriptionSummary(systemPrompt);

    if (!summary.count) {
      return '我已在本地模式下处理了你的问题。当前还没有可分析的订阅数据，建议先添加至少一项订阅记录，再让我帮你做支出分析。';
    }

    const sorted = [...summary.items].sort((a, b) => b.amount - a.amount);
    const top = sorted.slice(0, 3);
    const total = summary.totalMonthly;
    const overBudget = total > summary.budget;
    const avg = summary.count ? total / summary.count : 0;

    if (msg.includes('取消') || msg.includes('冗余') || msg.includes('减少')) {
      const suggestions = top.map((item, index) => `${index + 1}. ${item.name}（约 ¥${item.amount.toFixed(0)}/月，分类：${item.category}）`);
      return `我先给你一个简版优化建议：\n\n当前共有 ${summary.count} 个订阅，月均约 ¥${avg.toFixed(0)}，总计约 ¥${total.toFixed(0)}/月。\n预算上限是 ¥${summary.budget}，${overBudget ? '已超预算，需要优先处理高频支出。' : '还在预算范围内，可适度优化。'}\n\n优先检查：\n${suggestions.join('\n')}\n\n建议按“费用高 + 频次低 + 使用率不高”的顺序考虑取消或替代，先从前 2-3 项入手，通常最容易降本。`;
    }

    if (msg.includes('预算') || msg.includes('偏高') || msg.includes('超支')) {
      return `本月订阅预算状况：\n- 当前月均订阅支出：¥${total.toFixed(0)}\n- 预算上限：¥${summary.budget}\n- 预算差额：¥${(summary.budget - total).toFixed(0)}\n\n${overBudget ? '当前已经超出预算，建议先压缩高成本项目，优先处理前 2 个大头订阅。' : '目前仍在预算内，建议保留现有结构并观察是否有重复订阅。'}`;
    }

    if (msg.includes('分析') || msg.includes('支出') || msg.includes('情况') || msg.includes('总结')) {
      const topNames = top.map((item) => `${item.name}（¥${item.amount.toFixed(0)}/月）`).join('、');
      return `我已根据当前订阅数据做了简要分析：\n\n- 订阅总数：${summary.count}\n- 月度估算支出：¥${total.toFixed(0)}\n- 平均每项：¥${avg.toFixed(0)}\n- 主要支出：${topNames}\n\n从消费结构看，${top[0]?.name || '当前主力订阅'} 是最大的支出项。若你希望进一步压缩成本，我可以直接给你一份优先级排序。`;
    }

    return `我已读取到你当前的订阅记录。当前一共 ${summary.count} 个订阅，月均支出约 ¥${avg.toFixed(0)}，总额约 ¥${total.toFixed(0)}。\n\n其中 ${top[0]?.name || '首要订阅'} 贡献了最大金额，建议优先检查它是否真的必要。若你愿意，我可以继续帮你做预算优化或取消建议。`;
  }

  private async *streamText(text: string): AsyncGenerator<string, void, unknown> {
    const chunkSize = 18;
    for (let i = 0; i < text.length; i += chunkSize) {
      yield text.slice(i, i + chunkSize);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  }

  /**
   * Make a non-streaming chat completion request
   */
  async chatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    if (!this.isOmniflowConfigured()) {
      const content = await this.generateLocalFallbackReply(
        request.messages.find((message) => message.role === 'user')?.content || '分析我的订阅支出情况',
        request.messages.find((message) => message.role === 'system')?.content,
      );

      return {
        id: 'local-fallback',
        object: 'chat.completion',
        created: Date.now(),
        model: process.env.LLM_MODEL_NAME || DEFAULT_MODEL_NAME,
        choices: [{
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat`,
        {
          ...request,
          stream: false,
          modelName: process.env.LLM_MODEL_NAME || DEFAULT_MODEL_NAME,
          appLink: request.appLink,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      const fallbackContent = await this.generateLocalFallbackReply(
        request.messages.find((message) => message.role === 'user')?.content || '分析我的订阅支出情况',
        request.messages.find((message) => message.role === 'system')?.content,
      );

      return {
        id: 'local-fallback',
        object: 'chat.completion',
        created: Date.now(),
        model: process.env.LLM_MODEL_NAME || DEFAULT_MODEL_NAME,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: fallbackContent },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }
  }

  /**
   * Make a streaming chat completion request
   */
  async *chatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isOmniflowConfigured()) {
      const content = await this.generateLocalFallbackReply(
        request.messages.find((message) => message.role === 'user')?.content || '分析我的订阅支出情况',
        request.messages.find((message) => message.role === 'system')?.content,
      );
      yield* this.streamText(content);
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat`,
        {
          ...request,
          stream: true,
          modelName: process.env.LLM_MODEL_NAME || DEFAULT_MODEL_NAME,
          appLink: request.appLink,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed: StreamingChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('AI Service Streaming Error:', error);
      const fallbackContent = await this.generateLocalFallbackReply(
        request.messages.find((message) => message.role === 'user')?.content || '分析我的订阅支出情况',
        request.messages.find((message) => message.role === 'system')?.content,
      );
      yield* this.streamText(fallbackContent);
    }
  }

  /**
   * Simple chat method for basic conversations (non-streaming)
   * Automatically uses knowledge base if configured
   */
  async chat(
    message: string,
    systemPrompt?: string,
    appLink?: string,
    topK?: number,
  ): Promise<string> {
    let enhancedSystemPrompt = systemPrompt;

    // Auto-enable knowledge base if configured
    const kbConfig = this.getKnowledgeBaseConfig();
    if (kbConfig && kbConfig.length > 0) {
      try {
        const searchResults = await this.searchKnowledgeBase(message, {
          topK: topK || 5,
          appLink,
        });

        if (searchResults.length > 0) {
          const context = searchResults
            .map((result, idx) => `[${idx + 1}] ${result.text}`)
            .join('\n\n');

          enhancedSystemPrompt = `${systemPrompt || 'You are a helpful assistant.'}\n\nUse the following information from the knowledge base to answer the question:\n\n${context}\n\nIf the information is insufficient, answer based on general knowledge and be clear about limitations.`;
        }
      } catch (error) {
        const kbErrorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Knowledge base search failed, proceeding without KB context:', kbErrorMessage);
      }
    }

    const messages: ChatMessage[] = [];

    if (enhancedSystemPrompt) {
      messages.push({ role: 'system', content: enhancedSystemPrompt });
    }

    messages.push({ role: 'user', content: message });

    const response = await this.chatCompletion({ messages, appLink });
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Default chat method that returns streaming response
   * This is the recommended method for user-facing chat
   */
  async *chatDefault(
    message: string,
    systemPrompt?: string,
    appLink?: string,
    topK?: number,
  ): AsyncGenerator<string, void, unknown> {
    yield* this.chatStream(message, systemPrompt, appLink, topK);
  }

  /**
   * Chat with conversation history
   */
  async chatWithHistory(messages: ChatMessage[]): Promise<string> {
    const response = await this.chatCompletion({ messages });
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Streaming chat method
   * Automatically uses knowledge base if configured
   */
  async *chatStream(
    message: string,
    systemPrompt?: string,
    appLink?: string,
    topK?: number,
  ): AsyncGenerator<string, void, unknown> {
    let enhancedSystemPrompt = systemPrompt;

    // Auto-enable knowledge base if configured
    const kbConfig = this.getKnowledgeBaseConfig();
    if (kbConfig && kbConfig.length > 0) {
      try {
        const searchResults = await this.searchKnowledgeBase(message, {
          topK: topK || 3,
          appLink,
        });

        if (searchResults.length > 0) {
          const context = searchResults
            .map((result, idx) => `[${idx + 1}] ${result.text}`)
            .join('\n\n');

          enhancedSystemPrompt = `${systemPrompt || 'You are a helpful assistant.'}\n\nUse the following information from the knowledge base to answer the question:\n\n${context}\n\nIf the information is insufficient, answer based on general knowledge and be clear about limitations.`;
        }
      } catch (error) {
        const kbErrorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Knowledge base search failed, proceeding without KB context:', kbErrorMessage);
      }
    }

    const messages: ChatMessage[] = [];

    if (enhancedSystemPrompt) {
      messages.push({ role: 'system', content: enhancedSystemPrompt });
    }

    messages.push({ role: 'user', content: message });

    yield* this.chatCompletionStream({ messages, appLink });
  }

  /**
   * Convert speech to text using Whisper API
   * @param audioFile - File object, Buffer, or path to audio file
   * @param options - Optional configuration for transcription
   * @returns Transcribed text
   */
  async speechToText(
    audioFile: File | Buffer | Blob,
    options?: SpeechToTextRequest,
  ): Promise<string> {
    if (!this.isOmniflowConfigured()) {
      return '本地模式下暂不支持音频转文字。';
    }

    try {
      const formData = new FormData();

      // Handle different input types
      if (audioFile instanceof File) {
        // Convert File to Buffer for Node.js form-data compatibility
        const arrayBuffer = await audioFile.arrayBuffer();
        formData.append('file', Buffer.from(arrayBuffer), audioFile.name);
      } else if (audioFile instanceof Buffer) {
        formData.append('file', audioFile, 'audio.mp3');
      } else if (audioFile instanceof Blob) {
        const buffer = await audioFile.arrayBuffer();
        formData.append('file', Buffer.from(buffer), 'audio.mp3');
      }

      // Add optional parameters
      if (options?.model) formData.append('model', options.model);
      if (options?.language) formData.append('language', options.language);
      if (options?.prompt) formData.append('prompt', options.prompt);
      if (options?.response_format)
        formData.append('response_format', options.response_format);
      if (options?.temperature !== undefined)
        formData.append('temperature', options.temperature.toString());
      if (options?.appLink) formData.append('appLink', options.appLink);

      const response = await axios.post(
        `${this.baseUrl}/v1/speech-to-text`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...formData.getHeaders(),
          },
        },
      );

      return response.data.text;
    } catch (error) {
      console.error('Speech-to-text Error:', error);
      throw new Error(`Speech-to-text request failed: ${error}`);
    }
  }

  /**
   * Get knowledge base configuration from environment
   */
  private getKnowledgeBaseConfig(): KnowledgeBaseConfig[] | null {
    try {
      const configStr = process.env.KNOWLEDGE_BASE_CONFIG;
      if (!configStr) {
        return null;
      }
      const config = JSON.parse(configStr);
      return config.knowledgeBases || [];
    } catch (error) {
      console.error('Error parsing knowledge base config:', error);
      return null;
    }
  }

  /**
   * Search a single knowledge base
   * @param knowledgeBaseId - Knowledge base ID
   * @param query - Search query
   * @param options - Search options
   * @returns Search results
   */
  private async searchSingleKnowledgeBase(
    knowledgeBaseId: string,
    query: string,
    options?: {
      topK?: number;
      appLink?: string;
    },
  ): Promise<SearchResult[]> {
    if (!this.isOmniflowConfigured()) {
      return [];
    }

    const response = await axios.post(
      `${this.baseUrl}/v1/knowledge-base/${knowledgeBaseId}/search`,
      {
        query,
        topK: options?.topK || 5,
        appLink: options?.appLink,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // API response format: { success: true, data: { results: [...] } }
    return response.data.data?.results || [];
  }

  /**
   * Search multiple knowledge bases and merge results by weight
   * @param query - Search query
   * @param options - Search options
   * @returns Merged and sorted search results
   */
  async searchKnowledgeBase(
    query: string,
    options?: {
      topK?: number;
      appLink?: string;
    },
  ): Promise<SearchResult[]> {
    try {
      const topK = options?.topK || 5;

      // Search all configured knowledge bases
      const kbConfig = this.getKnowledgeBaseConfig();
      if (!kbConfig || kbConfig.length === 0) {
        throw new Error('No knowledge base configured for this application');
      }

      // Search all knowledge bases in parallel
      const searchPromises = kbConfig.map(async (kb) => {
        try {
          const results = await this.searchSingleKnowledgeBase(kb.id, query, {
            topK,
            appLink: options?.appLink,
          });
          // Apply weight to scores
          return results.map((result) => ({
            ...result,
            score: result.score * kb.weight,
            knowledgeBaseId: kb.id,
          }));
        } catch (error) {
          console.warn(`Failed to search KB ${kb.id}:`, error);
          return [];
        }
      });

      const allResults = await Promise.all(searchPromises);
      const mergedResults = allResults.flat();

      // Sort by weighted score (descending) and return top K
      mergedResults.sort((a, b) => b.score - a.score);
      return mergedResults.slice(0, topK);
    } catch (error) {
      console.error('Knowledge base search error:', error);
      throw new Error(`Knowledge base search failed: ${error}`);
    }
  }
}

// Factory function to create AI service instance
export function createAIService(): AIService {
  return new AIService();
}

export default AIService;
export type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  SpeechToTextRequest,
  SpeechToTextResponse,
};
