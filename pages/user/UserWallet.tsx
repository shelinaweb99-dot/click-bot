
import React, { useState, useEffect, useRef } from 'react';
import { WithdrawalRequest, WithdrawalStatus, WithdrawalMethod, User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, createWithdrawal, getWithdrawals, saveUser, getPaymentMethods, subscribeToChanges, getSystemSettings, verifyTelegramMembership } from '../../services/mockDb';
import { DollarSign, History, AlertTriangle, Lock, Loader2, ArrowUpRight } from 'lucide-react';

export const UserWallet: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [availableMethods, setAvailableMethods] = useState<WithdrawalMethod[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  
  const userId = getCurrentUserId();
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
        if (userId) {
            const userData = await getUserById(userId);
            if (!isMounted.current) return;
            setUser(userData);
            
            const allWithdrawals = await getWithdrawals();
            if (!isMounted.current) return;
            const myWithdrawals = allWithdrawals.filter(w => w.userId === userId);
            setHistory(myWithdrawals.reverse());
        }
        
        const methods = await getPaymentMethods();
        if (!isMounted.current) return;
        const activeMethods = methods.filter(m => m.isEnabled);
        setAvailableMethods(activeMethods);
        
        const settings = await getSystemSettings();
        if (!isMounted.current) return;
        setSystemSettings(settings);
        
        if (activeMethods.length > 0 && !methodId) {
            setMethodId(activeMethods[0].id);
        }
    } catch (e) {
        console.error("Wallet fetch error", e);
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

  const calculateUsd = (usdt: number) => {
      const rate = systemSettings?.pointsPerDollar || 1; // Assuming 1:1 if configured as points
      // If the user wants to see "USDT", usually 1 point = 1 USDT for simplicity in labels
      return usdt.toFixed(2);
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || isSubmitting) return;
    
    setMessage('');
    setIsSubmitting(true);

    try {
        const freshUser = await getUserById(userId);
        if (!isMounted.current) return;
        
        if (!freshUser || !selectedMethod) {
            setIsSubmitting(false);
            return;
        }
        
        const val = parseFloat(amount);
        const minAmount = systemSettings?.minWithdrawal || 50;

        if (val < minAmount) {
            setMessage(`Minimum withdrawal is ${minAmount} USDT.`);
            setIsSubmitting(false);
            return;
        }
        if (freshUser.balance < val) {
            setMessage('Insufficient USDT balance!');
            setIsSubmitting(false);
            return;
        }

        if (systemSettings?.requiredChannelId) {
            if (!freshUser.telegramId) {
                setMessage("Link your Telegram ID to enable withdrawals.");
                setIsSubmitting(false);
                return;
            }

            const verify = await verifyTelegramMembership(
                systemSettings.requiredChannelId, 
                freshUser.telegramId
            );
            
            if (!isMounted.current) return;

            if (!verify.success) {
                setMessage(`Membership Lock: Join ${systemSettings.requiredChannelId} to continue.`);
                setIsSubmitting(false);
                return;
            }
        }

        freshUser.balance -= val;
        await saveUser(freshUser);
        if (isMounted.current) setUser(freshUser);

        const req: WithdrawalRequest = {
            id: Date.now().toString(),
            userId: freshUser.id,
            userName: freshUser.name,
            amount: val,
            method: selectedMethod.name,
            details,
            status: WithdrawalStatus.PENDING,
            date: new Date().toISOString()
        };
        
        try {
            await createWithdrawal(req);
            if (isMounted.current) {
                setHistory([req, ...history]);
                setMessage('Withdrawal request successful! USDT deducted.');
                setAmount('');
                setDetails('');
            }
        } catch (dbError) {
            freshUser.balance += val;
            await saveUser(freshUser);
            if (isMounted.current) {
                setUser(freshUser);
                setMessage('Network error. USDT refunded.');
            }
        }

    } catch (err) {
        console.error(err);
        if (isMounted.current) setMessage('A system error occurred.');
    } finally {
        if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" />
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Syncing Wallet</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
       {/* High-end Balance Card */}
       <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Withdrawable Balance</p>
            <div className="flex items-baseline justify-center gap-2">
                <h1 className="text-5xl font-black text-white tracking-tighter">{user.balance.toFixed(2)}</h1>
                <span className="text-blue-500 font-black italic tracking-widest">USDT</span>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-green-500 uppercase">Verified Account</span>
            </div>
       </div>

       {systemSettings?.requiredChannelId && (
           <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-3xl flex items-center gap-3 text-xs text-orange-400 font-medium">
               <Lock className="shrink-0" size={18} />
               <span>Anti-Fraud Check: You must join <b className="text-orange-300 underline">{systemSettings.requiredChannelId}</b> before requesting payouts.</span>
           </div>
       )}

       <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
           <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3">
               <div className="bg-green-500/10 p-2 rounded-lg text-green-500"><DollarSign size={20} /></div>
               Payout Request
           </h2>
           
           {message && (
               <div className={`p-4 rounded-2xl text-xs font-bold mb-6 flex items-center gap-3 animate-in shake duration-300 ${message.toLowerCase().includes('success') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                   {message.includes('Lock') ? <Lock size={16} /> : <AlertTriangle size={16} />}
                   {message}
               </div>
           )}

           <form onSubmit={handleWithdraw} className="space-y-5">
               <div className="space-y-1.5">
                   <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Payment Method</label>
                   {availableMethods.length > 0 ? (
                       <select 
                            value={methodId} 
                            onChange={e => setMethodId(e.target.value)}
                            className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 outline-none border border-white/5 focus:border-blue-500 transition-all font-bold text-sm"
                        >
                           {availableMethods.map(m => (
                               <option key={m.id} value={m.id}>{m.name}</option>
                           ))}
                       </select>
                   ) : (
                       <div className="p-4 bg-red-500/5 text-red-500 text-xs font-bold rounded-2xl border border-red-500/10">System: No payout methods configured by admin.</div>
                   )}
               </div>
               
               {selectedMethod && (
                   <>
                       <div className="space-y-1.5">
                           <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Withdrawal Amount (USDT)</label>
                           <div className="relative">
                               <input 
                                    type="number" 
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder={`Minimum ${systemSettings?.minWithdrawal || 50}`}
                                    className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 outline-none border border-white/5 focus:border-blue-500 transition-all font-bold text-sm"
                                    required
                               />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 font-black text-[10px] uppercase">USDT</span>
                           </div>
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">{selectedMethod.detailsLabel}</label>
                           <input 
                                type="text" 
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                placeholder={`Enter ${selectedMethod.name} address or ID`}
                                className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 outline-none border border-white/5 focus:border-blue-500 transition-all font-bold text-sm placeholder:text-gray-800"
                                required
                           />
                       </div>
                       <button 
                        type="submit" 
                        disabled={isSubmitting || !amount}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-600/10 active:scale-95 transition-all mt-4"
                       >
                           {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Process Payout'}
                       </button>
                   </>
               )}
           </form>
       </div>

       {/* History List */}
       <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
           <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <History size={16} className="text-gray-500" /> Payout History
           </h3>
           <div className="space-y-4">
               {history.length === 0 ? <p className="text-gray-600 text-center text-[11px] font-bold py-6 italic">No payout records found</p> : 
                history.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-[#030712]/30 p-4 rounded-2xl border border-white/5 group hover:border-blue-500/20 transition-all">
                        <div className="text-left">
                            <p className="text-white text-sm font-bold">{item.method}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-sm font-black text-white mb-1.5">{item.amount.toFixed(2)} USDT</p>
                             <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                 item.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                 item.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                 'bg-amber-500/10 text-amber-500'
                             }`}>
                                 {item.status}
                             </span>
                        </div>
                    </div>
                ))
               }
           </div>
       </div>
    </div>
  );
};
