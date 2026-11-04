import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Check, AlertCircle, ArrowDownLeft, ArrowUpRight, Sparkles, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { LedgerEntry, CreateLedgerRequest, LedgerSummary } from '@shared/types/api';
import { LEDGER_CATEGORIES } from '@shared/types/api';

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getThisMonth() {
  return getTodayStr().slice(0, 7);
}

const defaultForm: CreateLedgerRequest = {
  type: 'expense',
  amount: '',
  category: 'food',
  description: '',
  occurredAt: getTodayStr(),
  source: 'manual',
};

const TYPE_META = {
  income: { label: '收入', color: '#10B981', icon: ArrowDownLeft },
  expense: { label: '支出', color: '#EF4444', icon: ArrowUpRight },
} as const;

function getCategoryInfo(value: string) {
  return LEDGER_CATEGORIES.find(c => c.value === value) || LEDGER_CATEGORIES[LEDGER_CATEGORIES.length - 1];
}

interface Props {
  onDataChange?: () => void;
}

export default function LedgerView({ onDataChange }: Props) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({ income: 0, expense: 0, balance: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLedgerRequest>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');

  const load = useCallback(async () => {
    try {
      const [listRes, sumRes] = await Promise.all([
        apiService.getLedger(),
        apiService.getLedgerSummary(getThisMonth()),
      ]);
      if (listRes.success) setEntries(listRes.data);
      if (sumRes.success) setSummary(sumRes.data);
    } catch {
      toast.error('加载记账数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, occurredAt: getTodayStr() });
    setDialogOpen(true);
  };

  const openEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    setForm({
      type: entry.type,
      amount: entry.amount,
      category: entry.category,
      description: entry.description || '',
      occurredAt: entry.occurredAt,
      source: entry.source,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('请输入有效金额');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await apiService.updateLedger(editingId, form);
        if (res.success) {
          toast.success('记账已更新');
          setEntries(prev => prev.map(e => e.id === editingId ? res.data : e));
        }
      } else {
        const res = await apiService.createLedger(form);
        if (res.success) {
          toast.success(form.type === 'income' ? '收入已记录' : '支出已记录');
          setEntries(prev => [res.data, ...prev]);
        }
      }
      setDialogOpen(false);
      await load();
      onDataChange?.();
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiService.deleteLedger(id);
      if (res.success) {
        toast.success('记账已删除');
        setEntries(prev => prev.filter(e => e.id !== id));
        await load();
        onDataChange?.();
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = entries.filter(e => filterType === 'all' || e.type === filterType);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">手动记账</h2>
          <p className="text-sm text-muted-foreground">记录每一笔收入与支出</p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer min-h-[44px]">
          <Plus className="w-4 h-4 mr-2" />
          记一笔
        </Button>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">本月收入</div>
          <div className="text-lg font-bold text-emerald-600">¥{summary.income.toFixed(2)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">本月支出</div>
          <div className="text-lg font-bold text-red-500">¥{summary.expense.toFixed(2)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">本月结余</div>
          <div className={`text-lg font-bold ${summary.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
            ¥{summary.balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="income">收入</SelectItem>
            <SelectItem value="expense">支出</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-4">📒</div>
          <p className="font-medium">暂无记账记录</p>
          <p className="text-sm mt-1">点击「记一笔」手动记录，或到 AI 助手粘贴手机转账信息自动入账</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(entry => {
            const catInfo = getCategoryInfo(entry.category);
            const typeInfo = TYPE_META[entry.type] || TYPE_META.expense;
            const TypeIcon = typeInfo.icon;
            return (
              <div key={entry.id} className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3.5 hover:shadow-sm transition-shadow">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: typeInfo.color + '1a', color: typeInfo.color }}
                >
                  <TypeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground truncate">
                      {entry.description || catInfo.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {catInfo.icon} {catInfo.label}
                    </Badge>
                    <Badge variant={entry.source === 'ai' ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                      {entry.source === 'ai' ? (
                        <span className="flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />AI 自动</span>
                      ) : (
                        <span className="flex items-center gap-0.5"><Hand className="w-2.5 h-2.5" />手动</span>
                      )}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{entry.occurredAt}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold" style={{ color: typeInfo.color }}>
                    {entry.type === 'income' ? '+' : '-'}¥{Number(entry.amount).toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8" onClick={() => openEdit(entry)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="cursor-pointer h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(entry.id)}>
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
            <DialogTitle>{editingId ? '编辑记账' : '记一笔'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
                className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  form.type === 'expense'
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 inline mr-1" />支出
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, type: 'income' }))}
                className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  form.type === 'income'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 inline mr-1" />收入
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>金额（元）*</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>日期</Label>
                <Input
                  type="date"
                  value={form.occurredAt}
                  onChange={e => setForm(f => ({ ...f, occurredAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEDGER_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input
                placeholder="如：美团外卖、工资、房租"
                value={form.description || ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
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
          <p className="text-sm text-muted-foreground">删除后无法恢复，确定要删除这笔记账吗？</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="cursor-pointer">取消</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="cursor-pointer">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
