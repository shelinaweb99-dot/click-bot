
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, AdSettings } from '../../types';
import { getTasks, verifyAndCompleteTask, getCurrentUserId, getAdSettings } from '../../services/mockDb';
import { ArrowLeft, CheckCircle, Send, Loader2, PlayCircle, Globe, Timer, ShieldAlert, X, Info } from 'lucide-react';
import { AdSimulator } from '../../components/AdSimulator';

export const TaskRunner: React.FC = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
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
      } catch (e) { console.error(e); }
    };
    init();
  }, [taskId, navigate]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
        setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleStartTask = () => {
    setIsTimerRunning(true);
    if (task?.url) {
      setShowViewer(true);
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
        } else {
            alert(result.message || "Verification failed. Please try again.");
        }
    } catch (e: any) {
        alert(e.message || "Network error. Please try again later.");
    }
  };

  if (!task || !adSettings) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-white space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Connecting to Task Engine...</p>
          </div>
      );
  }

  if (isCompleted) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500 px-6">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-2xl">
                  <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">MISSION SUCCESS</h2>
                  <p className="text-gray-500 text-sm mt-2 font-medium italic">You have earned <span className="text-blue-500 font-bold">+{task.reward} Points</span></p>
              </div>
              <button 
                onClick={() => navigate('/tasks')} 
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[2rem] shadow-xl transition-all active:scale-95"
              >
                  Claim & Exit
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full gap-5 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/tasks')} className="text-gray-500 hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-[0.15em] transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      {/* Task Info Header */}
      <div className="bg-[#1e293b] p-6 rounded-[2rem] border border-white/5 shadow-2xl flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xs font-black text-white line-clamp-1 uppercase tracking-tight">{task.title}</h2>
            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">Reward: {task.reward} USDT-Pts</p>
          </div>
          <div className={`flex items-center gap-2.5 font-mono text-2xl font-black tabular-nums ${timeLeft === 0 ? 'text-green-500' : 'text-blue-500'}`}>
              <Timer size={20} className={isTimerRunning ? 'animate-pulse' : ''} />
              {timeLeft}s
          </div>
      </div>

      {/* Main Action Area */}
      <div className="bg-[#0b1120] rounded-[2.5rem] border border-white/5 flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center relative overflow-hidden shadow-inner min-h-[450px]">
          
          <div className="space-y-8 max-w-xs w-full animate-in fade-in zoom-in duration-300">
              <div className="bg-blue-500/10 p-8 sm:p-10 rounded-full border border-blue-500/20 mx-auto w-fit shadow-lg">
                  {task.type === TaskType.WEBSITE ? <Globe size={56} className="text-blue-500" /> : 
                   task.type === TaskType.YOUTUBE ? <PlayCircle size={56} className="text-red-500" /> :
                   <Send size={56} className="text-blue-400" />}
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {task.type === TaskType.WEBSITE ? 'Visit Platform' : 
                     task.type === TaskType.YOUTUBE ? 'Watch Mission' : 'Join Community'}
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                    {timeLeft > 0 
                        ? `Interact for ${task.durationSeconds}s to unlock rewards.` 
                        : "Mission success. Points are ready to be claimed."}
                </p>
              </div>

              {!isTimerRunning && timeLeft > 0 ? (
                  <button 
                    onClick={handleStartTask} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                      {task.type === TaskType.YOUTUBE ? <PlayCircle size={18}/> : <Globe size={18} />} 
                      START MISSION
                  </button>
              ) : timeLeft > 0 ? (
                  <div className="space-y-6">
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" style={{ width: `${((task.durationSeconds - timeLeft) / task.durationSeconds) * 100}%` }}></div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <p className="text-blue-500 font-black text-[9px] uppercase tracking-[0.2em] animate-pulse">Monitoring Activity...</p>
                        <button onClick={() => setShowViewer(true)} className="bg-white/5 text-white/50 py-3 rounded-2xl text-[9px] uppercase font-black tracking-widest hover:bg-white/10 transition-all border border-white/5">
                            Re-Open Mission Window
                        </button>
                      </div>
                  </div>
              ) : (
                  <button 
                    onClick={handleVerify} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.8rem] shadow-xl transition-all active:scale-95 animate-in zoom-in duration-500 border border-green-400/20"
                  >
                      VERIFY & CLAIM
                  </button>
              )}
          </div>

          <div className="mt-12 flex items-center gap-2 text-gray-700 text-[8px] font-black uppercase tracking-[0.3em]">
             <ShieldAlert size={12} /> Encrypted Verification
          </div>
      </div>

      {/* In-App Mission Viewer Overlay */}
      {showViewer && task.url && (
          <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-in fade-in duration-300">
              <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b border-white/5">
                  <div className="flex items-center gap-3">
                      <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                          {task.type === TaskType.WEBSITE ? <Globe size={16} /> : <PlayCircle size={16} />}
                      </div>
                      <div>
                        <p className="text-white text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">{task.title}</p>
                        {timeLeft > 0 && <p className="text-blue-400 text-[9px] font-bold">{timeLeft}s remaining</p>}
                      </div>
                  </div>
                  <button 
                    onClick={() => setShowViewer(false)}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition-colors shadow-lg active:scale-90"
                  >
                      <X size={20} />
                  </button>
              </div>
              <div className="flex-1 bg-white relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center -z-10 bg-gray-900">
                      <Info className="text-gray-600 mb-4" size={48} />
                      <p className="text-gray-400 text-sm font-medium">Mission loading...</p>
                      <p className="text-gray-600 text-[10px] mt-2 max-w-xs">If the content doesn't appear, try re-opening the window or ensuring you have a stable connection.</p>
                  </div>
                  <iframe 
                    src={task.url} 
                    className="w-full h-full border-none bg-white relative z-10"
                    title="Mission Content"
                    allow="autoplay; encrypted-media; fullscreen"
                  />
              </div>
              <div className="bg-[#1e293b] p-3 text-center border-t border-white/5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                      Return to the app after the timer hits 0 to claim your rewards.
                  </p>
              </div>
          </div>
      )}

      <AdSimulator isOpen={showAd} onComplete={handleAdComplete} settings={adSettings} />
    </div>
  );
};
