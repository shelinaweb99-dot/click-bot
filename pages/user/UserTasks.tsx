
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskType, TaskStatus } from '../../types';
import { getTasks, getCurrentUserId, getTransactions, subscribeToChanges } from '../../services/mockDb';
import { Youtube, Globe, Edit, PlayCircle, RefreshCw, Send, Clock, Lock, FileDown, CheckCircle } from 'lucide-react';

export const UserTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  const fetchTasks = async () => {
    if (tasks.length === 0 && isMounted.current) setLoading(true);
    
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            if (isMounted.current) setLoading(false);
            return;
        }

        const userTransactions = await getTransactions(userId);
        if (!isMounted.current) return;

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();
        const completionMap = new Map<string, boolean>();
        
        userTransactions.forEach(tx => {
            if (tx.taskId && tx.type === 'EARNING') {
                const txDate = new Date(tx.date).getTime();
                // Only mark as completed if it was done within the last 24 hours
                // (Though backend should filter Website/YouTube tasks, this is safe for others)
                if (txDate > yesterday) {
                    completionMap.set(tx.taskId, true);
                }
            }
        });

        const allTasks = await getTasks();
        if (!isMounted.current) return;
        
        const filteredTasks = allTasks.filter(t => t.status === TaskStatus.ACTIVE);
        
        if (isMounted.current) {
            setTasks(filteredTasks.map(t => ({
                ...t,
                isCompleted: completionMap.get(t.id) || false
            } as any)));
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

  const getIcon = (type: TaskType, isDone: boolean) => {
    if (type === TaskType.SHORTLINK && isDone) return <FileDown className="text-green-500" />;
    switch(type) {
        case TaskType.YOUTUBE: return <Youtube className="text-red-500" />;
        case TaskType.WEBSITE: return <Globe className="text-blue-500" />;
        case TaskType.TELEGRAM: return <Send className="text-blue-400" />;
        case TaskType.SHORTLINK: return <Lock className="text-amber-500" />;
        case TaskType.CUSTOM: return <Edit className="text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center px-1">
          <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Active Missions</h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Syncing Live Directory</p>
          </div>
          <button 
            onClick={fetchTasks} 
            className={`p-3 bg-gray-900 rounded-2xl text-gray-500 hover:text-white transition-all shadow-xl active:scale-90 ${loading ? 'animate-spin' : ''}`}
          >
              <RefreshCw size={20} />
          </button>
      </div>
      
      {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
              <Clock size={48} className="text-gray-800 mb-6" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">No active missions available</p>
              <p className="text-[9px] text-gray-700 mt-2 uppercase tracking-[0.2em] font-black">Check back soon for new rewards</p>
          </div>
      ) : (
        <div className="space-y-4">
            {tasks.map((task: any) => (
                <div 
                    key={task.id} 
                    className={`glass-card rounded-[2rem] p-5 border border-white/5 transition-all cursor-pointer group hover:border-blue-500/30 shadow-xl ${task.isCompleted ? 'opacity-80' : ''}`}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#030712] p-4 rounded-2xl border border-white/5 text-blue-400 group-hover:scale-110 transition-transform shadow-inner">
                                {getIcon(task.type, task.isCompleted)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-white font-bold text-[13px] line-clamp-1 uppercase tracking-tight">{task.title}</h3>
                                <p className="text-gray-600 text-[9px] mt-1 font-black uppercase tracking-widest">
                                    {task.isCompleted ? (
                                        <span className="text-green-500 flex items-center gap-1">Mission Completed <CheckCircle size={10} /></span>
                                    ) : (
                                        task.type === TaskType.SHORTLINK ? 'Unlock Protected File' : 'Verification Reward'
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap border shadow-sm transition-colors ${task.isCompleted ? 'bg-green-500/10 text-green-500 border-green-500/10' : 'bg-blue-600/10 text-blue-400 border-blue-500/10'}`}>
                            {task.isCompleted ? 'CLAIMED' : `+${task.reward} Pts`}
                        </div>
                    </div>
                    
                    <button className={`w-full mt-5 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-lg ${
                        task.isCompleted 
                        ? 'bg-emerald-600/10 text-emerald-500 border-emerald-500/10' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400/20 active:scale-95'
                    }`}>
                        {task.isCompleted 
                            ? (task.type === TaskType.SHORTLINK ? <>Access File <FileDown size={14} /></> : 'Mission Logged')
                            : (task.type === TaskType.SHORTLINK ? 'Start Link' : 'Deploy Mission') 
                        }
                    </button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
