
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

  const calculateUsd = (points: number) => {
      const rate = systemSettings?.pointsPerDollar || 1000;
      return (points / rate).toFixed(2);
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
            setMessage(`Minimum withdrawal amount is ${minAmount} points.`);
            setIsSubmitting(false);
            return;
        }
        if (freshUser.balance < val) {
            setMessage('Insufficient balance!');
            setIsSubmitting(false);
            return;
        }

        // --- BOT MEMBERSHIP LOCK CHECK ---
        if (systemSettings?.requiredChannelId) {
            // Note: We don't need bot token here anymore, handled by server
            if (!freshUser.telegramId) {
                setMessage("Security Lock: You must link your Telegram ID to withdraw.");
                setIsSubmitting(false);
                return;
            }

            // Verify membership securely
            const verify = await verifyTelegramMembership(
                systemSettings.requiredChannelId, 
                freshUser.telegramId
            );
            
            if (!isMounted.current) return;

            if (!verify.success) {
                setMessage(`Membership Locked: You must join ${systemSettings.requiredChannelId} to withdraw.`);
                setIsSubmitting(false);
                return;
            }
        }
        // --------------------------------

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
                setMessage('Withdrawal request submitted successfully!');
                setAmount('');
                setDetails('');
            }
        } catch (dbError) {
            console.error("Withdrawal creation failed, refunding user...", dbError);
            freshUser.balance += val;
            await saveUser(freshUser);
            if (isMounted.current) {
                setUser(freshUser);
                setMessage('Network error. Points refunded to balance.');
            }
        }

    } catch (err) {
        console.error(err);
        if (isMounted.current) setMessage('An unexpected error occurred.');
    } finally {
        if (isMounted.current) setIsSubmitting(false);
    }
  };

  if (!user) return <div className="text-white text-center mt-10">Loading Wallet...</div>;

  return (
    <div className="space-y-6">
       <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
            <p className="text-gray-400 mb-1">Current Balance</p>
            <h1 className="text-4xl font-bold text-white">{user.balance.toFixed(2)}</h1>
            <p className="text-green-400 font-medium text-sm mt-1">
                ≈ ${calculateUsd(user.balance)} USD
            </p>
       </div>

       {systemSettings?.requiredChannelId && (
           <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-lg flex items-center gap-2 text-sm text-orange-400">
               <Lock className="shrink-0" size={18} />
               <span>Withdrawals are locked until you join <b>{systemSettings.requiredChannelId}</b>.</span>
           </div>
       )}

       <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
           <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               <DollarSign size={20} className="text-green-500" /> Request Withdrawal
           </h2>
           
           <div className="bg-blue-600/10 border border-blue-600/30 p-3 rounded-lg text-sm text-blue-300 mb-4 flex items-center gap-2">
               <DollarSign size={16} />
               <span>Exchange Rate: <b>{systemSettings?.pointsPerDollar || 1000} Points = $1.00 USD</b></span>
           </div>
           
           {message && (
               <div className={`p-3 rounded text-sm mb-4 flex items-center gap-2 ${message.includes('success') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                   {message.includes('Locked') ? <Lock size={16} /> : <AlertTriangle size={16} />}
                   {message}
               </div>
           )}

           <form onSubmit={handleWithdraw} className="space-y-4">
               <div>
                   <label className="block text-gray-400 text-sm mb-1">Payment Method</label>
                   {availableMethods.length > 0 ? (
                       <select 
                            value={methodId} 
                            onChange={e => setMethodId(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded p-3 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                           {availableMethods.map(m => (
                               <option key={m.id} value={m.id}>{m.name}</option>
                           ))}
                       </select>
                   ) : (
                       <p className="text-red-400 text-sm">No payment methods available.</p>
                   )}
               </div>
               
               {selectedMethod && (
                   <>
                       <div>
                           <label className="block text-gray-400 text-sm mb-1">Amount (Points)</label>
                           <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder={`Min ${systemSettings?.minWithdrawal || 50}`}
                                className="w-full bg-gray-700 text-white rounded p-3 outline-none focus:ring-2 focus:ring-blue-500"
                                required
                           />
                           {amount && (
                               <p className="text-xs text-green-400 mt-2 text-right font-medium">
                                   Receiving: ${calculateUsd(parseFloat(amount))}
                               </p>
                           )}
                       </div>
                       <div>
                           <label className="block text-gray-400 text-sm mb-1">{selectedMethod.detailsLabel}</label>
                           <input 
                                type="text" 
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                placeholder={`Enter your ${selectedMethod.name} details`}
                                className="w-full bg-gray-700 text-white rounded p-3 outline-none focus:ring-2 focus:ring-blue-500"
                                required
                           />
                       </div>
                       <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 rounded-lg mt-2 transition-all flex justify-center items-center gap-2"
                       >
                           {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Checking...</> : 'Submit Request'}
                       </button>
                   </>
               )}
           </form>
       </div>

       <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
           <h3 className="text-white font-bold mb-4 flex items-center gap-2">
               <History size={18} /> Withdrawal History
           </h3>
           <div className="space-y-3">
               {history.length === 0 ? <p className="text-gray-500 text-center text-sm">No withdrawals yet.</p> : 
                history.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg border border-gray-700">
                        <div>
                            <p className="text-white font-medium">{item.method} - {item.amount}</p>
                            <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-gray-300 mb-1">${calculateUsd(item.amount)}</p>
                             <span className={`px-2 py-1 rounded text-xs font-bold ${
                                 item.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                                 item.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                                 'bg-yellow-500/20 text-yellow-400'
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
