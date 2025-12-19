
import React, { useState, useEffect, useRef } from 'react';
import { getPaymentMethods, savePaymentMethod, deletePaymentMethod, getAdSettings, saveAdSettings, getSystemSettings, saveSystemSettings } from '../../services/mockDb';
import { WithdrawalMethod, AdSettings, AdProvider, SystemSettings, AdLink, RotationMode, AdRotationConfig } from '../../types';
import { Plus, Trash2, Save, MonitorPlay, Bot, AlertTriangle, Lock, Code, Info, Link as LinkIcon, RefreshCcw, ToggleLeft, ToggleRight, List, DollarSign, Loader2 } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const defaultAdSettings: AdSettings = {
    activeProvider: AdProvider.TELEGRAM_ADS,
    monetagDirectLink: '',
    monetagInterstitialUrl: '',
    monetagRewardedUrl: '',
    monetagAdTag: '',
    monetagZoneId: '',
    monetagPopupUrl: '',
    adsterraLink: '',
    telegramChannelLink: '',
    rotation: {
        isEnabled: false,
        mode: 'SERIAL',
        intervalMinutes: 10,
        lastRotationTime: 0,
        currentLinkIndex: 0,
        links: []
    }
  };

  const [adSettings, setAdSettings] = useState<AdSettings>(defaultAdSettings);

  const [rotationConfig, setRotationConfig] = useState<AdRotationConfig>(defaultAdSettings.rotation!);

  const defaultSystemSettings: SystemSettings = {
      telegramBotToken: '',
      supportLink: '',
      requiredChannelId: '',
      youtubeApiKey: '',
      minWithdrawal: 50,
      dailyRewardBase: 10,
      dailyRewardStreakBonus: 2,
      pointsPerDollar: 1000
  };

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);

  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
        if (isMounted.current) setLoading(true);
        const [m, a, s] = await Promise.all([
            getPaymentMethods(), 
            getAdSettings(), 
            getSystemSettings()
        ]);
        
        if (!isMounted.current) return;

        setMethods(Array.isArray(m) ? m : []);
        
        // Robust Merging to prevent undefined property crashes (like .includes or .length)
        const mergedAds = { ...defaultAdSettings, ...a };
        setAdSettings(mergedAds);
        
        if (mergedAds.rotation) {
            setRotationConfig({ ...defaultAdSettings.rotation!, ...mergedAds.rotation });
        }
        
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
        await savePaymentMethod(method);
        await loadData();
        setNewMethodName('');
        setNewMethodLabel('');
    } catch (e) { alert("Failed to add method"); }
  };

  const handleDeleteMethod = async (id: string) => {
    if (window.confirm('Delete this payment method?')) {
      try { await deletePaymentMethod(id); await loadData(); } catch (e) { alert("Failed to delete method"); }
    }
  };

  const handleAddRotationLink = () => {
      const newUrl = prompt("Enter Direct Link URL:");
      if (!newUrl) return;
      const provider = confirm("Is this an Adsterra link? (Cancel for Monetag)") ? 'ADSTERRA' : 'MONETAG';
      
      const newLink: AdLink = {
          id: Date.now().toString(),
          url: newUrl,
          provider: provider as any,
          isEnabled: true
      };
      setRotationConfig(prev => ({
          ...prev,
          links: [...(prev.links || []), newLink]
      }));
  };

  const handleDeleteRotationLink = (id: string) => {
      setRotationConfig(prev => ({
          ...prev,
          links: (prev.links || []).filter(l => l.id !== id)
      }));
  };

  const toggleRotationLink = (id: string) => {
      setRotationConfig(prev => ({
          ...prev,
          links: (prev.links || []).map(l => l.id === id ? { ...l, isEnabled: !l.isEnabled } : l)
      }));
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
        const mergedAdSettings = { ...adSettings, rotation: rotationConfig };
        await Promise.all([
            saveAdSettings(mergedAdSettings),
            saveSystemSettings(systemSettings)
        ]);
        setSaveStatus('Settings Sync Successful');
        setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) { 
        setSaveStatus('Sync Failed'); 
        console.error(e); 
    } finally {
        if (isMounted.current) setIsSaving(false);
    }
  };

  if (loading) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Configuring Core Protocols</p>
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

      <form onSubmit={handleSettingsSave} className="space-y-8">
        
        {/* Financial Configuration */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <DollarSign className="text-green-500" size={24} /> Financial Rules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Min Withdrawal (USDT)</label>
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

        {/* Telegram API Settings */}
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

        {/* Ad Provider Settings */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                <MonitorPlay className="text-indigo-500" size={24} /> Ad Delivery
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {Object.values(AdProvider).map((provider) => (
                    <button 
                        key={provider} 
                        type="button"
                        onClick={() => setAdSettings({...adSettings, activeProvider: provider})}
                        className={`
                            p-5 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest
                            ${adSettings.activeProvider === provider 
                                ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-900/20 scale-105' 
                                : 'bg-[#0b1120] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        {provider.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {adSettings.activeProvider === AdProvider.MONETAG && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-blue-500 text-[10px] font-black uppercase tracking-widest ml-1">Monetag Zone ID (Vignette)</label>
                        <input 
                            type="text" 
                            className="w-full bg-[#0b1120] border-2 border-blue-500/30 text-white p-4 rounded-2xl focus:border-blue-500 outline-none font-mono shadow-inner" 
                            placeholder="e.g. 10305424" 
                            value={adSettings.monetagZoneId || ''} 
                            onChange={(e) => setAdSettings({...adSettings, monetagZoneId: e.target.value.trim()})} 
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Smart Rotation System */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
                 <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                        <RefreshCcw className="text-indigo-400" size={24} /> Ad Rotation
                    </h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Fallback Link Management</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={rotationConfig.isEnabled} onChange={e => setRotationConfig({...rotationConfig, isEnabled: e.target.checked})} className="sr-only peer" />
                      <div className="w-14 h-7 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
            </div>

            {rotationConfig.isEnabled && (
                <div className="space-y-6 animate-in slide-in-from-top-4">
                    <div className="grid grid-cols-2 gap-6 p-6 bg-black/20 rounded-3xl border border-white/5">
                        <div className="space-y-2">
                            <label className="text-indigo-400 text-[10px] font-black uppercase tracking-widest ml-1">Mode</label>
                            <select 
                                value={rotationConfig.mode} 
                                onChange={e => setRotationConfig({...rotationConfig, mode: e.target.value as RotationMode})}
                                className="w-full bg-[#0b1120] text-white p-4 rounded-2xl border border-white/5 outline-none font-bold text-xs uppercase tracking-widest"
                            >
                                <option value="SERIAL">Sequential</option>
                                <option value="RANDOM">Random Shuffle</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-indigo-400 text-[10px] font-black uppercase tracking-widest ml-1">Interval (Min)</label>
                            <input 
                                type="number" 
                                className="w-full bg-[#0b1120] text-white p-4 rounded-2xl border border-white/5 outline-none font-mono text-center"
                                value={rotationConfig.intervalMinutes || 10}
                                onChange={(e) => setRotationConfig({...rotationConfig, intervalMinutes: Math.max(1, parseInt(e.target.value) || 1)})}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <List size={14} /> Link Registry ({(rotationConfig.links || []).length})
                            </h3>
                            <button type="button" onClick={handleAddRotationLink} className="text-indigo-400 hover:text-white flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors">
                                <Plus size={14} /> New Link
                            </button>
                        </div>

                        <div className="bg-[#0b1120] rounded-[1.8rem] border border-white/5 overflow-hidden">
                            {(rotationConfig.links || []).length === 0 ? (
                                <div className="p-10 text-center text-gray-600 font-bold text-xs italic">No fallback links defined</div>
                            ) : (
                                (rotationConfig.links || []).map((link, idx) => (
                                    <div key={link.id} className="flex items-center gap-4 p-5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.01]">
                                        <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase w-16 text-center ${link.provider === 'ADSTERRA' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {link.provider}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-mono truncate ${link.isEnabled ? 'text-gray-300' : 'text-gray-600 line-through italic'}`}>{link.url}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button type="button" onClick={() => toggleRotationLink(link.id)} className={`transition-colors ${link.isEnabled ? 'text-green-500' : 'text-gray-600'}`}>
                                                {link.isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                            </button>
                                            <button type="button" onClick={() => handleDeleteRotationLink(link.id)} className="text-gray-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white py-6 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isSaving ? 'Processing Sync' : 'Apply Security Settings'}
        </button>
      </form>
    </div>
  );
};
