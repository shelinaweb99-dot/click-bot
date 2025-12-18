
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, AdSettings } from '../../types';
import { getTasks, verifyAndCompleteTask, getCurrentUserId, getAdSettings, extractYouTubeId, fetchYouTubeMetadata } from '../../services/mockDb';
import { Timer, ArrowLeft, CheckCircle, Send, Loader2, PlayCircle, Volume2, VolumeX } from 'lucide-react';
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
            // TRIGGER GLOBAL REFRESH
            window.dispatchEvent(new Event('db_change'));
        } else {
            alert(result.message || "Failed to complete task.");
        }
    } catch (e) {
        alert("Server error. Please try again.");
    }
  };

  if (!task || !adSettings) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p>Loading Task...</p>
          </div>
      );
  }

  if (isCompleted) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <CheckCircle className="w-20 h-20 text-green-500" />
              <h2 className="text-2xl font-bold text-white">Success!</h2>
              <p className="text-gray-400">+{task.reward} points claimed.</p>
              <button onClick={() => navigate('/tasks')} className="bg-blue-600 px-6 py-2 rounded-lg text-white font-bold mt-4">
                  Continue Earning
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full gap-4 pb-20">
      <button onClick={() => navigate('/tasks')} className="text-gray-400 hover:text-white flex items-center gap-2">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-gray-800 p-4 rounded-xl flex justify-between items-center border border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white line-clamp-1">{task.title}</h2>
            <p className="text-sm text-blue-400 font-bold">Reward: {task.reward} Pts</p>
          </div>
          {task.type !== TaskType.CUSTOM && task.type !== TaskType.TELEGRAM && (
            <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                {timeLeft}s
            </div>
          )}
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-700 relative flex flex-col min-h-[50vh]">
          {!isTimerRunning && timeLeft > 0 && task.type !== TaskType.CUSTOM && task.type !== TaskType.TELEGRAM && (
              <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center p-6 text-center">
                  <button onClick={() => setIsTimerRunning(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center gap-2">
                      <PlayCircle size={20} /> START TASK
                  </button>
              </div>
          )}

          {task.type === TaskType.YOUTUBE && (
              <div className="flex flex-col h-full bg-black">
                  <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                      <YouTubePlayer
                          videoId={extractYouTubeId(task.url || '') || ''}
                          autoplay={isTimerRunning}
                          muted={false} 
                          controls={true}
                          className="w-full h-full"
                      />
                  </div>
                  <div className="p-4 bg-gray-800 flex-1">
                      <h3 className="text-white font-bold">{videoMetadata?.title || 'Loading Video...'}</h3>
                      <p className="text-gray-400 text-xs mt-1 italic">Keep this page open until the timer ends.</p>
                  </div>
              </div>
          )}
          
          {task.type === TaskType.WEBSITE && (
              <iframe src={task.url} className="w-full flex-1 bg-white" title="task-frame" />
          )}

          {task.type === TaskType.TELEGRAM && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                  <div className="bg-blue-500/20 p-6 rounded-full">
                      <Send size={64} className="text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Join Channel</h3>
                  <button onClick={() => window.open(task.url, '_blank')} className="w-full max-w-xs bg-blue-500 text-white font-bold py-4 rounded-xl">OPEN TELEGRAM</button>
                  <button onClick={() => setShowAd(true)} className="w-full max-w-xs bg-gray-700 text-white font-bold py-3 rounded-xl">I HAVE JOINED</button>
              </div>
          )}
      </div>

      <AdSimulator isOpen={showAd} onComplete={handleAdComplete} settings={adSettings} />
    </div>
  );
};
