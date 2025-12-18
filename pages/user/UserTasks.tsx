
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
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Available Tasks</h2>
          <button 
            onClick={fetchTasks} 
            className={`p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition ${loading ? 'animate-spin' : ''}`}
            title="Refresh Tasks"
          >
              <RefreshCw size={20} />
          </button>
      </div>
      
      {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-gray-800 rounded-xl border border-gray-700">
              <Clock size={40} className="text-gray-600 mb-4" />
              <p className="text-gray-400 mb-2">{loading ? 'Loading tasks...' : 'No active tasks available.'}</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Tasks reappear 24 hours after completion. Check back later!
              </p>
              <button 
                onClick={fetchTasks}
                className="text-blue-400 text-sm hover:underline mt-4"
              >
                Tap to Refresh
              </button>
          </div>
      ) : (
        tasks.map(task => (
            <div key={task.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition cursor-pointer" onClick={() => navigate(`/tasks/${task.id}`)}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-700 p-3 rounded-full">
                            {getIcon(task.type)}
                        </div>
                        <div>
                            <h3 className="text-white font-bold line-clamp-1">{task.title}</h3>
                            <p className="text-gray-400 text-xs mt-1">
                                {task.type === TaskType.CUSTOM ? 'Complete Job' : 
                                 task.type === TaskType.TELEGRAM ? 'Join & Earn' :
                                 `Watch for ${task.durationSeconds}s`}
                            </p>
                        </div>
                    </div>
                    <div className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                        +{task.reward} Pts
                    </div>
                </div>
                <button className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    {getActionText(task.type)} <PlayCircle size={16} />
                </button>
            </div>
        ))
      )}
    </div>
  );
};
