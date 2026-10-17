import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { Subscription, CreateSubscriptionRequest } from '@shared/types/api';
import { CATEGORIES, BILLING_CYCLES } from '@shared/types/api';

const CATEGORY_ICONS: Record<string, string> = {
  entertainment: '🎬', productivity: '💼', education: '📚',
  health: '💪', cloud: '☁️', gaming: '🎮', music: '🎵',
  news: '📰', other: '📦',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: '活跃', variant: 'default' },
  paused: { label: '暂停', variant: 'secondary' },
  cancelled: { label: '已取消', variant: 'destructive' },
};

const defaultForm: CreateSubscriptionRequest = {
  name: '',
  amount: '',
  category: 'other',
  billingCycle: 'monthly',
  nextBillingDate: '',
  lastBillingDate: '',
  status: 'active',
  icon: '',
  color: '',
  notes: '',
};

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getNextMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

interface Props {
  onDataChange?: () => void;
}

export default function SubscriptionsView({ onDataChange }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSubscriptionRequest>({ ...defaultForm, lastBillingDate: getTodayStr(), nextBillingDate: getNextMonthStr() });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await apiService.getSubscriptions();
      if (res.success) setSubscriptions(res.data);
    } catch {
      toast.error('加载订阅失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, lastBillingDate: getTodayStr(), nextBillingDate: getNextMonthStr() });
    setDialogOpen(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setForm({
      name: sub.name,
      amount: sub.amount,
      category: sub.category,
      billingCycle: sub.billingCycle as 'monthly' | 'yearly' | 'quarterly',
      nextBillingDate: sub.nextBillingDate,
      lastBillingDate: sub.lastBillingDate,
      status: sub.status as 'active' | 'cancelled' | 'paused',
      icon: sub.icon || '',
      color: sub.color || '',
      notes: sub.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) {
      toast.error('请填写名称和金额');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await apiService.updateSubscription(editingId, form);
        if (res.success) {
          toast.success('订阅已更新');
          setSubscriptions(prev => prev.map(s => s.id === editingId ? res.data : s));
        }
      } else {
        const res = await apiService.createSubscription(form);
        if (res.success) {
          toast.success('订阅已添加');
          setSubscriptions(prev => [...prev, res.data]);
        }
      }
      setDialogOpen(false);
      onDataChange?.();
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiService.deleteSubscription(id);
      if (res.success) {
        toast.success('订阅已删除');
        setSubscriptions(prev => prev.filter(s => s.id !== id));
        onDataChange?.();
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = subscriptions.filter(s => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">订阅管理</h2>
          <p className="text-sm text-muted-foreground">共 {subscriptions.filter(s => s.status === 'active').length} 个活跃订阅</p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer min-h-[44px]">
          <Plus className="w-4 h-4 mr-2" />
          添加订阅
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{CATEGORY_ICONS[c.value]} {c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="paused">暂停</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-medium">暂无订阅记录</p>
          <p className="text-sm mt-1">点击「添加订阅」开始追踪你的软件支出</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const catInfo = getCategoryInfo(sub.category);
            const statusInfo = STATUS_MAP[sub.status] || STATUS_MAP.active;
            return (
              <div key={sub.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: catInfo?.color + '20' }}
                >
                  {CATEGORY_ICONS[sub.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{sub.name}</span>
                    <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span style={{ color: catInfo?.color }}>{catInfo?.label || sub.category}</span>
                    <span>·</span>
                    <span>{BILLING_CYCLES.find(b => b.value === sub.billingCycle)?.label || sub.billingCycle}</span>
                    <span>·</span>
                    <span>下次 {sub.nextBillingDate}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-lg text-foreground">¥{parseFloat(sub.amount).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">/{sub.billingCycle === 'yearly' ? '年' : sub.billingCycle === 'quarterly' ? '季' : '月'}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8" onClick={() => openEdit(sub)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(sub.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑订阅' : '添加订阅'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>服务名称 *</Label>
              <Input placeholder="如：Netflix、Spotify" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>金额（元）*</Label>
                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>扣款周期</Label>
                <Select value={form.billingCycle} onValueChange={v => setForm(f => ({ ...f, billingCycle: v as 'monthly' | 'yearly' | 'quarterly' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{CATEGORY_ICONS[c.value]} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>上次扣款日期</Label>
                <Input type="date" value={form.lastBillingDate} onChange={e => setForm(f => ({ ...f, lastBillingDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>下次扣款日期</Label>
                <Input type="date" value={form.nextBillingDate} onChange={e => setForm(f => ({ ...f, nextBillingDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as 'active' | 'cancelled' | 'paused' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="paused">暂停</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input placeholder="可选备注信息" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
              <X className="w-4 h-4 mr-1" /> 取消
            </Button>
            <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
              <Check className="w-4 h-4 mr-1" /> {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">删除后无法恢复，确定要删除这条订阅记录吗？</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="cursor-pointer">取消</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="cursor-pointer">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
