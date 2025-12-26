
import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUserId, getShorts, getShortsSettings, getUserById, recordShortView, recordAdReward, getAdSettings } from '../../services/mockDb';
import { ShortVideo, ShortsSettings, AdSettings, User } from '../../types';
import { AdSimulator } from '../../components/AdSimulator';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import { Heart, Loader2, CheckCircle, Clock, Play, RefreshCw, Volume2, VolumeX, AlertTriangle } from 'lucide-react';

export const ShortsFeed: React.FC = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [settings, setSettings] = useState<ShortsSettings | null>(null);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true); 
  const [errorVideoId, setErrorVideoId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  const [watchProgress, setWatchProgress] = useState(0); 
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [currentVideoStatus, setCurrentVideoStatus] = useState<'IDLE' | 'WATCHING' | 'COMPLETED'>('IDLE');
  
  const [showAd, setShowAd] = useState(false);
  const [userShortsData, setUserShortsData] = useState<User['shortsData']>();
  
  const userId = getCurrentUserId();

  useEffect(() => {
      isMountedRef.current = true;
      return () => { isMountedRef.current = false; };
  }, []);

  const loadData = async (isRefresh = false) => {
      try {
        if (!userId) return;
        if (!isRefresh && isMountedRef.current) setLoading(true);

        const [allVideos, s, a, u] = await Promise.all([
            getShorts(),
            getShortsSettings(),
            getAdSettings(),
            getUserById(userId)
        ]);
        
        if (!isMountedRef.current) return;

        const now = Date.now();
        const validVideos = allVideos.filter(video => {
            const history = u?.shortsData?.lastWatched;
            const lastWatchedStr = (history instanceof Map) 
                ? history.get(video.id) 
                : (history ? (history as any)[video.id] : null);
            
            if (!lastWatchedStr) return true;
            const lastWatchedTime = new Date(lastWatchedStr).getTime();
            const diffHours = (now - lastWatchedTime) / (1000 * 60 * 60);
            return diffHours >= 24; 
        });

        setVideos(validVideos);
        setSettings(s);
        setAdSettings(a);
        if (u) setUserShortsData(u.shortsData);
      } catch (e) {
          console.error("Shorts init error", e);
      } finally {
          if (isMountedRef.current) setLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: any;
    const handleScroll = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (!isMountedRef.current || !container) return;
            const index = Math.round(container.scrollTop / container.clientHeight);
            if (index !== activeIndex && index >= 0 && index < videos.length) {
                setActiveIndex(index);
            }
        }, 100);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
        container.removeEventListener('scroll', handleScroll);
        clearTimeout(timeoutId);
    };
  }, [activeIndex, videos]);

  useEffect(() => {
    setWatchProgress(0);
    setIsTimerActive(false);
    setPlayingVideoId(null); 
    setVideoLoading(false);
    setErrorVideoId(null);
    setErrorCode(null);
    
    if (!videos[activeIndex]) {
        if (isMountedRef.current) setCurrentVideoStatus('IDLE');
        return;
    }

    setCurrentVideoStatus('IDLE');
    const timer = setTimeout(() => {
        if (isMountedRef.current && videos[activeIndex]) {
            handleManualPlay(videos[activeIndex].id);
        }
    }, 400); 
    return () => clearTimeout(timer);
  }, [activeIndex, videos]);

  useEffect(() => {
      if (!videos[activeIndex] || playingVideoId !== videos[activeIndex].id) return;

      let interval: any;
      if (currentVideoStatus === 'WATCHING' && settings) {
          setIsTimerActive(true);
          const tickRate = 200; 
          const totalTicks = (settings.minWatchTimeSec * 1000) / tickRate;
          
          interval = setInterval(() => {
              if (!isMountedRef.current) return clearInterval(interval);
              setWatchProgress(prev => {
                  const next = prev + (100 / totalTicks);
                  if (next >= 100) {
                      clearInterval(interval);
                      handleVideoComplete();
                      return 100;
                  }
                  return next;
              });
          }, tickRate);
      }
      return () => clearInterval(interval);
  }, [playingVideoId, currentVideoStatus, settings]);

  const handleManualPlay = (id: string) => {
      setVideoLoading(true);
      setErrorVideoId(null);
      setPlayingVideoId(id);
      if (currentVideoStatus !== 'COMPLETED') setCurrentVideoStatus('WATCHING');
  };

  const handleVideoComplete = async () => {
      if (!userId || !videos[activeIndex] || !isMountedRef.current) return;
      const videoId = videos[activeIndex].id;
      
      try {
          if (currentVideoStatus === 'COMPLETED') return;

          const res = await recordShortView(userId, videoId);
          if (isMountedRef.current && res.success) {
              setCurrentVideoStatus('COMPLETED');
              
              const newWatchedTodayCount = (userShortsData?.watchedTodayCount || 0) + 1;
              setUserShortsData(prev => ({
                  ...prev!,
                  watchedTodayCount: newWatchedTodayCount
              }));

              // AUTOMATIC AD TRIGGER
              const freq = settings?.adFrequency || 10;
              if (newWatchedTodayCount > 0 && newWatchedTodayCount % freq === 0) {
                  // Wait slightly for reward animation then force ad
                  setTimeout(() => {
                      if (isMountedRef.current) {
                          setShowAd(true);
                      }
                  }, 1500);
              }

              setTimeout(() => {
                  if (isMountedRef.current) {
                      setVideos(prev => prev.filter(v => v.id !== videoId));
                  }
              }, 2500);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const onAdComplete = async () => {
      setShowAd(false);
      if (!userId) return;
      try {
          await recordAdReward(userId);
          await loadData(true);
      } catch (e) { console.error(e); }
  };

  if (loading || !settings) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-[#030712]">
              <Loader2 className="animate-spin text-red-500 mb-4" size={40} />
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Generating Your Feed...</p>
          </div>
      );
  }

  if (videos.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-[#030712] text-white p-6 text-center animate-in fade-in duration-500">
              <Clock size={48} className="text-gray-700 mb-6" />
              <h2 className="text-2xl font-black tracking-tight uppercase">DAILY MISSIONS DONE</h2>
              <p className="text-gray-500 mt-2 text-sm max-w-[240px] leading-relaxed font-medium italic">You've watched all available videos for now. Each video resets 24 hours after completion.</p>
              <button onClick={() => loadData(true)} className="mt-8 bg-gray-900 border border-white/5 px-8 py-4 rounded-2xl text-blue-500 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl">
                Refresh Status
              </button>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 top-[60px] bottom-[70px] bg-black z-10">
        <div 
            ref={containerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {videos.map((video, index) => {
                const isActive = index === activeIndex;
                const isPlaying = isActive && playingVideoId === video.id;
                const hasError = errorVideoId === video.id;
                const shouldRender = index >= activeIndex - 1 && index <= activeIndex + 2;

                if (!shouldRender) return <div key={video.id} className="w-full h-full snap-start" />;

                return (
                    <div 
                        key={video.id} 
                        className="w-full h-full snap-start relative bg-black flex items-center justify-center"
                        style={{ scrollSnapStop: 'always' }}
                    >
                        <div className="absolute inset-0 z-0 opacity-40">
                             <img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} className="w-full h-full object-cover blur-3xl" alt="bg" />
                        </div>

                        <div className="relative z-10 w-full h-full max-w-[500px] flex items-center justify-center bg-black">
                             <img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${isPlaying && !videoLoading && !hasError ? 'opacity-0' : 'opacity-100'}`} alt="thumb" />

                            {isPlaying && !hasError && (
                                <YouTubePlayer
                                    videoId={video.youtubeId}
                                    className={`w-full h-full absolute inset-0 z-20 ${videoLoading ? 'opacity-0' : 'opacity-100'}`}
                                    autoplay={true}
                                    muted={isMuted}
                                    controls={false}
                                    onReady={() => setVideoLoading(false)}
                                    onError={(code) => { setErrorVideoId(video.id); setErrorCode(code); }}
                                />
                            )}
                            
                            {isPlaying && videoLoading && <Loader2 className="absolute z-30 animate-spin text-white opacity-50" size={50} />}

                             {hasError && (
                                 <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
                                     <AlertTriangle size={40} className="text-red-500 mb-3" />
                                     <p className="font-bold text-white mb-6">Restricted View</p>
                                     <button onClick={() => containerRef.current?.scrollBy(0, window.innerHeight)} className="bg-white/10 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest">Skip Video</button>
                                 </div>
                             )}

                             {!isPlaying && !hasError && (
                                <button className="absolute inset-0 z-30 flex items-center justify-center" onClick={() => handleManualPlay(video.id)}>
                                    <div className="bg-white/10 p-5 rounded-full text-white backdrop-blur-md animate-pulse"><Play fill="currentColor" /></div>
                                </button>
                             )}
                        </div>

                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-50 bg-gradient-to-b from-black/50 via-transparent to-black/90">
                            <div className="flex justify-between items-start">
                                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white border border-white/5">
                                    {index + 1} / {videos.length} Available
                                </div>
                                <button onClick={() => setIsMuted(!isMuted)} className="bg-black/40 backdrop-blur-md p-3 rounded-2xl text-white/80 border border-white/5 pointer-events-auto">
                                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>

                            <div className="mb-12 flex items-end justify-between w-full">
                                <div className="flex-1 pr-12">
                                    <h3 className="text-white font-black text-xl drop-shadow-xl line-clamp-2 leading-tight uppercase tracking-tighter">
                                        {video.title || 'Reward Shorts'}
                                    </h3>
                                    
                                    {currentVideoStatus === 'COMPLETED' ? (
                                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg animate-in zoom-in">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            +{settings.pointsPerVideo} Pts Claimed
                                        </div>
                                    ) : (
                                        <div className="mt-5 w-full max-w-[200px] h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-200" style={{ width: `${watchProgress}%` }} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-5 items-center pointer-events-auto">
                                    <div className={`p-4 rounded-2xl transition-all shadow-xl ${currentVideoStatus === 'COMPLETED' ? 'bg-red-500 scale-110' : 'bg-gray-900 border border-white/5'}`}>
                                        <Heart size={24} className="text-white" fill={currentVideoStatus === 'COMPLETED' ? "currentColor" : "none"} />
                                    </div>
                                    <button onClick={() => loadData(true)} className="p-4 bg-gray-900 rounded-2xl text-white border border-white/5 shadow-xl active:rotate-180 transition-transform">
                                        <RefreshCw size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {adSettings && (
            <AdSimulator 
                isOpen={showAd} 
                onComplete={onAdComplete} 
                settings={adSettings} 
                type="DIRECT" 
            />
        )}
    </div>
  );
};
