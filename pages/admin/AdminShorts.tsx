
import React, { useState, useEffect, useRef } from 'react';
import { ShortVideo, ShortsSettings } from '../../types';
import { getShortsSettings, saveShortsSettings, subscribeToChanges, addShort, deleteShort, getManualShorts } from '../../services/mockDb';
import { PlaySquare, Save, Settings, Search, Plus, Trash2, Video, Youtube, ExternalLink, Info, LayoutList, AlertCircle, Clock } from 'lucide-react';

export const AdminShorts: React.FC = () => {
  const [settings, setSettings] = useState<ShortsSettings | null>(null);
  const [manualVideos, setManualVideos] = useState<ShortVideo[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
        const [settingsData, manualData] = await Promise.all([
             getShortsSettings(),
             getManualShorts()
        ]);
        if (isMounted.current) {
            setSettings(settingsData);
            setManualVideos(manualData);
        }
    } catch (e) {
        console.error("Fetch shorts data error", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const unsubscribe = subscribeToChanges(() => {
        if (isMounted.current) fetchData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!settings) return;
      setIsSavingSettings(true);
      try {
          await saveShortsSettings(settings);
          if (isMounted.current) alert("Settings Saved!");
      } catch (e) {
          console.error(e);
      } finally {
          if (isMounted.current) setIsSavingSettings(false);
      }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newVideoUrl) return;
      setIsAddingVideo(true);
      try {
          await addShort(newVideoUrl);
          if (isMounted.current) {
              setNewVideoUrl('');
              // fetchData() triggers via listener
          }
      } catch (e) {
          alert("Error adding video: " + (e as Error).message);
      } finally {
          if (isMounted.current) setIsAddingVideo(false);
      }
  };

  const handleDeleteVideo = async (id: string) => {
      if (window.confirm("Delete this video from the manual list?")) {
          await deleteShort(id);
      }
  };

  if (!settings) return <div className="text-white p-6 flex items-center gap-2"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> Loading configuration...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-700 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <div className="bg-red-600/20 p-3 rounded-xl text-red-500">
                    <PlaySquare size={32} />
                </div>
                Shorts Feed Control
            </h1>
            <p className="text-gray-400 mt-2">Manage the viral video feed, earnings, and auto-fetch algorithms.</p>
          </div>
          <button 
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
              <Save size={20} /> {isSavingSettings ? 'Saving...' : 'Save Configuration'}
          </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Playlist Management (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Add New Video Card */}
              <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                  <div className="p-6 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <LayoutList className="text-blue-400" /> Manual Playlist
                      </h2>
                      <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full border border-gray-600">
                          {manualVideos.length} Videos
                      </span>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
                          <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-200">
                              Videos added here are prioritized in the user's feed. They are mixed with auto-fetched content if enabled.
                          </p>
                      </div>

                      <form onSubmit={handleAddVideo} className="relative">
                          <input 
                             type="text" 
                             className="w-full bg-gray-900 text-white p-4 pl-12 pr-32 rounded-xl border border-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all placeholder:text-gray-600"
                             placeholder="Paste YouTube Link (e.g. https://youtube.com/shorts/...)"
                             value={newVideoUrl}
                             onChange={e => setNewVideoUrl(e.target.value)}
                          />
                          <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                          <button 
                            type="submit"
                            disabled={isAddingVideo || !newVideoUrl}
                            className="absolute right-2 top-2 bottom-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-6 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                          >
                              {isAddingVideo ? 'Adding...' : <><Plus size={16} /> Add Video</>}
                          </button>
                      </form>
                  </div>
              </div>

              {/* Video List */}
              <div className="space-y-3">
                  {manualVideos.length === 0 ? (
                      <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700 border-dashed">
                          <Video size={48} className="mx-auto text-gray-600 mb-3" />
                          <p className="text-gray-400 font-medium">No manual videos added yet</p>
                          <p className="text-sm text-gray-500">Paste a link above to get started</p>
                      </div>
                  ) : (
                      manualVideos.map(video => (
                          <div key={video.id} className="group flex items-center gap-4 bg-gray-800 hover:bg-gray-750 p-3 pr-4 rounded-xl border border-gray-700 hover:border-gray-600 transition-all shadow-sm">
                              {/* Thumbnail */}
                              <div className="relative w-32 h-20 rounded-lg overflow-hidden shrink-0 bg-black">
                                  <img 
                                    src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                    alt="thumb" 
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="bg-black/50 p-1.5 rounded-full backdrop-blur-sm">
                                          <Youtube size={16} className="text-white" />
                                      </div>
                                  </div>
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0 py-1">
                                  <h3 className="text-white font-bold truncate pr-4">{video.title || `Video ${video.youtubeId}`}</h3>
                                  <a href={video.url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline truncate flex items-center gap-1 mt-1">
                                      {video.url} <ExternalLink size={10} />
                                  </a>
                                  <p className="text-gray-500 text-[10px] mt-2">Added: {new Date(video.addedAt).toLocaleDateString()}</p>
                              </div>

                              {/* Actions */}
                              <button 
                                onClick={() => handleDeleteVideo(video.id)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700/50 text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                title="Remove Video"
                              >
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* Right Column: Settings (1/3 width) */}
          <div className="space-y-6">
              
              {/* Main Toggle Card */}
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 flex items-center justify-between">
                  <div>
                      <h3 className="font-bold text-white text-lg">Shorts Feature</h3>
                      <p className={`text-xs mt-1 font-medium ${settings.isEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                          {settings.isEnabled ? 'Active & Visible' : 'Disabled globally'}
                      </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.isEnabled} 
                        onChange={e => setSettings({...settings!, isEnabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
              </div>

              {/* Configuration Card */}
              <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                  <div className="p-4 bg-gray-900/50 border-b border-gray-700">
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <Settings size={18} className="text-purple-400" /> Auto-Fetch & Rewards
                      </h3>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      
                      {/* Keywords */}
                      <div className="space-y-2">
                          <label className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                             <Search size={12} /> Auto-Fetch Keywords
                          </label>
                          <textarea 
                            className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-600 focus:border-purple-500 outline-none text-sm min-h-[80px]"
                            value={settings.shortsKeywords || ''}
                            onChange={e => setSettings({...settings!, shortsKeywords: e.target.value})}
                            placeholder="e.g. funny shorts, minecraft, tech news"
                          />
                          <p className="text-[10px] text-gray-500 leading-relaxed">
                              If YouTube API Key is set in System Settings, videos matching these terms will be fetched automatically to fill the feed.
                          </p>
                      </div>

                      <div className="h-px bg-gray-700 my-4" />

                      {/* Reward Settings */}
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <label className="text-gray-400 text-xs font-bold uppercase tracking-wider">Per Video</label>
                                  <div className="relative">
                                      <input 
                                        type="number" 
                                        className="w-full bg-gray-900 text-white p-3 pl-8 rounded-xl border border-gray-600 focus:border-green-500 outline-none font-mono"
                                        value={settings.pointsPerVideo}
                                        onChange={e => setSettings({...settings!, pointsPerVideo: Number(e.target.value)})}
                                      />
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Pts</span>
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-gray-400 text-xs font-bold uppercase tracking-wider">Per Ad</label>
                                  <div className="relative">
                                      <input 
                                        type="number" 
                                        className="w-full bg-gray-900 text-white p-3 pl-8 rounded-xl border border-gray-600 focus:border-green-500 outline-none font-mono"
                                        value={settings.pointsPerAd}
                                        onChange={e => setSettings({...settings!, pointsPerAd: Number(e.target.value)})}
                                      />
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Pts</span>
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-1">
                              <label className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                  <AlertCircle size={12} /> Ad Frequency
                              </label>
                              <div className="flex items-center gap-3 bg-gray-900 p-2 rounded-xl border border-gray-600">
                                  <input 
                                    type="range" 
                                    min="1" 
                                    max="20"
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    value={settings.adFrequency}
                                    onChange={e => setSettings({...settings!, adFrequency: Number(e.target.value)})}
                                  />
                                  <span className="bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-mono border border-gray-600 min-w-[3rem] text-center">
                                      {settings.adFrequency}
                                  </span>
                              </div>
                              <p className="text-[10px] text-gray-500">Show an ad after every {settings.adFrequency} videos watched.</p>
                          </div>

                          <div className="space-y-1">
                              <label className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                  <Clock size={12} /> Min Watch Time
                              </label>
                              <div className="relative">
                                  <input 
                                    type="number" 
                                    className="w-full bg-gray-900 text-white p-3 pl-3 pr-12 rounded-xl border border-gray-600 focus:border-orange-500 outline-none font-mono"
                                    value={settings.minWatchTimeSec}
                                    onChange={e => setSettings({...settings!, minWatchTimeSec: Number(e.target.value)})}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Seconds</span>
                              </div>
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
