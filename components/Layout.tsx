
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  PlaySquare
} from 'lucide-react';
import { logout } from '../services/mockDb';

export const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#030712] flex flex-col selection:bg-blue-500/30">
      {/* Premium Header */}
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

      {/* Modern Floating Nav */}
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
              {/* Fix: Use NavLink's render prop to access isActive in children scope */}
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
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-gray-900/50 backdrop-blur-md p-6 flex flex-col border-r border-white/5">
        <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3 italic">
           <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
             <Settings className="text-white" size={20} />
           </div>
           ADMIN
        </h2>
        <nav className="flex-1 space-y-1">
          {[
            { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
            { to: '/admin/shorts', icon: PlaySquare, label: 'Shorts' },
            { to: '/admin/announcements', icon: Megaphone, label: 'News' },
            { to: '/admin/games', icon: Gamepad2, label: 'Games' },
            { to: '/admin/users', icon: Users, label: 'Users' },
            { to: '/admin/tasks', icon: List, label: 'Tasks' },
            { to: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
            { to: '/admin/settings', icon: Sliders, label: 'Settings' },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <item.icon size={18} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-8 flex items-center gap-3 px-4 py-3 text-red-400/80 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all w-full font-bold text-sm">
          <LogOut size={18} /> Logout
        </button>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
