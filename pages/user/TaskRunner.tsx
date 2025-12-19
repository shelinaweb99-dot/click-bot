
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, AdSettings } from '../../types';
import { getTasks, verifyAndCompleteTask, getCurrentUserId, getAdSettings, extractYouTubeId, fetchYouTubeMetadata } from '../../services/mockDb';
import { Timer, ArrowLeft, CheckCircle, Send, Loader2, PlayCircle, Globe, ExternalLink } from 'lucide-react';
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
  const [videoMetadata, setVideoMetadata] = useState<{title: string, author: string} | null>(null);
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
          if (foundTask.type === TaskType.YOUTUBE && foundTask.url) {
              const vId = extractYouTubeId(foundTask.url);
              if (vId) {
                  const meta = await fetchYouTubeMetadata(vId);
                  if (meta) setVideoMetadata({ title: meta.title, author: meta.author_name });
              }
          }
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
        setShowAd(true);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleStartTask = () => {
    setIsTimerRunning(true);
    if (task?.url && task.type === TaskType.WEBSITE) {
      window.open(task.url, '_blank');
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
        } else {
            alert(result.message || "Verification failed. Ensure you stayed on page.");
        }
    } catch (e) {
        alert("Server error. Please try again.");
    }
  };

  if (!task || !adSettings) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Initializing Environment</p>
          </div>
      );
  }

  if (isCompleted) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-2xl shadow-green-500/10">
                  <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Mission Success!</h2>
                  <p className="text-gray-500 text-sm mt-1 font-medium">+{task.reward} USDT-Pts added to wallet.</p>
              </div>
              <button 
                onClick={() => navigate('/tasks')} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-4 px-10 rounded-2xl shadow-xl shadow-blue-600/10 transition-all active:scale-95"
              >
                  Earn More
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full gap-5 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/tasks')} className="text-gray-500 hover:text-white flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-colors w-fit">
        <ArrowLeft size={14} /> Mission Control
      </button>

      <div className="glass-card p-6 rounded-[2rem] flex justify-between items-center border border-white/5 shadow-xl">
          <div className="min-w-0 pr-4">
            <h2 className="text-sm font-black text-white line-clamp-1 uppercase tracking-tight">{task.title}</h2>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">Reward: {task.reward} USDT-Pts</p>
          </div>
          {task.type !== TaskType.CUSTOM && task.type !== TaskType.TELEGRAM && (
            <div className={`flex items-center gap-2 font-mono text-2xl font-black tabular-nums ${timeLeft === 0 ? 'text-green-500' : 'text-blue-500'}`}>
                {timeLeft}s
            </div>
          )}
      </div>

      <div className="flex-1 bg-[#030712] rounded-[2.5rem] overflow-hidden border border-white/5 relative flex flex-col min-h-[50vh] shadow-inner shadow-black/50 items-center justify-center">
          
          {/* Action Overlay for YouTube and Website */}
          {!isTimerRunning && timeLeft > 0 && task.type !== TaskType.CUSTOM && task.type !== TaskType.TELEGRAM && (
              <div className="absolute inset-0 bg-[#030712]/95 z-40 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md">
                  <div className="bg-blue-600/10 p-6 rounded-full mb-6 border border-blue-500/20">
                    {task.type === TaskType.YOUTUBE ? <PlayCircle size={48} className="text-blue-500" /> : <Globe size={48} className="text-blue-500" />}
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">{task.type === TaskType.YOUTUBE ? 'Ready to Watch?' : 'Ready to Visit?'}</h3>
                  <p className="text-gray-500 text-xs mb-8 font-medium">Keep the bot open while you visit the destination. Points will be credited after the timer.</p>
                  <button onClick={handleStartTask} className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95">
                      {task.type === TaskType.YOUTUBE ? 'WATCH VIDEO' : 'VISIT WEBSITE'}
                  </button>
              </div>
          )}

          {task.type === TaskType.YOUTUBE && (
              <div className="w-full h-full bg-black">
                  <YouTubePlayer
                      videoId={extractYouTubeId(task.url || '') || ''}
                      autoplay={isTimerRunning}
                      className="w-full h-full"
                  />
              </div>
          )}
          
          {task.type === TaskType.WEBSITE && (
              <div className="flex flex-col items-center justify-center p-10 text-center space-y-6">
                  <Globe size={64} className="text-blue-500 opacity-20" />
                  <div className="space-y-2">
                    <p className="text-white font-black text-xl">Site Visit in Progress</p>
                    <p className="text-gray-500 text-xs">Stay on the website for the full duration. Don't close this bot window.</p>
                  </div>
                  {isTimerRunning && (
                    <button onClick={() => window.open(task.url, '_blank')} className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase tracking-widest border border-blue-500/20 px-4 py-2 rounded-full">
                        Return to Website <ExternalLink size={14} />
                    </button>
                  )}
              </div>
          )}

          {task.type === TaskType.TELEGRAM && (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-8">
                  <div className="bg-blue-500/10 p-8 rounded-full border border-blue-500/20">
                      <Send size={64} className="text-blue-500" />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black text-white">Join Community</h3>
                      <p className="text-gray-500 text-xs mt-2 font-medium">Click below to join our official channel and unlock your reward.</p>
                  </div>
                  <div className="w-full space-y-3">
                    <button onClick={() => window.open(task.url, '_blank')} className="w-full bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg active:scale-95 transition-all">JOIN CHANNEL</button>
                    <button onClick={() => setShowAd(true)} className="w-full bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl border border-white/5 transition-all">VERIFY JOIN</button>
                  </div>
              </div>
          )}
      </div>

      <AdSimulator isOpen={showAd} onComplete={handleAdComplete} settings={adSettings} />
    </div>
  );
};
