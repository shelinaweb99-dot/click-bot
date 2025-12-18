
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { loginUser, registerUser, getCurrentUserId, getUserRole, getPublicIp, getFingerprint } from '../services/mockDb';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle } from 'lucide-react';

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
      const user = await loginUser(email, password);
      if (user.blocked) throw new Error('Your account has been blocked.');
      navigate(user.role === UserRole.ADMIN ? '/admin' : '/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password too short'); return; }
    setIsLoading(true);
    setError('');
    try {
      const currentIp = await getPublicIp();
      const currentDevice = getFingerprint();
      await registerUser(email, password, { name, country, telegramId, ipAddress: currentIp, deviceId: currentDevice });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 animate-in fade-in duration-300">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          {isLogin ? 'Login' : 'Join Us'}
        </h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4 text-sm flex items-center gap-2">
             <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                <input type="text" required className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Country</label>
                <input type="text" required className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none" value={country} onChange={e => setCountry(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1">Email</label>
            <input type="email" required className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:underline">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};
