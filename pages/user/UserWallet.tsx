
import React, { useState, useEffect, useRef } from 'react';
import { WithdrawalRequest, WithdrawalStatus, WithdrawalMethod, User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, createWithdrawal, getWithdrawals, getPaymentMethods, subscribeToChanges, getSystemSettings } from '../../services/mockDb';
import { History, Loader2, RefreshCw, CreditCard, AlertCircle, ChevronRight, Landmark } from 'lucide-react';

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
    if (!userId) return;
    try {
        if (isMounted.current) setLoading(true);
        
        // Parallel fetch for speed
        const [userData, allWithdrawals, fetchedMethods, settings] = await Promise.all([
            getUserById(userId),
            getWithdrawals(),
            getPaymentMethods(),
            getSystemSettings()
        ]);

        if (!isMounted.current) return;

        if (userData) {
            setUser(userData);
        }
        
        if (settings) {
            setSystemSettings(settings);
        }

        if (Array.isArray(allWithdrawals)) {
            const myWithdrawals = allWithdrawals.filter(w => w.userId === userId);
            setHistory([...myWithdrawals].reverse());
        }

        // Logic fix: Ensure methods is an array
        const methodsArray = Array.isArray(fetchedMethods) ? fetchedMethods : [];
        const activeMethods = methodsArray.filter(m => m.isEnabled);
        
        setAvailableMethods(activeMethods);
        
        if (activeMethods.length > 0 && !methodId) {
            setMethodId(activeMethods[0].id);
        } else if (activeMethods.length > 0 && !activeMethods.find(m => m.id === methodId)) {
            setMethodId(activeMethods[0].id);
        }
    } catch (e) {
        console.error("Wallet sync error", e);
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
        if ((freshUser.balance || 0) < val) {
            setMessage('Insufficient balance.');
            setIsSubmitting(false);
            return;
        }

        const req: WithdrawalRequest = {
            id: 'w_' + Date.now(),
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
            setMessage('Success! Request submitted.');
            setAmount('');
            setDetails('');
            fetchData();
        }

    } catch (err: any) {
        if (isMounted.current) setMessage(err.message || 'Processing error.');
    } finally {
        if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (loading && !user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Refreshing Wallet Data...</p>
    </div>
  );

  const exchangeRate = systemSettings?.pointsPerDollar || 1000;
  const currentBalance = user?.balance || 0;
  const currentUSD = currentBalance / exchangeRate;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
       {/* 1. Value Card */}
       <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden shadow-2xl">
            <div className="bg-blue-600/10 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-blue-500/10 mb-5">
                <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest italic">
                   Current Value: ${currentUSD.toFixed(2)} USDT
                </p>
            </div>
            
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">Total Points Balance</p>
            <div className="flex items-baseline justify-center gap-2">
                <h1 className="text-5xl font-black text-white tracking-tighter">{currentBalance.toFixed(0)}</h1>
                <span className="text-blue-500 font-black italic tracking-widest text-[10px]">USDT-PTS</span>
            </div>

            <div className="absolute -top-4 -right-4 bg-white/5 p-8 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 bg-blue-500/5 p-8 rounded-full blur-2xl"></div>
       </div>

       {/* 2. Redeem Points Card */}
       <div className="bg-[#111827] p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-xl relative">
           <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-4">
                    <div className="bg-green-500/10 p-3 rounded-2xl text-green-500 border border-green-500/10 shadow-lg shadow-green-500/5">
                        <Landmark size={22} />
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Redeem Points</h2>
                </div>
                <button onClick={fetchData} className="p-3 bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all active:scale-90 shadow-lg">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
           </div>
           
           {message && (
               <div className={`p-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest mb-8 animate-in slide-in-from-top-4 text-center border ${message.toLowerCase().includes('success') ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                   {message}
               </div>
           )}

           {availableMethods.length === 0 && !loading ? (
               <div className="p-10 text-center bg-[#0b1120] rounded-[2rem] border border-white/5 shadow-inner">
                   <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="text-orange-500" size={32} />
                   </div>
                   <p className="text-orange-200 text-[11px] font-black uppercase tracking-widest">Payouts Currently Paused</p>
                   <p className="text-gray-600 text-[9px] mt-2 font-bold uppercase tracking-widest max-w-[180px] mx-auto leading-relaxed">The administrator has not configured any payment methods yet.</p>
               </div>
           ) : (
               <form onSubmit={handleWithdraw} className="space-y-6">
                   <div className="space-y-2 px-1">
                       <label className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] ml-1">Payment Channel</label>
                       <div className="relative">
                           <div className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
                               <CreditCard size={20} />
                           </div>
                           <select 
                                value={methodId} 
                                onChange={e => setMethodId(e.target.value)}
                                className="w-full bg-[#030712] text-white rounded-[1.5rem] p-5 pl-14 border border-white/5 focus:border-blue-500/50 outline-none font-black text-xs uppercase appearance-none shadow-inner transition-all"
                            >
                                {availableMethods.map(m => <option key={m.id} value={m.id} className="bg-gray-900">{m.name}</option>)}
                           </select>
                           <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none">
                               <ChevronRight size={16} className="rotate-90" />
                           </div>
                       </div>
                   </div>
                   
                   <div className="space-y-2 px-1">
                       <label className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] ml-1">Cashout Amount</label>
                       <input 
                            type="number" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder={`Min ${systemSettings?.minWithdrawal || 50} Pts`}
                            className="w-full bg-[#030712] text-white rounded-[1.5rem] p-5 border border-white/5 focus:border-blue-500/50 outline-none font-black text-xs shadow-inner transition-all placeholder:text-gray-800"
                            required
                       />
                   </div>

                   <div className="space-y-2 px-1">
                       <label className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] ml-1">{selectedMethod?.detailsLabel || 'Account Details'}</label>
                       <input 
                            type="text" 
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Wallet address or Phone"
                            className="w-full bg-[#030712] text-white rounded-[1.5rem] p-5 border border-white/5 focus:border-blue-500/50 outline-none font-black text-xs shadow-inner transition-all placeholder:text-gray-800"
                            required
                       />
                   </div>

                   <button 
                        type="submit" 
                        disabled={isSubmitting || availableMethods.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-[10px] uppercase tracking-[0.3em] py-6 rounded-[1.8rem] transition-all active:scale-[0.98] shadow-2xl shadow-blue-900/30 mt-4 border border-blue-400/10"
                   >
                       {isSubmitting ? 'Verifying...' : 'Initiate Withdrawal'}
                   </button>
               </form>
           )}
       </div>

       {/* 3. Transaction History */}
       <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
           <h3 className="text-white font-black text-[9px] uppercase tracking-[0.2em] mb-8 flex items-center gap-3 font-bold">
               Transaction Log
           </h3>
           <div className="space-y-4">
               {history.length === 0 ? (
                    <div className="text-center py-12 opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-widest italic">No Records Found</p>
                    </div>
               ) : (
                history.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-[#030712] p-5 rounded-[1.8rem] border border-white/5 transition-all">
                        <div className="text-left">
                            <p className="text-white text-[11px] font-black tracking-tight uppercase">{item.method}</p>
                            <p className="text-[9px] text-gray-700 font-black uppercase mt-1 tracking-widest">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-sm font-black text-white mb-1">{item.amount.toFixed(0)} <span className="text-[9px] text-gray-700 uppercase">Pts</span></p>
                             <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
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
