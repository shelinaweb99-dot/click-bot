
import React, { useState, useEffect, useRef } from 'react';
/* Removed non-existent savePaymentMethod and deletePaymentMethod from imports */
import { getPaymentMethods, updateAllPaymentMethods, getSystemSettings, saveSystemSettings, changePassword } from '../../services/mockDb';
import { WithdrawalMethod, SystemSettings } from '../../types';
import { Plus, Trash2, Save, Bot, Lock, Code, Info, RefreshCcw, ToggleLeft, ToggleRight, DollarSign, Loader2, CreditCard, Users, ShieldAlert, Key } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityStatus, setSecurityStatus] = useState({ message: '', isError: false });
  const [isChangingPass, setIsChangingPass] = useState(false);

  const defaultSystemSettings: SystemSettings = {
      telegramBotToken: '',
      supportLink: '',
      requiredChannelId: '',
      youtubeApiKey: '',
      minWithdrawal: 50,
      dailyRewardBase: 10,
      dailyRewardStreakBonus: 2,
      pointsPerDollar: 1000,
      referralBonusReferrer: 25,
      referralBonusReferee: 10
  };

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
        if (isMounted.current) setLoading(true);
        const [m, s] = await Promise.all([
            getPaymentMethods(), 
            getSystemSettings()
        ]);
        
        if (!isMounted.current) return;

        setMethods(Array.isArray(m) ? m : []);
        setSystemSettings({ ...defaultSystemSettings, ...s });
        
    } catch (e) {
        console.error("Failed to load settings", e);
    } finally {
        if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
        isMounted.current = false;
    };
  }, []);

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName || !newMethodLabel) return;
    try {
        const method: WithdrawalMethod = {
          id: Date.now().toString(),
          name: newMethodName,
          detailsLabel: newMethodLabel,
          isEnabled: true
        };
        /* Replaced missing savePaymentMethod with updateAllPaymentMethods */
        const updatedMethods = [...methods, method];
        await updateAllPaymentMethods(updatedMethods);
        setNewMethodName('');
        setNewMethodLabel('');
        window.dispatchEvent(new Event('db_change'));
        await loadData();
    } catch (e) { alert("Failed to add method"); }
  };

  const handleDeleteMethod = async (id: string) => {
    if (window.confirm('Delete this payment method?')) {
      try { 
          /* Replaced missing deletePaymentMethod with updateAllPaymentMethods */
          const updatedMethods = methods.filter(m => m.id !== id);
          await updateAllPaymentMethods(updatedMethods);
          window.dispatchEvent(new Event('db_change'));
          await loadData(); 
      } catch (e) { alert("Failed to delete method"); }
    }
  };

  const toggleMethod = async (id: string) => {
      const updated = methods.map(m => m.id === id ? { ...m, isEnabled: !m.isEnabled } : m);
      setMethods(updated);
      try {
          await updateAllPaymentMethods(updated);
          window.dispatchEvent(new Event('db_change'));
      } catch (e) {
          alert("Failed to toggle method");
          loadData();
      }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = systemSettings.telegramBotToken || '';
    if (token.includes(' ')) { 
        alert("Bot Token should not contain spaces."); 
        return; 
    }
    
    setIsSaving(true);
    try {
        await Promise.all([
            saveSystemSettings(systemSettings),
            updateAllPaymentMethods(methods)
        ]);
        setSaveStatus('Settings Sync Successful');
        window.dispatchEvent(new Event('db_change'));
        setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) { 
        setSaveStatus('Sync Failed'); 
        console.error(e); 
    } finally {
        if (isMounted.current) setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setSecurityStatus({ message: 'Keys do not match.', isError: true });
          return;
      }
      if (newPassword.length < 6) {
          setSecurityStatus({ message: 'Key must be >= 6 chars.', isError: true });
          return;
      }

      setIsChangingPass(true);
      setSecurityStatus({ message: '', isError: false });

      try {
          const res = await changePassword(oldPassword, newPassword);
          if (isMounted.current) {
              setSecurityStatus({ message: res.message || 'Success!', isError: false });
              setOldPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setTimeout(() => setSecurityStatus({ message: '', isError: false }), 5000);
          }
      } catch (err: any) {
          if (isMounted.current) setSecurityStatus({ message: err.message || 'Verification failed.', isError: true });
      } finally {
          if (isMounted.current) setIsChangingPass(false);
      }
  };

  if (loading) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Configuring Node</p>
      </div>
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">System</h1>
            <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Infrastructure Control Panel</p>
          </div>
          {saveStatus && (
              <div className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest animate-bounce ${saveStatus.includes('Failed') ? 'bg-red-500' : 'bg-green-600'} text-white shadow-xl`}>
                  {saveStatus}
              </div>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Financial Configuration */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <DollarSign className="text-green-500" size={24} /> Financial Rules
            </h2>
            <div className="space-y-6 flex-1">
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Min Withdrawal (Pts)</label>
                    <input 
                        type="number" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-green-500 outline-none transition-all font-mono"
                        value={systemSettings.minWithdrawal || 0} 
                        onChange={(e) => setSystemSettings({...systemSettings, minWithdrawal: Number(e.target.value)})} 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Daily Reward Base</label>
                    <input 
                        type="number" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-green-500 outline-none transition-all font-mono"
                        value={systemSettings.dailyRewardBase || 0} 
                        onChange={(e) => setSystemSettings({...systemSettings, dailyRewardBase: Number(e.target.value)})} 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Exchange Rate (Pts/$)</label>
                    <input 
                        type="number" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-mono"
                        value={systemSettings.pointsPerDollar || 0} 
                        onChange={(e) => setSystemSettings({...systemSettings, pointsPerDollar: Number(e.target.value)})} 
                    />
                </div>
            </div>
        </div>

        {/* Security / Password Node */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <ShieldAlert size={120} />
            </div>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <Key className="text-blue-500" size={24} /> Security Node
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4 flex-1">
                {securityStatus.message && (
                    <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border animate-in slide-in-from-top-2 ${securityStatus.isError ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                        {securityStatus.message}
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Current Key</label>
                    <input 
                        type="password" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-blue-500 outline-none transition-all"
                        placeholder="Current secret..."
                        required
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">New Key</label>
                        <input 
                            type="password" 
                            className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-blue-500 outline-none transition-all"
                            placeholder="Min 6 chars"
                            required
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Confirm Key</label>
                        <input 
                            type="password" 
                            className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-blue-500 outline-none transition-all"
                            placeholder="Repeat key"
                            required
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>
                <button 
                    type="submit" 
                    disabled={isChangingPass || !oldPassword || !newPassword}
                    className="w-full bg-[#0b1120] hover:bg-blue-600 hover:text-white text-blue-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                    {isChangingPass ? <Loader2 className="animate-spin" size={14} /> : <ShieldAlert size={14} />}
                    {isChangingPass ? 'SECURING...' : 'UPDATE CREDENTIALS'}
                </button>
            </form>
        </div>
      </div>

      <form onSubmit={handleSettingsSave} className="space-y-8">
        {/* Referral System Configuration */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <Users className="text-pink-500" size={24} /> Referral Rewards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Inviter Reward (Pts)</label>
                    <input 
                        type="number" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-pink-500 outline-none transition-all font-mono"
                        value={systemSettings.referralBonusReferrer || 0} 
                        onChange={(e) => setSystemSettings({...systemSettings, referralBonusReferrer: Number(e.target.value)})} 
                    />
                    <p className="text-[9px] text-gray-600 mt-1 italic ml-1">Points given to the person who shares the code.</p>
                </div>
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">New User Reward (Pts)</label>
                    <input 
                        type="number" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl focus:border-pink-500 outline-none transition-all font-mono"
                        value={systemSettings.referralBonusReferee || 0} 
                        onChange={(e) => setSystemSettings({...systemSettings, referralBonusReferee: Number(e.target.value)})} 
                    />
                    <p className="text-[9px] text-gray-600 mt-1 italic ml-1">Points given to the new user who uses the code.</p>
                </div>
            </div>
        </div>

        {/* Payout Channels System */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <CreditCard className="text-orange-500" size={24} /> Payout Channels
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {methods.length === 0 ? (
                    <div className="md:col-span-2 p-10 text-center text-gray-600 font-bold border border-dashed border-white/10 rounded-3xl italic">
                        No withdrawal channels configured.
                    </div>
                ) : (
                    methods.map(m => (
                        <div key={m.id} className="bg-[#0b1120] p-5 rounded-2xl border border-white/5 flex justify-between items-center group transition-all hover:border-orange-500/30">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${m.isEnabled ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-800 text-gray-500'}`}>
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h4 className={`font-black text-sm uppercase tracking-tight ${m.isEnabled ? 'text-white' : 'text-gray-600'}`}>{m.name}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{m.detailsLabel}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => toggleMethod(m.id)} className={`transition-colors ${m.isEnabled ? 'text-green-500' : 'text-gray-600'}`}>
                                    {m.isEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                </button>
                                <button type="button" onClick={() => handleDeleteMethod(m.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-4">Register New Channel</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <input 
                        type="text" 
                        placeholder="Name (e.g. Bkash, Binance)" 
                        className="bg-[#0b1120] border border-white/5 text-white p-4 rounded-xl focus:border-orange-500 outline-none text-xs font-bold"
                        value={newMethodName}
                        onChange={e => setNewMethodName(e.target.value)}
                    />
                    <input 
                        type="text" 
                        placeholder="Label (e.g. Number, Address)" 
                        className="bg-[#0b1120] border border-white/5 text-white p-4 rounded-xl focus:border-orange-500 outline-none text-xs font-bold"
                        value={newMethodLabel}
                        onChange={e => setNewMethodLabel(e.target.value)}
                    />
                </div>
                <button 
                    type="button" 
                    onClick={handleAddMethod}
                    disabled={!newMethodName || !newMethodLabel}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-800 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={16} /> Add Channel
                </button>
            </div>
        </div>

        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <Bot className="text-blue-500" size={24} /> Integration Keys
            </h2>
            <div className="space-y-2">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Telegram Bot Token</label>
                <input 
                    type="text" 
                    className={`w-full bg-[#0b1120] border text-white p-4 rounded-2xl focus:border-blue-500 outline-none font-mono text-sm transition-all ${(systemSettings.telegramBotToken || '').includes(' ') ? 'border-red-500' : 'border-white/5'}`}
                    placeholder="123456789:ABC..." 
                    value={systemSettings.telegramBotToken || ''} 
                    onChange={(e) => setSystemSettings({...systemSettings, telegramBotToken: e.target.value.trim()})} 
                />
            </div>
        </div>

        <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white py-6 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isSaving ? 'Synchronizing' : 'Commit Changes'}
        </button>
      </form>
    </div>
  );
};
