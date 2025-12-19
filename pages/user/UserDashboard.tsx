
import React, { useEffect, useState, useRef } from 'react';
import { User, Transaction } from '../../types';
import { getCurrentUserId, getUserById, getTransactions, subscribeToChanges, claimDailyReward, triggerHoneypot } from '../../services/mockDb';
import { TrendingUp, Award, Clock, CalendarCheck, Trophy, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const UserDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
        const id = getCurrentUserId();
        if (!id) { navigate('/login'); return; }
        const u = await getUserById(id);
        if (!isMounted.current) return;
        if (!u) { navigate('/login'); return; }
        setUser(u);
        const txs = await getTransactions(id);
        if (isMounted.current) {
            setTransactions(txs.slice(0, 5)); // Only show last 5 on dashboard to save space
            setLoading(false);
        }
    } catch (e) {
        if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const unsubscribe = subscribeToChanges(() => {
        if (isMounted.current) fetchData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const handleDailyCheckIn = async () => {
    if (!user || isClaiming) return;
    setIsClaiming(true);
    try {
        const result = await claimDailyReward(user.id);
        if (isMounted.current && result.success) fetchData();
    } catch (e: any) {
        alert(e.message || "Failed to claim reward.");
    } finally {
        if (isMounted.current) setIsClaiming(false);
    }
  };

  const isCheckedInToday = () => {
      if (!user?.lastDailyCheckIn) return false;
      const today = new Date().toISOString().split('T')[0];
      const last = user.lastDailyCheckIn.split('T')[0];
      return today === last;
  };

  if (loading || !user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Accessing Wallet...</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700 pb-10 max-w-full overflow-x-hidden">
      
      {/* ANTI-BOT HONEYPOT */}
      <button onClick={() => triggerHoneypot()} className="opacity-0 absolute pointer-events-auto h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>Admin Debug</button>

      {/* Main Balance Card - Optimized for all aspect ratios */}
      <div className="mesh-gradient rounded-[1.8rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-[0_20px_40px_rgba(37,99,235,0.25)] text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
          <TrendingUp size={100} className="sm:w-[140px] sm:h-[140px]" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              <h2 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Total Assets</h2>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
                {/* Fluid Typography: min 32px, max 64px based on viewport */}
                <span className="text-[clamp(2rem,10vw,4rem)] font-black tracking-tighter drop-shadow-md leading-none">
                    {user.balance.toFixed(2)}
                </span>
                <span className="text-[10px] sm:text-sm font-black opacity-80 italic tracking-widest">USDT</span>
            </div>
            
            <div className="mt-5 sm:mt-8 grid grid-cols-2 gap-2 sm:gap-4">
                <Link to="/tasks" className="bg-white/10 hover:bg-white/20 text-center py-3 sm:py-4 rounded-xl sm:rounded-2xl backdrop-blur-md transition-all font-bold text-[9px] sm:text-xs uppercase tracking-widest border border-white/10 active:scale-95 flex items-center justify-center">
                    Earn More
                </Link>
                <Link to="/wallet" className="bg-white text-blue-700 font-black text-center py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-all text-[9px] sm:text-xs uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center">
                    Withdraw
                </Link>
            </div>
        </div>
      </div>

      {/* Daily Reward - Slim banner layout */}
      <div className="glass-card rounded-[1.5rem] sm:rounded-[2rem] p-3.5 sm:p-5 flex justify-between items-center shadow-lg border border-white/5">
          <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-2.5 sm:p-3.5 rounded-xl border border-green-500/20">
                  <CalendarCheck className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                  <h3 className="text-white font-bold text-[11px] sm:text-sm truncate">Daily Reward</h3>
                  <p className="text-orange-400 font-black text-[8px] sm:text-[10px] uppercase tracking-wider">{user.dailyStreak || 1} Day Streak</p>
              </div>
          </div>
          <button 
            onClick={handleDailyCheckIn}
            disabled={isCheckedInToday() || isClaiming}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                isCheckedInToday() 
                ? 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 active:scale-95'
            }`}
          >
             {isCheckedInToday() ? 'Claimed' : (isClaiming ? '...' : 'Claim')}
          </button>
      </div>

      {/* Stats Grid - Square and robust */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <div className="glass-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.2rem] border border-white/5 flex flex-col justify-between">
            <div className="bg-blue-500/10 p-2 rounded-lg w-fit mb-3">
                <Trophy className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Available</p>
              <p className="text-white font-black text-lg sm:text-2xl mt-0.5 tracking-tight">{user.balance.toFixed(2)}</p>
            </div>
        </div>
        <div className="glass-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.2rem] border border-white/5 flex flex-col justify-between">
            <div className="bg-orange-500/10 p-2 rounded-lg w-fit mb-3">
                <Award className="text-orange-500 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-gray-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Task Done</p>
              <p className="text-white font-black text-lg sm:text-2xl mt-0.5 tracking-tight">{transactions.length}</p>
            </div>
        </div>
      </div>

      {/* Activity Timeline - Compact for mobile */}
      <div className="glass-card rounded-[1.5rem] sm:rounded-[2.2rem] p-5 sm:p-6 border border-white/5 shadow-xl">
        <h3 className="text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mb-4 sm:mb-6 flex items-center gap-2">
            <Clock size={14} className="text-blue-500" /> Recent Activity
        </h3>
        <div className="space-y-4 sm:space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
            {transactions.length === 0 ? (
                <p className="text-gray-600 text-[10px] sm:text-xs font-bold italic py-4">No records yet</p>
            ) : (
                transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-start pl-5 sm:pl-6 relative">
                        <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border-2 sm:border-[3px] border-[#030712] ${tx.type === 'WITHDRAWAL' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div className="min-w-0 pr-3">
                            <p className="text-white text-[10px] sm:text-xs font-bold truncate capitalize">{tx.description}</p>
                            <p className="text-gray-600 text-[8px] font-bold mt-1 uppercase">{new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-black text-[11px] sm:text-sm whitespace-nowrap ${tx.type === 'WITHDRAWAL' ? 'text-red-400' : 'text-green-400'}`}>
                            {tx.type === 'WITHDRAWAL' ? '-' : '+'}{tx.amount.toFixed(2)}
                        </span>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
