
import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Gift, Dices, Disc } from 'lucide-react';

export const UserGames: React.FC = () => {
  const games = [
    { id: 'spin', name: 'Spin & Win', icon: <Disc size={32} />, color: 'from-purple-500 to-indigo-600', link: '/games/spin' },
    { id: 'scratch', name: 'Scratch Card', icon: <Gift size={32} />, color: 'from-green-500 to-emerald-600', link: '/games/scratch' },
    { id: 'guess', name: 'Guess Number', icon: <Dices size={32} />, color: 'from-orange-500 to-red-600', link: '/games/guess' },
    { id: 'lottery', name: 'Lucky Box', icon: <Gamepad2 size={32} />, color: 'from-blue-500 to-cyan-600', link: '/games/lottery' },
  ];

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="text-purple-400" /> Play & Earn
        </h1>
        <p className="text-gray-400">Play mini-games to earn extra points daily!</p>

        <div className="grid grid-cols-2 gap-4">
            {games.map(game => (
                <Link to={game.link} key={game.id} className={`bg-gradient-to-br ${game.color} p-6 rounded-xl text-white shadow-lg transform transition hover:scale-105 flex flex-col items-center justify-center text-center h-40`}>
                    <div className="bg-white/20 p-4 rounded-full mb-3">
                        {game.icon}
                    </div>
                    <span className="font-bold text-lg">{game.name}</span>
                </Link>
            ))}
        </div>
    </div>
  );
};
