
import React, { useEffect, useState, useRef } from 'react';
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
  Loader2,
  MonitorPlay
} from 'lucide-react';
import { logout, getCurrentUserId, getUserRole, getAdSettings, getUserById, subscribeToChanges } from '../services/mockDb';
import { UserRole, AdSettings } from '../types';
import { AdsterraBanner } from './AdsterraBanner';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isGames = location.pathname.includes('/games');
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [userName, setUserName] = useState<string>('');

  const fetchUserData = async () => {
    const id = getCurrentUserId();
    if (id) {
      const u = await getUserById(id, true);
      if (u) setUserName(u.name.split(' ')[0]);
    }
  };

  useEffect(() => {
    const fetchAds = async () => {
      const ads = await getAdSettings();
      setAdSettings(ads);
    };
    fetchAds();
    fetchUserData();
    const unsub = subscribeToChanges(() => {
      fetchAds();
      fetchUserData();
    });
    return unsub;
  }, []);

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    if (hour >= 18 && hour < 22) return "Good evening";
    return "Good night";
  };

  const bannerHeight = adSettings?.bannerAd?.isEnabled ? (adSettings.bannerAd.height || 50) : 0;

  return (
    <div className="min-h-screen bg-[#0b1120] flex flex-col font-sans">
      <PWAInstallPrompt />
      
      {/* Header */}
      {!isGames && (
        <header className="bg-[#1e293b] px-4 py-3 sticky top-0 z-50 shadow-lg border-b border-white/5 shrink-0">
          <div className="flex justify-between items-center max-w-2xl mx-auto">
            <NavLink to="/leaderboard" className="text-yellow-500 hover:scale-110 transition p-2" title="Leaderboard">
               <Trophy size={20} />
            </NavLink>
            <h1 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] text-center flex-1 px-2 line-clamp-1">
              {getGreetingText()}, {userName || 'Member'}
            </h1>
            <NavLink to="/profile" className="text-gray-400 hover:text-white transition p-2" title="Settings">
               <Settings size={20} />
            </NavLink>
          </div>
        </header>
      )}
      
      <main 
        className={`flex-1 w-full max-w-2xl mx-auto p-4 sm:p-6 ${isGames ? 'pt-2' : ''}`}
        style={{ paddingBottom: `${6 + (bannerHeight / 4) + 6}rem` }} // Dynamically calc bottom padding
      >
        {children}
      </main>

      {/* Adsterra Banner */}
      {adSettings && <AdsterraBanner settings={adSettings} />}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1e293b]/95 backdrop-blur-md border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50 h-[4.5rem] sm:h-20 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-full max-w-2xl mx-auto px-1">
          <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <Home size={20} className="sm:w-6 sm:h-6" />
            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter">Home</span>
          </NavLink>
          <NavLink to="/shorts" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <PlaySquare size={20} className="sm:w-6 sm:h-6" />
            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter">Shorts</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <CheckSquare size={20} className="sm:w-6 sm:h-6" />
            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter">Tasks</span>
          </NavLink>
          <NavLink to="/friends" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <Users size={20} className="sm:w-6 sm:h-6" />
            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter">Friends</span>
          </NavLink>
           <NavLink to="/games" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <Gamepad2 size={20} className="sm:w-6 sm:h-6" />
            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter">Games</span>
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => `flex flex-col items-center gap-1 transition-all flex-1 ${isActive ? 'text-blue-400 scale-105' : 'text-gray-500'}`}>
            <Wallet size={20} className="sm:w-6 sm:h-6" />
            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tighter">Wallet</span>
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
  const checkTimer = useRef<any>(null);

  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);

    checkTimer.current = setTimeout(() => {
        const id = getCurrentUserId();
        const role = getUserRole();
        
        if (!id || role !== UserRole.ADMIN) {
          console.warn("Security Breach Detected: Unauthenticated access to Administrative Node.");
          navigate('/login', { replace: true });
        } else {
          setIsVerifying(false);
        }
    }, 300);

    return () => {
        if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    if(window.confirm('Action Required: Terminate secure administrative session?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse"></div>
        </div>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Verifying Root Privileges</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 lg:w-72 bg-[#1e293b] p-6 md:p-8 flex flex-col border-r border-white/5 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
        <div className="mb-8 md:mb-10 flex items-center gap-4 px-2">
           <div className="bg-blue-600 p-2.5 rounded-2xl shadow-xl shadow-blue-900/40 border border-blue-400/20">
             <ShieldAlert size={20} className="text-white" />
           </div>
           <div>
             <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-none">Admin</h2>
             <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1.5 opacity-80 italic">Root Authority</p>
           </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
          {[
            { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
            { to: '/admin/users', icon: Users, label: 'Users' },
            { to: '/admin/tasks', icon: List, label: 'Tasks' },
            { to: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
            { to: '/admin/shorts', icon: PlaySquare, label: 'Shorts' },
            { to: '/admin/announcements', icon: Megaphone, label: 'News' },
            { to: '/admin/games', icon: Gamepad2, label: 'Games' },
            { to: '/admin/ads', icon: MonitorPlay, label: 'Ads' },
            { to: '/admin/settings', icon: Sliders, label: 'Settings' },
          ].map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-[10px] lg:text-xs uppercase tracking-widest
                ${isActive ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 translate-x-1' : 'text-gray-500 hover:text-white hover:bg-[#334155]'}
              `}
            >
              <item.icon size={16} strokeWidth={2.5} /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 pt-6 border-t border-white/5">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-5 py-4 text-red-400/80 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all w-full font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto relative bg-[#0b1120]">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
