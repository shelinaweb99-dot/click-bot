
import React, { useState, useEffect, useRef } from 'react';
import { getAdSettings, saveAdSettings, subscribeToChanges } from '../../services/mockDb';
import { AdSettings, AdProvider, AdLink, RotationMode, AdRotationConfig } from '../../types';
import { 
  MonitorPlay, 
  Save, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Link as LinkIcon,
  Info
} from 'lucide-react';

export const AdminAds: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useRef(true);
  const [newUrl, setNewUrl] = useState('');

  const defaultAdSettings: AdSettings = {
    activeProvider: AdProvider.MONETAG,
    monetagDirectLink: '',
    monetagZoneId: '',
    monetagRewardedInterstitialId: '',
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
        setSettings({ ...defaultAdSettings, ...data });
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
      alert("Success: Advertising configuration updated globally.");
    } catch (e) {
      alert("Error: Failed to synchronize ad nodes.");
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
          {isSaving ? 'Syncing...' : 'Save All'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monetag SDK Section */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 border border-blue-500/10">
                <Zap size={20} />
             </div>
             <h2 className="text-xl font-black text-white uppercase tracking-tight">Monetag TMA SDK</h2>
          </div>

          <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex gap-3">
             <Info className="text-blue-500 shrink-0" size={18} />
             <p className="text-gray-400 text-[10px] leading-relaxed">
                Enter your <strong>Monetag Interstitial Zone ID</strong>. The app will automatically inject the required script to show native Telegram ads.
             </p>
          </div>

          <div className="space-y-4">
             <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Interstitial Zone ID</label>
             <input 
                type="text" 
                className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-sm shadow-inner transition-all"
                placeholder="Example: 8621458"
                value={settings.monetagRewardedInterstitialId || ''}
                onChange={e => setSettings({ ...settings, monetagRewardedInterstitialId: e.target.value })}
             />
          </div>

          <div className="space-y-4">
             <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Direct Link (Fallback)</label>
             <input 
                type="text" 
                className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px] shadow-inner transition-all"
                placeholder="https://alwingulla.com/..."
                value={settings.monetagDirectLink || ''}
                onChange={e => setSettings({ ...settings, monetagDirectLink: e.target.value })}
             />
             <p className="text-gray-600 text-[9px] px-1 font-medium">This link is used if the SDK is blocked or unavailable for specific users.</p>
          </div>
        </div>

        {/* Dynamic Rotation Section */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 border border-purple-500/10">
                    <RotateCcw size={20} />
                 </div>
                 <h2 className="text-xl font-black text-white uppercase tracking-tight">Ad Rotation</h2>
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
                        placeholder="Paste link..." 
                        className="flex-1 bg-[#0b1120] border border-white/5 text-white p-4 rounded-xl text-xs outline-none focus:border-purple-500/50"
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                    />
                    <button onClick={addLink} className="bg-purple-600 hover:bg-purple-700 p-4 rounded-xl text-white transition-all active:scale-95 shadow-lg">
                        <Plus size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                      {settings.rotation.links.map(link => (
                          <div key={link.id} className="flex justify-between items-center bg-[#030712] p-4 rounded-2xl border border-white/5 group">
                              <div className="flex items-center gap-3 min-w-0">
                                 <LinkIcon size={14} className="text-gray-600 shrink-0" />
                                 <p className="text-[10px] text-gray-400 truncate pr-4 font-mono">{link.url}</p>
                              </div>
                              <button onClick={() => {
                                  setSettings({
                                      ...settings,
                                      rotation: { ...settings.rotation!, links: settings.rotation!.links.filter(l => l.id !== link.id) }
                                  });
                              }} className="text-gray-700 hover:text-red-500 p-2 transition-colors">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))}
                  </div>
               </div>
           )}
        </div>
      </div>
      
      <div className="bg-blue-600/5 p-10 rounded-[3rem] border border-blue-500/10 text-center">
          <ShieldCheck size={40} className="text-blue-500 mx-auto mb-4 opacity-40" />
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
              Monetization Protocol Synchronized &bull; Multi-Node Relay Active
          </p>
      </div>
    </div>
  );
};
