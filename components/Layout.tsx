
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
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 p-4 sticky top-0 z-30 shadow-md shrink-0">
        <div className="flex justify-center items-center max-w-md mx-auto relative">
          <NavLink to="/leaderboard" className="absolute left-0 text-yellow-500 hover:text-yellow-400" title="Leaderboard">
             <Trophy size={20} />
          </NavLink>
          <h1 className="text-lg font-bold text-blue-400">Click to earn USDT Bot</h1>
          <NavLink to="/profile" className="absolute right-0 text-gray-400 hover:text-white" title="Settings">
             <Settings size={20} />
          </NavLink>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-md mx-auto p-4 pb-24 flex flex-col relative z-0 animate-in fade-in">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg z-20 h-auto pb-safe">
        <div className="flex justify-between items-center max-w-md mx-auto py-3 px-2">
          <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center flex-1 min-w-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
            <Home size={20} />
            <span className="text-[10px] mt-1 truncate">Home</span>
          </NavLink>
          <NavLink to="/shorts" className={({ isActive }) => `flex flex-col items-center flex-1 min-w-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
            <PlaySquare size={20} />
            <span className="text-[10px] mt-1 truncate">Shorts</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `flex flex-col items-center flex-1 min-w-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
            <CheckSquare size={20} />
            <span className="text-[10px] mt-1 truncate">Tasks</span>
          </NavLink>
           <NavLink to="/games" className={({ isActive }) => `flex flex-col items-center flex-1 min-w-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
            <Gamepad2 size={20} />
            <span className="text-[10px] mt-1 truncate">Games</span>
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => `flex flex-col items-center flex-1 min-w-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
            <Wallet size={20} />
            <span className="text-[10px] mt-1 truncate">Wallet</span>
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
    <div className="min-h-screen bg-gray-900 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-gray-800 p-6 flex flex-col border-r border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
           <Settings className="text-blue-500" /> Admin
        </h2>
        <nav className="flex-1 space-y-2">
          <NavLink to="/admin" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/admin/shorts" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <PlaySquare size={20} /> Shorts
          </NavLink>
          <NavLink to="/admin/announcements" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <Megaphone size={20} /> News
          </NavLink>
           <NavLink to="/admin/games" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <Gamepad2 size={20} /> Games
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <Users size={20} /> Users
          </NavLink>
          <NavLink to="/admin/tasks" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <List size={20} /> Tasks
          </NavLink>
          <NavLink to="/admin/withdrawals" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <Wallet size={20} /> Withdrawals
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <Sliders size={20} /> Settings
          </NavLink>
        </nav>
        <button onClick={handleLogout} className="mt-8 flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-700 rounded-lg transition-colors w-full">
          <LogOut size={20} /> Logout
        </button>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
