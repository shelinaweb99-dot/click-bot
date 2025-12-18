
import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUserId, getShorts, getShortsSettings, getUserById, recordShortView, recordAdReward, getAdSettings } from '../../services/mockDb';
import { ShortVideo, ShortsSettings, AdSettings, User } from '../../types';
import { AdSimulator } from '../../components/AdSimulator';
import { YouTubePlayer } from '../../components/YouTubePlayer';
import { Heart, Loader2, Info, CheckCircle, Clock, Play, RefreshCw, ExternalLink, Volume2, VolumeX, SkipForward, AlertTriangle } from 'lucide-react';

export const ShortsFeed: React.FC = () => {
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [settings, setSettings] = useState<ShortsSettings | null>(null);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  
  // Player State
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true); 
  const [errorVideoId, setErrorVideoId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Timer State
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

  // Load Data & Filter 24h Watched Videos
  useEffect(() => {
    const init = async () => {
      try {
        if (!userId) return;
        
        const [allVideos, s, a, u] = await Promise.all([
            getShorts(),
            getShortsSettings(),
            getAdSettings(),
            getUserById(userId)
        ]);
        
        if (!isMountedRef.current) return;

        // --- FILTER LOGIC: HIDE VIDEOS WATCHED IN LAST 24 HOURS ---
        const now = Date.now();
        const validVideos = allVideos.filter(video => {
            if (!u?.shortsData?.lastWatched?.[video.id]) return true; // Not watched yet
            
            const lastWatchedTime = new Date(u.shortsData.lastWatched[video.id]).getTime();
            const diffHours = (now - lastWatchedTime) / (1000 * 60 * 60);
            
            // Only show if more than 24 hours have passed
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
    init();
  }, [userId]);

  // Scroll Handler (Debounced)
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
        }, 50); // Fast debounce
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
        container.removeEventListener('scroll', handleScroll);
        clearTimeout(timeoutId);
    };
  }, [activeIndex, videos]);

  // Handle Swipe/Scroll Changes & Autoplay
  useEffect(() => {
    setWatchProgress(0);
    setIsTimerActive(false);
    setPlayingVideoId(null); 
    setVideoLoading(false);
    setErrorVideoId(null);
    setErrorCode(null);
    
    if (!userId || !videos[activeIndex] || !userShortsData) {
        if (isMountedRef.current) setCurrentVideoStatus('IDLE');
        return;
    }

    // Since we filter out watched videos on load, we assume IDLE unless it's the one we JUST watched in this session
    if (userShortsData.lastWatched?.[videos[activeIndex].id]) {
         // Check time diff again just in case (for session updates)
         const lastWatched = new Date(userShortsData.lastWatched[videos[activeIndex].id]).getTime();
         if (Date.now() - lastWatched < 24 * 60 * 60 * 1000) {
             if (isMountedRef.current) setCurrentVideoStatus('COMPLETED');
         } else {
             if (isMountedRef.current) setCurrentVideoStatus('IDLE');
         }
    } else {
        if (isMountedRef.current) setCurrentVideoStatus('IDLE'); 
    }
    
    // Autoplay logic
    const timer = setTimeout(() => {
        if (isMountedRef.current) handleManualPlay(videos[activeIndex].id);
    }, 500); 
    
    return () => {
        clearTimeout(timer);
    };

  }, [activeIndex, videos, userId, userShortsData]);

  // Timer Logic
  useEffect(() => {
      if (playingVideoId !== videos[activeIndex]?.id) return;

      let interval: any;
      if (currentVideoStatus === 'WATCHING' && settings) {
          setIsTimerActive(true);
          const tickRate = 100; 
          const totalTicks = (settings.minWatchTimeSec * 1000) / tickRate;
          
          interval = setInterval(() => {
              if (!isMountedRef.current) {
                  clearInterval(interval);
                  return;
              }
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
  }, [playingVideoId, currentVideoStatus, settings, activeIndex, videos]);

  const handleManualPlay = (id: string) => {
      if (!isMountedRef.current) return;
      setVideoLoading(true);
      setErrorVideoId(null);
      setErrorCode(null);
      setPlayingVideoId(id);
      if (currentVideoStatus !== 'COMPLETED') {
          setCurrentVideoStatus('WATCHING');
      }
  };

  const handlePlayerError = (id: string, code: number) => {
      if (!isMountedRef.current) return;
      setVideoLoading(false);
      setErrorVideoId(id);
      setErrorCode(code);
  };

  const getFriendlyErrorMessage = (code: number | null) => {
      switch (code) {
          case 100: return "Video not found";
          case 101: 
          case 150: 
          case 153: return "Restricted by owner";
          case 2: return "Invalid Video ID";
          case 5: return "HTML5 Player Error";
          default: return "Playback Error";
      }
  };

  const handleNextVideo = () => {
      if (containerRef.current && activeIndex < videos.length - 1) {
          const nextIndex = activeIndex + 1;
          containerRef.current.scrollTo({
              top: nextIndex * containerRef.current.clientHeight,
              behavior: 'smooth'
          });
      }
  };

  const handleVideoComplete = async () => {
      setIsTimerActive(false);
      if (!userId || !videos[activeIndex] || !isMountedRef.current) return;

      const videoId = videos[activeIndex].id;
      
      try {
          if (currentVideoStatus === 'COMPLETED') return;

          const res = await recordShortView(userId, videoId);
          if (isMountedRef.current) {
              if (res.success) {
                  setCurrentVideoStatus('COMPLETED');
                  
                  // Update local state to reflect completion immediately safely
                  setUserShortsData(prev => {
                      const base = prev || { lastWatched: {}, watchedTodayCount: 0, lastResetDate: new Date().toISOString().split('T')[0] };
                      return {
                          ...base,
                          lastWatched: { ...base.lastWatched, [videoId]: new Date().toISOString() },
                          watchedTodayCount: base.watchedTodayCount + 1
                      };
                  });
                  
                  if (settings && (userShortsData?.watchedTodayCount || 0) % settings.adFrequency === 0) {
                       setTimeout(() => {
                           if (isMountedRef.current) setShowAd(true);
                       }, 1500); 
                  }
              }
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
      } catch (e) { console.error(e); }
  };

  const toggleMute = () => {
      setIsMuted(!isMuted);
  };

  if (loading || !settings) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-black">
              <Loader2 className="animate-spin text-red-500 mb-4" size={40} />
              <p className="text-white">Loading Feed...</p>
          </div>
      );
  }

  if (videos.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-black text-white p-6 text-center">
              <Info size={48} className="text-gray-500 mb-4" />
              <h2 className="text-xl font-bold">All Caught Up!</h2>
              <p className="text-gray-400 mt-2">You've watched all available videos.</p>
              <p className="text-xs text-gray-500 mt-1">Videos reappear after 24 hours.</p>
              <button onClick={() => window.location.reload()} className="mt-6 bg-gray-800 px-4 py-2 rounded-full text-blue-400 text-sm">Refresh Feed</button>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 top-[60px] bottom-[70px] bg-black z-10">
        <div 
            ref={containerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
            style={{ scrollBehavior: 'smooth' }}
        >
            {videos.map((video, index) => {
                const isActive = index === activeIndex;
                const isPlaying = isActive && playingVideoId === video.id;
                const hasError = errorVideoId === video.id;
                
                // Preload Logic: Render previous 1, current, and next 2 videos
                const shouldRender = index >= activeIndex - 1 && index <= activeIndex + 2;

                if (!shouldRender) return <div key={video.id} className="w-full h-full snap-start snap-always" />;

                const displayTitle = video.title || 'Viral Short';
                const displayAuthor = 'YouTube Shorts';

                return (
                    <div 
                        key={video.id} 
                        className="w-full h-full snap-start snap-always relative bg-black flex items-center justify-center border-b border-gray-900"
                        style={{ scrollSnapStop: 'always' }} // Forces scroll to stop at this element
                    >
                        
                        {/* 1. Low Quality Blur BG */}
                        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                             <img 
                                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} 
                                className="w-full h-full object-cover blur-md"
                                alt="bg"
                            />
                        </div>

                        {/* 2. Video Container */}
                        <div className="relative z-10 w-full h-full max-w-[500px] flex items-center justify-center bg-black shadow-2xl">
                             <img 
                                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} 
                                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${isPlaying && !videoLoading && !hasError ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                alt="thumb"
                            />

                            {isPlaying && !hasError && (
                                <YouTubePlayer
                                    videoId={video.youtubeId}
                                    className={`w-full h-full absolute inset-0 z-20 ${videoLoading ? 'opacity-0' : 'opacity-100'}`}
                                    autoplay={true}
                                    muted={isMuted}
                                    controls={false}
                                    onReady={() => setVideoLoading(false)}
                                    onError={(code) => handlePlayerError(video.id, code)}
                                />
                            )}
                            
                            {isPlaying && videoLoading && !hasError && (
                                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                    <Loader2 className="animate-spin text-white drop-shadow-md" size={50} />
                                </div>
                            )}

                             {hasError && (
                                 <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center animate-in fade-in">
                                     <AlertTriangle size={40} className="text-red-500 mb-3" />
                                     <p className="font-bold text-lg mb-1">{getFriendlyErrorMessage(errorCode)}</p>
                                     <p className="text-xs text-gray-400 mb-6">You can watch it externally or skip.</p>
                                     
                                     <div className="flex flex-col gap-3 w-full max-w-xs">
                                         <a href={video.url} target="_blank" rel="noreferrer" className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition w-full">
                                             Watch on YouTube <ExternalLink size={16}/>
                                         </a>
                                         <button onClick={handleNextVideo} className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition w-full">
                                             Play Next Video <SkipForward size={16}/>
                                         </button>
                                     </div>
                                 </div>
                             )}

                             {!isPlaying && !hasError && (
                                <button 
                                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 w-full h-full"
                                    onClick={() => handleManualPlay(video.id)}
                                >
                                    <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full text-white animate-pulse ring-4 ring-white/10 hover:scale-110 transition">
                                        <Play size={40} fill="currentColor" />
                                    </div>
                                </button>
                             )}
                        </div>

                        {/* 3. Controls & Overlay Info */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-50 bg-gradient-to-b from-black/60 via-transparent to-black/80">
                            
                            <div className="flex justify-between items-start pt-safe">
                                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white border border-white/10 shadow-sm">
                                    Shorts Feed
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={toggleMute}
                                        className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white/80 border border-white/10 pointer-events-auto active:scale-90 transition"
                                    >
                                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-16 md:mb-8 flex items-end justify-between w-full">
                                <div className="flex-1 pr-12">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-red-600 p-1 rounded-md">
                                            <Play size={12} className="text-white" fill="currentColor" />
                                        </div>
                                        <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{displayAuthor}</span>
                                    </div>
                                    <h3 className="text-white font-bold text-lg drop-shadow-lg leading-tight line-clamp-2">
                                        {displayTitle}
                                    </h3>
                                    
                                    {currentVideoStatus === 'COMPLETED' ? (
                                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-500/90 text-white text-xs font-bold rounded-lg backdrop-blur-sm animate-in zoom-in">
                                            <CheckCircle size={12} /> +{settings.pointsPerVideo} Points
                                        </div>
                                    ) : (
                                        <div className="mt-3 w-full max-w-[200px] h-1 bg-gray-600/50 rounded-full overflow-hidden backdrop-blur-sm">
                                            <div 
                                                className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] transition-all duration-100 ease-linear"
                                                style={{ width: `${watchProgress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-4 items-center pointer-events-auto">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`p-3 rounded-full transition-all duration-300 transform ${currentVideoStatus === 'COMPLETED' ? 'bg-red-500 scale-110 ring-4 ring-red-500/30' : 'bg-gray-800/80 hover:bg-gray-700'}`}>
                                            <Heart size={24} className="text-white" fill={currentVideoStatus === 'COMPLETED' ? "currentColor" : "none"} />
                                        </div>
                                        <span className="text-[10px] font-bold text-white drop-shadow-md">
                                            {currentVideoStatus === 'COMPLETED' ? 'Done' : 'Earn'}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => handleManualPlay(video.id)}
                                        className="p-3 bg-gray-800/80 hover:bg-gray-700 rounded-full text-white backdrop-blur-sm transition active:rotate-180"
                                    >
                                        <RefreshCw size={20} />
                                    </button>

                                    <a 
                                        href={video.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-3 bg-gray-800/80 hover:bg-gray-700 rounded-full text-white backdrop-blur-sm transition"
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {adSettings && <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />}
    </div>
  );
};
