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
