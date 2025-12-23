
import React, { useState, useEffect, useRef } from 'react';
import { getAdSettings, saveAdSettings, subscribeToChanges } from '../../services/mockDb';
import { AdSettings, AdProvider, AdLink, RotationMode, AdRotationConfig } from '../../types';
import { DEFAULT_MONETAG_SCRIPT } from '../../components/AdSimulator';
import { 
  MonitorPlay, 
  Save, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  RotateCcw,
  ShieldCheck,
  Zap,
  Link as LinkIcon,
  Info,
  Layout,
  LayoutGrid
} from 'lucide-react';

export const AdminAds: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const isMounted = useRef(true);

  const defaultAdSettings: AdSettings = {
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
      alert("Success: Advertising configurations synchronized.");
    } catch (e) {
      alert("Error: Failed to update ad nodes.");
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
        rotation: { ...settings.rotation!, links: settings.rotation!.links.filter(l => l.id !== id) }
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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
             <MonitorPlay size={32} className="text-blue-500" /> Ads Center
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Monetization Control Plane</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.15em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/30 border border-blue-400/20"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Synchronize
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monetag TMA SDK Section */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 border border-blue-500/10">
                <LayoutGrid size={20} />
             </div>
             <h2 className="text-xl font-black text-white uppercase tracking-tight">Monetag TMA SDK</h2>
          </div>

          <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex gap-3">
             <Info className="text-blue-500 shrink-0" size={18} />
             <p className="text-gray-400 text-[10px] leading-relaxed">
                Provide Zone IDs for each ad format. The app will automatically load the appropriate script and trigger functions like <code className="text-blue-400">show_XXXXX()</code>.
             </p>
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
             <div className="space-y-2">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">In-App Interstitial Zone ID</label>
                <input 
                    type="text" 
                    className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner"
                    placeholder="e.g. 8621460"
                    value={settings.monetagInterstitialId || ''}
                    onChange={e => setSettings({ ...settings, monetagInterstitialId: e.target.value })}
                />
             </div>
          </div>
        </div>

        {/* Dynamic Rotation Section */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 border border-purple-500/10">
                    <RotateCcw size={20} />
                 </div>
                 <h2 className="text-xl font-black text-white uppercase tracking-tight">Direct Link Rotation</h2>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, rotation: { ...settings.rotation!, isEnabled: !settings.rotation?.isEnabled }})}
                className={`transition-all ${settings.rotation?.isEnabled ? 'text-green-500' : 'text-gray-600'}`}
              >
                  {settings.rotation?.isEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
           </div>

           {settings.rotation?.isEnabled && (
               <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Paste fallback link..." 
                        className="flex-1 bg-[#0b1120] border border-white/5 text-white p-4 rounded-xl text-[10px] outline-none focus:border-purple-500/50 font-mono"
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                    />
                    <button onClick={addLink} className="bg-purple-600 hover:bg-purple-700 p-4 rounded-xl text-white transition-all active:scale-95 shadow-lg">
                        <Plus size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                      {settings.rotation.links.map(link => (
                          <div key={link.id} className="flex justify-between items-center bg-[#030712] p-4 rounded-2xl border border-white/5 group">
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
           )}
        </div>

        {/* Global Fallback Config */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500 border border-yellow-500/10">
                <Zap size={20} />
             </div>
             <h2 className="text-xl font-black text-white uppercase tracking-tight">Global SDK Fallback</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Universal Tag (Script URL)</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-yellow-500/50 outline-none font-mono text-[10px]"
                   placeholder="https://alwingulla.com/script/suv4.js"
                   value={settings.monetagAdTag || ''}
                   onChange={e => setSettings({ ...settings, monetagAdTag: e.target.value })}
                />
                <p className="text-gray-600 text-[9px] font-bold italic ml-1">Default: {DEFAULT_MONETAG_SCRIPT}</p>
             </div>
             
             <div className="space-y-2.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Primary Global Zone ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-yellow-500/50 outline-none font-mono text-xs"
                   placeholder="General Zone ID"
                   value={settings.monetagZoneId || ''}
                   onChange={e => setSettings({ ...settings, monetagZoneId: e.target.value })}
                />
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-600/5 p-10 rounded-[3rem] border border-blue-500/10 text-center">
          <ShieldCheck size={40} className="text-blue-500 mx-auto mb-4 opacity-40" />
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
              Advertising Protocol Synchronized &bull; Multi-Node Active
          </p>
      </div>
    </div>
  );
};
