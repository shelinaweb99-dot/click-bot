
import React, { useEffect, useState, useRef } from 'react';
import { getUsers, getWithdrawals, getTasks, subscribeToChanges } from '../../services/mockDb';
import { User, Task, WithdrawalRequest } from '../../types';
import { Users, CheckCircle, Wallet, AlertCircle, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
      const [usersData, withdrawalsData, tasksData] = await Promise.all([
        getUsers(),
        getWithdrawals(),
        getTasks()
      ]);
      if (!isMounted.current) return;
      setUsers(usersData);
      setWithdrawals(withdrawalsData);
      setTasks(tasksData);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const unsubscribe = subscribeToChanges(() => {
        if(isMounted.current) fetchData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING').length;

  if (loading) {
    return <div className="p-6 text-white">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{users.length}</h3>
                </div>
                <div className="p-3 bg-blue-600/20 rounded-lg text-blue-500">
                    <Users size={24} />
                </div>
            </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-400 text-sm">Active Tasks</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{tasks.length}</h3>
                </div>
                <div className="p-3 bg-green-600/20 rounded-lg text-green-500">
                    <CheckCircle size={24} />
                </div>
            </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-400 text-sm">Pending Withdrawals</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{pendingWithdrawals}</h3>
                </div>
                <div className="p-3 bg-orange-600/20 rounded-lg text-orange-500">
                    <AlertCircle size={24} />
                </div>
            </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-400 text-sm">Total Paid</p>
                    <h3 className="text-3xl font-bold text-white mt-2">
                        {withdrawals.filter(w => w.status === 'APPROVED').reduce((acc, curr) => acc + curr.amount, 0)}
                    </h3>
                </div>
                <div className="p-3 bg-purple-600/20 rounded-lg text-purple-500">
                    <Wallet size={24} />
                </div>
            </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mt-8">
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="flex gap-4">
              <Link to="/admin/announcements" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                  <Megaphone size={18} /> Post News
              </Link>
              <Link to="/admin/withdrawals" className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
                  <Wallet size={18} /> Review Payments
              </Link>
          </div>
      </div>
    </div>
  );
};
