
import React, { useState, useEffect, useRef } from 'react';
import { User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, saveUser, logout, getSystemSettings, subscribeToChanges } from '../../services/mockDb';
import { User as UserIcon, LogOut, Settings, MessageCircle, Lock, Save, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
        try {
            const id = getCurrentUserId();
            if (id) {
                const u = await getUserById(id);
                if (isMounted.current) setUser(u);
            }
            const s = await getSystemSettings();
            if (isMounted.current) setSystemSettings(s);
        } catch (e) {
            console.error("Profile init error", e);
        }
    };
    init();
    const unsub = subscribeToChanges(() => {
        if (isMounted.current) init();
    });
    return () => {
        isMounted.current = false;
        unsub();
    };
  }, []);

  const handleLogout = async () => {
      if(window.confirm('Are you sure you want to logout?')) {
          await logout();
          navigate('/login');
      }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      // Note: Updating password now requires Firebase Auth password update, which is sensitive.
      // For this simplified version, we are disabling the "Update Password" UI if using Firebase Auth 
      // as it requires re-authentication. 
      alert("Please reset your password via the Login page 'Forgot Password' option (not implemented yet).");
  };

  if (!user) return <div className="text-center text-white mt-10">Loading...</div>;

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="text-blue-500" /> My Profile
        </h1>

        {/* Info Card */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-gray-400 text-sm mb-4">{user.email}</p>
            
            <div className="bg-black/30 px-4 py-2 rounded-lg flex items-center gap-3 border border-gray-700">
                <span className="text-gray-500 text-xs uppercase">User ID</span>
                <code className="text-blue-400 font-mono text-sm">{user.id}</code>
                <button onClick={() => navigator.clipboard.writeText(user.id)} className="text-gray-400 hover:text-white">
                    <Copy size={14} />
                </button>
            </div>
        </div>

        {/* Support */}
        <div className="bg-blue-600/10 border border-blue-600/30 p-4 rounded-xl flex items-center justify-between">
            <div>
                <h3 className="font-bold text-blue-400">Need Help?</h3>
                <p className="text-xs text-blue-200">Contact admin for payment issues.</p>
            </div>
            <a 
                href={systemSettings?.supportLink || '#'} 
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
            >
                <MessageCircle size={16} /> Contact Support
            </a>
        </div>

        {/* Logout */}
        <button 
            onClick={handleLogout}
            className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
            <LogOut size={20} /> Log Out
        </button>

        <p className="text-center text-gray-600 text-xs">Version 2.5.1 (Secure)</p>
    </div>
  );
};
