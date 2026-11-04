import { API_BASE_URL } from '@/config/constants';
import type {
  ApiResponse,
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  BudgetSettings,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  LedgerEntry,
  CreateLedgerRequest,
  UpdateLedgerRequest,
  LedgerSummary,
  ParsedTransfer,
} from '@shared/types/api';

function getToken(): string {
  return localStorage.getItem('token') || '';
}

class ApiService {
  private async request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json() as Promise<ApiResponse<T>>;
  }

  // ---------- Auth ----------
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async me(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/auth/me');
  }

  // ---------- Subscriptions ----------
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

  // ---------- Budget ----------
  async getBudget(): Promise<ApiResponse<BudgetSettings>> {
    return this.request<BudgetSettings>('/api/subscriptions/budget/settings');
  }

  async updateBudget(monthlyLimit: string): Promise<ApiResponse<BudgetSettings>> {
    return this.request<BudgetSettings>('/api/subscriptions/budget/settings', {
      method: 'PUT',
      body: JSON.stringify({ monthlyLimit }),
    });
  }

  // ---------- Ledger (手动记账 / AI 自动记账) ----------
  async getLedger(): Promise<ApiResponse<LedgerEntry[]>> {
    return this.request<LedgerEntry[]>('/api/ledger');
  }

  async getLedgerSummary(month?: string): Promise<ApiResponse<LedgerSummary>> {
    const q = month ? `?month=${month}` : '';
    return this.request<LedgerSummary>(`/api/ledger/summary${q}`);
  }

  async getRecentLedger(limit = 10): Promise<ApiResponse<LedgerEntry[]>> {
    return this.request<LedgerEntry[]>(`/api/ledger/recent?limit=${limit}`);
  }

  async createLedger(data: CreateLedgerRequest): Promise<ApiResponse<LedgerEntry>> {
    return this.request<LedgerEntry>('/api/ledger', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLedger(id: string, data: UpdateLedgerRequest): Promise<ApiResponse<LedgerEntry>> {
    return this.request<LedgerEntry>(`/api/ledger/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLedger(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/ledger/${id}`, { method: 'DELETE' });
  }

  // ---------- AI: parse transfer text ----------
  async parseTransfer(text: string): Promise<ApiResponse<ParsedTransfer>> {
    return this.request<ParsedTransfer>('/api/ai/parse-transfer', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // AI Chat (streaming)
  async sendChatMessage(
    message: string,
    systemPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
