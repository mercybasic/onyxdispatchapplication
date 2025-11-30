import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { IntakeForm } from './components/IntakeForm';
import { LoginPage } from './components/LoginPage';
import { DispatchDashboard } from './components/DispatchDashboard';
import { ClientTracker } from './components/ClientTracker';
import { Navigation } from './components/Navigation';
import { SettingsPanel } from './components/SettingsPanel';
import { Analytics } from './components/Analytics';
import { ShipManagement } from './components/ShipManagement';
import { RoleManagement } from './components/RoleManagement';
import { DiscordRoleMapping } from './components/DiscordRoleMapping';
import { Profile } from './components/Profile';
import { ContractManager } from './components/ContractManager';
import { UserDirectory } from './components/UserDirectory';
import { Shield, Search } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'intake' | 'login' | 'dashboard' | 'track' | 'settings' | 'analytics' | 'ships' | 'roles' | 'discord' | 'crew' | 'contracts' | 'directory'>('intake');
  const [trackingData, setTrackingData] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    const path = window.location.pathname;

    if (path === '/dashboard') {
      if (user && !loading) {
        setView('dashboard');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/settings') {
      if (user && !loading) {
        setView('settings');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/analytics') {
      if (user && !loading) {
        setView('analytics');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/ships') {
      if (user && !loading) {
        setView('ships');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/roles') {
      if (user && !loading) {
        setView('roles');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/discord') {
      if (user && !loading) {
        setView('discord');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/crew') {
      if (user && !loading) {
        setView('crew');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/contracts') {
      if (user && !loading) {
        setView('contracts');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/directory') {
      if (user && !loading) {
        setView('directory');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/login') {
      if (user && !loading) {
        setView('dashboard');
        window.history.replaceState({}, '', '/dashboard');
      } else if (!loading) {
        setView('login');
      }
    } else if (path === '/track') {
      setView('track');
    } else {
      if (user && !loading && path === '/') {
        setView('dashboard');
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [user, loading]);

  const handleNavigate = (newView: 'intake' | 'dashboard' | 'settings' | 'analytics' | 'ships' | 'roles' | 'discord' | 'crew' | 'contracts' | 'directory') => {
    setView(newView);
    const path = newView === 'intake' ? '/'
      : newView === 'dashboard' ? '/dashboard'
      : newView === 'settings' ? '/settings'
      : newView === 'analytics' ? '/analytics'
      : newView === 'ships' ? '/ships'
      : newView === 'roles' ? '/roles'
      : newView === 'discord' ? '/discord'
      : newView === 'crew' ? '/crew'
      : newView === 'contracts' ? '/contracts'
      : '/directory';
    window.history.pushState({}, '', path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (view === 'login') {
    return <LoginPage />;
  }

  if (view === 'track') {
    return <ClientTracker initialTrackingCode={trackingData?.code} initialClientName={trackingData?.name} />;
  }

  if (user) {
    return (
      <>
        <Navigation currentView={view as 'intake' | 'dashboard' | 'settings' | 'analytics' | 'ships' | 'roles' | 'discord' | 'crew' | 'contracts' | 'directory'} onNavigate={handleNavigate} />
        <div className="md:ml-64 transition-all duration-300">
          {view === 'dashboard' ? <DispatchDashboard />
            : view === 'settings' ? <SettingsPanel />
            : view === 'analytics' ? <Analytics />
            : view === 'ships' ? <ShipManagement />
            : view === 'roles' ? <RoleManagement />
            : view === 'discord' ? <DiscordRoleMapping />
            : view === 'crew' ? <Profile />
            : view === 'contracts' ? <ContractManager />
            : view === 'directory' ? <UserDirectory />
            : <IntakeForm />}
        </div>
      </>
    );
  }

  const handleRequestSubmitted = (trackingCode: string, clientName: string) => {
    setTrackingData({ code: trackingCode, name: clientName });
    setView('track');
    window.history.pushState({}, '', '/track');
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => {
            setTrackingData(null);
            setView('track');
            window.history.pushState({}, '', '/track');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-900/80 to-blue-900/80 hover:from-cyan-800/80 hover:to-blue-800/80 text-cyan-300 clip-corners border-2 border-cyan-500/30 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
        >
          <Search className="w-4 h-4" />
          Track Request
        </button>
        <button
          onClick={() => setView('login')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-colors shadow-lg"
        >
          <Shield className="w-4 h-4" />
          Dispatcher Login
        </button>
      </div>
      <IntakeForm onRequestSubmitted={handleRequestSubmitted} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
