
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskType, Transaction, AdSettings, SystemSettings } from '../../types';
import { getTasks, getUserById, verifyAndCompleteTask, getCurrentUserId, getAdSettings, getSystemSettings, verifyTelegramMembership, fetchYouTubeMetadata, extractYouTubeId, getTransactions } from '../../services/mockDb';
import { Timer, ArrowLeft, CheckCircle, Send, AlertTriangle, Loader2, PlayCircle, Play, ExternalLink, Info, Video } from 'lucide-react';
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
  const [errorMessage, setErrorMessage] = useState('');
  
  // YouTube Metadata
  const [videoMetadata, setVideoMetadata] = useState<{title: string, author: string, thumbnail: string} | null>(null);
  const [playerError, setPlayerError] = useState(false);

  const [proof, setProof] = useState('');
  const [hasClickedJoin, setHasClickedJoin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
          const userId = getCurrentUserId();
          if (!userId) {
              navigate('/login');
              return;
          }

          // 1. Check if Task Exists
          const allTasks = await getTasks();
          const foundTask = allTasks.find(t => t.id === taskId);
          if (!foundTask) {
              navigate('/tasks');
              return;
          }

          // 2. Check 24-Hour Cooldown (Security Check)
          const userTransactions = await getTransactions(userId);
          const taskTransactions = userTransactions
              .filter(t => t.taskId === foundTask.id && t.type === 'EARNING')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (taskTransactions.length > 0) {
              const lastCompleted = new Date(taskTransactions[0].date).getTime();
              const now = Date.now();
              const hoursDiff = (now - lastCompleted) / (1000 * 60 * 60);
              
              if (hoursDiff < 24) {
                  alert(`You have already completed this task today. It will be available again in ${(24 - hoursDiff).toFixed(1)} hours.`);
                  navigate('/tasks');
                  return;
              }
          }

          setTask(foundTask);
          setTimeLeft(foundTask.durationSeconds);
          
          const settings = await getAdSettings();
          setAdSettings(settings);

          // Fetch metadata if it's a YouTube task
          if (foundTask.type === TaskType.YOUTUBE && foundTask.url) {
              const videoId = extractYouTubeId(foundTask.url);
              if (videoId) {
                  try {
                      const meta = await fetchYouTubeMetadata(videoId);
                      if (meta) {
                          setVideoMetadata({
                              title: meta.title,
                              author: meta.author_name,
                              thumbnail: meta.thumbnail_url
                          });
                      }
                  } catch (e) {
                      console.warn("Metadata fetch error", e);
                  }
              }
          }
      } catch (e) {
          console.error("Task runner init error", e);
      }
    };
    init();
  }, [taskId, navigate]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
        setIsTimerRunning(false);
        setErrorMessage(''); 
        setShowAd(true);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleLoadVideo = () => {
      setVideoLoaded(true);
      setPlayerError(false);
      if (!isTimerRunning) {
          setIsTimerRunning(true);
      }
  };

  const handleStartGeneral = () => {
    setIsTimerRunning(true);
  };

  const handleAdComplete = () => {
    setShowAd(false);
    if (errorMessage) {
        alert(errorMessage);
        setErrorMessage('');
        return;
    }
    completeTask();
  };

  const completeTask = async () => {
    if (!task) return;
    try {
        const userId = getCurrentUserId();
        if (!userId) return;

        // Secure call
        const result = await verifyAndCompleteTask(userId, task.id);
        
        if (result.success) {
            setIsCompleted(true);
        } else {
            alert(result.message || "Failed to complete task.");
        }
    } catch (e) {
        console.error("Completion error", e);
        alert("Error saving progress. Please check internet connection.");
    }
  };

  const handleManualClaim = () => {
      setErrorMessage(''); 
      completeTask();
  };

  const submitCustomProof = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(''); 
    setShowAd(true);
  };

  const handleTelegramJoin = () => {
      if (task?.url && task.url !== '#') {
          window.open(task.url, '_blank');
          setHasClickedJoin(true);
      } else {
          alert("Error: No join link provided for this task.");
      }
  };

  const handleTelegramVerify = async () => {
      const userId = getCurrentUserId();
      if (!userId) return;
      
      const user = await getUserById(userId);
      if (!user) return;

      if (!hasClickedJoin) {
          setErrorMessage("Please click 'Join Channel' first.");
          setShowAd(true); 
          return;
      }

      let tgId = user.telegramId;
      
      if (!tgId) {
          const manualId = prompt("Telegram Identity Missing\n\nPlease enter your Numeric Telegram ID (e.g., 123456789) to verify.");
          if (manualId && /^\d+$/.test(manualId.trim())) {
              tgId = parseInt(manualId.trim());
          } else {
              setErrorMessage("Identification Failed: A valid numeric Telegram ID is required.");
              setShowAd(true);
              return;
          }
      }

      if (!task?.channelUsername) {
           setErrorMessage("System Error: Task not configured correctly.");
           setShowAd(true);
           return;
      }

      setIsVerifying(true);
      setErrorMessage(''); 

      try {
          // SECURE VERIFICATION: Calls backend API now
          const result = await verifyTelegramMembership(
              task.channelUsername, 
              tgId!
          );

          if (result.success) {
              setErrorMessage(''); 
              setShowAd(true); 
          } else {
              setErrorMessage(`Verification Failed: ${result.error || 'Check that you joined.'}`);
              setShowAd(true); 
          }

      } catch (error) {
          console.error("Verification Error", error);
          setErrorMessage("Network Error: Could not verify status.");
          setShowAd(true);
      } finally {
          setIsVerifying(false);
      }
  };

  if (!task || !adSettings) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-white space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p>Loading System...</p>
          </div>
      );
  }

  if (isCompleted) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <CheckCircle className="w-20 h-20 text-green-500" />
              <h2 className="text-2xl font-bold text-white">Task Completed!</h2>
              <p className="text-gray-400">You earned {task.reward} points.</p>
              <button onClick={() => navigate('/tasks')} className="bg-blue-600 px-6 py-2 rounded-lg text-white font-bold">
                  Back to Tasks
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <button onClick={() => navigate('/tasks')} className="text-gray-400 hover:text-white flex items-center gap-2 shrink-0">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-gray-800 p-4 rounded-xl flex justify-between items-center border border-gray-700 shrink-0 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-white">{task.title}</h2>
            <p className="text-sm text-gray-400">Reward: <span className="text-blue-400 font-bold">{task.reward} Pts</span></p>
          </div>
          {task.type !== TaskType.CUSTOM && task.type !== TaskType.TELEGRAM && (
            <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                <Timer /> {timeLeft}s
            </div>
          )}
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-700 relative flex flex-col min-h-[75vh]">
          
          {!isTimerRunning && task.type !== TaskType.CUSTOM && task.type !== TaskType.TELEGRAM && task.type !== TaskType.YOUTUBE && timeLeft > 0 && (
              <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-white mb-4">Click below to start the timer and view the content.</p>
                  <button onClick={handleStartGeneral} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105 flex items-center gap-2">
                      <PlayCircle size={20} /> Start Task
                  </button>
              </div>
          )}

           {!isTimerRunning && timeLeft === 0 && task.type !== TaskType.CUSTOM && task.type !== TaskType.TELEGRAM && (
              <div className="absolute top-4 right-4 z-20 animate-bounce">
                  <button 
                    onClick={handleManualClaim}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg shadow-lg text-sm border-2 border-yellow-300"
                  >
                      Claim Reward
                  </button>
              </div>
          )}

          {task.type === TaskType.YOUTUBE && (
              <div className="flex flex-col h-full bg-black">
                  <div className="relative w-full aspect-video bg-black flex items-center justify-center shrink-0">
                      {videoLoaded && !playerError ? (
                         <YouTubePlayer
                             videoId={extractYouTubeId(task.url || '') || ''}
                             autoplay={true}
                             muted={false} 
                             controls={true}
                             className="w-full h-full"
                             onError={(e) => {
                                 console.warn("Player error", e);
                                 setPlayerError(true);
                                 if (!isTimerRunning && timeLeft > 0) setIsTimerRunning(true);
                             }}
                         />
                      ) : (
                         <div 
                            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black"
                            onClick={handleLoadVideo}
                         >
                            <img 
                                src={`https://img.youtube.com/vi/${extractYouTubeId(task.url || '')}/hqdefault.jpg`} 
                                className="absolute inset-0 w-full h-full object-cover opacity-50"
                                alt="thumb"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${extractYouTubeId(task.url || '')}/0.jpg`;
                                }}
                            />
                            {playerError ? (
                                <div className="z-10 bg-red-900/90 text-white p-6 rounded-lg text-center max-w-xs backdrop-blur-md">
                                    <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
                                    <p className="font-bold text-lg">Playback Restricted</p>
                                    <p className="text-xs text-gray-300 mb-4">The owner has disabled playback on this site.</p>
                                    <button 
                                        className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(task.url, '_blank');
                                            if (!isTimerRunning) setIsTimerRunning(true);
                                        }}
                                    >
                                        Open in YouTube App
                                    </button>
                                </div>
                            ) : (
                                <div className="z-10 bg-red-600 text-white p-5 rounded-full shadow-2xl animate-pulse group-hover:scale-110 transition">
                                    <Play size={40} fill="currentColor" />
                                </div>
                            )}
                         </div>
                      )}
                  </div>
                  
                  <div className="p-4 bg-gray-800 flex-1 overflow-y-auto">
                      {videoMetadata ? (
                          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4">
                              <h3 className="text-white font-bold text-lg leading-tight">{videoMetadata.title}</h3>
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                     <img src={videoMetadata.thumbnail} className="w-full h-full object-cover opacity-80" alt="avatar" />
                                  </div>
                                  <div>
                                      <p className="text-gray-300 text-sm font-medium">{videoMetadata.author}</p>
                                      <p className="text-gray-500 text-xs">YouTube Channel</p>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="text-gray-500 text-sm flex items-center gap-2">
                              <Info size={16} /> {playerError ? 'Metadata unavailable' : 'Video details loading...'}
                          </div>
                      )}
                      
                      <div className="mt-4 pt-4 border-t border-gray-700">
                          <a href={task.url} target="_blank" rel="noreferrer" className="text-blue-400 text-sm flex items-center gap-2 hover:underline">
                              <ExternalLink size={14} /> Open in YouTube App
                          </a>
                          <p className="text-xs text-gray-500 mt-2">
                              If the video doesn't play above, watch it in the app and wait for the timer here to finish.
                          </p>
                      </div>
                  </div>
              </div>
          )}

          {task.type === TaskType.WEBSITE && (
              <div className="w-full flex-1 flex flex-col h-full">
                 <div className="bg-gray-800 p-2 text-xs text-center text-gray-400 border-b border-gray-700 shrink-0">
                    Visiting: {task.url}
                 </div>
                 <iframe 
                    src={task.url}
                    className="w-full flex-1 bg-white"
                    onError={() => alert("Website refused to connect (X-Frame-Options). This is common in demos.")}
                 />
              </div>
          )}

          {task.type === TaskType.TELEGRAM && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                  <div className="bg-blue-500/20 p-6 rounded-full animate-pulse">
                      <Send size={64} className="text-blue-500" />
                  </div>
                  
                  <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Join Telegram Channel</h3>
                      <p className="text-gray-400">Join <span className="text-blue-400 font-mono">{task.channelUsername}</span> to earn points.</p>
                  </div>

                  {errorMessage && !showAd && (
                      <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm text-left animate-in fade-in slide-in-from-top-2">
                          <AlertTriangle size={24} className="shrink-0" /> 
                          <span className="text-xs md:text-sm">{errorMessage}</span>
                      </div>
                  )}

                  <button 
                    onClick={handleTelegramJoin}
                    className="w-full max-w-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition transform active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                      <Send size={20} /> Join Channel
                  </button>

                  <button 
                    onClick={handleTelegramVerify}
                    disabled={isVerifying}
                    className="w-full max-w-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-xl border border-gray-600 flex items-center justify-center gap-2"
                  >
                      {isVerifying ? (
                          <>
                            <Loader2 size={18} className="animate-spin" /> Verifying...
                          </>
                      ) : (
                          'Verify Membership'
                      )}
                  </button>
                  
                  <p className="text-xs text-gray-500">
                      Step 1: Click "Join Channel" to open Telegram.<br/>
                      Step 2: Return here and click "Verify".
                  </p>
              </div>
          )}

          {task.type === TaskType.CUSTOM && (
             <div className="p-6 text-white overflow-y-auto">
                 <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Instructions</h3>
                 <p className="text-gray-300 mb-6 whitespace-pre-wrap">{task.instructions}</p>
                 
                 <div className="bg-gray-800 p-4 rounded-lg">
                    <label className="block text-sm font-medium mb-2 text-blue-400">Link / Proof of work</label>
                    <input 
                        type="text" 
                        value={proof}
                        onChange={(e) => setProof(e.target.value)}
                        placeholder="Paste screenshot link or answer here..."
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <a href={task.url} target="_blank" rel="noreferrer" className="block text-center text-blue-400 underline mb-4 text-sm">
                        Open Task Link <span className="text-xs">↗</span>
                    </a>
                    <button 
                        onClick={submitCustomProof}
                        disabled={!proof}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg"
                    >
                        Submit Proof
                    </button>
                 </div>
             </div>
          )}
      </div>

      <AdSimulator isOpen={showAd} onComplete={handleAdComplete} settings={adSettings} />
    </div>
  );
};
