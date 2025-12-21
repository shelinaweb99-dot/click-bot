
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
  Zap
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
        // Merge with defaults to ensure all keys exist for the UI
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

  if (error) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 text-center">
      <AlertCircle className="text-red-500 mb-4" size={48} />
      <h2 className="text-xl font-black text-white uppercase tracking-tight">System Desync</h2>
      <p className="text-gray-500 text-sm mt-2 mb-8">{error}</p>
      <button onClick={loadData} className="bg-blue-600 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
        <RefreshCw size={18} /> Reconnect Node
      </button>
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
        
        {/* Ad Provider Selection */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3">
             <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500 border border-yellow-500/10">
                <Zap size={20} />
             </div>
             <h2 className="text-xl font-black text-white tracking-tight uppercase">Active Provider</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: AdProvider.MONETAG, label: 'Monetag', color: 'bg-indigo-600' },
              { id: AdProvider.ADSTERRA, label: 'Adsterra', color: 'bg-emerald-600' },
              { id: AdProvider.TELEGRAM_ADS, label: 'Telegram', color: 'bg-blue-500' },
            ].map(prov => (
              <button
                key={prov.id}
                onClick={() => setSettings({ ...settings, activeProvider: prov.id })}
                className={`p-5 rounded-2xl border transition-all font-black text-[10px] uppercase tracking-widest text-center ${
                  settings.activeProvider === prov.id 
                  ? `${prov.color} border-white/20 text-white shadow-lg` 
                  : 'bg-[#0b1120] border-white/5 text-gray-500 hover:text-white'
                }`}
              >
                {prov.label}
              </button>
            ))}
          </div>

          <div className="space-y-6 pt-4">
             {/* Monetag Config */}
             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Monetag Node (Zone ID)</label>
                <div className="relative">
                   <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                   <input 
                      type="text" 
                      className="w-full bg-[#0b1120] border border-white/5 text-white p-5 pl-14 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-xs shadow-inner transition-all"
                      placeholder="e.g. 10305424"
                      value={settings.monetagZoneId || ''}
                      onChange={e => setSettings({ ...settings, monetagZoneId: e.target.value })}
                   />
                </div>
             </div>
             
             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Ad Script URL</label>
                <input 
                   type="text" 
                   className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px] shadow-inner transition-all"
                   placeholder="https://alwingulla.com/script/suv4.js"
                   value={settings.monetagAdTag || ''}
                   onChange={e => setSettings({ ...settings, monetagAdTag: e.target.value })}
                />
             </div>

             <div className="space-y-4">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Direct Link (Fallback)</label>
                <div className="relative">
                   <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                   <input 
                      type="text" 
                      className="w-full bg-[#0b1120] border border-white/5 text-white p-5 pl-14 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px] shadow-inner transition-all"
                      placeholder="https://... direct link"
                      value={settings.monetagDirectLink || ''}
                      onChange={e => setSettings({ ...settings, monetagDirectLink: e.target.value })}
                   />
                </div>
             </div>
          </div>
        </div>

        {/* Ad Rotation System */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
               <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 border border-purple-500/10">
                  <RefreshCw size={20} />
               </div>
               <h2 className="text-xl font-black text-white tracking-tight uppercase">Rotation Hub</h2>
            </div>
            <button 
              onClick={() => setSettings({ ...settings, rotation: { ...settings.rotation!, isEnabled: !settings.rotation?.isEnabled }})}
              className={`transition-all ${settings.rotation?.isEnabled ? 'text-green-500' : 'text-gray-700'}`}
            >
              {settings.rotation?.isEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
            </button>
          </div>

          <div className="flex-1 space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Rotation Mode</label>
                   <select 
                      className="w-full bg-[#0b1120] text-white p-4 rounded-xl border border-white/5 font-black text-[10px] uppercase outline-none"
                      value={settings.rotation?.mode}
                      onChange={e => setSettings({ ...settings, rotation: { ...settings.rotation!, mode: e.target.value as RotationMode }})}
                   >
                      <option value="SERIAL">Serial Sequence</option>
                      <option value="RANDOM">Random Chaos</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest ml-1">Interval (Min)</label>
                   <input 
                      type="number"
                      className="w-full bg-[#0b1120] text-white p-4 rounded-xl border border-white/5 font-black text-[10px] outline-none"
                      value={settings.rotation?.intervalMinutes}
                      onChange={e => setSettings({ ...settings, rotation: { ...settings.rotation!, intervalMinutes: parseInt(e.target.value) || 0 }})}
                   />
                </div>
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

             <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                {settings.rotation?.links.length === 0 ? (
                  <p className="text-center text-gray-700 text-[10px] font-black uppercase py-10 italic">No dynamic links in queue</p>
                ) : (
                  settings.rotation?.links.map(link => (
                    <div key={link.id} className="bg-[#0b1120] p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                       <div className="flex items-center gap-4 min-w-0 pr-4">
                          <div className={`w-2 h-2 rounded-full ${link.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-800'}`}></div>
                          <div className="min-w-0">
                             <p className="text-[10px] font-black text-white tracking-tight truncate uppercase">{link.provider}: <span className="text-gray-600 lowercase font-mono">{link.url}</span></p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => toggleRotationLink(link.id)} className={`p-2 transition-colors ${link.isEnabled ? 'text-blue-500' : 'text-gray-700'}`}>
                             {link.isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                          <button onClick={() => removeRotationLink(link.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-600/5 p-8 rounded-[3rem] border border-blue-500/10 text-center">
         <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest leading-relaxed">
            Infrastructure safety: Ad rotation ensures high CPM by bypassing single-link saturation. <br/>
            Rotation protocols update every {settings.rotation?.intervalMinutes} minutes based on node traffic.
         </p>
      </div>
    </div>
  );
};
