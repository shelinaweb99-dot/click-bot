
import React, { useState, useEffect, useRef } from 'react';
import { User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, logout, getSystemSettings, subscribeToChanges } from '../../services/mockDb';
import { User as UserIcon, LogOut, Settings, MessageCircle, Copy, Loader2, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  const init = async () => {
      try {
          setError(null);
          const id = getCurrentUserId();
          if (!id) {
              navigate('/login');
              return;
          }
          
          const u = await getUserById(id);
          if (!isMounted.current) return;

          if (!u) {
              console.warn("User not found in profile init, clearing session");
              localStorage.clear();
              navigate('/login');
              return;
          }

          setUser(u);
          const s = await getSystemSettings();
          if (isMounted.current) {
              setSystemSettings(s);
              setLoading(false);
          }
      } catch (e: any) {
          console.error("Profile init error", e);
          if (isMounted.current) {
              setError(e.message || "Failed to load profile data.");
              setLoading(false);
          }
      }
  };

  useEffect(() => {
    isMounted.current = true;
    init();
    const unsub = subscribeToChanges(() => {
        if (isMounted.current) init();
    });
    return () => {
        isMounted.current = false;
        unsub();
    };
  }, []);

  const handleLogout = async () => {
      if(window.confirm('Are you sure you want to terminate your session?')) {
          await logout();
          navigate('/login');
      }
  };

  const copyToClipboard = (text: string) => {
      try {
          navigator.clipboard.writeText(text);
          alert("ID copied to clipboard!");
      } catch (e) {
          console.error("Copy failed", e);
      }
  };

  if (loading) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Profile</p>
    </div>
  );

  if (error || !user) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
        <AlertCircle className="text-red-500" size={48} />
        <h2 className="text-xl font-black">Profile Error</h2>
        <p className="text-gray-500 text-sm">{error || "User data mismatch."}</p>
        <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
        >
            Retry Sync
        </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/20">
                <Settings className="text-blue-500" size={24} />
            </div> 
            Account Center
        </h1>

        {/* Info Card - Pro Look */}
        <div className="glass-card p-8 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden border border-white/5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-full flex items-center justify-center text-4xl font-black text-white mb-5 shadow-2xl shadow-blue-500/20 border-4 border-[#030712]">
                {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{user.name || 'Anonymous User'}</h2>
            <p className="text-gray-500 text-sm font-medium mb-6">{user.email}</p>
            
            <button 
                onClick={() => copyToClipboard(user.id)}
                className="bg-black/40 px-5 py-3 rounded-2xl flex items-center gap-4 border border-white/5 group hover:border-blue-500/30 transition-all"
            >
                <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Referral ID</span>
                <code className="text-blue-400 font-mono text-sm tracking-tighter">{user.id}</code>
                <Copy size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
            </button>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
            <a 
                href={systemSettings?.supportLink || '#'} 
                target="_blank"
                rel="noreferrer"
                className="glass-card p-5 rounded-3xl flex items-center justify-between border border-white/5 hover:bg-white/5 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <MessageCircle size={20} />
                    </div>
                    <div className="text-left">
                        <h4 className="text-white font-bold text-sm">Customer Support</h4>
                        <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Payments & Technical help</p>
                    </div>
                </div>
                <ChevronRight size={18} className="text-gray-600" />
            </a>

            <div className="glass-card p-5 rounded-3xl flex items-center justify-between border border-white/5 opacity-80">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-500">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="text-left">
                        <h4 className="text-white font-bold text-sm">Security Guard</h4>
                        <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">IP: {user.ipAddress || 'Verified'}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Logout Button */}
        <button 
            onClick={handleLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95"
        >
            <LogOut size={20} strokeWidth={2.5} /> Terminate Session
        </button>

        <div className="pt-6 text-center space-y-1">
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-[0.4em]">Fintech Bot Engine</p>
            <p className="text-gray-800 text-[9px] font-bold">Release 2.9.1 &bull; Stable Build</p>
        </div>
    </div>
  );
};
