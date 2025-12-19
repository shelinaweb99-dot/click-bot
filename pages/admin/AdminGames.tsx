
import React, { useEffect, useState, useRef } from 'react';
import { GameSettings, GameConfig } from '../../types';
import { getGameSettings, saveGameSettings, subscribeToChanges } from '../../services/mockDb';
import { Gamepad2, Save, Loader2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export const AdminGames: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchSettings = async () => {
    try {
        if (isMounted.current) setLoading(true);
        const data = await getGameSettings();
        if (isMounted.current) {
            setSettings(data);
            setLoading(false);
        }
    } catch (e) {
        console.error("Game settings error", e);
        if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchSettings();
    const unsubscribe = subscribeToChanges(() => {
        if(isMounted.current) fetchSettings();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
        await saveGameSettings(settings);
        alert("Game configurations updated in central database.");
    } catch (e) {
        alert("Failed to save settings. Check connection.");
    } finally {
        if (isMounted.current) setSaving(false);
    }
  };

  // Defensive helper to prevent crashes if a game key is missing in DB
  const safeGetConfig = (game: keyof GameSettings): GameConfig => {
      const defaultConf: GameConfig = { isEnabled: false, dailyLimit: 10, minReward: 1, maxReward: 10 };
      if (!settings || !settings[game]) return defaultConf;
      return {
          ...defaultConf,
          ...settings[game]
      };
  };

  const updateConfig = (game: keyof GameSettings, field: keyof GameConfig, value: any) => {
      if (!settings) return;
      const current = safeGetConfig(game);
      setSettings({
          ...settings,
          [game]: {
              ...current,
              [field]: value
          }
      });
  };

  if (loading) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-purple-500" size={40} />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Accessing Game Engine</p>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Gamepad2 className="text-purple-500" size={36} /> Game Lab
                </h1>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Mini-Game Economy & Limits</p>
            </div>
            <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-purple-900/20 active:scale-95"
            >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Commit Changes'}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['spin', 'scratch', 'guess', 'lottery'] as const).map(game => {
                const config = safeGetConfig(game);
                return (
                    <div key={game} className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative group transition-all hover:border-purple-500/20">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white capitalize tracking-tight flex items-center gap-2">
                                <ShieldCheck size={18} className="text-purple-400" /> {game}
                            </h2>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={config.isEnabled} 
                                    onChange={(e) => updateConfig(game, 'isEnabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Daily Player Limit</label>
                                <input 
                                    type="number" 
                                    value={config.dailyLimit}
                                    onChange={(e) => updateConfig(game, 'dailyLimit', parseInt(e.target.value) || 0)}
                                    className="w-full bg-[#0b1120] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Min Reward</label>
                                    <input 
                                        type="number" 
                                        value={config.minReward}
                                        onChange={(e) => updateConfig(game, 'minReward', parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#0b1120] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Max Reward</label>
                                    <input 
                                        type="number" 
                                        value={config.maxReward}
                                        onChange={(e) => updateConfig(game, 'maxReward', parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#0b1120] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
