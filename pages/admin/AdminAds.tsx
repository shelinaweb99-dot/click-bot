
import React, { useState, useEffect, useRef } from 'react';
import { getAdSettings, saveAdSettings, subscribeToChanges } from '../../services/mockDb';
import { AdSettings } from '../../types';
import { 
  MonitorPlay, 
  Save, 
  Loader2, 
  ShieldCheck,
  Info,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  FileCode
} from 'lucide-react';

export const AdminAds: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useRef(true);

  const defaultAdSettings: AdSettings = {
    isGlobalEnabled: true,
    bannerAd: {
        isEnabled: false,
        scriptHtml: '',
        height: 50
    },
    nativeBanner: {
        isEnabled: false,
        scriptHtml: ''
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
            bannerAd: {
                ...defaultAdSettings.bannerAd!,
                ...(data?.bannerAd || {})
            },
            nativeBanner: {
                ...defaultAdSettings.nativeBanner!,
                ...(data?.nativeBanner || {})
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
      alert("Success: Ad protocols synchronized.");
    } catch (e) {
      alert("Error: Failed to update ad settings.");
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
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
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Monetization & Script Control</p>
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

      <div className={`grid grid-cols-1 gap-8 transition-opacity duration-500 ${!settings.isGlobalEnabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
        
        {/* Adsterra Bottom Banner Hub */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500 border border-emerald-500/10">
                        <MonitorPlay size={20} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Bottom Banner Hub</h2>
                </div>
                <button 
                    onClick={() => setSettings({ ...settings, bannerAd: { ...settings.bannerAd!, isEnabled: !settings.bannerAd?.isEnabled } })}
                    className={`transition-all ${settings.bannerAd?.isEnabled ? 'text-emerald-500' : 'text-gray-600'}`}
                >
                    {settings.bannerAd?.isEnabled ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
                </button>
            </div>

            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 flex gap-3">
              <Info className="text-emerald-500 shrink-0" size={18} />
              <p className="text-gray-400 text-[10px] leading-relaxed">
                 Configure your Adsterra 320x50 or 320x100 banner. This banner remains fixed above the navigation bar.
              </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Banner Script HTML</label>
                    <textarea 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-emerald-500/50 outline-none font-mono text-[10px] shadow-inner h-32"
                        placeholder="Paste Adsterra banner script tags here..."
                        value={settings.bannerAd?.scriptHtml || ''}
                        onChange={e => setSettings({ ...settings, bannerAd: { ...settings.bannerAd!, scriptHtml: e.target.value } })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Banner Height (px)</label>
                    <div className="flex gap-4">
                        {[50, 100].map(h => (
                            <button 
                                key={h}
                                onClick={() => setSettings({ ...settings, bannerAd: { ...settings.bannerAd!, height: h } })}
                                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${settings.bannerAd?.height === h ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-800 text-gray-500 border-white/5'}`}
                            >
                                {h}px
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Task Completion Native Banner */}
        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 border border-orange-500/10">
                        <FileCode size={20} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Task Native Banner</h2>
                </div>
                <button 
                    onClick={() => setSettings({ ...settings, nativeBanner: { ...settings.nativeBanner!, isEnabled: !settings.nativeBanner?.isEnabled } })}
                    className={`transition-all ${settings.nativeBanner?.isEnabled ? 'text-orange-500' : 'text-gray-600'}`}
                >
                    {settings.nativeBanner?.isEnabled ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
                </button>
            </div>

            <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10 flex gap-3">
              <Info className="text-orange-500 shrink-0" size={18} />
              <p className="text-gray-400 text-[10px] leading-relaxed">
                 Configure your Native Banner script (e.g., Adsterra Native). This ad pops up automatically after a user successfully completes any task.
              </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Native Ad Script HTML</label>
                    <textarea 
                        className="w-full bg-[#0b1120] border border-white/5 text-white p-5 rounded-2xl focus:border-orange-500/50 outline-none font-mono text-[10px] shadow-inner h-48"
                        placeholder="Paste your Native Banner script HTML here..."
                        value={settings.nativeBanner?.scriptHtml || ''}
                        onChange={e => setSettings({ ...settings, nativeBanner: { ...settings.nativeBanner!, scriptHtml: e.target.value } })}
                    />
                </div>
            </div>
        </div>
      </div>
      
      <div className="bg-blue-600/5 p-10 rounded-[3rem] border border-blue-500/10 text-center">
          <ShieldCheck size={40} className="text-blue-500 mx-auto mb-4 opacity-40" />
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
              Ad Protocols Verified &bull; System Active
          </p>
      </div>
    </div>
  );
};
