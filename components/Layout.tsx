
import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  CheckSquare, 
  Wallet, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Settings, 
  List,
  Sliders,
  Trophy,
  Megaphone,
  Gamepad2,
  PlaySquare,
  ShieldAlert
} from 'lucide-react';
import { logout, getCurrentUserId, getUserRole } from '../services/mockDb';
import { UserRole } from '../types';

export const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#030712] flex flex-col selection:bg-blue-500/30">
      <header className="bg-[#030712]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50 border-b border-white/[0.03] shrink-0">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <NavLink to="/leaderboard" className="text-amber-400/80 hover:text-amber-400 transition-all hover:scale-110" title="Leaderboard">
             <Trophy size={18} strokeWidth={2.5} />
          </NavLink>
          <div className="flex flex-col items-center">
            <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-0.5">Premium Earning</h1>
            <span className="text-xs font-bold text-white/90">Click to Earn Bot</span>
          </div>
          <NavLink to="/profile" className="text-gray-500 hover:text-white transition-all" title="Settings">
             <Settings size={18} strokeWidth={2.5} />
          </NavLink>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-md mx-auto p-5 pb-28 flex flex-col relative z-0">
        {children}
      </main>

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-gray-900/80 backdrop-blur-2xl border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 h-16 rounded-[2rem] px-2">
        <div className="flex justify-around items-center h-full">
          {[
            { to: '/dashboard', icon: Home, label: 'Home' },
            { to: '/shorts', icon: PlaySquare, label: 'Shorts' },
            { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
            { to: '/games', icon: Gamepad2, label: 'Games' },
            { to: '/wallet', icon: Wallet, label: 'Wallet' },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              className={({ isActive }) => `
                relative flex flex-col items-center justify-center transition-all duration-300 flex-1
                ${isActive ? 'text-blue-500 active-nav-dot translate-y-[-2px]' : 'text-gray-500 hover:text-gray-300'}
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const id = getCurrentUserId();
    const role = getUserRole();
    if (!id || role !== UserRole.ADMIN) {
      navigate('/login');
    }
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    if(window.confirm('Terminate Admin Session?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-gray-900/50 backdrop-blur-3xl p-8 flex flex-col border-r border-white/5 z-20">
        <div className="mb-10 flex items-center gap-4 px-2">
           <div className="bg-blue-600 p-2.5 rounded-[1rem] shadow-xl shadow-blue-600/30 ring-4 ring-blue-600/10">
             <ShieldAlert className="text-white" size={24} />
           </div>
           <div>
             <h2 className="text-xl font-black text-white tracking-tight">Admin Console</h2>
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Secure Core v2.9</p>
           </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
          {[
            { to: '/admin', icon: LayoutDashboard, label: 'System Overview', end: true },
            { to: '/admin/users', icon: Users, label: 'Member List' },
            { to: '/admin/tasks', icon: List, label: 'Earn Missions' },
            { to: '/admin/withdrawals', icon: Wallet, label: 'Payout Control' },
            { to: '/admin/shorts', icon: PlaySquare, label: 'Shorts Engine' },
            { to: '/admin/announcements', icon: Megaphone, label: 'Broadcast News' },
            { to: '/admin/games', icon: Gamepad2, label: 'Games Config' },
            { to: '/admin/settings', icon: Sliders, label: 'Global Settings' },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-5 py-4 rounded-[1.2rem] transition-all font-bold text-xs uppercase tracking-widest
                ${isActive ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20 translate-x-1' : 'text-gray-500 hover:text-white hover:bg-white/5'}
              `}
            >
              {/* Wrapping children in a function to access isActive from NavLink */}
              {({ isActive }) => (
                <>
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} /> {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 pt-6 border-t border-white/5">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-5 py-4 text-red-500/80 hover:text-red-500 hover:bg-red-500/10 rounded-[1.2rem] transition-all w-full font-black text-xs uppercase tracking-widest"
          >
            <LogOut size={18} /> Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto relative bg-gradient-to-br from-transparent to-blue-900/5">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};