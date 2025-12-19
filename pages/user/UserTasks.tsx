
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskType, TaskStatus } from '../../types';
import { getTasks, getCurrentUserId, getTransactions, subscribeToChanges } from '../../services/mockDb';
import { Youtube, Globe, Edit, PlayCircle, RefreshCw, Send, Clock } from 'lucide-react';

export const UserTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  const fetchTasks = async () => {
    // Only set loading on first fetch to avoid flickering on updates
    if (tasks.length === 0 && isMounted.current) setLoading(true);
    
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            if (isMounted.current) setLoading(false);
            return;
        }

        // Fetch User History
        const userTransactions = await getTransactions(userId);
        if (!isMounted.current) return;

        // Map to store the last completion time for each task
        const lastCompletionMap = new Map<string, number>();
        
        userTransactions.forEach(tx => {
            if (tx.taskId && tx.type === 'EARNING') {
                const txTime = new Date(tx.date).getTime();
                const existing = lastCompletionMap.get(tx.taskId) || 0;
                // Keep the most recent completion time
                if (txTime > existing) {
                    lastCompletionMap.set(tx.taskId, txTime);
                }
            }
        });

        const allTasks = await getTasks();
        if (!isMounted.current) return;
        
        const now = Date.now();
        const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; // 24 Hours in ms

        // Filter Tasks
        const activeTasks = allTasks.filter(t => {
            // 1. Must be globally active
            if (t.status !== TaskStatus.ACTIVE) return false;

            // 2. Check personal 24h cooldown
            const lastCompletedAt = lastCompletionMap.get(t.id);
            if (lastCompletedAt) {
                const timeSinceCompletion = now - lastCompletedAt;
                // If less than 24 hours passed, hide it
                if (timeSinceCompletion < COOLDOWN_PERIOD) {
                    return false;
                }
            }
            
            return true;
        });
        
        if (isMounted.current) {
            setTasks(activeTasks);
            setLoading(false);
        }
    } catch (e) {
        console.error("Failed to fetch tasks", e);
        if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchTasks();
    const unsubscribe = subscribeToChanges(() => {
        if (isMounted.current) fetchTasks();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const getIcon = (type: TaskType) => {
    switch(type) {
        case TaskType.YOUTUBE: return <Youtube className="text-red-500" />;
        case TaskType.WEBSITE: return <Globe className="text-blue-500" />;
        case TaskType.TELEGRAM: return <Send className="text-blue-400" />;
        case TaskType.CUSTOM: return <Edit className="text-yellow-500" />;
    }
  };

  const getActionText = (type: TaskType) => {
      switch(type) {
          case TaskType.TELEGRAM: return "Join Channel";
          case TaskType.CUSTOM: return "Complete Job";
          default: return "Start Task";
      }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Available Tasks</h2>
          <button 
            onClick={fetchTasks} 
            className={`p-2 rounded-xl hover:bg-gray-800 text-gray-500 hover:text-white transition ${loading ? 'animate-spin' : ''}`}
            title="Refresh Tasks"
          >
              <RefreshCw size={20} />
          </button>
      </div>
      
      {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-900/40 rounded-3xl border border-white/5 backdrop-blur-sm">
              <Clock size={40} className="text-gray-700 mb-4" />
              <p className="text-gray-500 font-bold mb-2">No active missions</p>
              <p className="text-[10px] text-gray-600 max-w-[200px] mx-auto uppercase tracking-widest font-bold">
                  Tasks reset every 24 hours. Check back later!
              </p>
              <button 
                onClick={fetchTasks}
                className="text-blue-500 text-xs font-black uppercase tracking-widest mt-6 hover:underline"
              >
                Tap to Sync
              </button>
          </div>
      ) : (
        tasks.map(task => (
            <div key={task.id} className="glass-card rounded-3xl p-5 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group" onClick={() => navigate(`/tasks/${task.id}`)}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-900 p-3.5 rounded-2xl border border-white/5 text-blue-400 group-hover:scale-110 transition-transform">
                            {getIcon(task.type)}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm line-clamp-1">{task.title}</h3>
                            <p className="text-gray-500 text-[10px] mt-1 font-bold uppercase tracking-wider">
                                {task.type === TaskType.CUSTOM ? 'Manual Review' : 
                                 task.type === TaskType.TELEGRAM ? 'Community Join' :
                                 `Verify in ${task.durationSeconds}s`}
                            </p>
                        </div>
                    </div>
                    <div className="bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap border border-blue-500/10 shadow-sm">
                        +{task.reward} USDT
                    </div>
                </div>
                <button className="w-full mt-5 bg-blue-600/5 hover:bg-blue-600 hover:text-white text-blue-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-blue-500/10">
                    {getActionText(task.type)} <PlayCircle size={14} />
                </button>
            </div>
        ))
      )}
    </div>
  );
};
