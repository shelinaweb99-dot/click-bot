
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { loginUser, registerUser, getCurrentUserId, getUserRole, getPublicIp, getFingerprint, initMockData } from '../services/mockDb';
import { Eye, EyeOff, LogIn, UserPlus, AlertTriangle, Database } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  const loadingTimerRef = useRef<any>(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [telegramId, setTelegramId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      const cachedId = getCurrentUserId();
      if (cachedId) {
        const role = getUserRole();
        navigate(role === UserRole.ADMIN ? '/admin' : '/dashboard', { replace: true });
        return;
      }

      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        const user = tg.initDataUnsafe?.user;
        if (user?.id) {
           setTelegramId(user.id);
           if (user.first_name) {
                setName(`${user.first_name} ${user.last_name || ''}`.trim());
           }
        }
      }

      setIsCheckingAuth(false);
      initMockData();
    };
    checkAuth();
    return () => { if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current); };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const user = await loginUser(email, password);
      if (user.blocked) {
          setError('Your account has been blocked.');
          setIsLoading(false);
          return;
      }
      navigate(user.role === UserRole.ADMIN ? '/admin' : '/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password too short');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const currentIp = await getPublicIp();
      const currentDevice = getFingerprint();
      await registerUser(email, password, {
          name, 
          country, 
          telegramId, 
          ipAddress: currentIp, 
          deviceId: currentDevice
      });
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
                  <p className="text-gray-400">Connecting...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 relative">
      <div className="absolute top-4 right-4 text-xs text-gray-600 flex items-center gap-1">
          <Database size={12} /> Secure Cloud Storage
      </div>

      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          {isLogin ? 'Login' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4 text-sm text-center">
             <div className="flex items-center justify-center gap-2 font-bold mb-1">
                 <AlertTriangle size={18} /> Error
             </div>
             <p>{error}</p>
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Country</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  placeholder="e.g. Bangladesh"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-gray-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
              </span>
            ) : (
              <>
                 {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                 {isLogin ? 'Login' : 'Sign Up'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-blue-400 hover:underline font-medium"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
