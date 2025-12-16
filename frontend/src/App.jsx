import { useState, useEffect } from 'react';
import { authService, signalService, betService, adminService } from './services/api';
import AdminPanel from './pages/Admin/AdminPanel';
import Landing from './pages/Landing';
import LoginView from './pages/Auth/LoginView';
import ProDashboard from './pages/Dashboard/ProDashboard';
import Profile from './pages/Profile';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import About from './pages/About';
import NeuButton from './components/ui/NeuButton';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('landing'); // landing, login, dashboard, profile, pricing, checkout, about
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

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setView('landing');
  };

  const handleChoosePlan = (plan) => {
    setSelectedPlan(plan);
    setView('checkout');
  };

  // Nav Bar for Pro Users
  const ProNav = () => (
    <nav className="sticky top-0 z-50 bg-base/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-neu-extruded">
      <div className="text-2xl font-extrabold text-text-main cursor-pointer" onClick={() => setView('dashboard')}>
        GoalGPT <span className="text-accent">Pro</span>
      </div>
      <div className="flex items-center gap-4">
        {user?.role === 'admin' && (
          <button
            onClick={() => setView('admin')}
            className="font-bold px-4 py-2 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/20"
          >
            👽 Admin Panel
          </button>
        )}
        <button
          onClick={() => setView('dashboard')}
          className={`font-bold px-4 py-2 rounded-xl transition-all ${view === 'dashboard' ? 'text-accent bg-base shadow-neu-inset' : 'text-text-muted hover:text-text-main'}`}
        >
          Signals
        </button>
        <button
          onClick={() => setView('profile')}
          className={`font-bold px-4 py-2 rounded-xl transition-all ${view === 'profile' ? 'text-accent bg-base shadow-neu-inset' : 'text-text-muted hover:text-text-main'}`}
        >
          My Profile
        </button>
      </div>
    </nav>
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-base text-text-muted font-bold text-xl animate-pulse">Loading System...</div>;

  // 1. Admin View (Legacy/Functional Isolation) - NOW CONTROLLED BY STATE
  if (user && view === 'admin') {
    return (
      <AdminPanel
        user={user}
        handleLogout={handleLogout}
        onSwitchToUser={() => setView('dashboard')}
      />
    );
  }

  // 2. Public/Pro Views (Neumorphic)
  return (
    <div className="min-h-screen bg-base text-text-main font-body selection:bg-accent selection:text-white">
      {user && view !== 'landing' && <ProNav />}

      {view === 'landing' && !user && (
        <Landing
          onLoginClick={() => setView('login')}
          onNavigate={(page) => setView(page)}
        />
      )}

      {view === 'login' && !user && (
        <LoginView onLogin={handleLogin} error={error} />
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
    </div>
  );
}

export default App;
