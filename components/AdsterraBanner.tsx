
import React, { useEffect, useRef } from 'react';
import { AdSettings } from '../types';

interface AdsterraBannerProps {
  settings: AdSettings;
}

export const AdsterraBanner: React.FC<AdsterraBannerProps> = ({ settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const banner = settings.bannerAd;

  useEffect(() => {
    if (!banner?.isEnabled || !banner.scriptHtml || !containerRef.current) return;

    // Clear previous banner content
    containerRef.current.innerHTML = '';

    // Extract scripts from the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(banner.scriptHtml, 'text/html');
    const scripts = doc.querySelectorAll('script');

    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      
      // Copy attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      // Copy content (for inline scripts like atOptions)
      if (oldScript.innerHTML) {
        newScript.innerHTML = oldScript.innerHTML;
      }

      containerRef.current?.appendChild(newScript);
    });

    // Handle iframe or placeholder if any
    const others = doc.body.childNodes;
    others.forEach(node => {
        if (node.nodeName !== 'SCRIPT') {
            containerRef.current?.appendChild(node.cloneNode(true));
        }
    });

  }, [banner?.isEnabled, banner?.scriptHtml]);

  if (!banner?.isEnabled) return null;

  return (
    <div 
      className="fixed bottom-[4.5rem] sm:bottom-20 left-0 right-0 z-[40] flex justify-center bg-black/20 backdrop-blur-sm border-t border-white/5 overflow-hidden"
      style={{ height: `${banner.height || 50}px` }}
    >
      <div 
        ref={containerRef} 
        className="w-full max-w-[320px] h-full flex items-center justify-center pointer-events-auto"
      />
    </div>
  );
};
