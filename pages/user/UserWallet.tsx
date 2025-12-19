
import React, { useState, useEffect, useRef } from 'react';
import { WithdrawalRequest, WithdrawalStatus, WithdrawalMethod, User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, createWithdrawal, getWithdrawals, getPaymentMethods, subscribeToChanges, getSystemSettings } from '../../services/mockDb';
import { DollarSign, History, Loader2, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';

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
        
        // Fetch Settings & Methods
        const [fetchedMethods, settings] = await Promise.all([
            getPaymentMethods(),
            getSystemSettings()
        ]);
        
        if (!isMounted.current) return;
        setSystemSettings(settings);

        const activeMethods = Array.isArray(fetchedMethods) ? fetchedMethods.filter(m => m.isEnabled) : [];
        setAvailableMethods(activeMethods);
        
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
            setMessage(`Minimum payout is ${minAmount} Points.`);
            setIsSubmitting(false);
            return;
        }
        if (freshUser.balance < val) {
            setMessage('Insufficient points balance.');
            setIsSubmitting(false);
            return;
        }

        const req: WithdrawalRequest = {
            id: Date.now().toString(),
            userId: freshUser.id,
            userName: freshUser.name || 'User',
            amount: val,
            method: selectedMethod?.name || 'Manual',
            details,
            status: WithdrawalStatus.PENDING,
            date: new Date().toISOString()
        };
        
        await createWithdrawal(req);
        if (isMounted.current) {
            setMessage('Success! Payout request submitted.');
            setAmount('');
            setDetails('');
            fetchData();
        }

    } catch (err: any) {
        if (isMounted.current) setMessage(err.message || 'Processing failed.');
    } finally {
        if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (loading && !user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" />
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Accessing Ledger...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
       {/* Balance Card */}
       <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden shadow-2xl bg-gradient-to-b from-blue-600/5 to-transparent">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Available Points</p>
            <div className="flex items-baseline justify-center gap-2">
                <h1 className="text-5xl font-black text-white tracking-tighter">{(user?.balance || 0).toFixed(0)}</h1>
                <span className="text-blue-500 font-black italic tracking-widest text-sm">PTS</span>
            </div>
            <p className="text-[10px] text-gray-600 mt-3 font-bold uppercase italic tracking-wider">
               Est. Value: ${((user?.balance || 0) / (systemSettings?.pointsPerDollar || 1000)).toFixed(2)} USD
            </p>
       </div>

       {/* Form Section */}
       <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
           <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-white flex items-center gap-3">
                    <div className="bg-green-500/10 p-2 rounded-lg text-green-500"><DollarSign size={20} /></div>
                    Cash Out
                </h2>
                <button onClick={fetchData} className="p-2 text-gray-500 hover:text-white transition-colors">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
           </div>
           
           {message && (
               <div className={`p-4 rounded-2xl text-xs font-bold mb-6 animate-in shake duration-300 ${message.toLowerCase().includes('success') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                   {message}
               </div>
           )}

           {availableMethods.length === 0 && !loading ? (
               <div className="p-8 text-center bg-orange-500/5 rounded-3xl border border-orange-500/10">
                   <AlertCircle className="mx-auto text-orange-500 mb-3" />
                   <p className="text-orange-200 text-xs font-bold uppercase tracking-widest">No payout channels active</p>
                   <p className="text-gray-600 text-[10px] mt-1 font-medium">Please wait for admin to enable methods.</p>
               </div>
           ) : (
               <form onSubmit={handleWithdraw} className="space-y-5">
                   <div className="space-y-1.5">
                       <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Select Channel</label>
                       <div className="relative">
                           <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                           <select 
                                value={methodId} 
                                onChange={e => setMethodId(e.target.value)}
                                className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 pl-12 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm appearance-none"
                            >
                                {availableMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                           </select>
                       </div>
                   </div>
                   
                   <div className="space-y-1.5">
                       <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Amount to Redeem</label>
                       <input 
                            type="number" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder={`Min ${systemSettings?.minWithdrawal || 50} pts`}
                            className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm"
                            required
                       />
                   </div>

                   <div className="space-y-1.5">
                       <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">{selectedMethod?.detailsLabel || 'Payment Address'}</label>
                       <input 
                            type="text" 
                            value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Enter account or wallet details"
                            className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm"
                            required
                       />
                   </div>

                   <button 
                        type="submit" 
                        disabled={isSubmitting || availableMethods.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-900/40"
                   >
                       {isSubmitting ? 'Verifying...' : 'Request Payout'}
                   </button>
               </form>
           )}
       </div>

       {/* History */}
       <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
           <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <History size={16} className="text-gray-500" /> Recent Payouts
           </h3>
           <div className="space-y-4">
               {history.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-700 text-[11px] font-bold uppercase tracking-widest italic">No redemption logs found</p>
                    </div>
               ) : (
                history.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 transition-all hover:border-white/10">
                        <div className="text-left">
                            <p className="text-white text-sm font-black tracking-tight">{item.method}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-sm font-black text-white mb-1">{item.amount.toFixed(0)} Pts</p>
                             <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                 item.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                 item.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                 'bg-amber-500/10 text-amber-500'
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
