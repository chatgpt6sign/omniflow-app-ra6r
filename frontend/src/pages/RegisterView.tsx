import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('请输入用户名和密码');
      return;
    }
    if (username.trim().length < 3) {
      toast.error('用户名至少 3 个字符');
      return;
    }
    if (password.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }
    if (password !== confirm) {
      toast.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.register({ username: username.trim(), password });
      if (res.success) {
        login(res.data.token, res.data.user);
        toast.success('注册成功，已自动登录');
        navigate('/', { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <Wallet className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">创建账户</h1>
            <p className="text-sm text-muted-foreground mt-1">注册后即可使用智能记账助手</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="reg-username">用户名</Label>
              <Input
                id="reg-username"
                placeholder="3-50 个字符"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">密码</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少 6 位"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm">确认密码</Label>
              <Input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="再次输入密码"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 cursor-pointer" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? '注册中...' : '注册并登录'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
