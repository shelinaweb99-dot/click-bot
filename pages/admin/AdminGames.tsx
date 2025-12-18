
import React, { useState, useEffect, useRef } from 'react';
import { GameSettings, GameConfig } from '../../types';
import { getGameSettings, saveGameSettings, subscribeToChanges } from '../../services/mockDb';
import { Gamepad2, Save, Settings } from 'lucide-react';

export const AdminGames: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const isMounted = useRef(true);

  const fetchSettings = async () => {
    try {
        const data = await getGameSettings();
        if (isMounted.current) setSettings(data);
    } catch (e) {
        console.error("Game settings error", e);
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
        if (isMounted.current) alert("Game settings saved!");
    } catch (e) {
        alert("Failed to save settings");
    } finally {
        if (isMounted.current) setSaving(false);
    }
  };

  const updateConfig = (game: keyof GameSettings, field: keyof GameConfig, value: any) => {
      if (!settings) return;
      setSettings({
          ...settings,
          [game]: {
              ...settings[game],
              [field]: value
          }
      });
  };

  if (!settings) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="text-purple-500" /> Game Settings
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['spin', 'scratch', 'guess', 'lottery'] as const).map(game => (
                <div key={game} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white capitalize">{game} & Win</h2>
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={settings[game].isEnabled} 
                                onChange={(e) => updateConfig(game, 'isEnabled', e.target.checked)}
                                className="w-5 h-5 accent-purple-500"
                            />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-gray-400 text-sm">Daily Play Limit</label>
                            <input 
                                type="number" 
                                value={settings[game].dailyLimit}
                                onChange={(e) => updateConfig(game, 'dailyLimit', parseInt(e.target.value))}
                                className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-gray-400 text-sm">Min Reward</label>
                                <input 
                                    type="number" 
                                    value={settings[game].minReward}
                                    onChange={(e) => updateConfig(game, 'minReward', parseInt(e.target.value))}
                                    className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm">Max Reward</label>
                                <input 
                                    type="number" 
                                    value={settings[game].maxReward}
                                    onChange={(e) => updateConfig(game, 'maxReward', parseInt(e.target.value))}
                                    className="w-full bg-gray-700 text-white p-2 rounded mt-1"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
        >
            <Save size={18} /> {saving ? 'Saving...' : 'Save All Settings'}
        </button>
    </div>
  );
};
