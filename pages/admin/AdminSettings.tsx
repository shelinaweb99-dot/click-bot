
import React, { useState, useEffect } from 'react';
import { getPaymentMethods, savePaymentMethod, deletePaymentMethod, getAdSettings, saveAdSettings, getSystemSettings, saveSystemSettings } from '../../services/mockDb';
import { WithdrawalMethod, AdSettings, AdProvider, SystemSettings, AdLink, RotationMode, AdRotationConfig } from '../../types';
import { Plus, Trash2, Save, MonitorPlay, HelpCircle, Bot, AlertTriangle, MessageCircle, Lock, PlayCircle, Maximize2, Gift, Code, Youtube, Info, Link as LinkIcon, RefreshCcw, ToggleLeft, ToggleRight, List, DollarSign } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodLabel, setNewMethodLabel] = useState('');

  const [adSettings, setAdSettings] = useState<AdSettings>({
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
  });

  const [rotationConfig, setRotationConfig] = useState<AdRotationConfig>({
      isEnabled: false,
      mode: 'SERIAL',
      intervalMinutes: 10,
      lastRotationTime: 0,
      currentLinkIndex: 0,
      links: []
  });

  // Rotation Link Input State
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkProvider, setNewLinkProvider] = useState<'ADSTERRA' | 'MONETAG'>('ADSTERRA');

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
      telegramBotToken: '',
      supportLink: '',
      requiredChannelId: '',
      youtubeApiKey: '',
      minWithdrawal: 50,
      dailyRewardBase: 10,
      dailyRewardStreakBonus: 2,
      pointsPerDollar: 1000
  });

  const [saveStatus, setSaveStatus] = useState('');

  const loadData = async () => {
    try {
        const [m, a, s] = await Promise.all([getPaymentMethods(), getAdSettings(), getSystemSettings()]);
        setMethods(m);
        setAdSettings(a);
        if (a.rotation) setRotationConfig(a.rotation);
        setSystemSettings(s);
    } catch (e) {
        console.error("Failed to load settings", e);
    }
  };

  useEffect(() => {
    loadData();
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

  const toggleMethod = async (method: WithdrawalMethod) => {
    try { await savePaymentMethod({ ...method, isEnabled: !method.isEnabled }); await loadData(); } catch (e) { console.error(e); }
  };

  const handleAddRotationLink = () => {
      if (!newLinkUrl) return;
      const newLink: AdLink = {
          id: Date.now().toString(),
          url: newLinkUrl,
          provider: newLinkProvider,
          isEnabled: true
      };
      setRotationConfig({
          ...rotationConfig,
          links: [...rotationConfig.links, newLink]
      });
      setNewLinkUrl('');
  };

  const handleDeleteRotationLink = (id: string) => {
      setRotationConfig({
          ...rotationConfig,
          links: rotationConfig.links.filter(l => l.id !== id)
      });
  };

  const toggleRotationLink = (id: string) => {
      setRotationConfig({
          ...rotationConfig,
          links: rotationConfig.links.map(l => l.id === id ? { ...l, isEnabled: !l.isEnabled } : l)
      });
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (systemSettings.telegramBotToken.includes(' ')) { alert("Bot Token should not contain spaces."); return; }
    try {
        const mergedAdSettings = { ...adSettings, rotation: rotationConfig };
        await Promise.all([
            saveAdSettings(mergedAdSettings),
            saveSystemSettings(systemSettings)
        ]);
        setSaveStatus('All settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) { setSaveStatus('Error saving settings!'); console.error(e); }
  };

  return (
    <div className="space-y-8 pb-10">
      <h1 className="text-2xl font-bold text-white">System Settings</h1>

      {saveStatus && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl font-bold animate-bounce ${saveStatus.includes('Error') ? 'bg-red-500' : 'bg-green-500'} text-white`}>
              {saveStatus}
          </div>
      )}

      <form onSubmit={handleSettingsSave} className="space-y-8">
        
        {/* --- Financial & Reward Configuration --- */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="text-green-400" /> Financial & Rewards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <label className="block text-gray-400 text-sm mb-1 font-bold">Minimum Withdrawal</label>
                    <input 
                        type="number" 
                        min="1"
                        className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:border-green-500 outline-none"
                        value={systemSettings.minWithdrawal} 
                        onChange={(e) => setSystemSettings({...systemSettings, minWithdrawal: Number(e.target.value)})} 
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1 font-bold">Daily Check-in Base</label>
                    <input 
                        type="number" 
                        min="1"
                        className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:border-green-500 outline-none"
                        value={systemSettings.dailyRewardBase} 
                        onChange={(e) => setSystemSettings({...systemSettings, dailyRewardBase: Number(e.target.value)})} 
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1 font-bold">Streak Bonus (per day)</label>
                    <input 
                        type="number" 
                        min="0"
                        className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg focus:border-green-500 outline-none"
                        value={systemSettings.dailyRewardStreakBonus} 
                        onChange={(e) => setSystemSettings({...systemSettings, dailyRewardStreakBonus: Number(e.target.value)})} 
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1 font-bold text-yellow-400">Exchange Rate (Points = $1)</label>
                    <input 
                        type="number" 
                        min="1"
                        className="w-full bg-gray-900 border border-yellow-500/50 text-white p-3 rounded-lg focus:border-yellow-500 outline-none"
                        value={systemSettings.pointsPerDollar} 
                        onChange={(e) => setSystemSettings({...systemSettings, pointsPerDollar: Number(e.target.value)})} 
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Example: 1000 points = $1.00 USD</p>
                </div>
            </div>
        </div>

        {/* --- System/Bot Configuration --- */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Bot className="text-blue-400" /> Telegram & API Settings
            </h2>
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 space-y-4">
                <div>
                    <label className="block text-gray-400 text-sm mb-1 font-bold">Telegram Bot Token (from @BotFather)</label>
                    <input type="text" className={`w-full bg-gray-800 border text-white p-3 rounded-lg focus:border-blue-500 outline-none font-mono ${systemSettings.telegramBotToken.includes(' ') ? 'border-red-500' : 'border-gray-600'}`} placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" value={systemSettings.telegramBotToken} onChange={(e) => setSystemSettings({...systemSettings, telegramBotToken: e.target.value.trim()})} />
                </div>
            </div>
        </div>

        {/* --- SMART AD ROTATION SYSTEM --- */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-xl border border-indigo-500/50 relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-center mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <RefreshCcw className="text-indigo-400" /> Smart Link Rotation
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Automatically switch fallback ads every few minutes.</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={rotationConfig.isEnabled} onChange={e => setRotationConfig({...rotationConfig, isEnabled: e.target.checked})} className="sr-only peer" />
                      <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
            </div>

            {rotationConfig.isEnabled && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                    
                    {/* Config Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl">
                        <div>
                            <label className="block text-indigo-300 text-xs font-bold uppercase mb-2">Rotation Mode</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setRotationConfig({...rotationConfig, mode: 'SERIAL'})} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition ${rotationConfig.mode === 'SERIAL' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                                    Serial (1 → 2 → 3)
                                </button>
                                <button type="button" onClick={() => setRotationConfig({...rotationConfig, mode: 'RANDOM'})} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition ${rotationConfig.mode === 'RANDOM' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                                    Random Shuffle
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-indigo-300 text-xs font-bold uppercase mb-2">Change Interval (Minutes)</label>
                            <input 
                                type="number" min="1" max="1440" 
                                className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded-lg font-mono text-center focus:border-indigo-500 outline-none"
                                value={rotationConfig.intervalMinutes}
                                onChange={(e) => setRotationConfig({...rotationConfig, intervalMinutes: Math.max(1, parseInt(e.target.value))})}
                            />
                        </div>
                    </div>

                    {/* Link Manager */}
                    <div className="space-y-4">
                        <label className="block text-white text-sm font-bold flex items-center gap-2">
                            <List size={16} /> Manage Direct Links ({rotationConfig.links.length})
                        </label>
                        
                        {/* Add New */}
                        <div className="flex flex-col md:flex-row gap-2">
                            <select 
                                value={newLinkProvider} 
                                onChange={(e) => setNewLinkProvider(e.target.value as any)}
                                className="bg-gray-800 text-white p-3 rounded-lg border border-gray-600 outline-none"
                            >
                                <option value="ADSTERRA">Adsterra</option>
                                <option value="MONETAG">Monetag</option>
                            </select>
                            <input 
                                type="url" 
                                placeholder="Paste Direct Link URL here..." 
                                className="flex-1 bg-gray-800 text-white p-3 rounded-lg border border-gray-600 outline-none focus:border-indigo-500"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                            />
                            <button type="button" onClick={handleAddRotationLink} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold flex items-center gap-2 justify-center">
                                <Plus size={18} /> Add
                            </button>
                        </div>

                        {/* List */}
                        <div className="bg-gray-900/50 rounded-xl border border-gray-700 max-h-60 overflow-y-auto custom-scrollbar">
                            {rotationConfig.links.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No links added. Add Adsterra/Monetag links above.</div>
                            ) : (
                                rotationConfig.links.map((link, index) => (
                                    <div key={link.id} className={`flex items-center gap-3 p-3 border-b border-gray-700 last:border-0 ${index === rotationConfig.currentLinkIndex ? 'bg-indigo-900/20' : ''}`}>
                                        <div className={`text-[10px] font-bold px-2 py-1 rounded w-20 text-center ${link.provider === 'ADSTERRA' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                            {link.provider}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate ${link.isEnabled ? 'text-gray-300' : 'text-gray-600 line-through'}`}>{link.url}</p>
                                        </div>
                                        {index === rotationConfig.currentLinkIndex && (
                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded animate-pulse">ACTIVE</span>
                                        )}
                                        <button type="button" onClick={() => toggleRotationLink(link.id)} className="text-gray-400 hover:text-white" title="Toggle">
                                            {link.isEnabled ? <ToggleRight className="text-green-500" /> : <ToggleLeft />}
                                        </button>
                                        <button type="button" onClick={() => handleDeleteRotationLink(link.id)} className="text-gray-500 hover:text-red-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- Standard Ad Configuration --- */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 relative overflow-hidden shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MonitorPlay className="text-blue-500" /> General Ad Controls
            </h2>
            
            <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Select Active Ad Provider</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {Object.values(AdProvider).map((provider) => (
                        <label 
                            key={provider} 
                            className={`
                                cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105
                                ${adSettings.activeProvider === provider 
                                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg ring-1 ring-blue-500' 
                                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}
                            `}
                        >
                            <span className="font-bold text-sm tracking-wide">{provider.replace('_', ' ')}</span>
                            <input 
                                type="radio" 
                                name="adProvider" 
                                className="w-4 h-4 accent-blue-500"
                                checked={adSettings.activeProvider === provider}
                                onChange={() => setAdSettings({...adSettings, activeProvider: provider})}
                            />
                        </label>
                    ))}
                </div>

                {adSettings.activeProvider === AdProvider.MONETAG && (
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 animate-in fade-in slide-in-from-top-2 space-y-4">
                        <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-500/30 mb-2">
                            <h3 className="text-blue-300 font-bold text-sm flex items-center gap-2 mb-2">
                                <Info size={16} /> Best Setup for Telegram:
                            </h3>
                            <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                <li><b>Primary:</b> Enter your **Zone ID** (Vignette Banner).</li>
                                <li><b>Fallback:</b> Enable <b>Smart Link Rotation</b> above for dynamic failover.</li>
                            </ul>
                        </div>
                        <div>
                            <label className="block text-blue-400 text-xl mb-1 font-bold flex items-center gap-2">
                                <Code size={20} /> Monetag Zone ID (Vignette)
                            </label>
                            <input type="text" className="w-full bg-gray-800 border-2 border-blue-500 text-white p-4 rounded-xl focus:border-blue-400 outline-none font-mono text-lg shadow-lg shadow-blue-900/20" placeholder="e.g. 1234567" value={adSettings.monetagZoneId || ''} onChange={(e) => setAdSettings({...adSettings, monetagZoneId: e.target.value.trim()})} />
                        </div>
                        <div>
                            <label className="block text-green-400 text-sm mb-1 font-bold flex items-center gap-2">
                                <LinkIcon size={16} /> Static Direct Link (Optional)
                            </label>
                            <input type="url" className="w-full bg-gray-800 border border-green-600/50 text-white p-3 rounded-lg focus:border-green-500 outline-none" placeholder="https://gohfy.com/..." value={adSettings.monetagDirectLink || ''} onChange={(e) => setAdSettings({...adSettings, monetagDirectLink: e.target.value})} />
                        </div>
                    </div>
                )}
            </div>
        </div>

        <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-105">
            <Save size={18} /> Save All Settings
        </button>
      </form>
    </div>
  );
};
