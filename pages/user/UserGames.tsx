
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Gamepad2, 
  Gift, 
  Dices, 
  Disc, 
  ChevronRight, 
  Plus, 
  Minus,
  Trophy,
  Settings
} from 'lucide-react';

export const UserGames: React.FC = () => {
  const games = [
    { 
      id: 'spin', 
      name: 'Spin & Win', 
      desc: 'TEST YOUR LUCK',
      icon: <Disc size={32} />, 
      color: 'from-[#8b5cf6] to-[#4f46e5]', 
      link: '/games/spin' 
    },
    { 
      id: 'scratch', 
      name: 'Lucky Reveal', 
      desc: 'INSTANT REWARDS',
      icon: <Gift size={32} />, 
      color: 'from-[#10b981] to-[#047857]', 
      link: '/games/scratch',
      decoration: (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          <div className="bg-white/90 p-1.5 rounded-full text-[#10b981] shadow-lg"><Plus size={20} strokeWidth={3} /></div>
          <div className="bg-white/90 p-1.5 rounded-full text-[#10b981] shadow-lg"><Minus size={20} strokeWidth={3} /></div>
        </div>
      )
    },
    { 
      id: 'guess', 
      name: 'Vault Breaker', 
      desc: 'CRACK THE CODE',
      icon: <Dices size={32} />, 
      color: 'from-[#f97316] to-[#dc2626]', 
      link: '/games/guess',
      decoration: (
        <div className="absolute right-6 top-1/2 -translate-y-1/2">
           <div className="bg-white/20 p-3 rounded-full backdrop-blur-md border border-white/20">
             <ChevronRight size={24} className="text-white" />
           </div>
        </div>
      )
    },
    { 
      id: 'lottery', 
      name: 'Treasure Box', 
      desc: 'PICK A WINNER',
      icon: <Gamepad2 size={32} />, 
      color: 'from-[#2563eb] to-[#0891b2]', 
      link: '/games/lottery' 
    },
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-3 animate-in fade-in duration-500 overflow-hidden">
        {/* Navigation / Header mimic from screenshot */}
        <div className="flex justify-between items-center px-2 py-1 shrink-0">
          <Trophy className="text-yellow-500" size={24} />
          <h1 className="text-xs font-black text-white uppercase tracking-[0.2em]">CLICK TO EARN USDT</h1>
          <Settings className="text-gray-500" size={24} />
        </div>

        {/* Game Cards List */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
            {games.map(game => (
                <Link 
                  to={game.link} 
                  key={game.id} 
                  className={`flex-1 min-h-[90px] bg-gradient-to-r ${game.color} rounded-[2.5rem] text-white shadow-xl shadow-black/30 transform transition-all active:scale-[0.98] flex items-center relative overflow-hidden px-8 group`}
                >
                    {/* Icon Box */}
                    <div className="bg-white/20 p-5 rounded-[2rem] backdrop-blur-md border border-white/10 shrink-0 group-hover:scale-105 transition-transform duration-300">
                        {game.icon}
                    </div>

                    {/* Text Content */}
                    <div className="ml-6 flex-1">
                        <h2 className="font-black text-2xl tracking-tight leading-none mb-1">{game.name}</h2>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{game.desc}</p>
                    </div>

                    {/* Decorative Elements */}
                    {game.decoration}
                    
                    {/* Background Shine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </Link>
            ))}
        </div>
    </div>
  );
};
