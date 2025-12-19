
import React, { useEffect, useState } from 'react';
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
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { logout, getCurrentUserId, getUserRole } from '../services/mockDb';
import { UserRole } from '../types';

export const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0b1120] flex flex-col font-sans">
      <header className="bg-[#1e293b] px-4 sm:px-5 py-3.5 sm:py-4 sticky top-0 z-50 shadow-lg border-b border-white/5 shrink-0">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <NavLink to="/leaderboard" className="text-yellow-500 hover:scale-110 transition p-1" title="Leaderboard">
             <Trophy size={18} className="sm:w-5 sm:h-5" />
          </NavLink>
          <h1 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-widest text-center flex-1 px-2 line-clamp-1">
            Click to earn USDT Bot
          </h1>
          <NavLink to="/profile" className="text-gray-400 hover:text-white transition p-1" title="Settings">
             <Settings size={18} className="sm:w-5 sm:h-5" />
          </NavLink>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-lg mx-auto p-4 pb-28 flex flex-col relative z-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1e293b]/95 backdrop-blur-md border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50 h-20 pb-safe">
        <div className="flex justify-around items-center h-full max-w-lg mx-auto px-2">
          <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <Home size={22} className="sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter">Home</span>
          </NavLink>
          <NavLink to="/shorts" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <PlaySquare size={22} className="sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter">Shorts</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <CheckSquare size={22} className="sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter">Tasks</span>
          </NavLink>
           <NavLink to="/games" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <Gamepad2 size={22} className="sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter">Games</span>
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <Wallet size={22} className="sm:w-6 sm:h-6" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter">Wallet</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Immediate verification check
    const id = getCurrentUserId();
    const role = getUserRole();
    
    if (!id || role !== UserRole.ADMIN) {
      console.warn("Unauthorized admin access attempt");
      navigate('/login', { replace: true });
    } else {
      setIsVerifying(false);
    }
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    if(window.confirm('Terminate secure admin session?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Checking Security Protocol</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#1e293b] p-6 sm:p-8 flex flex-col border-r border-white/5 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
        <div className="mb-8 sm:mb-10 flex items-center gap-4 px-2">
           <div className="bg-blue-600 p-2.5 sm:p-3 rounded-2xl shadow-xl shadow-blue-900/40 border border-blue-400/20">
             {/* Fixed: Merged duplicate className attribute */}
             <ShieldAlert size={20} className="text-white sm:w-6 sm:h-6" />
           </div>
           <div>
             <h2 className="text-lg sm:text-xl font-black text-white tracking-tighter uppercase leading-none">Admin</h2>
             <p className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1.5 opacity-80 italic">Root Authority</p>
           </div>
        </div>

        <nav className="flex-1 space-y-1 sm:space-y-1.5 overflow-y-auto no-scrollbar">
          {[
            { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
            { to: '/admin/users', icon: Users, label: 'Users' },
            { to: '/admin/tasks', icon: List, label: 'Tasks' },
            { to: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
            { to: '/admin/shorts', icon: PlaySquare, label: 'Shorts' },
            { to: '/admin/announcements', icon: Megaphone, label: 'News' },
            { to: '/admin/games', icon: Gamepad2, label: 'Games' },
            { to: '/admin/settings', icon: Sliders, label: 'Settings' },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 rounded-[1rem] sm:rounded-[1.2rem] transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest
                ${isActive ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 translate-x-1' : 'text-gray-500 hover:text-white hover:bg-[#334155]'}
              `}
            >
              <item.icon size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 sm:mt-8 pt-6 border-t border-white/5">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-5 py-3.5 sm:py-4 text-red-400/80 hover:text-red-500 hover:bg-red-500/10 rounded-[1.2rem] transition-all w-full font-black text-[10px] sm:text-xs uppercase tracking-[0.2em]"
          >
            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto relative bg-[#0b1120]">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
