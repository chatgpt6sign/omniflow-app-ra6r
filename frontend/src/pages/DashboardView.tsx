import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { Subscription } from '@shared/types/api';
import { CATEGORIES } from '@shared/types/api';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const CATEGORY_ICONS: Record<string, string> = {
  entertainment: '🎬', productivity: '💼', education: '📚',
  health: '💪', cloud: '☁️', gaming: '🎮', music: '🎵',
  news: '📰', other: '📦',
};

function getMonthlyAmount(sub: Subscription): number {
  const amt = parseFloat(sub.amount);
  if (sub.billingCycle === 'yearly') return amt / 12;
  if (sub.billingCycle === 'quarterly') return amt / 3;
  return amt;
}

function getUpcomingDays(dateStr: string): number {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function buildProjection(subs: Subscription[]) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { label: `${d.getMonth() + 1}月`, total: 0 };
  });
  subs.forEach(s => {
    const step = s.billingCycle === 'yearly' ? 12 : s.billingCycle === 'quarterly' ? 3 : 1;
    const amt = parseFloat(s.amount);
    const d = new Date(s.nextBillingDate);
    if (isNaN(d.getTime()) || isNaN(amt)) return;
    let guard = 0;
    while (guard < 100) {
      guard += 1;
      const idx = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
      if (idx >= 6) break;
      if (idx >= 0) buckets[idx].total += amt;
      d.setMonth(d.getMonth() + step);
    }
  });
  return buckets;
}

interface Props {
  refreshKey?: number;
  onGoSubscriptions?: () => void;
}

export default function DashboardView({ refreshKey, onGoSubscriptions }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [monthlyLimit, setMonthlyLimit] = useState(500);
  const [loading, setLoading] = useState(true);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [subRes, budgetRes] = await Promise.all([
        apiService.getSubscriptions(),
        apiService.getBudget(),
      ]);
      if (subRes.success) setSubscriptions(subRes.data);
      if (budgetRes.success && budgetRes.data) {
        setMonthlyLimit(parseFloat(budgetRes.data.monthlyLimit) || 500);
      }
    } catch {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalMonthly = activeSubscriptions.reduce((sum, s) => sum + getMonthlyAmount(s), 0);
  const totalYearly = totalMonthly * 12;
  const budgetUsed = Math.min((totalMonthly / monthlyLimit) * 100, 100);
  const overBudget = totalMonthly > monthlyLimit;

  // Category breakdown
  const categoryData = CATEGORIES.map(cat => {
    const subs = activeSubscriptions.filter(s => s.category === cat.value);
    const total = subs.reduce((sum, s) => sum + getMonthlyAmount(s), 0);
    return { name: cat.label, value: total, color: cat.color, icon: CATEGORY_ICONS[cat.value] };
  }).filter(d => d.value > 0);

  // Upcoming renewals (next 7 days)
  const upcoming = activeSubscriptions
    .map(s => ({ ...s, daysLeft: getUpcomingDays(s.nextBillingDate) }))
    .filter(s => s.daysLeft >= 0 && s.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Top spending
  const topSpending = [...activeSubscriptions]
    .sort((a, b) => getMonthlyAmount(b) - getMonthlyAmount(a))
    .slice(0, 5);

  const projection = buildProjection(activeSubscriptions);

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) { toast.error('请输入有效金额'); return; }
    setSavingBudget(true);
    try {
      const res = await apiService.updateBudget(budgetInput);
      if (res.success) {
        setMonthlyLimit(val);
        toast.success('预算已更新');
        setBudgetDialogOpen(false);
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingBudget(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscriptions.length === 0 && (
        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="text-4xl">🧾</div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">还没有订阅记录</p>
              <p className="text-sm text-muted-foreground mt-1">添加你的第一笔扣款记录，系统将自动生成支出分析、续费提醒与预算预警。</p>
            </div>
            {onGoSubscriptions && (
              <Button onClick={onGoSubscriptions} className="cursor-pointer min-h-[44px]">去添加订阅</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="min-h-[110px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">月度支出</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">¥{totalMonthly.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground mt-1">年度约 ¥{totalYearly.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card className="min-h-[110px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">活跃订阅</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{activeSubscriptions.length}</div>
            <div className="text-xs text-muted-foreground mt-1">共 {subscriptions.length} 条记录</div>
          </CardContent>
        </Card>
        <Card className="min-h-[110px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">月度预算</span>
              <Target className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">¥{monthlyLimit}</div>
            <Button variant="ghost" size="sm" className="text-xs text-primary cursor-pointer p-0 h-auto mt-1" onClick={() => { setBudgetInput(String(monthlyLimit)); setBudgetDialogOpen(true); }}>
              修改预算
            </Button>
          </CardContent>
        </Card>
        <Card className={`min-h-[110px] ${overBudget ? 'border-destructive/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">预算使用</span>
              {overBudget ? <TrendingUp className="w-4 h-4 text-destructive" /> : <TrendingDown className="w-4 h-4 text-green-500" />}
            </div>
            <div className={`text-2xl font-bold ${overBudget ? 'text-destructive' : 'text-green-600'}`}>
              {budgetUsed.toFixed(0)}%
            </div>
            <Progress value={budgetUsed} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Over Budget Alert */}
      {overBudget && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive text-sm">超出预算警告</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              当前月度订阅支出¥{totalMonthly.toFixed(2)}，超出预算¥{(totalMonthly - monthlyLimit).toFixed(2)}。建议检查并取消冗余订阅。
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Renewals */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              即将续费（7天内）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map(sub => (
              <div key={sub.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{CATEGORY_ICONS[sub.category]}</span>
                  <div>
                    <p className="font-medium text-sm text-foreground">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">{sub.nextBillingDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-foreground">¥{parseFloat(sub.amount).toFixed(2)}</p>
                  <Badge variant={sub.daysLeft === 0 ? 'destructive' : 'secondary'} className="text-xs">
                    {sub.daysLeft === 0 ? '今天' : `${sub.daysLeft}天后`}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">分类支出占比</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">暂无活跃订阅</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`¥${Number(value).toFixed(2)}`, '月度支出']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {categoryData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground truncate">{d.icon} {d.name}</span>
                      <span className="font-medium ml-auto">¥{d.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Spending Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">最大支出项目</CardTitle>
          </CardHeader>
          <CardContent>
            {topSpending.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">暂无活跃订阅</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSpending.map(s => ({ name: s.name.length > 8 ? s.name.slice(0, 8) + '...' : s.name, amount: getMonthlyAmount(s) }))} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `¥${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v) => [`¥${Number(v).toFixed(2)}`, '月度金额']} />
                  <Bar dataKey="amount" fill="oklch(0.5 0.2 250)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">未来 6 个月预计支出</CardTitle>
        </CardHeader>
        <CardContent>
          {activeSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无活跃订阅</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projection} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `¥${v}`} width={50} />
                <Tooltip formatter={(v) => [`¥${Number(v).toFixed(2)}`, '预计支出']} />
                <Bar dataKey="total" fill="oklch(0.5 0.2 250)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="text-xs text-muted-foreground mt-2">按各订阅的扣款周期与下次扣款日期推算，预算上限 ¥{monthlyLimit}/月。</p>
        </CardContent>
      </Card>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>设置月度预算</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">设定每月软件订阅支出上限，超出时系统会主动提醒。</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">¥</span>
              <Input type="number" placeholder="500" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)} className="cursor-pointer">取消</Button>
            <Button onClick={handleSaveBudget} disabled={savingBudget} className="cursor-pointer">{savingBudget ? '保存中...' : '确定'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
