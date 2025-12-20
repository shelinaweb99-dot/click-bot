
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, AdSettings } from '../../types';
import { getTasks, verifyAndCompleteTask, getCurrentUserId, getAdSettings, extractYouTubeId } from '../../services/mockDb';
import { ArrowLeft, CheckCircle, Send, Loader2, PlayCircle, Globe, ExternalLink, Timer, ShieldAlert } from 'lucide-react';
import { AdSimulator } from '../../components/AdSimulator';
import { YouTubePlayer } from '../../components/YouTubePlayer';

export const TaskRunner: React.FC = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);

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
    if (task?.url && (task.type === TaskType.WEBSITE || task.type === TaskType.YOUTUBE)) {
      window.open(task.url, '_blank');
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
            alert(result.message || "Verification failed. Make sure you completed the task.");
        }
    } catch (e) {
        alert("Server error. Please try again.");
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
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-2xl">
                  <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div className="px-6">
                  <h2 className="text-3xl font-black text-white tracking-tight">Mission Success</h2>
                  <p className="text-gray-500 text-sm mt-2 font-medium">You have earned <span className="text-blue-500 font-bold">+{task.reward} Points</span></p>
              </div>
              <button 
                onClick={() => navigate('/tasks')} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 px-12 rounded-[2rem] shadow-xl transition-all active:scale-95"
              >
                  Claim & Exit
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full gap-5 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/tasks')} className="text-gray-500 hover:text-white flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors w-fit">
        <ArrowLeft size={14} /> Mission Dashboard
      </button>

      {/* Task Info Header */}
      <div className="glass-card p-6 rounded-[2rem] border border-white/5 shadow-2xl flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-black text-white line-clamp-1 uppercase tracking-tight">{task.title}</h2>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">Reward: {task.reward} Pts</p>
          </div>
          <div className={`flex items-center gap-3 font-mono text-3xl font-black tabular-nums ${timeLeft === 0 ? 'text-green-500' : 'text-blue-500'}`}>
              <Timer size={24} className={isTimerRunning ? 'animate-pulse' : ''} />
              {timeLeft}s
          </div>
      </div>

      {/* Simplified Action Center */}
      <div className="bg-[#0b1120] rounded-[2.5rem] border border-white/5 min-h-[40vh] flex flex-col items-center justify-center p-10 text-center relative overflow-hidden shadow-inner">
          
          <div className="space-y-8 max-w-xs w-full animate-in fade-in zoom-in duration-300">
              {/* Task Icon */}
              <div className="bg-blue-500/10 p-10 rounded-full border border-blue-500/20 mx-auto w-fit shadow-lg">
                  {task.type === TaskType.WEBSITE ? <Globe size={64} className="text-blue-500" /> : 
                   task.type === TaskType.YOUTUBE ? <PlayCircle size={64} className="text-red-500" /> :
                   <Send size={64} className="text-blue-400" />}
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white">
                    {task.type === TaskType.WEBSITE ? 'Visit Website' : 
                     task.type === TaskType.YOUTUBE ? 'Watch Video' : 'Join Telegram'}
                </h3>
                <p className="text-gray-500 text-xs font-medium leading-relaxed">
                    {timeLeft > 0 
                        ? `You must interact for ${task.durationSeconds} seconds to unlock your reward.` 
                        : "Task duration finished. You can now verify your activity."}
                </p>
              </div>

              {!isTimerRunning && timeLeft > 0 ? (
                  <button 
                    onClick={handleStartTask} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                      {task.type === TaskType.YOUTUBE ? <PlayCircle size={18}/> : <ExternalLink size={18} />} 
                      START MISSION
                  </button>
              ) : timeLeft > 0 ? (
                  <div className="space-y-6">
                      <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" style={{ width: `${((task.durationSeconds - timeLeft) / task.durationSeconds) * 100}%` }}></div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Stay Active on the page...</p>
                        <button onClick={() => window.open(task.url, '_blank')} className="text-gray-600 text-[10px] uppercase font-bold hover:text-white transition-colors underline underline-offset-4">
                            Didn't open? Click here to try again
                        </button>
                      </div>
                  </div>
              ) : (
                  <button 
                    onClick={handleVerify} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-95 animate-in zoom-in duration-500 border border-green-400/20"
                  >
                      VERIFY & CLAIM POINTS
                  </button>
              )}
          </div>

          {/* Warning Message */}
          <div className="mt-10 flex items-center gap-2 text-orange-500/50 text-[9px] font-black uppercase tracking-widest">
             <ShieldAlert size={14} /> Anti-Cheat System Active
          </div>
      </div>

      <AdSimulator isOpen={showAd} onComplete={handleAdComplete} settings={adSettings} />
    </div>
  );
};
