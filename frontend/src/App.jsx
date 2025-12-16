import { useState, useEffect } from 'react';
import { authService, signalService, betService, adminService } from './services/api';
import AdminPanel from './pages/Admin/AdminPanel';
import Landing from './pages/Landing';
import LoginView from './pages/Auth/LoginView';
import RegisterView from './pages/Auth/RegisterView';
import ProDashboard from './pages/Dashboard/ProDashboard';
import Profile from './pages/Profile';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import About from './pages/About';
import MainLayout from './components/layout/MainLayout';
import NeuButton from './components/ui/NeuButton';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing'); // landing, login, register, dashboard, profile, pricing, checkout, about
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null); // For checkout

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const profile = await authService.getProfile();
      if (profile) {
        setUser(profile);
        setView(profile.role === 'admin' ? 'admin' : 'dashboard');
      } else {
        setView('landing');
      }
    } catch (err) {
      console.log('User not logged in');
      setView('landing');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    setError(null);
    try {
      const res = await authService.login(email, password);
      // Ensure backend returns correct structure
      if (res.success || res.token) {
        const profile = await authService.getProfile();
        setUser(profile);
        setView(profile.role === 'admin' ? 'admin' : 'dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  const handleRegister = async (name, email, password) => {
    setError(null);
    try {
      const res = await authService.register(name, email, password);
      if (res.success || res.userId) {
        // Auto login after register
        await handleLogin(email, password);
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setView('landing');
  };

  const handleChoosePlan = (plan) => {
    setSelectedPlan(plan);
    setView('checkout');
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-base text-text-muted font-bold text-xl animate-pulse">Loading System...</div>;

  // 1. Admin View (Legacy/Functional Isolation)
  if (user && view === 'admin') {
    return (
      <AdminPanel
        user={user}
        handleLogout={handleLogout}
        onSwitchToUser={() => setView('dashboard')}
      />
    );
  }

  // 2. Public/Pro Views (Neumorphic Main Layout)
  return (
    <MainLayout user={user} onViewChange={setView} currentView={view}>
      {view === 'landing' && !user && (
        <Landing
          onLoginClick={() => setView('login')}
          onNavigate={(page) => setView(page)}
        />
      )}

      {view === 'login' && !user && (
        <LoginView
          onLogin={handleLogin}
          onRegisterClick={() => setView('register')}
          error={error}
        />
      )}

      {view === 'register' && !user && (
        <RegisterView
          onRegister={handleRegister}
          onLoginClick={() => setView('login')}
          error={error}
        />
      )}

      {view === 'pricing' && (
        <Pricing onChoosePlan={handleChoosePlan} />
      )}

      {view === 'checkout' && (
        <Checkout
          plan={selectedPlan}
          onBack={() => setView('pricing')}
          onComplete={() => {
            alert('Success! Welcome to Pro.');
            setView('login');
          }}
        />
      )}

      {view === 'about' && (
        <About onBack={() => setView('landing')} />
      )}

      {view === 'dashboard' && user && (
        <ProDashboard user={user} />
      )}

      {view === 'profile' && user && (
        <Profile user={user} onLogout={handleLogout} />
      )}
    </MainLayout>
  );
}

export default App;
