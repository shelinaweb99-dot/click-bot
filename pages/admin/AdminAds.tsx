
import React, { useState, useEffect, useRef } from 'react';
import { getAdSettings, saveAdSettings, subscribeToChanges } from '../../services/mockDb';
import { AdSettings, AdProvider, AdLink, RotationMode } from '../../types';
import { DEFAULT_MONETAG_SCRIPT } from '../../components/AdSimulator';
import { 
  MonitorPlay, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  RotateCcw,
  ShieldCheck,
  Zap,
  Link as LinkIcon,
  Info,
  Layout,
  ToggleLeft,
  ToggleRight,
  ShieldAlert
} from 'lucide-react';

export const AdminAds: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const isMounted = useRef(true);

  const defaultAdSettings: AdSettings = {
    isGlobalEnabled: true,
    activeProvider: AdProvider.MONETAG,
    monetagDirectLink: '',
    monetagAdTag: '',
    monetagZoneId: '',
    monetagRewardedInterstitialId: '',
    monetagRewardedPopupId: '',
    monetagInterstitialId: '',
    adsterraLink: '',
    rotation: {
        isEnabled: false,
        mode: 'SERIAL',
        intervalMinutes: 10,
        lastRotationTime: 0,
        currentLinkIndex: 0,
        links: []
    }
  };

  const [settings, setSettings] = useState<AdSettings>(defaultAdSettings);

  const loadData = async () => {
    try {
      if (isMounted.current) setLoading(true);
      const data = await getAdSettings();
      if (isMounted.current) {
        setSettings({
            ...defaultAdSettings,
            ...data,
            rotation: {
                ...defaultAdSettings.rotation!,
                ...(data?.rotation || {}),
                links: data?.rotation?.links || []
            }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    const unsub = subscribeToChanges(() => { if (isMounted.current) loadData(); });
    return () => { isMounted.current = false; unsub(); };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await saveAdSettings(settings);
      alert("Success: Monetization protocols synchronized.");
    } catch (e) {
      alert("Error: Failed to update ad settings.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  const addLink = () => {
    if (!newUrl) return;
    const newLink: AdLink = { id: 'link_' + Date.now(), url: newUrl, provider: 'MONETAG', isEnabled: true };
    setSettings({ 
        ...settings, 
        rotation: { ...settings.rotation!, links: [...(settings.rotation?.links || []), newLink] } 
    });
    setNewUrl('');
  };

  const removeLink = (id: string) => {
    setSettings({
        ...settings,
        rotation: { ...settings.rotation!, links: (settings.rotation?.links || []).filter(l => l.id !== id) }
    });
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Ad Network</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
             <MonitorPlay size={32} className="text-blue-500" /> Ad Center
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Monetization & Network Control</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.15em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/30 border border-blue-400/20 w-full sm:w-auto"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Synchronize
        </button>
      </div>

      {/* Global Master Switch */}
      <div className={`p-8 rounded-[2.5rem] border flex flex-col sm:flex-row items-center justify-between gap-6 transition-all shadow-2xl ${settings.isGlobalEnabled ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
         <div className="flex items-center gap-6">
            <div className={`p-5 rounded-[1.8rem] border shadow-lg ${settings.isGlobalEnabled ? 'bg-green-500/10 text-green-500 border-green-500/10' : 'bg-red-500/10 text-red-500 border-red-500/10'}`}>
                <ShieldAlert size={32} />
            </div>
            <div className="text-center sm:text-left">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Global Ad Network</h2>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${settings.isGlobalEnabled ? 'text-green-500' : 'text-red-500'}`}>
                    Status: {settings.isGlobalEnabled ? 'ONLINE - Ads Active' : 'OFFLINE - Ads Paused'}
                </p>
            </div>
         </div>
         <button 
            onClick={() => setSettings({ ...settings, isGlobalEnabled: !settings.isGlobalEnabled })}
            className={`transition-all ${settings.isGlobalEnabled ? 'text-green-500' : 'text-gray-600'}`}
         >
            {settings.isGlobalEnabled ? <ToggleRight size={64} /> : <ToggleLeft size={64} />}
         </button>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-500 ${!settings.isGlobalEnabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
        
        {/* Telegram SDK Mode */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-500 border border-indigo-500/10">
                    <Layout size={20} />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Telegram SDK Ads</h2>
            </div>
            
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Rewarded Interstitial Zone ID</label>
                    <input 
                        type="text" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner"
                        placeholder="e.g. 8621458"
                        value={settings.monetagRewardedInterstitialId || ''}
                        onChange={e => setSettings({ ...settings, monetagRewardedInterstitialId: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Rewarded Popup Zone ID</label>
                    <input 
                        type="text" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner"
                        placeholder="e.g. 8621459"
                        value={settings.monetagRewardedPopupId || ''}
                        onChange={e => setSettings({ ...settings, monetagRewardedPopupId: e.target.value })}
                    />
                </div>
            </div>
        </div>

        {/* Global Fallback & Tags */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500 border border-yellow-500/10">
                    <Zap size={20} />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Global SDK & Tags</h2>
            </div>
            
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">SDK Script URL</label>
                    <input 
                        type="text" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px] shadow-inner"
                        placeholder={DEFAULT_MONETAG_SCRIPT}
                        value={settings.monetagAdTag || ''}
                        onChange={e => setSettings({ ...settings, monetagAdTag: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">General Fallback Zone ID</label>
                    <input 
                        type="text" 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner"
                        placeholder="Primary Zone ID"
                        value={settings.monetagZoneId || ''}
                        onChange={e => setSettings({ ...settings, monetagZoneId: e.target.value })}
                    />
                </div>
            </div>
        </div>

        {/* Dynamic Direct Links (Auto-Open Mode) */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl lg:col-span-2 space-y-8">
           <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 border border-purple-500/10">
                    <RotateCcw size={20} />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Auto-Open Direct Links</h2>
           </div>

           <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/10 flex gap-3">
              <Info className="text-purple-500 shrink-0" size={18} />
              <p className="text-gray-400 text-[10px] leading-relaxed">
                 Direct Links will open **automatically** without any buttons when triggered by the system.
              </p>
           </div>

            <div className="space-y-6">
                <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Paste direct sponsor link URL..." 
                    className="flex-1 bg-[#0b1120] border border-white/5 text-white p-4 rounded-xl text-[10px] outline-none focus:border-purple-500/50 font-mono shadow-inner"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                />
                <button onClick={addLink} className="bg-purple-600 hover:bg-purple-700 p-4 rounded-xl text-white transition-all active:scale-95 shadow-lg px-6">
                    <Plus size={18} />
                </button>
                </div>
                
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                    {settings.rotation?.links?.map(link => (
                        <div key={link.id} className="flex justify-between items-center bg-[#030712] p-5 rounded-2xl border border-white/5 group">
                            <div className="flex items-center gap-3 min-w-0">
                                <LinkIcon size={14} className="text-gray-600 shrink-0" />
                                <p className="text-[10px] text-gray-400 truncate pr-4 font-mono">{link.url}</p>
                            </div>
                            <button onClick={() => removeLink(link.id)} className="text-gray-700 hover:text-red-500 p-2 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      <div className="bg-blue-600/5 p-10 rounded-[3rem] border border-blue-500/10 text-center">
          <ShieldCheck size={40} className="text-blue-500 mx-auto mb-4 opacity-40" />
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
              Monetization Protocols Verified &bull; System Active
          </p>
      </div>
    </div>
  );
};
