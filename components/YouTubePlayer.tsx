
import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onReady?: (event: any) => void;
  onStateChange?: (event: any) => void;
  onError?: (errorCode: number) => void;
  onEnded?: () => void;
  className?: string;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
    videoId, width = '100%', height = '100%', autoplay = false, muted = true, controls = false,
    onReady, onStateChange, onError, onEnded, className 
}) => {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerId = useRef(`yt-player-${Math.random().toString(36).substr(2, 9)}`);
    const isMounted = useRef(true);
    const apiLoaded = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!videoId) return;

        // Cleanup function to destroy player on unmount/change
        const destroyPlayer = () => {
             if (playerRef.current) {
                 try { 
                     // Check if destroy method exists before calling
                     if (typeof playerRef.current.destroy === 'function') {
                         playerRef.current.destroy();
                     }
                 } catch (e) { console.warn("YT destroy error", e); }
                 playerRef.current = null;
             }
        };

        const createPlayer = () => {
             if (!isMounted.current) return;
             if (!containerRef.current) return;
             
             destroyPlayer();

             // Ensure container is empty and ready
             containerRef.current.innerHTML = `<div id="${playerId.current}"></div>`;

             // Handle Origin correctly for mobile wrappers/local dev
             let origin = 'https://www.youtube.com';
             if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
                 origin = window.location.origin;
             }

             try {
                 playerRef.current = new window.YT.Player(playerId.current, {
                     videoId: videoId,
                     width: '100%',
                     height: '100%',
                     playerVars: {
                         autoplay: autoplay ? 1 : 0,
                         controls: controls ? 1 : 0,
                         mute: muted ? 1 : 0,
                         playsinline: 1,
                         rel: 0,
                         showinfo: 0,
                         modestbranding: 1,
                         iv_load_policy: 3,
                         disablekb: 1,
                         fs: 0,
                         origin: origin,
                         widget_referrer: origin,
                         enablejsapi: 1
                     },
                     events: {
                         'onReady': (event: any) => {
                             if (muted) event.target.mute();
                             if (autoplay) event.target.playVideo();
                             if (onReady) onReady(event);
                         },
                         'onStateChange': (event: any) => {
                             if (event.data === window.YT.PlayerState.ENDED) {
                                 if (onEnded) onEnded();
                             }
                             if (onStateChange) onStateChange(event);
                         },
                         'onError': (event: any) => {
                             if (onError) onError(event.data);
                         }
                     }
                 });
             } catch (e) {
                 console.warn("YouTube Player Init Error", e);
             }
        };

        const loadAPI = () => {
            if (window.YT && window.YT.Player) {
                apiLoaded.current = true;
                createPlayer();
            } else {
                // Only append script if not already present
                if (!document.getElementById('yt-api-script')) {
                    const tag = document.createElement('script');
                    tag.id = 'yt-api-script';
                    tag.src = "https://www.youtube.com/iframe_api";
                    const firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
                }

                // Setup global callback
                const existingCallback = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    if (existingCallback) existingCallback();
                    apiLoaded.current = true;
                    createPlayer();
                };
            }
        };

        loadAPI();

        return () => {
            destroyPlayer();
        };
    }, [videoId, autoplay, muted, controls]);

    return (
        <div 
            ref={containerRef} 
            className={`relative overflow-hidden bg-black ${className}`} 
            style={{ width, height }}
        />
    );
};
