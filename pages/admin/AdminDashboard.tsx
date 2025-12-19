
import React, { useEffect, useState, useRef } from 'react';
import { getUsers, getWithdrawals, getTasks, subscribeToChanges } from '../../services/mockDb';
import { User, Task, WithdrawalRequest } from '../../types';
import { Users, CheckCircle, Wallet, AlertCircle, Megaphone, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
      setError(null);
      const [usersData, withdrawalsData, tasksData] = await Promise.all([
        getUsers().catch(() => []),
        getWithdrawals().catch(() => []),
        getTasks().catch(() => [])
      ]);

      if (!isMounted.current) return;

      setUsers(Array.isArray(usersData) ? usersData : []);
      setWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error: any) {
      console.error("Dashboard fetch error", error);
      if (isMounted.current) setError("Failed to synchronize dashboard metrics.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const unsubscribe = subscribeToChanges(() => {
        if(isMounted.current) fetchData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Mapping System Metrics</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-black text-white">Sync Error</h2>
        <p className="text-gray-500 text-sm mt-2 mb-6">{error}</p>
        <button onClick={fetchData} className="bg-red-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <RefreshCw size={16} /> Reconnect
        </button>
      </div>
    );
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING').length;
  const totalPaid = withdrawals.filter(w => w.status === 'APPROVED').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Overview</h1>
          <p className="text-gray-500 font-bold mt-1">Real-time platform statistics</p>
        </div>
        <button onClick={fetchData} className="p-3 bg-gray-900 rounded-2xl text-gray-500 hover:text-white border border-white/5 transition-all">
          <RefreshCw size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-2 -bottom-2 p-6 bg-blue-500/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Users size={80} className="text-blue-500" />
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Total Members</p>
            <h3 className="text-5xl font-black text-white tracking-tighter">{users.length}</h3>
            <div className="mt-4 flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Managed
            </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Active Missions</p>
            <h3 className="text-5xl font-black text-white tracking-tighter">{tasks.length}</h3>
            <div className="mt-4 flex items-center gap-2 text-green-400 text-[10px] font-black uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Live
            </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Pending Requests</p>
            <h3 className="text-5xl font-black text-orange-500 tracking-tighter">{pendingWithdrawals}</h3>
            <div className="mt-4 flex items-center gap-2 text-orange-400 text-[10px] font-black uppercase">
                <AlertCircle size={14} /> Attention Needed
            </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Paid Out Assets</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-white tracking-tighter">{totalPaid.toFixed(2)}</h3>
              <span className="text-gray-600 text-[10px] font-black uppercase">USDT</span>
            </div>
            <div className="mt-5 flex items-center gap-2 text-purple-400 text-[10px] font-black uppercase">
                <Wallet size={14} /> Global Payouts
            </div>
        </div>
      </div>

      <div className="bg-blue-600/10 p-10 rounded-[3rem] border border-blue-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5">
             <Megaphone size={150} />
          </div>
          <div className="relative z-10 max-w-xl">
            <h3 className="text-2xl font-black text-white mb-3">System Broadcast</h3>
            <p className="text-gray-400 text-sm mb-8 font-medium">Instantly notify all members about platform updates, mission resets, or successful payment cycles.</p>
            <div className="flex flex-wrap gap-4">
                <Link to="/admin/announcements" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40">
                    Create Update
                </Link>
                <Link to="/admin/withdrawals" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                    Review Payouts
                </Link>
            </div>
          </div>
      </div>
    </div>
  );
};
