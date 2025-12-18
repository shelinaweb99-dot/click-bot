
import React, { useState, useEffect, useRef } from 'react';
import { Announcement } from '../../types';
import { getAnnouncements, addAnnouncement, deleteAnnouncement, subscribeToChanges } from '../../services/mockDb';
import { Bell, Trash2, Megaphone, Plus, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'INFO' | 'SUCCESS' | 'WARNING'>('INFO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useRef(true);

  const fetchAnnouncements = async () => {
    try {
        const data = await getAnnouncements();
        if (isMounted.current) setAnnouncements(data);
    } catch (e) {
        console.error("Announcement fetch error", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchAnnouncements();
    const unsubscribe = subscribeToChanges(() => {
        if(isMounted.current) fetchAnnouncements();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setIsSubmitting(true);

    const newAnnouncement: Announcement = {
        id: Date.now().toString(),
        title,
        message,
        type,
        date: new Date().toISOString()
    };

    try {
        await addAnnouncement(newAnnouncement);
        if (isMounted.current) {
            setTitle('');
            setMessage('');
        }
    } catch (e) {
        alert("Failed to post announcement");
    } finally {
        if (isMounted.current) setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (window.confirm('Delete this announcement?')) {
          await deleteAnnouncement(id);
      }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Megaphone className="text-blue-500" /> Announcements
      </h1>

      {/* Create Form */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-bold text-white mb-4">Post New Update</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="text-gray-400 text-sm">Title</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-700 text-white p-3 rounded mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Payment Update"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
              </div>
              <div>
                  <label className="text-gray-400 text-sm">Message</label>
                  <textarea 
                    className="w-full bg-gray-700 text-white p-3 rounded mt-1 h-24 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write your news here..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
              </div>
              <div>
                  <label className="text-gray-400 text-sm">Type</label>
                  <div className="flex gap-4 mt-2">
                      <button 
                        type="button"
                        onClick={() => setType('INFO')}
                        className={`flex items-center gap-2 px-4 py-2 rounded border ${type === 'INFO' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                      >
                          <Info size={16} /> Info
                      </button>
                      <button 
                        type="button"
                        onClick={() => setType('SUCCESS')}
                        className={`flex items-center gap-2 px-4 py-2 rounded border ${type === 'SUCCESS' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                      >
                          <CheckCircle size={16} /> Success
                      </button>
                      <button 
                        type="button"
                        onClick={() => setType('WARNING')}
                        className={`flex items-center gap-2 px-4 py-2 rounded border ${type === 'WARNING' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                      >
                          <AlertTriangle size={16} /> Warning
                      </button>
                  </div>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg w-full flex items-center justify-center gap-2"
              >
                  <Plus size={18} /> Publish Announcement
              </button>
          </form>
      </div>

      {/* List */}
      <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">History</h2>
          {announcements.length === 0 ? (
              <p className="text-gray-500">No announcements yet.</p>
          ) : (
              announcements.map(item => (
                  <div key={item.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-start">
                      <div className="flex gap-4">
                          <div className={`p-3 rounded-full h-fit ${
                              item.type === 'SUCCESS' ? 'bg-green-500/20 text-green-500' :
                              item.type === 'WARNING' ? 'bg-orange-500/20 text-orange-500' :
                              'bg-blue-500/20 text-blue-500'
                          }`}>
                              <Bell size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-white">{item.title}</h3>
                              <p className="text-gray-300 text-sm mt-1">{item.message}</p>
                              <p className="text-gray-500 text-xs mt-2">{new Date(item.date).toLocaleString()}</p>
                          </div>
                      </div>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:bg-red-500/10 p-2 rounded transition"
                      >
                          <Trash2 size={18} />
                      </button>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};
