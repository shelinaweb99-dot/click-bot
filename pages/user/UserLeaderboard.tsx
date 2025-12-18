
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { getLeaderboard, subscribeToChanges } from '../../services/mockDb';
import { Trophy, Medal } from 'lucide-react';

export const UserLeaderboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
        const data = await getLeaderboard();
        if (isMounted.current) {
            setUsers(data);
            setLoading(false);
        }
    } catch (e) {
        console.error("Leaderboard fetch error", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const unsubscribe = subscribeToChanges(() => {
        if (isMounted.current) fetchData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const getRankIcon = (index: number) => {
      if (index === 0) return <Trophy className="text-yellow-400 w-6 h-6" />;
      if (index === 1) return <Medal className="text-gray-300 w-6 h-6" />;
      if (index === 2) return <Medal className="text-amber-600 w-6 h-6" />;
      return <span className="font-bold text-gray-500 w-6 text-center">{index + 1}</span>;
  };

  return (
    <div className="space-y-6">
        <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-white">Top Earners</h1>
            <p className="text-gray-400">The most active members this week</p>
        </div>

        {loading ? (
            <div className="text-center text-gray-500">Loading rankings...</div>
        ) : (
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                {users.map((u, index) => (
                    <div key={u.id} className="flex items-center justify-between p-4 border-b border-gray-700 last:border-0 hover:bg-gray-700/50 transition">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                {getRankIcon(index)}
                            </div>
                            <div>
                                <p className="font-bold text-white">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.country}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-blue-400">{u.balance.toFixed(0)}</p>
                            <p className="text-[10px] text-gray-500">POINTS</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
