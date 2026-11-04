// Shared API types — single source of truth for frontend <-> backend contracts.

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: string;
  category: string;
  billingCycle: string;
  nextBillingDate: string;
  lastBillingDate: string;
  status: string;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateSubscriptionRequest {
  name: string;
  amount: string;
  category: string;
  billingCycle: 'monthly' | 'yearly' | 'quarterly';
  nextBillingDate: string;
  lastBillingDate: string;
  status: 'active' | 'cancelled' | 'paused';
  icon?: string;
  color?: string;
  notes?: string;
}

export type UpdateSubscriptionRequest = Partial<CreateSubscriptionRequest>;

export interface BudgetSettings {
  id?: string;
  monthlyLimit: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ---------- Auth ----------
export interface User {
  id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

// ---------- Ledger (手动记账 + AI 自动记账) ----------
export interface LedgerEntry {
  id: string;
  userId?: string;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description?: string | null;
  source: 'manual' | 'ai';
  occurredAt: string; // YYYY-MM-DD
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateLedgerRequest {
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description?: string;
  occurredAt: string;
  source?: 'manual' | 'ai';
}

export type UpdateLedgerRequest = Partial<CreateLedgerRequest>;

export interface LedgerSummary {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

// ---------- AI transfer parsing ----------
export interface ParsedTransfer {
  matched: boolean;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
  occurredAt: string;
  raw: string;
}

export const LEDGER_CATEGORIES = [
  { value: 'food', label: '餐饮', icon: '🍜' },
  { value: 'transport', label: '交通', icon: '🚌' },
  { value: 'shopping', label: '购物', icon: '🛍️' },
  { value: 'housing', label: '居住', icon: '🏠' },
  { value: 'entertainment', label: '娱乐', icon: '🎬' },
  { value: 'medical', label: '医疗', icon: '💊' },
  { value: 'education', label: '教育', icon: '📚' },
  { value: 'salary', label: '工资收入', icon: '💼' },
  { value: 'transfer', label: '转账', icon: '🔄' },
  { value: 'other', label: '其他', icon: '📦' },
] as const;

export const CATEGORIES = [
  { value: 'entertainment', label: '娱乐', color: '#8B5CF6' },
  { value: 'productivity', label: '办公效率', color: '#3B82F6' },
  { value: 'education', label: '学习教育', color: '#10B981' },
  { value: 'health', label: '健康运动', color: '#F59E0B' },
  { value: 'cloud', label: '云存储', color: '#06B6D4' },
  { value: 'gaming', label: '游戏', color: '#EF4444' },
  { value: 'music', label: '音乐', color: '#EC4899' },
  { value: 'news', label: '新闻资讯', color: '#F97316' },
  { value: 'other', label: '其他', color: '#6B7280' },
] as const;

export const BILLING_CYCLES = [
  { value: 'monthly', label: '月付' },
  { value: 'quarterly', label: '季付' },
  { value: 'yearly', label: '年付' },
] as const;
