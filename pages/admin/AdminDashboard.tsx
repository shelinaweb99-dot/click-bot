
import React, { useEffect, useState, useRef } from 'react';
import { getUsers, getWithdrawals, getTasks, subscribeToChanges, getCurrentUserId, getUserRole } from '../../services/mockDb';
import { User, Task, WithdrawalRequest, UserRole } from '../../types';
import { Users, CheckCircle, Wallet, AlertCircle, Megaphone, Loader2, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const id = getCurrentUserId();
      const role = getUserRole();
      if (!id || role !== UserRole.ADMIN) {
          navigate('/login');
          return;
      }

      setError(null);
      if (isMounted.current) setLoading(true);

      const [usersData, withdrawalsData, tasksData] = await Promise.all([
        getUsers().catch(() => []),
        getWithdrawals().catch(() => []),
        getTasks().catch(() => [])
      ]);

      if (!isMounted.current) return;

      setUsers(Array.isArray(usersData) ? usersData : []);
      setWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (err: any) {
      console.error("Dashboard sync error", err);
      if (isMounted.current) setError("System sync failed. Please try again.");
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

  if (loading && users.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse"></div>
        </div>
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Retrieving Core Metrics</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10">
        <AlertCircle className="text-red-500 mb-4" size={56} />
        <h2 className="text-2xl font-black text-white tracking-tight">System Desync</h2>
        <p className="text-gray-500 text-sm mt-2 mb-8 max-w-xs">{error}</p>
        <button onClick={fetchData} className="bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/20">
          <RefreshCw size={18} /> Reconnect
        </button>
      </div>
    );
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING').length;
  const totalPaid = withdrawals.filter(w => w.status === 'APPROVED').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="bg-blue-600/10 p-2 rounded-xl text-blue-500 border border-blue-500/10">
               <LayoutDashboard size={20} />
             </div>
             <h1 className="text-4xl font-black text-white tracking-tighter">Overview</h1>
          </div>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Central System Hub</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className={`p-4 bg-gray-900 rounded-2xl text-gray-500 hover:text-white border border-white/5 transition-all shadow-xl active:scale-90 ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={22} />
        </button>
      </div>
      
      {/* 4-Column Metric Grid - Restored Clean Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Users size={120} />
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Total Members</p>
            <h3 className="text-5xl font-black text-white tracking-tighter">{users.length}</h3>
            <div className="mt-5 flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div> Active Database
            </div>
        </div>

        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <CheckCircle size={120} />
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Live Missions</p>
            <h3 className="text-5xl font-black text-white tracking-tighter">{tasks.length}</h3>
            <div className="mt-5 flex items-center gap-2 text-green-400 text-[10px] font-black uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Earning Ready
            </div>
        </div>

        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <AlertCircle size={120} />
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Pending Payouts</p>
            <h3 className={`text-5xl font-black tracking-tighter ${pendingWithdrawals > 0 ? 'text-orange-500' : 'text-white opacity-40'}`}>
                {pendingWithdrawals}
            </h3>
            <div className="mt-5 flex items-center gap-2 text-orange-400 text-[10px] font-black uppercase font-bold">
                <AlertCircle size={14} /> Critical Tasks
            </div>
        </div>

        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Wallet size={120} />
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Assets Distributed</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-white tracking-tighter">{totalPaid.toFixed(2)}</h3>
              <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">USDT</span>
            </div>
            <div className="mt-6 flex items-center gap-2 text-purple-400 text-[10px] font-black uppercase">
                <Wallet size={14} /> Global Ledger
            </div>
        </div>
      </div>

      <div className="bg-blue-600/10 p-10 rounded-[3rem] border border-blue-500/10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <Megaphone size={180} />
          </div>
          <div className="relative z-10 max-w-xl">
            <h3 className="text-2xl font-black text-white mb-3 flex items-center gap-3">
              <Megaphone className="text-blue-500" /> Broadcast Engine
            </h3>
            <p className="text-gray-400 text-sm mb-10 font-medium leading-relaxed">
              Maintain platform momentum by broadcasting mission updates or payout confirmations directly to all user dashboards.
            </p>
            <div className="flex flex-wrap gap-4">
                <Link to="/admin/announcements" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-xl shadow-blue-900/40 active:scale-95">
                    Create Bulletin
                </Link>
                <Link to="/admin/withdrawals" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all active:scale-95">
                    Manage Ledger
                </Link>
            </div>
          </div>
      </div>
    </div>
  );
};
