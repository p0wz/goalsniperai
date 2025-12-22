import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authService } from './services/api';
import AdminPanel from './pages/Admin/AdminPanel';
import Landing from './pages/Landing';
import LoginView from './pages/Auth/LoginView';
import RegisterView from './pages/Auth/RegisterView';
import ProDashboard from './pages/Dashboard/ProDashboard';
import FreeDashboard from './pages/Dashboard/FreeDashboard';
import Profile from './pages/Profile';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import About from './pages/About';
import MainLayout from './components/layout/MainLayout';

// Auth Guard Wrapper
const ProtectedRoute = ({ children, user, redirect = '/login' }) => {
  if (!user) return <Navigate to={redirect} replace />;
  return children;
};

// Admin Guard Wrapper
const AdminRoute = ({ children, user }) => {
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// Public Route Wrapper (redirect to dashboard if logged in)
const PublicRoute = ({ children, user }) => {
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const profile = await authService.getProfile();
      if (profile) setUser(profile);
    } catch (err) {
      console.log('User not logged in');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      setAuthError(null);
      const res = await authService.login(email, password);
      if (res.success || res.token) {
        const profile = await authService.getProfile();
        setUser(profile);
      } else {
        setAuthError(res.error || 'Giriş başarısız');
      }
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message || 'Giriş başarısız');
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      setAuthError(null);
      const res = await authService.register(name, email, password);
      if (res.success || res.userId) {
        await handleLogin(email, password);
      } else {
        setAuthError(res.error || 'Kayıt başarısız');
      }
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message || 'Kayıt başarısız');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  // Determine which dashboard to show based on user role/plan
  const DashboardComponent = () => {
    if (!user) return <Navigate to="/login" replace />;

    // Admin uses ProDashboard (or redirect to admin panel)
    if (user.role === 'admin') {
      return <ProDashboard user={user} />;
    }

    // PRO users get ProDashboard with SENTIO
    if (user.role === 'pro' || user.plan === 'pro' || user.plan === 'premium') {
      return <ProDashboard user={user} />;
    }

    // Free users get FreeDashboard with upgrade promo
    return <FreeDashboard user={user} />;
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-base text-text-muted font-bold text-xl animate-pulse">Loading System...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Route - Isolated Layout */}
        <Route path="/admin" element={
          <AdminRoute user={user}>
            <AdminPanel user={user} handleLogout={handleLogout} />
          </AdminRoute>
        } />

        {/* Main App Routes - Wrapped in MainLayout */}
        <Route element={<MainLayoutWrapper user={user} handleLogout={handleLogout} />}>

          <Route path="/" element={
            <PublicRoute user={user}>
              <Landing />
            </PublicRoute>
          } />

          <Route path="/login" element={
            <PublicRoute user={user}>
              <LoginView onLogin={handleLogin} error={authError} />
            </PublicRoute>
          } />

          <Route path="/register" element={
            <PublicRoute user={user}>
              <RegisterView onRegister={handleRegister} error={authError} />
            </PublicRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute user={user}>
              <DashboardComponent />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute user={user}>
              <Profile user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          } />

          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Layout Wrapper to inject Router props
const MainLayoutWrapper = ({ user, handleLogout }) => {
  const location = useLocation();

  return (
    <MainLayout user={user} currentPath={location.pathname}>
      <Outlet />
    </MainLayout>
  );
};

export default App;
