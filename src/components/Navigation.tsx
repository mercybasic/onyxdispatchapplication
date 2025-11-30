import { Home, LayoutDashboard, LogOut, Settings, Ship, ChevronLeft, ChevronRight, Menu, X, BarChart3, UserCog, Shield, User, FileText, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

interface NavigationProps {
  currentView: 'intake' | 'dashboard' | 'settings' | 'analytics' | 'ships' | 'roles' | 'discord' | 'crew' | 'contracts' | 'directory';
  onNavigate: (view: 'intake' | 'dashboard' | 'settings' | 'analytics' | 'ships' | 'roles' | 'discord' | 'crew' | 'contracts' | 'directory') => void;
}

export function Navigation({ currentView, onNavigate }: NavigationProps) {
  const { user, profile, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('intake');
  };

  const handleNavigate = (view: 'intake' | 'dashboard' | 'settings' | 'analytics' | 'ships' | 'roles' | 'discord' | 'crew' | 'contracts' | 'directory') => {
    onNavigate(view);
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed top-4 left-4 z-[60] w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-2 border-cyan-400 rounded-lg flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all"
          title={isMobileOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      )}

      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`fixed left-0 top-0 h-screen bg-gradient-to-br from-slate-900/95 to-black/95 backdrop-blur-sm border-r-2 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all duration-300 flex flex-col ${
        isMobile
          ? `z-50 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
          : `z-50 ${isCollapsed ? 'w-16' : 'w-64'}`
      }`}>
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-8 w-6 h-6 bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-2 border-cyan-400 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all z-10"
            title={isCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        <div className="p-4 border-b-2 border-cyan-500/30 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/30 blur-lg"></div>
            <Ship className="relative w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,1)]" />
          </div>
          {(!isCollapsed || isMobile) && (
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent uppercase tracking-wide">Onyx Services</h2>
              {user && profile && (
                <p className="text-cyan-400/60 text-xs uppercase tracking-wider">{profile.discord_username}</p>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <button
            onClick={() => handleNavigate('intake')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
              currentView === 'intake'
                ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
            }`}
            title="Client Intake"
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {(!isCollapsed || isMobile) && <span>Client Intake</span>}
          </button>

          {user && (
            <>
              <button
                onClick={() => handleNavigate('dashboard')}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                  currentView === 'dashboard'
                    ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                    : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
                }`}
                title="Dispatch Dashboard"
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <span>Dispatch Dashboard</span>}
              </button>

              <button
                onClick={() => handleNavigate('settings')}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                  currentView === 'settings'
                    ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                    : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
                }`}
                title="Settings"
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <span>Settings</span>}
              </button>

              <button
                onClick={() => handleNavigate('crew')}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                  currentView === 'crew'
                    ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                    : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
                }`}
                title="My Profile"
              >
                <User className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <span>My Profile</span>}
              </button>

              <button
                onClick={() => handleNavigate('contracts')}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                  currentView === 'contracts'
                    ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                    : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
                }`}
                title="Contract Manager"
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <span>Contracts</span>}
              </button>

              {(profile?.role === 'ceo' || profile?.role === 'dispatcher' || profile?.role === 'administrator') && (
                <button
                  onClick={() => handleNavigate('directory')}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                    currentView === 'directory'
                      ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                      : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
                  }`}
                  title="User Directory"
                >
                  <Users className="w-5 h-5 flex-shrink-0" />
                  {(!isCollapsed || isMobile) && <span>User Directory</span>}
                </button>
              )}

              {(profile?.role === 'ceo' || profile?.role === 'dispatcher' || profile?.role === 'administrator') && (
                <>
                  <button
                    onClick={() => handleNavigate('analytics')}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                      currentView === 'analytics'
                        ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                        : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
                    }`}
                    title="Analytics & Insights"
                  >
                    <BarChart3 className="w-5 h-5 flex-shrink-0" />
                    {(!isCollapsed || isMobile) && <span>Analytics</span>}
                  </button>

              <button
                onClick={() => handleNavigate('ships')}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                  currentView === 'ships'
                    ? 'bg-cyan-900/50 text-cyan-400 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]'
                    : 'text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 border-l-4 border-transparent'
                }`}
                title="Ship Management"
              >
                <Ship className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || isMobile) && <span>Ships</span>}
              </button>

              {profile?.role === 'ceo' && (
                <>
                  <button
                    onClick={() => handleNavigate('roles')}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                      currentView === 'roles'
                        ? 'bg-blue-900/50 text-blue-400 border-l-4 border-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]'
                        : 'text-blue-600 hover:bg-blue-900/20 hover:text-blue-400 border-l-4 border-transparent'
                    }`}
                    title="Role Management"
                  >
                    <UserCog className="w-5 h-5 flex-shrink-0" />
                    {(!isCollapsed || isMobile) && <span>Roles</span>}
                  </button>

                  <button
                    onClick={() => handleNavigate('discord')}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all uppercase tracking-wider text-sm font-semibold ${
                      currentView === 'discord'
                        ? 'bg-blue-900/50 text-blue-400 border-l-4 border-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]'
                        : 'text-blue-600 hover:bg-blue-900/20 hover:text-blue-400 border-l-4 border-transparent'
                    }`}
                    title="Discord Role Mapping"
                  >
                    <Shield className="w-5 h-5 flex-shrink-0" />
                    {(!isCollapsed || isMobile) && <span>Discord Roles</span>}
                  </button>
                </>
              )}
                </>
              )}
            </>
          )}
        </nav>

        {user && (
          <div className="border-t-2 border-cyan-500/30 p-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all uppercase tracking-wider text-sm font-semibold clip-corners border-2 border-red-500/30 hover:border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {(!isCollapsed || isMobile) && <span>Sign Out</span>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
