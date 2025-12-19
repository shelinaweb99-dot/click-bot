
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, AdSettings } from '../../types';
import { getTasks, verifyAndCompleteTask, getCurrentUserId, getAdSettings, extractYouTubeId, fetchYouTubeMetadata } from '../../services/mockDb';
import { ArrowLeft, CheckCircle, Send, Loader2, PlayCircle, Globe, ExternalLink, Timer } from 'lucide-react';
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
        // Task duration finished
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleStartTask = () => {
    setIsTimerRunning(true);
    if (task?.url && task.type === TaskType.WEBSITE) {
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
            alert(result.message || "Verification failed.");
        }
    } catch (e) {
        alert("Server error. Please try again.");
    }
  };

  if (!task || !adSettings) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-white space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Preparing Environment</p>
          </div>
      );
  }

  if (isCompleted) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-2xl">
                  <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Mission Accomplished</h2>
                  <p className="text-gray-500 text-sm mt-1 font-medium">+{task.reward} USDT points added to your account.</p>
              </div>
              <button 
                onClick={() => navigate('/tasks')} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 px-12 rounded-[2rem] shadow-xl transition-all active:scale-95"
              >
                  Return to Dashboard
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full gap-5 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/tasks')} className="text-gray-500 hover:text-white flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors w-fit">
        <ArrowLeft size={14} /> Back to Missions
      </button>

      {/* Task Info Card */}
      <div className="glass-card p-6 rounded-[2rem] flex justify-between items-center border border-white/5 shadow-2xl">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-black text-white line-clamp-1 uppercase tracking-tight">{task.title}</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Reward: {task.reward} Pts</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 font-mono text-2xl font-black tabular-nums ${timeLeft === 0 ? 'text-green-500' : 'text-blue-500'}`}>
              <Timer size={20} className={isTimerRunning ? 'animate-pulse' : ''} />
              {timeLeft}s
          </div>
      </div>

      {/* Action Container */}
      <div className="bg-[#0b1120] rounded-[2.5rem] border border-white/5 min-h-[45vh] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-inner">
          
          {task.type === TaskType.WEBSITE && (
              <div className="space-y-8 max-w-xs animate-in fade-in zoom-in duration-300">
                  <div className="bg-blue-500/10 p-8 rounded-full border border-blue-500/20 mx-auto w-fit">
                      <Globe size={64} className="text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white">Visit Website</h3>
                    <p className="text-gray-500 text-xs">Browse the target site for {task.durationSeconds} seconds to unlock reward.</p>
                  </div>
                  
                  {!isTimerRunning && timeLeft > 0 ? (
                      <button onClick={handleStartTask} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                          <ExternalLink size={18} /> Open Website
                      </button>
                  ) : timeLeft > 0 ? (
                      <div className="space-y-4">
                          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${((task.durationSeconds - timeLeft) / task.durationSeconds) * 100}%` }}></div>
                          </div>
                          <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Stay on the page...</p>
                          <button onClick={() => window.open(task.url, '_blank')} className="text-gray-400 text-[10px] uppercase font-bold hover:text-white transition-colors">
                              Lost the tab? Click here
                          </button>
                      </div>
                  ) : (
                      <button onClick={handleVerify} className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all active:scale-95 animate-in zoom-in">
                          Verify & Claim Points
                      </button>
                  )
                  }
              </div>
          )}

          {task.type === TaskType.YOUTUBE && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                  {!isTimerRunning && timeLeft > 0 ? (
                      <div className="space-y-6 max-w-xs">
                          <div className="bg-red-500/10 p-8 rounded-full border border-red-500/20 mx-auto w-fit">
                              <PlayCircle size={64} className="text-red-500" />
                          </div>
                          <h3 className="text-xl font-black text-white">Watch Video</h3>
                          <button onClick={handleStartTask} className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all active:scale-95">
                              Watch Now
                          </button>
                      </div>
                  ) : (
                      <div className="w-full h-full min-h-[40vh] bg-black rounded-2xl overflow-hidden relative">
                          <YouTubePlayer
                              videoId={extractYouTubeId(task.url || '') || ''}
                              autoplay={true}
                              className="w-full h-full"
                          />
                          {timeLeft > 0 && (
                              <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md text-[10px] font-black text-white border border-white/10 uppercase tracking-widest">
                                  Stay {timeLeft}s
                              </div>
                          )}
                          {timeLeft === 0 && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6 animate-in fade-in">
                                  <button onClick={handleVerify} className="w-full max-w-xs bg-green-600 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-2xl">
                                      Claim Mission Reward
                                  </button>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          )}

          {task.type === TaskType.TELEGRAM && (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-8 animate-in fade-in duration-500">
                  <div className="bg-blue-500/10 p-8 rounded-full border border-blue-500/20 shadow-inner">
                      <Send size={64} className="text-blue-500" />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black text-white">Join Channel</h3>
                      <p className="text-gray-500 text-xs mt-2 font-medium">Verify your membership to unlock reward.</p>
                  </div>
                  <div className="w-full space-y-3">
                    <button onClick={() => window.open(task.url, '_blank')} className="w-full bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg active:scale-95 transition-all">JOIN NOW</button>
                    <button onClick={handleVerify} className="w-full bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl border border-white/5 transition-all">VERIFY STATUS</button>
                  </div>
              </div>
          )}
      </div>

      <AdSimulator isOpen={showAd} onComplete={handleAdComplete} settings={adSettings} />
    </div>
  );
};
