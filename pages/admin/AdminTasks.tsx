
import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskType, TaskStatus } from '../../types';
import { getTasks, saveTask, deleteTask, subscribeToChanges } from '../../services/mockDb';
import { Trash2, Edit, Plus, Video, Globe, FileText, Send, AlertCircle, Link as LinkIcon, Lock, Bot } from 'lucide-react';

export const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentId, setCurrentId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>(TaskType.YOUTUBE);
  const [reward, setReward] = useState(0);
  const [url, setUrl] = useState('');
  const [channelUsername, setChannelUsername] = useState('');
  const [duration, setDuration] = useState(30);
  const [limit, setLimit] = useState(100);
  const [instructions, setInstructions] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileTitle, setFileTitle] = useState('');
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
    setFileUrl('');
    setFileTitle('');
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const existingTask = currentId ? tasks.find(t => t.id === currentId) : null;
        let finalUrl = url;

        if (type === TaskType.YOUTUBE && finalUrl) {
            let videoId = '';
            if (finalUrl.includes('v=')) videoId = finalUrl.split('v=')[1]?.split('&')[0];
            else if (finalUrl.includes('youtu.be/')) videoId = finalUrl.split('youtu.be/')[1]?.split('?')[0];
            else if (finalUrl.includes('/shorts/')) videoId = finalUrl.split('/shorts/')[1]?.split('?')[0];
            if (videoId) finalUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        const newTask: Task = {
            id: currentId || 't_' + Date.now(),
            title,
            type,
            reward,
            url: finalUrl,
            channelUsername: (type === TaskType.TELEGRAM || type === TaskType.TELEGRAM_CHANNEL || type === TaskType.TELEGRAM_BOT) ? channelUsername : undefined,
            durationSeconds: duration,
            totalLimit: limit,
            completedCount: existingTask ? existingTask.completedCount : 0, 
            status: existingTask ? existingTask.status : TaskStatus.ACTIVE,
            instructions: type === TaskType.CUSTOM ? instructions : undefined,
            fileUrl: type === TaskType.SHORTLINK ? fileUrl : undefined,
            fileTitle: type === TaskType.SHORTLINK ? fileTitle : undefined
        };
        
        await saveTask(newTask);
        if (isMounted.current) resetForm();
    } catch (error) {
        console.error(error);
        alert("Error saving task.");
    } finally {
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
    setFileUrl(task.fileUrl || '');
    setFileTitle(task.fileTitle || '');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this task?')) {
        await deleteTask(id);
    }
  };

  const postbackUrl = currentId ? `${window.location.origin}/api?action=postback&uid={uid}&tid=${currentId}` : 'Save task first to see Postback URL';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tighter">Task Management</h1>
        <button 
            onClick={() => { resetForm(); setIsEditing(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
        >
            <Plus size={18} /> New Task
        </button>
      </div>

      {isEditing && (
          <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 animate-in fade-in slide-in-from-top-4 shadow-2xl">
              <h3 className="text-xl font-black text-white mb-8 uppercase tracking-tight">{currentId ? 'Edit Resource' : 'Register New Mission'}</h3>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                      <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Task Title</label>
                      <input className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1 focus:border-blue-500 outline-none" required value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                      <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Mission Type</label>
                      <select className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1 focus:border-blue-500 outline-none" value={type} onChange={e => setType(e.target.value as TaskType)}>
                          <option value={TaskType.YOUTUBE}>YouTube Video</option>
                          <option value={TaskType.WEBSITE}>Website Visit</option>
                          <option value={TaskType.TELEGRAM_CHANNEL}>Telegram Channel Join</option>
                          <option value={TaskType.TELEGRAM_BOT}>Telegram Bot Join</option>
                          <option value={TaskType.SHORTLINK}>Shortlink + File</option>
                          <option value={TaskType.CUSTOM}>Custom Job</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Reward (Pts)</label>
                      <input type="number" className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1 focus:border-blue-500 outline-none" required value={reward} onChange={e => setReward(Number(e.target.value))} />
                  </div>

                  {(type === TaskType.TELEGRAM_CHANNEL || type === TaskType.TELEGRAM_BOT || type === TaskType.TELEGRAM) && (
                      <div>
                          <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Channel Username (e.g. @mychannel)</label>
                          <input className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1" value={channelUsername} onChange={e => setChannelUsername(e.target.value)} placeholder="@mychannel" />
                      </div>
                  )}

                  {type === TaskType.SHORTLINK ? (
                      <div className="md:col-span-2 space-y-6 p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                          <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest">
                              <Lock size={14} /> Protected File Configuration
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">File Display Name</label>
                                  <input className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1" value={fileTitle} onChange={e => setFileTitle(e.target.value)} placeholder="e.g. MySecretFile.zip" />
                              </div>
                              <div>
                                  <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Protected Download URL</label>
                                  <input className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." />
                              </div>
                          </div>
                          <div className="space-y-2">
                               <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Shortlink URL</label>
                               <input className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://gplinks.co/..." />
                          </div>
                          <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                              <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Global Postback URL</label>
                              <div className="flex items-center gap-2 mt-2">
                                  <code className="bg-[#030712] p-3 rounded-lg text-blue-400 font-mono text-[10px] flex-1 break-all">{postbackUrl}</code>
                                  <button type="button" onClick={() => navigator.clipboard.writeText(postbackUrl)} className="p-3 bg-white/5 rounded-xl hover:text-white transition-colors"><LinkIcon size={16} /></button>
                              </div>
                              <p className="text-[9px] text-gray-600 mt-2 italic">* Provide this URL to your shortlink network.</p>
                          </div>
                      </div>
                  ) : (
                      <div className="md:col-span-2">
                          <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Mission URL</label>
                          <input className="w-full bg-[#0b1120] border border-white/5 text-white p-4 rounded-2xl mt-1 focus:border-blue-500 outline-none" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
                      </div>
                  )}

                  <div className="md:col-span-2 flex gap-4 mt-4">
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-widest py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-95"
                      >
                        {isSaving ? 'Synchronizing...' : 'Commit Mission'}
                      </button>
                      <button type="button" onClick={() => setIsEditing(false)} className="px-8 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                  </div>
              </form>
          </div>
      )}

      <div className="grid gap-4">
          {tasks.map(task => (
              <div key={task.id} className="bg-[#1e293b] p-6 rounded-[2rem] border border-white/5 flex justify-between items-center group hover:border-blue-500/20 transition-all shadow-xl">
                  <div className="flex items-center gap-5">
                      <div className="bg-[#0b1120] p-4 rounded-2xl text-blue-500 shadow-inner group-hover:scale-110 transition-transform">
                          {task.type === TaskType.YOUTUBE ? <Video /> : 
                           task.type === TaskType.WEBSITE ? <Globe /> : 
                           (task.type === TaskType.TELEGRAM_CHANNEL || task.type === TaskType.TELEGRAM) ? <Send /> :
                           task.type === TaskType.TELEGRAM_BOT ? <Bot /> :
                           task.type === TaskType.SHORTLINK ? <Lock /> :
                           <FileText />}
                      </div>
                      <div>
                          <h3 className="font-black text-white text-sm uppercase tracking-tight">{task.title}</h3>
                          <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{task.reward} Pts</span>
                              <span className="text-gray-700 text-[10px]">•</span>
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{task.completedCount}/{task.totalLimit} Done</span>
                              {task.type === TaskType.SHORTLINK && (
                                  <span className="text-[8px] bg-blue-600/10 text-blue-400 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-blue-500/10">Secure File</span>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => handleEdit(task)} className="p-3 text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
