
import React, { useState, useEffect, useRef } from 'react';
import { WithdrawalRequest, WithdrawalStatus, WithdrawalMethod, User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, createWithdrawal, getWithdrawals, getPaymentMethods, subscribeToChanges, getSystemSettings } from '../../services/mockDb';
import { DollarSign, History, Loader2, RefreshCw, CreditCard, AlertCircle, TrendingUp } from 'lucide-react';

export const UserWallet: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [availableMethods, setAvailableMethods] = useState<WithdrawalMethod[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  
  const userId = getCurrentUserId();
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
        if (!isMounted.current) return;
        setLoading(true);
        
        if (userId) {
            const userData = await getUserById(userId);
            if (!isMounted.current) return;
            setUser(userData);
            
            const allWithdrawals = await getWithdrawals();
            if (!isMounted.current) return;
            const myWithdrawals = allWithdrawals.filter(w => w.userId === userId);
            setHistory([...myWithdrawals].reverse());
        }
        
        // Fetch Settings & Payment Channels
        const [fetchedMethods, settings] = await Promise.all([
            getPaymentMethods(),
            getSystemSettings()
        ]);
        
        if (!isMounted.current) return;
        setSystemSettings(settings);

        // Ensure we always have an array and only active methods
        const methodsArray = Array.isArray(fetchedMethods) ? fetchedMethods : [];
        const activeMethods = methodsArray.filter(m => m.isEnabled);
        
        setAvailableMethods(activeMethods);
        
        // Auto-select the first method if none is selected
        if (activeMethods.length > 0 && !methodId) {
            setMethodId(activeMethods[0].id);
        }
    } catch (e) {
        console.error("Wallet fetch error", e);
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
  }, [userId]);

  const selectedMethod = availableMethods.find(m => m.id === methodId);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || isSubmitting) return;
    
    setMessage('');
    setIsSubmitting(true);

    try {
        const freshUser = await getUserById(userId);
        if (!isMounted.current) return;
        
        const val = parseFloat(amount);
        const minAmount = systemSettings?.minWithdrawal || 50;

        if (val < minAmount) {
            setMessage(`Min withdrawal is ${minAmount} Points.`);
            setIsSubmitting(false);
            return;
        }
        if (freshUser.balance < val) {
            setMessage('Insufficient balance in wallet.');
            setIsSubmitting(false);
            return;
        }

        const req: WithdrawalRequest = {
            id: Date.now().toString(),
            userId: freshUser.id,
            userName: freshUser.name || 'User',
            amount: val,
            method: selectedMethod?.name || 'Standard',
            details,
            status: WithdrawalStatus.PENDING,
            date: new Date().toISOString()
        };
        
        await createWithdrawal(req);
        if (isMounted.current) {
            setMessage('Success! Withdrawal request pending approval.');
            setAmount('');
            setDetails('');
            fetchData();
        }

    } catch (err: any) {
        if (isMounted.current) setMessage(err.message || 'Payment system error.');
    } finally {
        if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (loading && !user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" />
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Updating Ledger...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
       {/* Points Card */}
       <div className="glass-card p-10 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden shadow-2xl bg-gradient-to-br from-[#1e293b] to-black">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
            <TrendingUp size={80} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
            
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Total Earnings</p>
            <div className="flex items-baseline justify-center gap-2">
                <h1 className="text-6xl font-black text-white tracking-tighter">{(user?.balance || 0).toFixed(0)}</h1>
                <span className="text-blue-500 font-black italic tracking-widest text-sm">PTS</span>
            </div>
            <div className="mt-4 px-6 py-2 bg-blue-600/10 rounded-full inline-block border border-blue-500/10">
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest italic">
                   Value: ${((user?.balance || 0) / (systemSettings?.pointsPerDollar || 1000)).toFixed(2)} USDT
                </p>
            </div>
       </div>

       {/* Withdrawal Form */}
       <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
           <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <div className="bg-green-500/10 p-2.5 rounded-xl text-green-500 border border-green-500/10">
                        <DollarSign size={20} />
                    </div>
                    Redeem Points
                </h2>
                <button onClick={fetchData} className="p-2 text-gray-500 hover:text-white transition-colors">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
           </div>
           
           {message && (
               <div className={`p-5 rounded-2xl text-xs font-bold mb-8 animate-in slide-in-from-top-4 ${message.toLowerCase().includes('success') ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                   {message}
               </div>
           )}

           {availableMethods.length === 0 && !loading ? (
               <div className="p-10 text-center bg-orange-500/5 rounded-[2rem] border border-orange-500/10">
                   <AlertCircle className="mx-auto text-orange-500 mb-4" size={32} />
                   <p className="text-orange-200 text-xs font-black uppercase tracking-widest">Payouts Currently Paused</p>
                   <p className="text-gray-600 text-[10px] mt-2 font-medium">Administrator has not enabled any payment channels.</p>
               </div>
           ) : (
               <form onSubmit={handleWithdraw} className="space-y-6">
                   <div className="space-y-2">
                       <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Payment Channel</label>
                       <div className="relative">
                           <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500">
                               <CreditCard size={20} />
                           </div>
                           <select 
                                value={methodId} 
                                onChange={e => setMethodId(e.target.value)}
                                className="w-full bg-[#030712] text-white rounded-2xl p-5 pl-14 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm appearance-none shadow-inner"
                            >
                                {availableMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                       </div>
                   </div>
                   
                   <div className="space-y-2">
                       <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Points to Cashout</label>
                       <input 
                            type="number" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder={`Min ${systemSettings?.minWithdrawal || 50}`}
                            className="w-full bg-[#030712] text-white rounded-2xl p-5 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm shadow-inner"
                            required
                       />
                   </div>

                   <div className="space-y-2">
                       <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">{selectedMethod?.detailsLabel || 'Wallet / Account'}</label>
                       <input 
                            type="text" 
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Enter payment details"
                            className="w-full bg-[#030712] text-white rounded-2xl p-5 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm shadow-inner"
                            required
                       />
                   </div>

                   <button 
                        type="submit" 
                        disabled={isSubmitting || availableMethods.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.3em] py-6 rounded-[1.8rem] transition-all active:scale-95 shadow-2xl shadow-blue-900/40 mt-4"
                   >
                       {isSubmitting ? 'Processing Payout...' : 'REQUEST WITHDRAWAL'}
                   </button>
               </form>
           )}
       </div>

       {/* Recent History */}
       <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
           <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
               <History size={16} className="text-gray-500" /> Transaction History
           </h3>
           <div className="space-y-5">
               {history.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <History size={40} className="mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Empty Transaction Log</p>
                    </div>
               ) : (
                history.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-black/40 p-5 rounded-3xl border border-white/5 transition-all hover:border-white/10">
                        <div className="text-left">
                            <p className="text-white text-sm font-black tracking-tight uppercase">{item.method}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-lg font-black text-white mb-1">{item.amount.toFixed(0)} <span className="text-[10px] text-gray-500">Pts</span></p>
                             <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] border ${
                                 item.status === 'APPROVED' ? 'bg-green-500/5 text-green-500 border-green-500/20' :
                                 item.status === 'REJECTED' ? 'bg-red-500/5 text-red-500 border-red-500/20' :
                                 'bg-amber-500/5 text-amber-500 border-amber-500/20'
                             }`}>
                                 {item.status}
                             </span>
                        </div>
                    </div>
                ))
               )}
           </div>
       </div>
    </div>
  );
};
