
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
  User,
  Megaphone,
  Gamepad2,
  PlaySquare
} from 'lucide-react';
import { logout } from '../services/mockDb';

export const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <header className="bg-[#1e293b] p-5 sticky top-0 z-30 shadow-xl border-b border-[#334155] shrink-0">
        <div className="flex justify-center items-center max-w-md mx-auto relative">
          <NavLink to="/leaderboard" className="absolute left-0 text-yellow-500 hover:text-yellow-400 transition" title="Leaderboard">
             <Trophy size={22} />
          </NavLink>
          <h1 className="text-xl font-black text-white uppercase tracking-wider">Click to earn USDT Bot</h1>
          <NavLink to="/profile" className="absolute right-0 text-gray-400 hover:text-white transition" title="Settings">
             <Settings size={22} />
          </NavLink>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-md mx-auto p-4 pb-28 flex flex-col relative z-0 animate-in fade-in">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1e293b]/90 backdrop-blur-lg border-t border-[#334155] shadow-2xl z-20 h-auto pb-safe">
        <div className="flex justify-between items-center max-w-md mx-auto py-4 px-4">
          <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center flex-1 transition ${isActive ? 'text-blue-500 scale-110' : 'text-gray-500'}`}>
            <Home size={22} className={({ isActive }: any) => isActive ? 'fill-current' : ''} />
            <span className="text-[10px] font-black mt-1.5 uppercase">Home</span>
          </NavLink>
          <NavLink to="/shorts" className={({ isActive }) => `flex flex-col items-center flex-1 transition ${isActive ? 'text-blue-500 scale-110' : 'text-gray-500'}`}>
            <PlaySquare size={22} />
            <span className="text-[10px] font-black mt-1.5 uppercase">Shorts</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `flex flex-col items-center flex-1 transition ${isActive ? 'text-blue-500 scale-110' : 'text-gray-500'}`}>
            <CheckSquare size={22} />
            <span className="text-[10px] font-black mt-1.5 uppercase">Tasks</span>
          </NavLink>
           <NavLink to="/games" className={({ isActive }) => `flex flex-col items-center flex-1 transition ${isActive ? 'text-blue-500 scale-110' : 'text-gray-500'}`}>
            <Gamepad2 size={22} />
            <span className="text-[10px] font-black mt-1.5 uppercase">Games</span>
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => `flex flex-col items-center flex-1 transition ${isActive ? 'text-blue-500 scale-110' : 'text-gray-500'}`}>
            <Wallet size={22} />
            <span className="text-[10px] font-black mt-1.5 uppercase">Wallet</span>
          </NavLink>
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
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-[#1e293b] p-6 flex flex-col border-r border-[#334155]">
        <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
           <Settings className="text-blue-500" size={28} /> Admin Panel
        </h2>
        <nav className="flex-1 space-y-2">
          <NavLink to="/admin" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/admin/shorts" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <PlaySquare size={20} /> Shorts
          </NavLink>
          <NavLink to="/admin/announcements" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <Megaphone size={20} /> News
          </NavLink>
           <NavLink to="/admin/games" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <Gamepad2 size={20} /> Games
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <Users size={20} /> Users
          </NavLink>
          <NavLink to="/admin/tasks" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <List size={20} /> Tasks
          </NavLink>
          <NavLink to="/admin/withdrawals" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <Wallet size={20} /> Withdrawals
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#334155]'}`}>
            <Sliders size={20} /> Settings
          </NavLink>
        </nav>
        <button onClick={handleLogout} className="mt-8 flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition w-full font-bold">
          <LogOut size={20} /> Logout
        </button>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
