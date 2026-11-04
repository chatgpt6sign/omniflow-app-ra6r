import { useState } from 'react';
import { LayoutDashboard, CreditCard, Bot, Menu, X, Wallet, NotebookPen, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import OmniflowBadge from '@/components/custom/OmniflowBadge';
import { useAuth } from '@/contexts/AuthContext';
import DashboardView from './DashboardView';
import SubscriptionsView from './SubscriptionsView';
import LedgerView from './LedgerView';
import AIChatView from './AIChatView';

type View = 'dashboard' | 'subscriptions' | 'ledger' | 'ai';

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: '概览', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'subscriptions', label: '订阅', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'ledger', label: '记账', icon: <NotebookPen className="w-5 h-5" /> },
  { id: 'ai', label: 'AI 助手', icon: <Bot className="w-5 h-5" /> },
];

export default function Index() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const { user, logout } = useAuth();

  const handleDataChange = () => {
    setDashboardRefreshKey(k => k + 1);
  };

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-base">智能记账</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-current={currentView === item.id ? 'page' : undefined}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right: user + logout (desktop) */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm text-muted-foreground max-w-[120px] truncate">
              {user?.username || ''}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="cursor-pointer text-muted-foreground">
              <LogOut className="w-4 h-4 mr-1" />
              退出
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden cursor-pointer"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="切换菜单"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border bg-background px-4 py-2 space-y-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-current={currentView === item.id ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentView === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-border mt-1">
              <span className="text-sm text-muted-foreground truncate">{user?.username || ''}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="cursor-pointer text-muted-foreground">
                <LogOut className="w-4 h-4 mr-1" />
                退出
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {currentView === 'dashboard' && (
          <DashboardView refreshKey={dashboardRefreshKey} onGoSubscriptions={() => handleNavClick('subscriptions')} />
        )}
        {currentView === 'subscriptions' && (
          <SubscriptionsView onDataChange={handleDataChange} />
        )}
        {currentView === 'ledger' && (
          <LedgerView onDataChange={handleDataChange} />
        )}
        {currentView === 'ai' && (
          <AIChatView />
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
        <div className="flex">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-current={currentView === item.id ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                currentView === item.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="sm:hidden h-16" />

      <OmniflowBadge />
      <Toaster />
    </div>
  );
}
