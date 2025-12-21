
import React, { useState, useEffect, useRef } from 'react';
import { getAdSettings, saveAdSettings, subscribeToChanges } from '../../services/mockDb';
import { AdSettings, AdProvider, AdLink, RotationMode, AdRotationConfig } from '../../types';
import { DEFAULT_MONETAG_SCRIPT } from '../../components/AdSimulator';
import { 
  MonitorPlay, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  AlertCircle,
  Zap,
  Layout,
  Info,
  ShieldCheck,
  Link as LinkIcon,
  RotateCcw
} from 'lucide-react';

export const AdminAds: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // For New Ad Link
  const [newUrl, setNewUrl] = useState('');
  const [newProvider, setNewProvider] = useState<'MONETAG' | 'ADSTERRA'>('MONETAG');

  const defaultRotation: AdRotationConfig = {
    isEnabled: false,
    mode: 'SERIAL',
    intervalMinutes: 10,
    lastRotationTime: 0,
    currentLinkIndex: 0,
    links: []
  };

  const defaultAdSettings: AdSettings = {
    activeProvider: AdProvider.MONETAG,
    monetagDirectLink: '',
    monetagAdTag: '',
    monetagZoneId: '',
    monetagRewardedInterstitialId: '',
    monetagRewardedPopupId: '',
    monetagInterstitialId: '',
    adsterraLink: '',
    rotation: defaultRotation
  };

  const [settings, setSettings] = useState<AdSettings>(defaultAdSettings);

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
            ...(data?.rotation || {}),
            links: data?.rotation?.links || []
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

  const addLink = () => {
    if (!newUrl) return;
    const newLink: AdLink = {
      id: 'link_' + Date.now(),
      url: newUrl,
      provider: newProvider,
      isEnabled: true,
      clicks: 0
    };
    const updatedRotation = {
        ...settings.rotation!,
        links: [...(settings.rotation?.links || []), newLink]
    };
    setSettings({ ...settings, rotation: updatedRotation });
    setNewUrl('');
  };

  const removeLink = (id: string) => {
    const updatedRotation = {
        ...settings.rotation!,
        links: (settings.rotation?.links || []).filter(l => l.id !== id)
    };
    setSettings({ ...settings, rotation: updatedRotation });
  };

  const toggleLink = (id: string) => {
    const updatedRotation = {
        ...settings.rotation!,
        links: (settings.rotation?.links || []).map(l => l.id === id ? { ...l, isEnabled: !l.isEnabled } : l)
    };
    setSettings({ ...settings, rotation: updatedRotation });
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Ad Network</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-blue-600/10 p-2.5 rounded-xl text-blue-500 border border-blue-500/10 shadow-lg">
              <MonitorPlay size={24} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Ads Center</h1>
          </div>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Monetization Node Management</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.15em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/30 border border-blue-400/20"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Syncing...' : 'Save All'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Telegram SDK (Zone IDs) */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-500 border border-indigo-500/10">
                <Layout size={20} />
             </div>
             <h2 className="text-xl font-black text-white tracking-tight uppercase">Telegram SDK Ads</h2>
          </div>

          <div className="space-y-6">
             <div className="space-y-2.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Rewarded Interstitial (Main)</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="Zone ID (e.g. 8621458)"
                   value={settings.monetagRewardedInterstitialId || ''}
                   onChange={e => setSettings({ ...settings, monetagRewardedInterstitialId: e.target.value })}
                />
             </div>
             <div className="space-y-2.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Rewarded Popup ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="Zone ID"
                   value={settings.monetagRewardedPopupId || ''}
                   onChange={e => setSettings({ ...settings, monetagRewardedPopupId: e.target.value })}
                />
             </div>
             <div className="space-y-2.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Standard Interstitial ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="Zone ID"
                   value={settings.monetagInterstitialId || ''}
                   onChange={e => setSettings({ ...settings, monetagInterstitialId: e.target.value })}
                />
             </div>
          </div>
        </div>

        {/* Section 2: Ad Rotation (Dynamic Ads) */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 border border-purple-500/10">
                    <RotateCcw size={20} />
                 </div>
                 <h2 className="text-xl font-black text-white tracking-tight uppercase">Dynamic Rotation</h2>
              </div>
              <button 
                onClick={() => setSettings({
                    ...settings, 
                    rotation: { ...settings.rotation!, isEnabled: !settings.rotation?.isEnabled }
                })}
                className={`transition-all ${settings.rotation?.isEnabled ? 'text-green-500' : 'text-gray-600'}`}
              >
                  {settings.rotation?.isEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
           </div>

           {settings.rotation?.isEnabled && (
               <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="bg-[#0b1120] p-6 rounded-3xl border border-white/5 space-y-4">
                      <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Direct Link URL..." 
                            className="flex-1 bg-gray-900 border border-white/5 text-white p-4 rounded-xl text-xs outline-none focus:border-purple-500"
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                        />
                        <button 
                            onClick={addLink}
                            className="bg-purple-600 hover:bg-purple-700 p-4 rounded-xl text-white transition-all active:scale-95"
                        >
                            <Plus size={20} />
                        </button>
                      </div>
                      <div className="flex gap-4">
                        <select 
                            className="flex-1 bg-gray-900 border border-white/5 text-white p-4 rounded-xl text-xs outline-none"
                            value={settings.rotation.mode}
                            onChange={e => setSettings({ ...settings, rotation: { ...settings.rotation!, mode: e.target.value as RotationMode }})}
                        >
                            <option value="SERIAL">Serial (One by One)</option>
                            <option value="RANDOM">Random Selection</option>
                        </select>
                      </div>
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                      {settings.rotation.links.map(link => (
                          <div key={link.id} className="flex items-center justify-between bg-[#0b1120] p-4 rounded-2xl border border-white/5 group">
                              <div className="flex items-center gap-3 min-w-0">
                                  <LinkIcon size={14} className="text-gray-600 shrink-0" />
                                  <p className="text-xs text-gray-400 truncate pr-4">{link.url}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => toggleLink(link.id)} className={link.isEnabled ? 'text-green-500' : 'text-gray-600'}>
                                      {link.isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                  </button>
                                  <button onClick={() => removeLink(link.id)} className="text-gray-700 hover:text-red-500 p-1">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
               </div>
           )}
        </div>

        {/* Global Configuration */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500 border border-yellow-500/10">
                <Zap size={20} />
             </div>
             <h2 className="text-xl font-black text-white tracking-tight uppercase">Global SDK & Tags</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Universal Tag (SDK Script URL)</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-yellow-500/50 outline-none font-mono text-[10px] shadow-inner transition-all"
                   placeholder="https://alwingulla.com/script/suv4.js"
                   value={settings.monetagAdTag || ''}
                   onChange={e => setSettings({ ...settings, monetagAdTag: e.target.value })}
                />
                <p className="text-gray-600 text-[9px] font-bold italic ml-1">Default: {DEFAULT_MONETAG_SCRIPT}</p>
             </div>
             
             <div className="space-y-2.5">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Primary Fallback Zone ID</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-yellow-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                   placeholder="General Zone ID"
                   value={settings.monetagZoneId || ''}
                   onChange={e => setSettings({ ...settings, monetagZoneId: e.target.value })}
                />
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-600/5 p-10 rounded-[3rem] border border-blue-500/10 text-center">
          <ShieldCheck size={40} className="text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
              Advertising Node Synchronized &bull; Multi-Mode Active
          </p>
      </div>
    </div>
  );
};
