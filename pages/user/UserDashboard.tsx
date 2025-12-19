
import React, { useEffect, useState, useRef } from 'react';
import { User, Transaction, Announcement } from '../../types';
import { getCurrentUserId, getUserById, getTransactions, subscribeToChanges, claimDailyReward, getAnnouncements } from '../../services/mockDb';
import { TrendingUp, Award, Clock, CalendarCheck, Trophy, Settings, Loader2 } from 'lucide-react';
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
        if (!id) {
            navigate('/login');
            return;
        }

        const u = await getUserById(id);
        if (!isMounted.current) return;
        
        if (!u) {
            // Handle cases where session exists but user is deleted/not found in DB
            localStorage.clear();
            navigate('/login');
            return;
        }

        setUser(u);
        const txs = await getTransactions(id);
        if (isMounted.current) {
            setTransactions(txs.slice(0, 15));
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
        if (isMounted.current) {
             // Use a more subtle feedback if possible, but alert works for confirmation
             if (result.success) fetchData();
        }
    } catch (e: any) {
        alert(e.message || "Failed to check in.");
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-gray-400 font-medium animate-pulse">Syncing balance...</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Main Balance Card (Blue Gradient) - Rounded 2rem */}
      <div className="bg-gradient-to-r from-[#31b5f6] to-[#1e59e5] rounded-[2rem] p-7 shadow-xl text-white">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/80">Available Points</h2>
        <div className="flex items-baseline gap-2 mt-1">
            <span className="text-5xl font-black tracking-tight">{user.balance.toFixed(0)}</span>
            <span className="text-sm font-bold opacity-90">USDT-Pts</span>
        </div>
        <div className="mt-7 flex gap-3">
            <Link to="/tasks" className="flex-1 bg-white/20 hover:bg-white/30 text-center py-3 rounded-2xl backdrop-blur-sm transition font-bold text-sm">
                Earn More
            </Link>
            <Link to="/wallet" className="flex-1 bg-white text-[#1e59e5] font-bold text-center py-3 rounded-2xl hover:bg-gray-100 transition text-sm shadow-md">
                Withdraw
            </Link>
        </div>
      </div>

      {/* 2. Daily Reward Section - Matched to Screenshot */}
      <div className="bg-[#1e293b] rounded-[1.8rem] p-4 flex justify-between items-center shadow-lg border border-white/5">
          <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-3.5 rounded-[1.2rem]">
                  <CalendarCheck className="text-green-500" size={26} />
              </div>
              <div>
                  <h3 className="text-white font-bold text-md">Daily Reward</h3>
                  <p className="text-gray-400 text-xs">
                      Streak: <span className="text-orange-400 font-bold">{user.dailyStreak || 1} Days</span>
                  </p>
              </div>
          </div>
          <button 
            onClick={handleDailyCheckIn}
            disabled={isCheckedInToday() || isClaiming}
            className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isCheckedInToday() 
                ? 'bg-gray-700/50 text-gray-500' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 active:scale-95'
            }`}
          >
             {isCheckedInToday() ? 'Claimed' : 'Claim Now'}
          </button>
      </div>

      {/* 3. Stats Grid (Two column) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1e293b] p-5 rounded-[1.8rem] shadow-lg border border-white/5 relative overflow-hidden">
            <div className="bg-blue-500/10 p-2.5 rounded-xl w-fit mb-3">
                <TrendingUp className="text-blue-500" size={22} />
            </div>
            <Trophy size={14} className="text-yellow-500 absolute top-5 right-5 opacity-40" />
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Earned</p>
            <p className="text-white font-black text-2xl mt-0.5">
                {user.balance.toFixed(0)}
            </p>
        </div>
        <div className="bg-[#1e293b] p-5 rounded-[1.8rem] shadow-lg border border-white/5">
            <div className="bg-orange-500/10 p-2.5 rounded-xl w-fit mb-3">
                <Award className="text-orange-500" size={22} />
            </div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Tasks Done</p>
            <p className="text-white font-black text-2xl mt-0.5">
                {transactions.filter(t => t.type === 'EARNING').length}
            </p>
        </div>
      </div>

      {/* 4. Recent Activity Section */}
      <div className="bg-[#1e293b] rounded-[1.8rem] p-5 shadow-xl border border-white/5">
        <div className="flex justify-between items-center mb-5">
            <h3 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Clock size={16} className="text-blue-400" /> Recent Activity
            </h3>
            <Link to="/wallet" className="text-blue-400 text-xs font-bold">See All</Link>
        </div>
        <div className="space-y-5">
            {transactions.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">Start tasks to see history</p>
                </div>
            ) : (
                transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center">
                        <div className="min-w-0 pr-4">
                            <p className="text-white text-[14px] font-bold truncate capitalize">{tx.description}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">
                                {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
