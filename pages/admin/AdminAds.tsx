
import React, { useState, useEffect, useRef } from 'react';
import { getAdSettings, saveAdSettings, subscribeToChanges } from '../../services/mockDb';
import { AdSettings, AdProvider, AdLink, RotationMode, AdRotationConfig } from '../../types';
import { 
  MonitorPlay, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Link as LinkIcon, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layout,
  Info
} from 'lucide-react';

export const AdminAds: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const defaultRotation: AdRotationConfig = {
    isEnabled: false,
    mode: 'SERIAL',
    intervalMinutes: 10,
    lastRotationTime: 0,
    currentLinkIndex: 0,
    links: []
  };

  const defaultAdSettings: AdSettings = {
    activeProvider: AdProvider.TELEGRAM_ADS,
    monetagDirectLink: '',
    monetagAdTag: '',
    monetagZoneId: '',
    monetagRewardedInterstitialId: '',
    monetagRewardedPopupId: '',
    monetagInterstitialId: '',
    adsterraLink: '',
    telegramChannelLink: '',
    rotation: defaultRotation
  };

  const [settings, setSettings] = useState<AdSettings>(defaultAdSettings);
  const [newLink, setNewLink] = useState('');
  const [newLinkProvider, setNewLinkProvider] = useState<'ADSTERRA' | 'MONETAG'>('MONETAG');

  const loadData = async () => {
    try {
      if (isMounted.current) setLoading(true);
      setError(null);
      const data = await getAdSettings();
      if (isMounted.current) {
        setSettings({
          ...defaultAdSettings,
          ...data,
          rotation: {
            ...defaultRotation,
            ...(data?.rotation || {})
          }
        });
      }
    } catch (e: any) {
      console.error("Ad settings load error", e);
      if (isMounted.current) setError("Failed to retrieve advertising node configuration.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    const unsub = subscribeToChanges(() => {
      if (isMounted.current) loadData();
    });
    return () => {
      isMounted.current = false;
      unsub();
    };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await saveAdSettings(settings);
      alert("Success: Advertising protocols updated globally.");
    } catch (e) {
      alert("Error: Failed to synchronize ad settings.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  const addRotationLink = () => {
    if (!newLink) return;
    const link: AdLink = {
      id: Date.now().toString(),
      url: newLink,
      provider: newLinkProvider,
      isEnabled: true,
      clicks: 0
    };
    setSettings(prev => ({
      ...prev,
      rotation: {
        ...prev.rotation!,
        links: [...(prev.rotation?.links || []), link]
      }
    }));
    setNewLink('');
  };

  const removeRotationLink = (id: string) => {
    setSettings(prev => ({
      ...prev,
      rotation: {
        ...prev.rotation!,
        links: prev.rotation!.links.filter(l => l.id !== id)
      }
    }));
  };

  const toggleRotationLink = (id: string) => {
    setSettings(prev => ({
      ...prev,
      rotation: {
        ...prev.rotation!,
        links: prev.rotation!.links.map(l => l.id === id ? { ...l, isEnabled: !l.isEnabled } : l)
      }
    }));
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Ad Network</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-16">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-600/10 p-2.5 rounded-xl text-blue-500 border border-blue-500/10 shadow-lg">
              <MonitorPlay size={24} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Ads Control</h1>
          </div>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Monetization Engine & Fallbacks</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.15em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/30"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Synchronize
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Monetag Telegram SDK IDs */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-500 border border-indigo-500/10">
                <Layout size={20} />
             </div>
             <h2 className="text-xl font-black text-white tracking-tight uppercase">Telegram SDK Ads</h2>
          </div>
          
          <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-500/10 flex gap-3 items-start">
             <Info className="text-blue-500 shrink-0 mt-1" size={18} />
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
               Enter only the numeric Zone IDs. The system will automatically detect the Monetag SDK and trigger the ads.
             </p>
          </div>

          <div className="space-y-6">
             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Rewarded Interstitial Zone ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="e.g. 8621458"
                   value={settings.monetagRewardedInterstitialId || ''}
                   onChange={e => setSettings({ ...settings, monetagRewardedInterstitialId: e.target.value })}
                />
             </div>
             
             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Rewarded Popup Zone ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="e.g. 8621459"
                   value={settings.monetagRewardedPopupId || ''}
                   onChange={e => setSettings({ ...settings, monetagRewardedPopupId: e.target.value })}
                />
             </div>

             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">In-App Interstitial Zone ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="e.g. 8621460"
                   value={settings.monetagInterstitialId || ''}
                   onChange={e => setSettings({ ...settings, monetagInterstitialId: e.target.value })}
                />
             </div>
          </div>
        </div>

        {/* Legacy Monetag / Adsterra Settings */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500 border border-yellow-500/10">
                <Zap size={20} />
             </div>
             <h2 className="text-xl font-black text-white tracking-tight uppercase">Legacy & Fallback</h2>
          </div>

          <div className="space-y-6">
             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Universal Tag (Script URL)</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px] shadow-inner transition-all"
                   placeholder="https://alwingulla.com/script/suv4.js"
                   value={settings.monetagAdTag || ''}
                   onChange={e => setSettings({ ...settings, monetagAdTag: e.target.value })}
                />
             </div>
             
             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Legacy/Standard Zone ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="Standard Zone"
                   value={settings.monetagZoneId || ''}
                   onChange={e => setSettings({ ...settings, monetagZoneId: e.target.value })}
                />
             </div>

             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Direct Link (Global Fallback)</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px] shadow-inner transition-all"
                   placeholder="https://... direct link"
                   value={settings.monetagDirectLink || ''}
                   onChange={e => setSettings({ ...settings, monetagDirectLink: e.target.value })}
                />
             </div>
          </div>
        </div>
      </div>
      
      {/* Rotation System Section (Condensed) */}
      <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-3">
               <RefreshCw className="text-purple-500" size={20} /> Rotation Engine
            </h2>
            <button 
              onClick={() => setSettings({ ...settings, rotation: { ...settings.rotation!, isEnabled: !settings.rotation?.isEnabled }})}
              className={`transition-all ${settings.rotation?.isEnabled ? 'text-green-500' : 'text-gray-700'}`}
            >
              {settings.rotation?.isEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
            </button>
          </div>
          
          <div className="bg-[#0b1120] p-6 rounded-[2rem] border border-white/5 space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Add Dynamic Link</h4>
                <div className="flex gap-2">
                   <select 
                      className="bg-gray-900 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase outline-none"
                      value={newLinkProvider}
                      onChange={e => setNewLinkProvider(e.target.value as any)}
                   >
                      <option value="MONETAG">Monetag</option>
                      <option value="ADSTERRA">Adsterra</option>
                   </select>
                   <input 
                      type="text"
                      className="flex-1 bg-black text-white p-4 rounded-xl text-[10px] font-mono outline-none border border-white/5"
                      placeholder="Paste rotation URL..."
                      value={newLink}
                      onChange={e => setNewLink(e.target.value)}
                   />
                   <button 
                     onClick={addRotationLink}
                     className="bg-blue-600 p-4 rounded-xl text-white shadow-lg active:scale-90 transition-transform"
                   >
                      <Plus size={20} />
                   </button>
                </div>
          </div>
      </div>
    </div>
  );
};
