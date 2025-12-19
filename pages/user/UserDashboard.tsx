
import React, { useEffect, useState, useRef } from 'react';
import { User, Transaction } from '../../types';
import { getCurrentUserId, getUserById, getTransactions, subscribeToChanges, claimDailyReward } from '../../services/mockDb';
import { TrendingUp, Award, Clock, CalendarCheck, Trophy, Loader2, ChevronRight, ArrowUpRight } from 'lucide-react';
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
        
        if (!u) {
            localStorage.clear();
            navigate('/login');
            return;
        }

        setUser(u);
        const txs = await getTransactions(id);
        if (isMounted.current) {
            setTransactions(txs.slice(0, 10));
            setLoading(false);
        }
    } catch (e) {
        console.error("Dashboard fetch error", e);
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
        console.error(e);
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
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-white space-y-6">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse"></div>
        </div>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Synchronizing</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      
      {/* Mesh Balance Card */}
      <div className="mesh-gradient rounded-[2.5rem] p-8 shadow-[0_20px_40px_rgba(37,99,235,0.25)] text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Wallet Balance</h2>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter drop-shadow-sm">{user.balance.toFixed(0)}</span>
                <span className="text-sm font-black opacity-80 italic tracking-widest">USDT</span>
            </div>
            <div className="mt-8 flex gap-3">
                <Link to="/tasks" className="flex-[1.5] bg-white/10 hover:bg-white/20 text-center py-4 rounded-2xl backdrop-blur-md transition-all font-bold text-xs uppercase tracking-widest border border-white/10">
                    Get Points
                </Link>
                <Link to="/wallet" className="flex-1 bg-white text-blue-700 font-black text-center py-4 rounded-2xl hover:bg-gray-100 transition-all text-xs uppercase tracking-widest shadow-xl active:scale-95">
                    Pay Out
                </Link>
            </div>
        </div>
      </div>

      {/* Pro Daily Reward */}
      <div className="glass-card rounded-3xl p-5 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
              <div className="bg-green-500/10 p-3.5 rounded-2xl border border-green-500/20">
                  <CalendarCheck className="text-green-500" size={24} />
              </div>
              <div>
                  <h3 className="text-white font-bold text-sm">Daily Bonus</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-orange-400 font-black text-[10px] uppercase">{user.dailyStreak || 1} Day Streak</span>
                      <div className="w-1 h-1 rounded-full bg-gray-700"></div>
                      <span className="text-gray-500 text-[10px] font-bold">Resets at 00:00</span>
                  </div>
              </div>
          </div>
          <button 
            onClick={handleDailyCheckIn}
            disabled={isCheckedInToday() || isClaiming}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isCheckedInToday() 
                ? 'bg-white/5 text-gray-500 border border-white/5' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 active:scale-95'
            }`}
          >
             {isCheckedInToday() ? 'Received' : 'Claim'}
          </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-5">
        <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 p-4 bg-blue-500/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="text-blue-500" size={40} />
            </div>
            <div className="bg-blue-500/10 p-2 rounded-lg w-fit mb-3 border border-blue-500/10">
                <Trophy className="text-blue-500" size={18} />
            </div>
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Lifetime Yield</p>
            <p className="text-white font-black text-2xl mt-0.5 tracking-tight">
                {user.balance.toFixed(0)} <span className="text-[10px] text-gray-500">PTS</span>
            </p>
        </div>
        <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden group">
            <div className="bg-orange-500/10 p-2 rounded-lg w-fit mb-3 border border-orange-500/10">
                <Award className="text-orange-500" size={18} />
            </div>
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Missions Done</p>
            <p className="text-white font-black text-2xl mt-0.5 tracking-tight">
                {transactions.filter(t => t.type === 'EARNING').length} <span className="text-[10px] text-gray-500">EXC</span>
            </p>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="glass-card rounded-[2rem] p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={16} className="text-blue-500" /> Recent Log
            </h3>
            <Link to="/wallet" className="text-blue-500 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center">
                History <ChevronRight size={14} />
            </Link>
        </div>
        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
            {transactions.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-gray-600 text-xs font-bold italic">No data records found</p>
                </div>
            ) : (
                transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-start pl-6 relative">
                        <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#030712] ${tx.type === 'WITHDRAWAL' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
                        <div className="min-w-0 pr-4">
                            <p className="text-white text-xs font-bold truncate leading-none capitalize">{tx.description}</p>
                            <p className="text-gray-600 text-[9px] font-bold mt-1.5 uppercase tracking-tighter">
                                {new Date(tx.date).toLocaleDateString()} at {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <span className={`font-black text-sm whitespace-nowrap ${tx.type === 'WITHDRAWAL' ? 'text-red-400' : 'text-green-400'}`}>
                            {tx.type === 'WITHDRAWAL' ? '-' : '+'}{tx.amount}
                        </span>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
