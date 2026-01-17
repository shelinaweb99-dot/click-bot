
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { haptics } from '../services/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].pageY;
    } else {
      startY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Add resistance
      const distance = Math.min(diff * 0.4, 120);
      setPullDistance(distance);
      
      // Trigger haptic once when threshold reached
      if (distance >= THRESHOLD && pullDistance < THRESHOLD) {
        haptics.light();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      haptics.medium();
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none transition-transform duration-200 z-50"
        style={{ 
          transform: `translateY(${pullDistance - 50}px)`,
          opacity: pullDistance / THRESHOLD
        }}
      >
        <div className="bg-blue-600 p-2.5 rounded-full shadow-2xl border border-white/20">
          <RefreshCw 
            size={20} 
            className={`text-white ${isRefreshing ? 'animate-spin' : ''}`} 
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      </div>
      
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${isRefreshing ? 60 : pullDistance * 0.5}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
