
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { AdSettings } from '../types';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
}

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING'>('IDLE');
  const timeoutRef = useRef<any>(null);

  const startProcess = () => {
    if (settings.isGlobalEnabled === false) {
      onComplete();
      return;
    }

    setStatus('LOADING');

    // Simulate internal verification process delay
    timeoutRef.current = setTimeout(() => {
        if (settings.isGlobalEnabled !== false) {
            setStatus('SHOWING');
            timeoutRef.current = setTimeout(() => {
                onComplete();
            }, 2500);
        } else {
            onComplete();
        }
    }, 1500);
  };

  useEffect(() => {
    if (!isOpen) {
        setStatus('IDLE');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
    }
    startProcess();
    return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  if (!isOpen || settings.isGlobalEnabled === false) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-10 text-center relative animate-in zoom-in duration-300">
          
          <div className="space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-full h-full text-blue-500 animate-spin" strokeWidth={1.5} />
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">
                    {status === 'LOADING' ? 'Verifying Integrity' : 'Sync Complete'}
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                    {status === 'LOADING' ? 'Synchronizing with secure earning node...' : 
                     'Processing rewards. This session is verified.'}
                </p>
              </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5">
              <div className="flex items-center justify-center gap-2 text-blue-500/50 animate-pulse">
                <Zap size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Bot Engine Verified</span>
              </div>
          </div>
      </div>
    </div>
  );
};
