
import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Gift, Dices, Disc, ChevronRight } from 'lucide-react';

export const UserGames: React.FC = () => {
  const games = [
    { id: 'spin', name: 'Spin & Win', icon: <Disc size={32} />, color: 'from-purple-600 to-indigo-700', link: '/games/spin', desc: 'Test your luck' },
    { id: 'scratch', name: 'Lucky Reveal', icon: <Gift size={32} />, color: 'from-emerald-600 to-teal-700', link: '/games/scratch', desc: 'Instant rewards' },
    { id: 'guess', name: 'Vault Breaker', icon: <Dices size={32} />, color: 'from-orange-600 to-red-700', link: '/games/guess', desc: 'Crack the code' },
    { id: 'lottery', name: 'Treasure Box', icon: <Gamepad2 size={32} />, color: 'from-blue-600 to-cyan-700', link: '/games/lottery', desc: 'Pick a winner' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-1 px-1">
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Gamepad2 className="text-blue-500" size={32} /> Game Center
            </h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Play & Earn Extra USDT-Pts</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {games.map(game => (
                <Link 
                  to={game.link} 
                  key={game.id} 
                  className={`bg-gradient-to-r ${game.color} p-6 rounded-[2rem] text-white shadow-xl shadow-black/20 transform transition-all active:scale-95 flex items-center justify-between group relative overflow-hidden`}
                >
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                        {game.icon}
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 group-hover:rotate-12 transition-transform">
                            {game.icon}
                        </div>
                        <div>
                            <span className="font-black text-xl tracking-tight block">{game.name}</span>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{game.desc}</span>
                        </div>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={20} />
                    </div>
                </Link>
            ))}
        </div>
        
        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
            <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest leading-relaxed">
                Gaming rewards are added to your balance instantly. <br/>Daily limits apply to ensure fair play.
            </p>
        </div>
    </div>
  );
};
