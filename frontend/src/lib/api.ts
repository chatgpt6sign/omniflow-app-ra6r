import { API_BASE_URL } from '@/config/constants';
import type { ApiResponse, Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest, BudgetSettings } from '@shared/types/api';

class ApiService {
  private async request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json() as Promise<ApiResponse<T>>;
  }

  // Subscriptions
  async getSubscriptions(): Promise<ApiResponse<Subscription[]>> {
    return this.request<Subscription[]>('/api/subscriptions');
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<ApiResponse<Subscription>> {
    return this.request<Subscription>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubscription(id: string, data: UpdateSubscriptionRequest): Promise<ApiResponse<Subscription>> {
    return this.request<Subscription>(`/api/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubscription(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/subscriptions/${id}`, { method: 'DELETE' });
  }

  // Budget
  async getBudget(): Promise<ApiResponse<BudgetSettings>> {
    return this.request<BudgetSettings>('/api/subscriptions/budget/settings');
  }

  async updateBudget(monthlyLimit: string): Promise<ApiResponse<BudgetSettings>> {
    return this.request<BudgetSettings>('/api/subscriptions/budget/settings', {
      method: 'PUT',
      body: JSON.stringify({ monthlyLimit }),
    });
  }

  // AI Chat (streaming)
  async sendChatMessage(
    message: string,
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, systemPrompt }),
    });

    if (!response.ok || !response.body) {
      throw new Error('AI chat request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) onChunk(parsed.content);
            } catch { /* ignore */ }
          }
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) onChunk(parsed.content);
          } catch { /* ignore */ }
        }
      }
    }
  }
}

export const apiService = new ApiService();
