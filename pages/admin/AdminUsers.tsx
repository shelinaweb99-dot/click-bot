
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../../types';
import { getUsers, saveUser, subscribeToChanges } from '../../services/mockDb';
import { Ban, CheckCircle, Search, Loader2, AlertCircle, RefreshCw, User as UserIcon } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const isMounted = useRef(true);

  const fetchUsers = async () => {
    try {
        if (isMounted.current) setLoading(true);
        setError(null);
        const data = await getUsers();
        if (isMounted.current) {
            setUsers(Array.isArray(data) ? data : []);
        }
    } catch (e: any) {
        console.error("Fetch users error", e);
        if (isMounted.current) setError("System core failed to retrieve member directory.");
    } finally {
        if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchUsers();
    const unsubscribe = subscribeToChanges(() => {
        if(isMounted.current) fetchUsers();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const toggleBlock = async (user: User) => {
    try {
        const updatedUser = { ...user, blocked: !user.blocked };
        await saveUser(updatedUser);
        // Local update to avoid full reload
        setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    } catch (e) {
        alert("Failed to update user security status.");
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Indexing User Database</p>
          </div>
      );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-black text-white">DB Sync Error</h2>
        <p className="text-gray-500 text-sm mt-2 mb-6">{error}</p>
        <button onClick={fetchUsers} className="bg-red-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <RefreshCw size={16} /> Force Sync
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Directory</h1>
            <p className="text-gray-500 font-bold mt-1 uppercase text-[10px] tracking-widest">{users.length} Registered Members</p>
          </div>
          <button onClick={fetchUsers} className="p-3 bg-gray-900 rounded-2xl text-gray-500 hover:text-white border border-white/5 transition-all">
            <RefreshCw size={18} />
          </button>
      </div>
      
      <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Filter by name, ID or email alias..." 
            className="w-full bg-gray-900 text-white pl-14 p-5 rounded-3xl border border-white/5 focus:border-blue-500 outline-none transition-all font-bold text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
      </div>

      <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-white/5 text-gray-500">
                      <tr>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Member Profile</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Balance (USDT)</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Region</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Security</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                      {filteredUsers.length === 0 ? (
                          <tr><td colSpan={5} className="p-10 text-center text-gray-600 font-bold italic">No records matching search query</td></tr>
                      ) : (
                        filteredUsers.map(user => (
                            <tr key={user.id} className="text-gray-300 hover:bg-white/[0.02] transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-blue-500">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm flex items-center gap-2">
                                                {user.name || 'Incognito User'}
                                                {user.role === UserRole.ADMIN && <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-black">CORE ADMIN</span>}
                                            </p>
                                            <p className="text-[11px] text-gray-600 font-mono">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 font-mono font-black text-white">{user.balance.toFixed(2)}</td>
                                <td className="px-8 py-6 text-xs font-bold text-gray-500">{user.country || 'International'}</td>
                                <td className="px-8 py-6">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${user.blocked ? 'bg-red-500/10 text-red-500 border border-red-500/10' : 'bg-green-500/10 text-green-500 border border-green-500/10'}`}>
                                        {user.blocked ? 'Restricted' : 'Authenticated'}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    {user.role !== UserRole.ADMIN && (
                                        <button 
                                            onClick={() => toggleBlock(user)}
                                            className={`p-3 rounded-xl transition-all ${user.blocked ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                            title={user.blocked ? "Unblock Access" : "Revoke Access"}
                                        >
                                            {user.blocked ? <CheckCircle size={18} /> : <Ban size={18} />}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
