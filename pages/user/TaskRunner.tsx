
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, AdSettings } from '../../types';
// Removed non-existent import getProtectedFile
import { getTasks, verifyAndCompleteTask, getCurrentUserId, getAdSettings, getTransactions } from '../../services/mockDb';
import { ArrowLeft, CheckCircle, Send, Loader2, PlayCircle, Globe, Timer, ShieldAlert, X, Info, Lock, Download, ExternalLink, Zap, FileText, Minimize2, ExternalLink as OpenIcon, Bot, AlertTriangle, Activity, RefreshCw, Key } from 'lucide-react';
import { AdSimulator } from '../../components/AdSimulator';
import { NativeBannerModal } from '../../components/NativeBannerModal';

export const TaskRunner: React.FC = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasOpenedLink, setHasOpenedLink] = useState(false);
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationInput, setVerificationInput] = useState('');
  const [showAd, setShowAd] = useState(false);
  const [showNativeBanner, setShowNativeBanner] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const isMounted = useRef(true);

  const checkCompletion = async () => {
      if (!taskId || !isMounted.current) return;
      const userId = getCurrentUserId();
      if (!userId) return;
      
      const txs = await getTransactions(userId, true);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();
      
      const done = txs.some(tx => {
          if (tx.taskId !== taskId || tx.type !== 'EARNING') return false;
          const txDate = new Date(tx.date).getTime();
          return txDate > yesterday;
      });
      
      if (done && isMounted.current) {
          setIsCompleted(true);
      }
  };

  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      try {
          const userId = getCurrentUserId();
          if (!userId) { navigate('/login'); return; }
          const allTasks = await getTasks();
          const foundTask = allTasks.find(t => t.id === taskId);
          if (!foundTask) { navigate('/tasks'); return; }
          setTask(foundTask);
          setTimeLeft(foundTask.durationSeconds);
          setAdSettings(await getAdSettings());
          
          await checkCompletion();
      } catch (e) { console.error(e); }
    };
    init();

    return () => {
        isMounted.current = false;
    };
  }, [taskId, navigate, isCompleted, task?.type]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
        setIsTimerRunning(false);
        setShowViewer(false); 
        handleVerify(); 
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleStartTask = () => {
    if (task?.url) {
        setVerificationError(null);
        const tg = (window as any).Telegram?.WebApp;
        
        let targetUrl = task.url;
        if ((task.type === TaskType.TELEGRAM || task.type === TaskType.TELEGRAM_CHANNEL || task.type === TaskType.TELEGRAM_BOT) && !targetUrl.startsWith('http')) {
            const handle = targetUrl.startsWith('@') ? targetUrl.slice(1) : targetUrl;
            targetUrl = `https://t.me/${handle}`;
        }

        const linkWithParams = task.type === TaskType.SHORTLINK 
            ? `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}uid=${getCurrentUserId()}&tid=${task.id}` 
            : targetUrl;
            
        if (task.type === TaskType.WEBSITE) {
            setShowViewer(true);
            setIsTimerRunning(true);
        } else if (task.type === TaskType.TELEGRAM || task.type === TaskType.TELEGRAM_CHANNEL || task.type === TaskType.TELEGRAM_BOT) {
            if (tg && typeof tg.openTelegramLink === 'function') {
                tg.openTelegramLink(linkWithParams);
            } else {
                window.open(linkWithParams, '_blank');
            }
            setHasOpenedLink(true);
        } else {
            if (tg && typeof tg.openLink === 'function') {
                tg.openLink(linkWithParams);
            } else {
                window.open(linkWithParams, '_blank');
            }
            
            if (task.type !== TaskType.SHORTLINK) {
                setIsTimerRunning(true);
            } else {
                setHasOpenedLink(true);
            }
        }
    }
  };

  const handleVerify = () => {
      if (task?.type === TaskType.SHORTLINK) {
          handleManualShortlinkVerify();
      } else {
          setVerificationError(null);
          setShowAd(true);
      }
  };

  const handleManualShortlinkVerify = async () => {
      if (!verificationInput.trim()) {
          setVerificationError("Please enter the downloaded file name to verify.");
          return;
      }
      setVerificationError(null);
      setIsVerifyingManual(true);
      
      try {
          const userId = getCurrentUserId();
          if (!userId || !task) return;
          
          const result = await verifyAndCompleteTask(userId, task.id, verificationInput);
          if (result.success) {
              setIsCompleted(true);
              setIsVerifyingManual(false);
              window.dispatchEvent(new Event('db_change'));
              if (adSettings?.nativeBanner?.isEnabled) {
                  setShowNativeBanner(true);
              }
          }
      } catch (e: any) {
          setIsVerifyingManual(false);
          setVerificationError(e.message || "Manual verification failed.");
      }
  };

  const handleAdComplete = () => {
    setShowAd(false);
    completeTask();
  };

  const completeTask = async () => {
    if (!task) return;
    try {
        const userId = getCurrentUserId();
        if (!userId) return;
        
        const result = await verifyAndCompleteTask(userId, task.id);
        if (result.success) {
            setIsCompleted(true);
            window.dispatchEvent(new Event('db_change'));
            if (adSettings?.nativeBanner?.isEnabled) {
                setShowNativeBanner(true);
            }
        }
    } catch (e: any) {
        setVerificationError(e.message || "Manual verification failed.");
    }
  };

  const isTelegramTask = task?.type === TaskType.TELEGRAM || task?.type === TaskType.TELEGRAM_CHANNEL || task?.type === TaskType.TELEGRAM_BOT;

  if (!task || !adSettings) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-white space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Accessing Mission Data...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full gap-5 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/tasks')} className="text-gray-500 hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-[0.15em] transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Directory
      </button>

      <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xs font-black text-white line-clamp-1 uppercase tracking-tight">{task.title}</h2>
            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">Reward: {task.reward} Points</p>
          </div>
          {task.type !== TaskType.SHORTLINK && !isCompleted && !isTelegramTask && (
              <div className={`flex items-center gap-2.5 font-mono text-2xl font-black tabular-nums ${timeLeft === 0 ? 'text-green-500' : 'text-blue-500'}`}>
                  <Timer size={20} className={isTimerRunning ? 'animate-pulse' : ''} />
                  {timeLeft}s
              </div>
          )}
          {isCompleted && (
               <div className="bg-green-500/10 p-3 rounded-2xl text-green-500 border border-green-500/10">
                   <CheckCircle size={20} />
               </div>
          )}
      </div>

      <div className="bg-[#0b1120] rounded-[2.5rem] border border-white/5 flex-1 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden shadow-inner min-h-[500px]">
          <div className="space-y-10 max-w-xs w-full animate-in fade-in zoom-in duration-300">
              
              <div className={`p-10 rounded-full border mx-auto w-fit shadow-2xl transition-all ${isCompleted ? 'bg-green-500/10 border-green-500/20 scale-110' : 'bg-blue-500/10 border-blue-500/20'}`}>
                  {isCompleted ? <CheckCircle size={64} className="text-green-500" /> : 
                   task.type === TaskType.WEBSITE ? <Globe size={64} className="text-blue-500" /> : 
                   task.type === TaskType.YOUTUBE ? <PlayCircle size={64} className="text-red-500" /> :
                   task.type === TaskType.SHORTLINK ? <Lock size={64} className="text-amber-500" /> :
                   (task.type === TaskType.TELEGRAM_BOT) ? <Bot size={64} className="text-blue-400" /> :
                   <Send size={64} className="text-blue-400" />}
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                    {isCompleted ? 'MISSION SECURED' : 
                     task.type === TaskType.SHORTLINK ? 'Unlock Resource' : 
                     task.type === TaskType.TELEGRAM_BOT ? 'Join Secure Bot' :
                     task.type === TaskType.TELEGRAM_CHANNEL ? 'Join Community Channel' : 'Start Earning'}
                </h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {isCompleted ? 'Asset decrypted and rewards applied.' : 
                     task.type === TaskType.SHORTLINK 
                        ? 'Complete the shortlink process, download the target file, then return to verify its name below.' 
                        : isTelegramTask 
                        ? `Click the button below to join the target Telegram resource and then verify.`
                        : `Complete the ${task.durationSeconds}s requirement to verify.`}
                </p>
              </div>

              {verificationError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left animate-in slide-in-from-top-2">
                      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                      <div>
                          <p className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-tight">Verification Error</p>
                          <p className="text-gray-400 text-[9px] mt-1 font-medium">{verificationError}</p>
                      </div>
                  </div>
              )}

              {isCompleted ? (
                  <div className="space-y-4">
                      <button onClick={() => navigate('/tasks')} className="w-full bg-white/5 hover:bg-white/10 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                          Return to Directory
                      </button>
                  </div>
              ) : (
                  <div className="space-y-4">
                    {(!isTimerRunning && (timeLeft > 0 || isTelegramTask || task.type === TaskType.SHORTLINK)) ? (
                        <div className="space-y-6">
                            <button 
                                onClick={handleStartTask} 
                                disabled={isVerifyingManual}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {task.type === TaskType.SHORTLINK ? <ExternalLink size={18}/> : 
                                 isTelegramTask ? <Send size={18} /> : <PlayCircle size={18} />} 
                                {isTelegramTask ? 'OPEN TELEGRAM' : (task.type === TaskType.SHORTLINK ? (hasOpenedLink ? 'RE-OPEN LINK' : 'OPEN SHORTLINK') : 'DEPLOY MISSION')}
                            </button>
                            
                            {task.type === TaskType.SHORTLINK && hasOpenedLink && (
                                <div className="space-y-5 p-6 bg-[#030712] rounded-[2.5rem] border border-white/5 shadow-2xl animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-500">
                                            <Key size={18} />
                                        </div>
                                        <p className="text-left text-gray-500 text-[9px] font-black uppercase tracking-widest">Identify Downloaded File</p>
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="Enter full file name..."
                                        className="w-full bg-[#0b1120] border border-white/10 text-white p-5 rounded-2xl focus:border-amber-500 outline-none transition-all placeholder:text-gray-700 text-sm font-bold shadow-inner"
                                        value={verificationInput}
                                        onChange={e => setVerificationInput(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleVerify}
                                        disabled={isVerifyingManual}
                                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-800 text-white font-black text-[10px] uppercase tracking-[0.25em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isVerifyingManual ? <Loader2 className="animate-spin" size={16} /> : <ShieldAlert size={16} />}
                                        {isVerifyingManual ? 'VERIFYING...' : 'VERIFY & CLAIM'}
                                    </button>
                                </div>
                            )}

                            {(isTelegramTask && hasOpenedLink) && (
                                <button 
                                    onClick={handleVerify} 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 animate-in zoom-in flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> VERIFY JOIN
                                </button>
                            )}
                        </div>
                    ) : timeLeft > 0 ? (
                        <div className="space-y-6">
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" style={{ width: `${((task.durationSeconds - timeLeft) / task.durationSeconds) * 100}%` }}></div>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-blue-500 animate-pulse">
                                <Zap size={14} />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Monitoring Activity...</span>
                            </div>
                            {task.type === TaskType.WEBSITE && (
                                <button onClick={() => setShowViewer(true)} className="bg-blue-600/10 text-blue-400 px-6 py-2 rounded-xl text-[10px] font-black uppercase border border-blue-500/20 active:scale-95 transition-all">
                                    Re-open Viewer
                                </button>
                            )}
                        </div>
                    ) : (
                        <button 
                            onClick={handleVerify} 
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 animate-in zoom-in"
                        >
                            VERIFY & CLAIM
                        </button>
                    )}
                  </div>
              )}
          </div>
      </div>

      {showViewer && task.type === TaskType.WEBSITE && (
          <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b border-white/5 shadow-2xl relative z-20">
                   <div className="flex flex-col min-w-0 pr-4">
                       <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Internal Session</span>
                       <span className="text-white font-bold text-[11px] truncate">{task.title}</span>
                   </div>
                   <div className="flex items-center gap-3">
                       <div className="bg-black/60 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                           <Timer size={14} className="text-blue-500 animate-pulse" />
                           <span className="text-blue-400 font-mono text-lg font-black">{timeLeft}s</span>
                       </div>
                   </div>
              </div>
              <div className="flex-1 bg-white relative overflow-hidden">
                  <iframe 
                    src={task.url} 
                    className="w-full h-full border-none" 
                    title="Bot Engine Browser"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    loading="lazy"
                  />
              </div>
              <div className="p-3 bg-black/40 text-center border-t border-white/5">
                  <p className="text-[7px] text-gray-600 font-black uppercase tracking-[0.4em]">DO NOT CLOSE &bull; BOT VERIFICATION IN PROGRESS</p>
              </div>
          </div>
      )}

      <AdSimulator 
        isOpen={showAd} 
        onComplete={handleAdComplete} 
        settings={adSettings} 
      />

      {adSettings && (
        <NativeBannerModal 
          isOpen={showNativeBanner} 
          onClose={() => setShowNativeBanner(false)} 
          settings={adSettings} 
        />
      )}
    </div>
  );
};
