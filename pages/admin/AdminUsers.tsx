
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../../types';
import { getUsers, saveUser, subscribeToChanges } from '../../services/mockDb';
import { Ban, CheckCircle, Search } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const isMounted = useRef(true);

  const fetchUsers = async () => {
    try {
        const data = await getUsers();
        if (isMounted.current) setUsers(data);
    } catch (e) {
        console.error("Fetch users error", e);
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
    const updatedUser = { ...user, blocked: !user.blocked };
    await saveUser(updatedUser);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">User Management</h1>
      
      <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full bg-gray-800 text-white pl-10 p-3 rounded-xl border border-gray-700 focus:border-blue-500 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
              <thead className="bg-gray-700 text-gray-300">
                  <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Balance</th>
                      <th className="p-4">Country</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Action</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                  {filteredUsers.map(user => (
                      <tr key={user.id} className="text-gray-300 hover:bg-gray-700/50">
                          <td className="p-4">
                              <p className="font-bold text-white flex items-center gap-2">
                                {user.name}
                                {user.role === UserRole.ADMIN && <span className="text-[10px] bg-blue-600 px-1 rounded">ADMIN</span>}
                              </p>
                              <p className="text-xs">{user.email}</p>
                          </td>
                          <td className="p-4 font-mono">{user.balance}</td>
                          <td className="p-4">{user.country}</td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs ${user.blocked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                  {user.blocked ? 'Blocked' : 'Active'}
                              </span>
                          </td>
                          <td className="p-4">
                              {user.role !== UserRole.ADMIN && (
                                <button 
                                    onClick={() => toggleBlock(user)}
                                    className={`p-2 rounded ${user.blocked ? 'text-green-400 hover:bg-green-400/10' : 'text-red-400 hover:bg-red-400/10'}`}
                                    title={user.blocked ? "Unblock" : "Block"}
                                >
                                    {user.blocked ? <CheckCircle size={18} /> : <Ban size={18} />}
                                </button>
                              )}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};
