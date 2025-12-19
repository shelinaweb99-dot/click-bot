
import React, { useState, useEffect, useRef } from 'react';
import { WithdrawalRequest, WithdrawalStatus, WithdrawalMethod, User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, createWithdrawal, getWithdrawals, saveUser, getPaymentMethods, subscribeToChanges, getSystemSettings, verifyTelegramMembership } from '../../services/mockDb';
import { DollarSign, History, AlertTriangle, Lock, Loader2 } from 'lucide-react';

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
        setAvailableMethods(methods.filter(m => m.isEnabled));
        
        const settings = await getSystemSettings();
        if (!isMounted.current) return;
        setSystemSettings(settings);
        
        if (availableMethods.length > 0 && !methodId) {
            setMethodId(availableMethods[0].id);
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

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || isSubmitting) return;
    
    setMessage('');
    setIsSubmitting(true);

    try {
        const freshUser = await getUserById(userId);
        if (!isMounted.current) return;
        
        const val = parseFloat(amount);
        const minAmount = systemSettings?.minWithdrawal || 5000; // Example 5000 points

        if (val < minAmount) {
            setMessage(`Minimum withdrawal is ${minAmount} Points.`);
            setIsSubmitting(false);
            return;
        }
        if (freshUser.balance < val) {
            setMessage('Insufficient Points balance!');
            setIsSubmitting(false);
            return;
        }

        const req: WithdrawalRequest = {
            id: Date.now().toString(),
            userId: freshUser.id,
            userName: freshUser.name,
            amount: val,
            method: selectedMethod?.name || 'Manual',
            details,
            status: WithdrawalStatus.PENDING,
            date: new Date().toISOString()
        };
        
        await createWithdrawal(req);
        if (isMounted.current) {
            setMessage('Withdrawal request successful! Points deducted.');
            setAmount('');
            setDetails('');
            fetchData();
        }

    } catch (err: any) {
        if (isMounted.current) setMessage(err.message || 'System error occurred.');
    } finally {
        if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" />
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Syncing Ledger</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
       <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Points</p>
            <div className="flex items-baseline justify-center gap-2">
                <h1 className="text-5xl font-black text-white tracking-tighter">{user.balance.toFixed(0)}</h1>
                <span className="text-blue-500 font-black italic tracking-widest text-sm">USDT-Pts</span>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 font-bold uppercase italic">Approx. Value: ${(user.balance / (systemSettings?.pointsPerDollar || 1000)).toFixed(2)} USDT</p>
       </div>

       <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
           <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3">
               <div className="bg-green-500/10 p-2 rounded-lg text-green-500"><DollarSign size={20} /></div>
               Redeem Points
           </h2>
           
           {message && (
               <div className={`p-4 rounded-2xl text-xs font-bold mb-6 animate-in shake duration-300 ${message.includes('success') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                   {message}
               </div>
           )}

           <form onSubmit={handleWithdraw} className="space-y-5">
               <div className="space-y-1.5">
                   <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Payout Method</label>
                   <select 
                        value={methodId} 
                        onChange={e => setMethodId(e.target.value)}
                        className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm"
                    >
                        {availableMethods.length > 0 ? (
                            availableMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                        ) : (
                            <option>No methods configured</option>
                        )}
                   </select>
               </div>
               
               <div className="space-y-1.5">
                   <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Points to Redeem</label>
                   <input 
                        type="number" 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder={`Min ${systemSettings?.minWithdrawal || 5000}`}
                        className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm"
                        required
                   />
               </div>
               <div className="space-y-1.5">
                   <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">{selectedMethod?.detailsLabel || 'Wallet Address'}</label>
                   <input 
                        type="text" 
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        placeholder="Enter your withdrawal details"
                        className="w-full bg-[#030712]/50 text-white rounded-2xl p-4 border border-white/5 focus:border-blue-500 outline-none font-bold text-sm"
                        required
                   />
               </div>
               <button 
                type="submit" 
                disabled={isSubmitting || availableMethods.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl transition-all"
               >
                   {isSubmitting ? 'Processing...' : 'Request Payout'}
               </button>
           </form>
       </div>

       <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
           <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <History size={16} className="text-gray-500" /> Redemption History
           </h3>
           <div className="space-y-4">
               {history.length === 0 ? <p className="text-gray-600 text-center text-[11px] font-bold py-6 italic">No payout records found</p> : 
                history.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-[#030712]/30 p-4 rounded-2xl border border-white/5">
                        <div className="text-left">
                            <p className="text-white text-sm font-bold">{item.method}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-sm font-black text-white mb-1">{item.amount.toFixed(0)} Pts</p>
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
