
import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskType, TaskStatus } from '../../types';
import { getTasks, saveTask, deleteTask, subscribeToChanges } from '../../services/mockDb';
import { Trash2, Edit, Plus, Video, Globe, FileText, Send, AlertCircle } from 'lucide-react';

export const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [currentId, setCurrentId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>(TaskType.YOUTUBE);
  const [reward, setReward] = useState(0);
  const [url, setUrl] = useState('');
  const [channelUsername, setChannelUsername] = useState(''); // New field for Telegram
  const [duration, setDuration] = useState(30);
  const [limit, setLimit] = useState(100);
  const [instructions, setInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useRef(true);

  const loadTasks = async () => {
    try {
        const data = await getTasks();
        if (isMounted.current) setTasks(data);
    } catch (e) {
        console.error("Failed to load tasks", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadTasks();
    const unsubscribe = subscribeToChanges(() => {
        if(isMounted.current) loadTasks();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const resetForm = () => {
    setCurrentId('');
    setTitle('');
    setType(TaskType.YOUTUBE);
    setReward(0);
    setUrl('');
    setChannelUsername('');
    setDuration(30);
    setLimit(100);
    setInstructions('');
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        // If editing, try to find existing task to preserve counts
        const existingTask = currentId ? tasks.find(t => t.id === currentId) : null;

        // Auto-generate URL for Telegram type if missing or malformed
        let finalUrl = url;
        let finalChannelUsername = channelUsername;

        // --- Telegram Formatting ---
        if (type === TaskType.TELEGRAM && channelUsername) {
            let cleanUser = channelUsername.trim();
            // Remove full URL if pasted
            if (cleanUser.startsWith('https://t.me/')) {
                cleanUser = cleanUser.replace('https://t.me/', '');
            }
            
            // Logic: 
            // 1. If it starts with -100 (Numeric Channel ID), keep it as is.
            // 2. If it starts with @, keep it as is.
            // 3. If it's alphanumeric without @, add @.
            
            if (cleanUser.startsWith('-100')) {
               finalChannelUsername = cleanUser;
               // Ensure URL is provided for private channels
               if (!url || url === '#' || url.length < 5) {
                   alert("For Private Channels (ID starting with -100), you MUST provide a valid Invite Link in the URL field.");
                   setIsSaving(false);
                   return;
               }
            } else if (cleanUser.startsWith('@')) {
               finalChannelUsername = cleanUser;
            } else {
               finalChannelUsername = `@${cleanUser}`;
            }
            
            // Task URL for user click
            if (finalChannelUsername.startsWith('@')) {
                // For public usernames, we can auto-generate if URL is empty
                if (!finalUrl) {
                    finalUrl = `https://t.me/${finalChannelUsername.substring(1)}`;
                }
            }
        }
        
        // --- YouTube Formatting (Auto-Convert to Embed) ---
        if (type === TaskType.YOUTUBE && finalUrl) {
             let videoId = '';
            // Standard watch URL: youtube.com/watch?v=VIDEO_ID
            if (finalUrl.includes('v=')) {
                videoId = finalUrl.split('v=')[1]?.split('&')[0];
            } 
            // Short URL: youtu.be/VIDEO_ID
            else if (finalUrl.includes('youtu.be/')) {
                videoId = finalUrl.split('youtu.be/')[1]?.split('?')[0];
            }
            // Shorts URL: youtube.com/shorts/VIDEO_ID
            else if (finalUrl.includes('/shorts/')) {
                videoId = finalUrl.split('/shorts/')[1]?.split('?')[0];
            }
            
            if (videoId) {
                finalUrl = `https://www.youtube.com/embed/${videoId}`;
            }
        }

        const newTask: Task = {
            id: currentId || Date.now().toString(),
            title,
            type,
            reward,
            url: finalUrl,
            channelUsername: type === TaskType.TELEGRAM ? finalChannelUsername : undefined,
            durationSeconds: duration,
            totalLimit: limit,
            // Preserve existing state if editing, otherwise defaults
            completedCount: existingTask ? existingTask.completedCount : 0, 
            status: existingTask ? existingTask.status : TaskStatus.ACTIVE,
            // The service layer now handles sanitization of undefined values
            instructions: type === TaskType.CUSTOM ? instructions : undefined
        };
        
        await saveTask(newTask);
        if (isMounted.current) resetForm();
    } catch (error) {
        console.error("Failed to save task:", error);
        alert("Error saving task: " + (error as Error).message);
        if (isMounted.current) setIsSaving(false);
    }
  };

  const handleEdit = (task: Task) => {
    setIsEditing(true);
    setCurrentId(task.id);
    setTitle(task.title);
    setType(task.type);
    setReward(task.reward);
    setUrl(task.url || '');
    setChannelUsername(task.channelUsername || '');
    setDuration(task.durationSeconds);
    setLimit(task.totalLimit);
    setInstructions(task.instructions || '');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this task?')) {
        await deleteTask(id);
    }
  };

  const getUrlPlaceholder = () => {
    switch(type) {
      case TaskType.YOUTUBE: return 'Paste any YouTube Link (Watch/Share/Shorts)';
      case TaskType.TELEGRAM: return 'https://t.me/your_channel (Optional if Username provided)';
      default: return 'https://...';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Task Management</h1>
        <button 
            onClick={() => { resetForm(); setIsEditing(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
        >
            <Plus size={18} /> Add New Task
        </button>
      </div>

      {isEditing && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-lg font-bold text-white mb-4">{currentId ? 'Edit Task' : 'Create Task'}</h3>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                      <label className="text-gray-400 text-sm">Task Title</label>
                      <input className="w-full bg-gray-700 text-white p-2 rounded mt-1" required value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                      <label className="text-gray-400 text-sm">Type</label>
                      <select className="w-full bg-gray-700 text-white p-2 rounded mt-1" value={type} onChange={e => setType(e.target.value as TaskType)}>
                          <option value={TaskType.YOUTUBE}>YouTube Video</option>
                          <option value={TaskType.WEBSITE}>Website Visit</option>
                          <option value={TaskType.TELEGRAM}>Telegram Join</option>
                          <option value={TaskType.CUSTOM}>Custom Job</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-gray-400 text-sm">Reward Points</label>
                      <input type="number" className="w-full bg-gray-700 text-white p-2 rounded mt-1" required value={reward} onChange={e => setReward(Number(e.target.value))} />
                  </div>

                  {type === TaskType.TELEGRAM ? (
                       <div className="md:col-span-2 bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                           <div className="mb-4">
                               <label className="text-blue-400 text-sm font-bold flex items-center gap-1">
                                   <Send size={14} /> Telegram Channel Username OR ID
                               </label>
                               <input 
                                    className="w-full bg-gray-700 text-white p-2 rounded mt-1 border border-blue-500/50" 
                                    value={channelUsername} 
                                    onChange={e => setChannelUsername(e.target.value)} 
                                    placeholder="@yourchannel OR -100123456789"
                                    required
                               />
                               <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                                   <AlertCircle size={12} className="mt-0.5" />
                                   <span>For Private Channels, use the ID (starts with -100). The Bot MUST be an Admin.</span>
                               </p>
                           </div>
                           
                           <div>
                                <label className="text-gray-400 text-sm">Invite Link</label>
                                <input 
                                    className="w-full bg-gray-700 text-white p-2 rounded mt-1" 
                                    value={url} 
                                    onChange={e => setUrl(e.target.value)} 
                                    placeholder="https://t.me/+AbCdEfGh..." 
                                />
                                <p className="text-xs text-orange-400 mt-1">
                                    Required for Private Channels (ID -100...). Optional for Public (@username).
                                </p>
                           </div>
                       </div>
                  ) : (
                       <div className="md:col-span-2">
                           <label className="text-gray-400 text-sm">URL / Link</label>
                           <input className="w-full bg-gray-700 text-white p-2 rounded mt-1" value={url} onChange={e => setUrl(e.target.value)} placeholder={getUrlPlaceholder()} />
                       </div>
                  )}

                  {type !== TaskType.CUSTOM && type !== TaskType.TELEGRAM && (
                     <div>
                        <label className="text-gray-400 text-sm">Duration (Seconds)</label>
                        <input type="number" className="w-full bg-gray-700 text-white p-2 rounded mt-1" value={duration} onChange={e => setDuration(Number(e.target.value))} />
                     </div>
                  )}
                  <div>
                      <label className="text-gray-400 text-sm">Max Workers</label>
                      <input type="number" className="w-full bg-gray-700 text-white p-2 rounded mt-1" value={limit} onChange={e => setLimit(Number(e.target.value))} />
                  </div>
                  {type === TaskType.CUSTOM && (
                      <div className="md:col-span-2">
                          <label className="text-gray-400 text-sm">Instructions</label>
                          <textarea className="w-full bg-gray-700 text-white p-2 rounded mt-1 h-24" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="What should the user do?" />
                      </div>
                  )}
                  <div className="md:col-span-2 flex gap-2 mt-2">
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded"
                      >
                        {isSaving ? 'Saving...' : 'Save Task'}
                      </button>
                      <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded">Cancel</button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid gap-4">
          {tasks.map(task => (
              <div key={task.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <div className="bg-gray-700 p-3 rounded-full text-blue-400">
                          {task.type === TaskType.YOUTUBE ? <Video /> : 
                           task.type === TaskType.WEBSITE ? <Globe /> : 
                           task.type === TaskType.TELEGRAM ? <Send /> :
                           <FileText />}
                      </div>
                      <div>
                          <h3 className="font-bold text-white">{task.title}</h3>
                          <p className="text-sm text-gray-400">
                              {task.reward} Pts • 
                              {task.type === TaskType.TELEGRAM ? <span className="text-blue-400 font-bold ml-1">{task.channelUsername}</span> : `${task.durationSeconds}s`} 
                              • {task.completedCount}/{task.totalLimit} Done
                          </p>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => handleEdit(task)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded"><Trash2 size={18} /></button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
