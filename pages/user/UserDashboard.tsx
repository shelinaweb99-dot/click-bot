
import React, { useEffect, useState, useRef } from 'react';
import { User, Transaction, Announcement } from '../../types';
import { getCurrentUserId, getUserById, getTransactions, subscribeToChanges, claimDailyReward, getAnnouncements } from '../../services/mockDb';
import { TrendingUp, Award, Clock, CalendarCheck, Zap, Bell, X, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UserDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [dismissedNews, setDismissedNews] = useState<string[]>([]);
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
          setTransactions(txs.slice(0, 5));
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
    // This listener catches the 'db_change' event fired from TaskRunner
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

  const dismissNews = (id: string) => {
      setDismissedNews([...dismissedNews, id]);
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading Balance...</p>
        </div>
    </div>
  );

  const activeNews = announcements.filter(a => !dismissedNews.includes(a.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Announcements */}
      {activeNews.length > 0 && (
          <div className="space-y-3">
              {activeNews.slice(0, 2).map(news => (
                  <div key={news.id} className={`p-4 rounded-xl border relative ${
                      news.type === 'SUCCESS' ? 'bg-green-600/10 border-green-600/30' :
                      news.type === 'WARNING' ? 'bg-orange-600/10 border-orange-600/30' :
                      'bg-blue-600/10 border-blue-600/30'
                  }`}>
                      <button onClick={() => dismissNews(news.id)} className="absolute top-2 right-2 text-gray-400 hover:text-white">
                          <X size={16} />
                      </button>
                      <div className="flex gap-3">
                          <Bell size={20} className={
                              news.type === 'SUCCESS' ? 'text-green-500' :
                              news.type === 'WARNING' ? 'text-orange-500' : 'text-blue-500'
                          } />
                          <div>
                              <h3 className="text-white font-bold text-sm">{news.title}</h3>
                              <p className="text-gray-300 text-xs mt-1">{news.message}</p>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-70">Available Points</h2>
            <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-black">{user.balance.toFixed(0)}</span>
                <span className="text-sm font-bold opacity-80">USDT-Pts</span>
            </div>
            <div className="mt-6 flex gap-2">
                <Link to="/tasks" className="flex-1 bg-white/20 hover:bg-white/30 text-center py-2.5 rounded-xl backdrop-blur-md transition font-bold text-sm">
                    Earn More
                </Link>
                <Link to="/wallet" className="flex-1 bg-white text-blue-700 font-black text-center py-2.5 rounded-xl hover:bg-gray-100 transition text-sm">
                    Withdraw
                </Link>
            </div>
        </div>
      </div>

      {/* Daily Reward */}
      <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-4">
              <div className="bg-green-500/20 p-3 rounded-xl">
                  <CalendarCheck className="text-green-400" size={24} />
              </div>
              <div>
                  <h3 className="text-white font-bold">Daily Reward</h3>
                  <p className="text-gray-400 text-xs">
                      Streak: <span className="text-orange-400 font-bold">{user.dailyStreak || 0} Days</span>
                  </p>
              </div>
          </div>
          <button 
            onClick={handleDailyCheckIn}
            disabled={isCheckedInToday() || isClaiming}
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                isCheckedInToday() 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20 scale-105 active:scale-95'
            }`}
          >
             {isCheckedInToday() ? 'Claimed' : 'Claim Now'}
          </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
            <div className="flex justify-between items-start mb-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                    <TrendingUp className="text-blue-500" size={20} />
                </div>
                <Trophy size={16} className="text-yellow-500" />
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-tighter">Total Earned</p>
            <p className="text-white font-black text-xl mt-1">
                {transactions.filter(t => t.type !== 'WITHDRAWAL').reduce((acc, curr) => acc + curr.amount, 0)}
            </p>
        </div>
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
            <div className="bg-orange-500/20 p-2 rounded-lg mb-3 w-fit">
                <Award className="text-orange-500" size={20} />
            </div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-tighter">Tasks Done</p>
            <p className="text-white font-black text-xl mt-1">
                {transactions.filter(t => t.type === 'EARNING').length}
            </p>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-lg">
        <div className="flex justify-between items-center mb-5">
            <h3 className="text-white font-bold flex items-center gap-2">
                <Clock size={18} className="text-blue-400" /> Recent Activity
            </h3>
            <Link to="/wallet" className="text-blue-400 text-xs font-bold hover:underline">See All</Link>
        </div>
        <div className="space-y-4">
            {transactions.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-gray-600 text-sm">No activity records found.</p>
                </div>
            ) : (
                transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center border-b border-gray-700/50 pb-3 last:border-0 last:pb-0">
                        <div className="min-w-0 pr-4">
                            <p className="text-white text-sm font-bold truncate">{tx.description}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">{new Date(tx.date).toLocaleString()}</p>
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
