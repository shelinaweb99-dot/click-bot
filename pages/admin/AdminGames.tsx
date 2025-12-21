
import React, { useEffect, useState, useRef } from 'react';
import { GameSettings, GameConfig } from '../../types';
import { getGameSettings, saveGameSettings, subscribeToChanges } from '../../services/mockDb';
import { Gamepad2, Save, Loader2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export const AdminGames: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchSettings = async () => {
    try {
        if (isMounted.current) {
            setLoading(true);
            setError(null);
        }
        
        const data = await getGameSettings();
        
        if (isMounted.current) {
            if (data && typeof data === 'object') {
                setSettings(data);
            } else {
                throw new Error("Invalid data format received from system.");
            }
        }
    } catch (e: any) {
        console.error("Game settings fetch error:", e);
        if (isMounted.current) {
            setError(e.message || "Failed to establish connection with the game engine.");
        }
    } finally {
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
        alert("Success: Game configurations synchronized with central database.");
    } catch (e: any) {
        alert("Sync Failed: " + (e.message || "Connection interrupted."));
    } finally {
        if (isMounted.current) setSaving(false);
    }
  };

  // Defensive helper to prevent crashes if a game key is missing in DB
  const safeGetConfig = (game: keyof GameSettings): GameConfig => {
      const defaultConf: GameConfig = { isEnabled: false, dailyLimit: 10, minReward: 1, maxReward: 10 };
      if (!settings) return defaultConf;
      
      const gameConf = settings[game];
      if (!gameConf) return defaultConf;

      return {
          ...defaultConf,
          ...gameConf
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

  if (loading) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <Loader2 className="animate-spin text-purple-500" size={48} />
                <div className="absolute inset-0 bg-purple-500/10 blur-xl animate-pulse"></div>
              </div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Accessing Game Core</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-12 bg-red-500/5 rounded-[3rem] border border-red-500/10 animate-in fade-in duration-500">
              <div className="bg-red-500/10 p-5 rounded-full mb-6">
                <AlertCircle className="text-red-500" size={56} />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">System Desync</h2>
              <p className="text-gray-500 text-sm mt-3 mb-10 max-w-sm leading-relaxed">{error}</p>
              <button 
                onClick={fetchSettings} 
                className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-purple-900/30"
              >
                <RefreshCw size={18} /> Re-Initialize Engine
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="bg-purple-600/10 p-2.5 rounded-xl text-purple-500 border border-purple-500/10">
                        <Gamepad2 size={24} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Game Lab</h1>
                </div>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Economy & Play Limitations</p>
            </div>
            <button 
                onClick={handleSave}
                disabled={saving || !settings}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-purple-900/30 active:scale-95 border border-purple-400/10"
            >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Synchronizing...' : 'Commit Changes'}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(['spin', 'scratch', 'guess', 'lottery'] as const).map(game => {
                const config = safeGetConfig(game);
                return (
                    <div key={game} className="bg-[#1e293b] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group transition-all hover:border-purple-500/20">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-white capitalize tracking-tighter flex items-center gap-3">
                                    <ShieldCheck size={22} className="text-purple-400" /> {game}
                                </h2>
                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1 italic">Status: {config.isEnabled ? 'Online' : 'Offline'}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={config.isEnabled} 
                                    onChange={(e) => updateConfig(game, 'isEnabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-16 h-8 bg-gray-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 border border-white/5"></div>
                            </label>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-2.5">
                                <label className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Daily Frequency Limit</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={config.dailyLimit}
                                        onChange={(e) => updateConfig(game, 'dailyLimit', parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#0b1120] text-white p-5 rounded-2xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-mono text-lg shadow-inner"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 text-[10px] font-black uppercase">Plays</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Min Payout</label>
                                    <input 
                                        type="number" 
                                        value={config.minReward}
                                        onChange={(e) => updateConfig(game, 'minReward', parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#0b1120] text-white p-5 rounded-2xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-mono text-lg shadow-inner"
                                        placeholder="1"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Max Payout</label>
                                    <input 
                                        type="number" 
                                        value={config.maxReward}
                                        onChange={(e) => updateConfig(game, 'maxReward', parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#0b1120] text-white p-5 rounded-2xl border border-white/5 outline-none focus:border-purple-500/50 transition-all font-mono text-lg shadow-inner"
                                        placeholder="10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        
        <div className="bg-purple-600/5 p-8 rounded-[2.5rem] border border-purple-500/10 text-center">
            <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest leading-relaxed">
                Platform safety: Changes take effect globally after synchronization. <br/>Ensure rewards are balanced with your points-to-USDT exchange rate.
            </p>
        </div>
    </div>
  );
};
