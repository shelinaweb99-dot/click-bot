
import React, { useState, useEffect, useRef } from 'react';
import { WithdrawalRequest, WithdrawalStatus } from '../../types';
import { getWithdrawals, updateWithdrawalStatus, getUserById, saveUser, subscribeToChanges } from '../../services/mockDb';
import { Check, X, Clock, Loader2, AlertCircle, RefreshCw, DollarSign } from 'lucide-react';

export const AdminWithdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const loadData = async () => {
      try {
          if (isMounted.current) setLoading(true);
          setError(null);
          const data = await getWithdrawals();
          if (isMounted.current) {
            setWithdrawals(Array.isArray(data) ? [...data].reverse() : []);
          }
      } catch (e: any) {
          console.error("Failed to load withdrawals", e);
          if (isMounted.current) setError("Network error fetching payout logs.");
      } finally {
          if (isMounted.current) setLoading(false);
      }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    const unsubscribe = subscribeToChanges(() => {
        if (isMounted.current) loadData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const handleAction = async (request: WithdrawalRequest, approve: boolean) => {
      if (request.status !== WithdrawalStatus.PENDING) return;
      
      const actionLabel = approve ? 'APPROVE' : 'REJECT';
      if(!window.confirm(`Are you sure you want to ${actionLabel} this request of ${request.amount} USDT?`)) return;

      try {
          if (approve) {
              await updateWithdrawalStatus(request.id, WithdrawalStatus.APPROVED);
          } else {
              await updateWithdrawalStatus(request.id, WithdrawalStatus.REJECTED);
              const user = await getUserById(request.userId);
              if (user) {
                  user.balance += request.amount;
                  await saveUser(user);
              }
          }
          // Refresh list
          loadData();
      } catch (e) {
          console.error("Action failed", e);
          alert("Platform synchronization error. User balance preserved.");
      }
  };

  if (loading) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Scanning Ledger</p>
          </div>
      );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-black text-white">System Error</h2>
        <p className="text-gray-500 text-sm mt-2 mb-6">{error}</p>
        <button onClick={loadData} className="bg-red-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <RefreshCw size={16} /> Retry Sync
        </button>
      </div>
    );
  }

  const pendingCount = withdrawals.filter(w => w.status === WithdrawalStatus.PENDING).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Payouts</h1>
            <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-widest">{pendingCount} Waiting Approvals</p>
        </div>
        <div className="bg-gray-900 p-1.5 rounded-2xl border border-white/5 flex">
            <button onClick={loadData} className="p-2.5 text-gray-400 hover:text-white transition-all"><RefreshCw size={18} /></button>
        </div>
      </div>
      
      <div className="space-y-4">
          {withdrawals.length === 0 ? (
            <div className="py-20 text-center glass-card rounded-[2.5rem] border border-dashed border-white/10">
                <Clock className="mx-auto text-gray-700 mb-4" size={40} />
                <p className="text-gray-500 font-bold">Clear Ledger</p>
                <p className="text-gray-700 text-xs uppercase font-black tracking-widest mt-1">No pending or historical requests</p>
            </div>
          ) : (
            withdrawals.map(req => (
              <div key={req.id} className="glass-card p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-blue-500/20 transition-all">
                  <div className="flex gap-5 items-center">
                      <div className={`p-4 rounded-2xl flex items-center justify-center ${
                          req.status === WithdrawalStatus.PENDING ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                          req.status === WithdrawalStatus.APPROVED ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                          <DollarSign size={24} />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-black text-white text-lg tracking-tight">{req.userName}</h3>
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 bg-gray-900 px-2 py-1 rounded-lg border border-white/5">{req.method}</span>
                          </div>
                          <p className="text-gray-500 text-xs font-medium">Account ID: <span className="text-blue-400 font-mono tracking-tighter">{req.userId}</span></p>
                          <p className="text-gray-400 text-xs font-bold mt-1">Address: {req.details}</p>
                          <p className="text-gray-700 text-[9px] font-black uppercase mt-2 tracking-widest">Request Time: {new Date(req.date).toLocaleString()}</p>
                      </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                         <p className="text-3xl font-black text-white tracking-tighter">{req.amount.toFixed(2)}</p>
                         <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">USDT ASSETS</p>
                      </div>

                      <div className="flex items-center gap-2">
                          {req.status === WithdrawalStatus.PENDING ? (
                              <>
                                <button 
                                    onClick={() => handleAction(req, true)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-900/20"
                                >
                                    <Check size={14} /> Approve
                                </button>
                                <button 
                                    onClick={() => handleAction(req, false)}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/20"
                                >
                                    <X size={14} /> Reject
                                </button>
                              </>
                          ) : (
                              <span className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                  req.status === WithdrawalStatus.APPROVED ? 'bg-green-500/5 text-green-500 border-green-500/10' : 'bg-red-500/5 text-red-500 border-red-500/10'
                              }`}>
                                  {req.status === WithdrawalStatus.APPROVED ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />} 
                                  {req.status}
                              </span>
                          )}
                      </div>
                  </div>
              </div>
            ))
          )}
      </div>
    </div>
  );
};
