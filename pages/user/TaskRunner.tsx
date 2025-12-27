
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, AdSettings } from '../../types';
import { getTasks, verifyAndCompleteTask, getCurrentUserId, getAdSettings, getTransactions, getProtectedFile } from '../../services/mockDb';
import { ArrowLeft, CheckCircle, Send, Loader2, PlayCircle, Globe, Timer, ShieldAlert, X, Info, Lock, Download, ExternalLink, Zap, FileText } from 'lucide-react';
import { AdSimulator } from '../../components/AdSimulator';
import { NativeBannerModal } from '../../components/NativeBannerModal';

export const TaskRunner: React.FC = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showNativeBanner, setShowNativeBanner] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [fileData, setFileData] = useState<{url: string, title: string} | null>(null);
  const isMounted = useRef(true);

  const checkCompletion = async () => {
      if (!taskId || !isMounted.current) return;
      const userId = getCurrentUserId();
      if (!userId) return;
      
      const txs = await getTransactions(userId, true);
      const done = txs.some(tx => tx.taskId === taskId && tx.type === 'EARNING');
      
      if (done && isMounted.current) {
          setIsCompleted(true);
          if (task?.type === TaskType.SHORTLINK) {
              const fileRes = await getProtectedFile(taskId);
              if (fileRes.success && isMounted.current) {
                  setFileData(fileRes);
              }
          }
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

    const interval = setInterval(() => {
        if (!isCompleted && task?.type === TaskType.SHORTLINK) {
            checkCompletion();
        }
    }, 5000);

    return () => {
        isMounted.current = false;
        clearInterval(interval);
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
        const tg = (window as any).Telegram?.WebApp;
        const linkWithUid = task.type === TaskType.SHORTLINK 
            ? `${task.url}${task.url.includes('?') ? '&' : '?'}uid=${getCurrentUserId()}` 
            : task.url;
            
        if (tg && typeof tg.openLink === 'function') {
            // Updated: Force in-app web view using Telegram's openLink options
            tg.openLink(linkWithUid, { try_instant_view: true });
        } else {
            window.open(linkWithUid, '_blank');
        }
        
        if (task.type !== TaskType.SHORTLINK) {
            setIsTimerRunning(true);
            setShowViewer(true);
        }
    }
  };

  const handleVerify = () => {
      setShowAd(true);
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
            // Trigger native banner after points are awarded
            if (adSettings?.nativeBanner?.isEnabled) {
                setShowNativeBanner(true);
            }
        }
    } catch (e: any) {
        alert(e.message || "Manual verification failed.");
    }
  };

  const handleDownload = () => {
      if (fileData?.url) {
          window.open(fileData.url, '_blank');
      }
  };

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
          {task.type !== TaskType.SHORTLINK && !isCompleted && (
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
                   <Send size={64} className="text-blue-400" />}
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                    {isCompleted ? 'MISSION SECURED' : 
                     task.type === TaskType.SHORTLINK ? 'Unlock Secure Resource' : 'Start Earning'}
                </h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {isCompleted ? 'Asset decrypted and rewards applied.' : 
                     task.type === TaskType.SHORTLINK 
                        ? 'Follow the link and solve the security challenge to unlock.' 
                        : `Complete the ${task.durationSeconds}s requirement to verify.`}
                </p>
              </div>

              {isCompleted ? (
                  <div className="space-y-4">
                      {task.type === TaskType.SHORTLINK && fileData && (
                          <div className="bg-[#030712] p-6 rounded-[2rem] border border-white/5 space-y-4">
                              <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest">Available Download</p>
                              <div className="flex items-center justify-center gap-3">
                                  <FileText className="text-blue-500" />
                                  <p className="text-white font-bold text-sm truncate">{fileData.title}</p>
                              </div>
                              <button 
                                onClick={handleDownload}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                              >
                                  <Download size={16} /> Download File
                              </button>
                          </div>
                      )}
                      <button onClick={() => navigate('/tasks')} className="w-full bg-white/5 hover:bg-white/10 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                          Return to Directory
                      </button>
                  </div>
              ) : (
                  <div className="space-y-4">
                    {!isTimerRunning && timeLeft > 0 ? (
                        <button 
                            onClick={handleStartTask} 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {task.type === TaskType.SHORTLINK ? <ExternalLink size={18}/> : <PlayCircle size={18} />} 
                            DEPLOY MISSION
                        </button>
                    ) : timeLeft > 0 ? (
                        <div className="space-y-6">
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" style={{ width: `${((task.durationSeconds - timeLeft) / task.durationSeconds) * 100}%` }}></div>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-blue-500 animate-pulse">
                                <Zap size={14} />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Monitoring Activity...</span>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={handleVerify} 
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 animate-in zoom-in"
                        >
                            VERIFY & CLAIM
                        </button>
                    )}
                    
                    {task.type === TaskType.SHORTLINK && !isTimerRunning && (
                        <div className="flex flex-col items-center gap-3 py-4">
                             <div className="flex items-center gap-2 text-amber-500">
                                <Loader2 className="animate-spin" size={14} />
                                <span className="text-[8px] font-black uppercase tracking-widest italic">Waiting for postback...</span>
                             </div>
                             <button onClick={checkCompletion} className="text-gray-700 hover:text-gray-500 text-[8px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4">
                                Manual Refresh Status
                             </button>
                        </div>
                    )}
                  </div>
              )}
          </div>
      </div>

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
