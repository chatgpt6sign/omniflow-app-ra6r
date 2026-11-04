import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import LoginView from './pages/LoginView';
import RegisterView from './pages/RegisterView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { ReactNode } from 'react';

function FullScreenLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated === null) return <FullScreenLoading />;
  if (isAuthenticated === false) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Index />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <AuthProvider>
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </AuthProvider>
);

export default App;
