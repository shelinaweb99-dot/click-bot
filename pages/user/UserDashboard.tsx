
import React, { useEffect, useState, useRef } from 'react';
import { User, Transaction, Announcement } from '../../types';
import { getCurrentUserId, getUserById, getTransactions, subscribeToChanges, claimDailyReward, getAnnouncements } from '../../services/mockDb';
import { TrendingUp, Award, Clock, CalendarCheck, Zap, Bell, X, Trophy, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UserDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
        const id = getCurrentUserId();
        if (id) {
          const u = await getUserById(id);
          if (!isMounted.current) return;
          setUser(u);
          
          const txs = await getTransactions(id);
          if (!isMounted.current) return;
          setTransactions(txs.slice(0, 10)); // Show more in recent activity
        }
        const news = await getAnnouncements();
        if (!isMounted.current) return;
        setAnnouncements(news);
    } catch (e) {
        console.error("Dashboard fetch error", e);
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
             alert(result.reward ? `Claimed ${result.reward} points!` : result.message);
             await fetchData();
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

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Syncing with server...</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 bg-[#0f172a] min-h-screen">
      
      {/* Balance Card - Matched to Screenshot */}
      <div className="bg-gradient-to-r from-[#38bdf8] to-[#2563eb] rounded-[2rem] p-8 shadow-2xl text-white relative overflow-hidden">
        <div className="relative z-10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Available Points</h2>
            <div className="flex items-baseline gap-2 mt-2">
                <span className="text-6xl font-black tracking-tighter">{user.balance.toFixed(0)}</span>
                <span className="text-sm font-bold opacity-90">USDT-Pts</span>
            </div>
            <div className="mt-8 flex gap-3">
                <Link to="/tasks" className="flex-1 bg-white/20 hover:bg-white/30 text-center py-3.5 rounded-2xl backdrop-blur-md transition font-black text-sm uppercase tracking-wider">
                    Earn More
                </Link>
                <Link to="/wallet" className="flex-1 bg-white text-blue-600 font-black text-center py-3.5 rounded-2xl hover:bg-gray-100 transition text-sm uppercase tracking-wider shadow-lg">
                    Withdraw
                </Link>
            </div>
        </div>
      </div>

      {/* Daily Reward - Matched to Screenshot */}
      <div className="bg-[#1e293b] rounded-3xl p-6 border border-[#334155] flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
              <div className="bg-[#22c55e26] p-4 rounded-2xl">
                  <CalendarCheck className="text-[#22c55e]" size={28} />
              </div>
              <div>
                  <h3 className="text-white font-bold text-lg">Daily Reward</h3>
                  <p className="text-gray-400 text-sm">
                      Streak: <span className="text-orange-400 font-bold">{user.dailyStreak || 0} Days</span>
                  </p>
              </div>
          </div>
          <button 
            onClick={handleDailyCheckIn}
            disabled={isCheckedInToday() || isClaiming}
            className={`px-6 py-3 rounded-2xl text-sm font-black transition-all ${
                isCheckedInToday() 
                ? 'bg-[#334155] text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-900/20 active:scale-95'
            }`}
          >
             {isCheckedInToday() ? 'Claimed' : 'Claim Now'}
          </button>
      </div>

      {/* Stats Grid - Matched to Screenshot */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-[#334155] shadow-lg relative">
            <div className="bg-blue-500/10 p-2.5 rounded-xl w-fit mb-4">
                <TrendingUp className="text-blue-500" size={24} />
            </div>
            <Trophy size={18} className="text-yellow-500 absolute top-6 right-6" />
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Earned</p>
            <p className="text-white font-black text-3xl mt-1">
                {(transactions.filter(t => t.type !== 'WITHDRAWAL').reduce((acc, curr) => acc + curr.amount, 0) + user.balance).toFixed(0)}
            </p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-[#334155] shadow-lg">
            <div className="bg-orange-500/10 p-2.5 rounded-xl w-fit mb-4">
                <Award className="text-orange-500" size={24} />
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Tasks Done</p>
            <p className="text-white font-black text-3xl mt-1">
                {transactions.filter(t => t.type === 'EARNING').length}
            </p>
        </div>
      </div>

      {/* Recent Activity - Matched to Screenshot */}
      <div className="bg-[#1e293b] rounded-3xl p-6 border border-[#334155] shadow-xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-3">
                <Clock size={20} className="text-blue-400" /> Recent Activity
            </h3>
            <Link to="/wallet" className="text-blue-400 text-xs font-bold hover:underline">See All</Link>
        </div>
        <div className="space-y-6">
            {transactions.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500 text-sm">No activity records yet.</p>
                </div>
            ) : (
                transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center group">
                        <div className="min-w-0 pr-4">
                            <p className="text-white text-[15px] font-bold truncate group-hover:text-blue-300 transition-colors capitalize">{tx.description}</p>
                            <p className="text-gray-500 text-[11px] mt-1">{new Date(tx.date).toLocaleString()}</p>
                        </div>
                        <span className={`font-black text-lg whitespace-nowrap ${tx.type === 'WITHDRAWAL' ? 'text-red-400' : 'text-green-400'}`}>
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
