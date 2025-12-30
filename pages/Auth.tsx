
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { loginUser, registerUser, getCurrentUserId, getUserRole, getPublicIp, getFingerprint } from '../services/mockDb';
import { Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [telegramId, setTelegramId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const cachedId = getCurrentUserId();
        if (cachedId) {
          const role = getUserRole();
          if (role) {
            navigate(role === UserRole.ADMIN ? '/admin' : '/dashboard', { replace: true });
            return;
          }
        }
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.ready();
          const user = tg.initDataUnsafe?.user;
          if (user?.id) {
             setTelegramId(user.id);
             if (user.first_name) setName(`${user.first_name} ${user.last_name || ''}`.trim());
          }
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await loginUser(email, password);
      if (response.blocked) throw new Error('Security Error: Account restricted.');
      
      // Small timeout to ensure localStorage is flushed before ProtectedRoute triggers
      setTimeout(() => {
        navigate(response.role === UserRole.ADMIN ? '/admin' : '/dashboard', { replace: true });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 chars.'); return; }
    setIsLoading(true);
    setError('');
    try {
      const currentIp = await getPublicIp();
      const currentDevice = getFingerprint();
      const response = await registerUser(email, password, { name, country, telegramId, ipAddress: currentIp, deviceId: currentDevice });
      
      setTimeout(() => {
        navigate(response.role === UserRole.ADMIN ? '/admin' : '/dashboard', { replace: true });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Securing Session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-6 selection:bg-blue-500/30">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <div className="inline-flex bg-blue-600/10 p-4 rounded-[2rem] border border-blue-500/20 mb-4 shadow-2xl shadow-blue-500/10">
            <ShieldCheck className="text-blue-500" size={32} />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            {isLogin ? 'Access Portal' : 'Create Account'}
          </h2>
          <p className="text-gray-500 text-xs font-medium px-8">
            Manage your earnings and missions with encrypted security.
          </p>
        </div>
        
        <div className="bg-gray-900/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/[0.05] shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl mb-6 text-[11px] font-bold flex items-center gap-2 animate-in shake duration-300">
               <AlertCircle size={14} /> {error}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Name</label>
                  <input type="text" required className="w-full bg-black/40 text-white rounded-2xl p-4 text-sm border border-white/5 focus:border-blue-500 outline-none transition-all placeholder:text-gray-700" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Country</label>
                  <input type="text" required className="w-full bg-black/40 text-white rounded-2xl p-4 text-sm border border-white/5 focus:border-blue-500 outline-none transition-all placeholder:text-gray-700" value={country} onChange={e => setCountry(e.target.value)} placeholder="Region" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Email ID</label>
              <input type="email" required className="w-full bg-black/40 text-white rounded-2xl p-4 text-sm border border-white/5 focus:border-blue-500 outline-none transition-all placeholder:text-gray-700" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@example.com" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required className="w-full bg-black/40 text-white rounded-2xl p-4 text-sm border border-white/5 focus:border-blue-500 outline-none transition-all placeholder:text-gray-700" value={password} onChange={e => setPassword(e.target.value)} placeholder="Secret phrase" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4">
              {isLoading ? 'Processing...' : (isLogin ? 'Authenticate' : 'Register Now')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-gray-500 hover:text-white transition-colors text-[11px] font-bold uppercase tracking-widest">
              {isLogin ? "Need a new account?" : "Returning member?"} <span className="text-blue-500 ml-1 underline decoration-2 underline-offset-4 decoration-blue-500/30">Switch</span>
            </button>
          </div>
        </div>
        
        <p className="mt-10 text-center text-gray-700 text-[9px] font-bold uppercase tracking-[0.4em]">
          Secure Infrastructure &bull; 2025
        </p>
      </div>
    </div>
  );
};
