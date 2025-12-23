
import React, { useState, useEffect, useRef } from 'react';
import { getAdSettings, saveAdSettings, subscribeToChanges } from '../../services/mockDb';
import { AdSettings, AdProvider, AdLink, RotationMode } from '../../types';
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
  ExternalLink,
  Target
} from 'lucide-react';

export const AdminAds: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const isMounted = useRef(true);

  const defaultAdSettings: AdSettings = {
    activeProvider: AdProvider.MONETAG,
    monetagDirectLink: '',
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
      alert("Success: Direct Link protocols synchronized.");
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
             <MonitorPlay size={32} className="text-blue-500" /> Direct Ads
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Direct Link Management</p>
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
        
        {/* Main Provider Selection */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8 lg:col-span-2">
            <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 border border-blue-500/10">
                    <Target size={20} />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Active Earning Gateway</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { id: AdProvider.MONETAG, label: 'Monetag Direct' },
                    { id: AdProvider.ADSTERRA, label: 'Adsterra Direct' },
                    { id: AdProvider.ROTATION, label: 'Dynamic Rotation' },
                ].map(p => (
                    <button 
                        key={p.id}
                        onClick={() => setSettings({...settings, activeProvider: p.id})}
                        className={`p-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${settings.activeProvider === p.id ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-900/40' : 'bg-[#0b1120] border-white/5 text-gray-500 hover:text-white'}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Monetag Section */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                Monetag Direct
            </h2>
            <div className="space-y-2">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Direct Link URL</label>
                <input 
                    type="text" 
                    className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px]"
                    placeholder="https://monetag.com/..."
                    value={settings.monetagDirectLink || ''}
                    onChange={e => setSettings({ ...settings, monetagDirectLink: e.target.value })}
                />
            </div>
        </div>

        {/* Adsterra Section */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                Adsterra Direct
            </h2>
            <div className="space-y-2">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Direct Link URL</label>
                <input 
                    type="text" 
                    className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-blue-500/50 outline-none font-mono text-[10px]"
                    placeholder="https://adsterra.com/..."
                    value={settings.adsterraLink || ''}
                    onChange={e => setSettings({ ...settings, adsterraLink: e.target.value })}
                />
            </div>
        </div>

        {/* Dynamic Rotation Section */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl lg:col-span-2 space-y-8">
           <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 border border-purple-500/10">
                <RotateCcw size={20} />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Dynamic Ad Rotation</h2>
           </div>

           <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/10 flex gap-3">
              <Info className="text-purple-500 shrink-0" size={18} />
              <p className="text-gray-400 text-[10px] leading-relaxed">
                 Use rotation to cycle through multiple different direct links to maximize revenue and stay fresh.
              </p>
           </div>

            <div className="space-y-6">
                <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Paste additional sponsor link..." 
                    className="flex-1 bg-[#0b1120] border border-white/5 text-white p-4 rounded-xl text-[10px] outline-none focus:border-purple-500/50 font-mono"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                />
                <button onClick={addLink} className="bg-purple-600 hover:bg-purple-700 p-4 rounded-xl text-white transition-all active:scale-95 shadow-lg px-6">
                    <Plus size={18} />
                </button>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {settings.rotation?.links?.map(link => (
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
        </div>
      </div>
      
      <div className="bg-blue-600/5 p-10 rounded-[3rem] border border-blue-500/10 text-center">
          <ShieldCheck size={40} className="text-blue-500 mx-auto mb-4 opacity-40" />
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
              Direct Link Protocols Verified &bull; System Active
          </p>
      </div>
    </div>
  );
};
