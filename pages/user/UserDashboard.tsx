
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
          setTransactions(txs.reverse().slice(0, 5));
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
             alert(result.message);
             await fetchData();
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (isMounted.current) setIsClaiming(false);
    }
  };

  const isCheckedInToday = () => {
      if (!user?.lastDailyCheckIn) return false;
      const today = new Date().toDateString();
      const last = new Date(user.lastDailyCheckIn).toDateString();
      return today === last;
  };

  const dismissNews = (id: string) => {
      setDismissedNews([...dismissedNews, id]);
  };

  if (!user) return <div className="text-white text-center mt-10">Loading Dashboard...</div>;

  const activeNews = announcements.filter(a => !dismissedNews.includes(a.id));

  return (
    <div className="space-y-6">
      
      {/* Announcements Section */}
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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-sm font-medium opacity-80">Total Balance</h2>
                <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-bold">{user.balance.toFixed(2)}</span>
                    <span className="text-lg">Points</span>
                </div>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
                <Zap className="text-yellow-300" />
            </div>
        </div>
        <div className="mt-6 flex gap-3">
            <Link to="/tasks" className="flex-1 bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg backdrop-blur-sm transition text-sm font-bold">
                Tasks
            </Link>
            <Link to="/friends" className="flex-1 bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg backdrop-blur-sm transition text-sm font-bold">
                Invite
            </Link>
            <Link to="/wallet" className="flex-1 bg-white text-blue-600 font-bold text-center py-2 rounded-lg hover:bg-gray-100 transition text-sm">
                Withdraw
            </Link>
        </div>
      </div>

      {/* Daily Check-in */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex justify-between items-center">
          <div>
              <h3 className="text-white font-bold flex items-center gap-2">
                  <CalendarCheck className="text-green-400" size={20} /> Daily Check-in
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                  Streak: <span className="text-orange-400 font-bold">{user.dailyStreak || 0} Days</span>
              </p>
          </div>
          <button 
            onClick={handleDailyCheckIn}
            disabled={isCheckedInToday() || isClaiming}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                isCheckedInToday() 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
            }`}
          >
             {isCheckedInToday() ? 'Claimed' : 'Claim'}
          </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start mb-2">
                <div className="bg-green-500/20 w-10 h-10 rounded-full flex items-center justify-center">
                    <TrendingUp className="text-green-500" size={20} />
                </div>
                <Link to="/leaderboard" className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
                    <Trophy size={12} /> Top 10
                </Link>
            </div>
            <p className="text-gray-400 text-xs">Total Earned</p>
            <p className="text-white font-bold text-lg">
                {transactions.filter(t => t.type === 'EARNING' || t.type === 'BONUS' || t.type === 'REFERRAL').reduce((acc, curr) => acc + curr.amount, 0)}
            </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="bg-orange-500/20 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                <Award className="text-orange-500" size={20} />
            </div>
            <p className="text-gray-400 text-xs">Tasks Done</p>
            <p className="text-white font-bold text-lg">
                {transactions.filter(t => t.type === 'EARNING').length}
            </p>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
                <Clock size={18} /> Activity
            </h3>
            <Link to="/wallet" className="text-blue-400 text-xs hover:underline">View All</Link>
        </div>
        <div className="space-y-4">
            {transactions.length === 0 ? (
                <p className="text-gray-500 text-center text-sm">No activity yet.</p>
            ) : (
                transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                        <div>
                            <p className="text-white text-sm font-medium">{tx.description}</p>
                            <p className="text-gray-500 text-xs">{new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-bold ${tx.type === 'WITHDRAWAL' ? 'text-red-400' : 'text-green-400'}`}>
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
