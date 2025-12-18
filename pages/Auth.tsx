
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { loginUser, registerUser, getCurrentUserId, getUserRole, getPublicIp, getFingerprint, initMockData, USE_FIREBASE } from '../services/mockDb';
import { Eye, EyeOff, LogIn, UserPlus, ShieldAlert, AlertTriangle, Info, ExternalLink, FileText, Database } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  // Failsafe timer ref
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
    
    return () => {
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, [navigate]);

  // Auto-fill for Testing
  useEffect(() => {
      if (isLogin) {
          if (!email) setEmail('user@demo.com');
          if (!password) setPassword('12345678');
      }
  }, [isLogin]);

  const startLoadingFailsafe = () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(() => {
          if (isLoading) {
              setIsLoading(false);
              setError("Request timed out. Please check your internet or database connection.");
          }
      }, 15000); // 15s hard stop
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    startLoadingFailsafe();

    try {
      const user = await loginUser(email, password);
      
      if (user.blocked) {
          setError('Your account has been blocked by the admin.');
          setIsLoading(false);
          return;
      }

      if (user.role === UserRole.ADMIN) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed. Check your connection.');
    } finally {
      setIsLoading(false);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setIsLoading(true);
    setError('');
    startLoadingFailsafe();

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
      console.error(err);
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    }
  };

  if (isCheckingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
              <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Connecting to Database...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 relative">
      <div className="absolute top-4 right-4 text-xs text-gray-600 flex items-center gap-1">
          <Database size={12} /> MongoDB Enabled
      </div>

      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {telegramId && !isLogin && (
            <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-2 rounded mb-4 text-xs text-center">
                Telegram account detected.
            </div>
        )}

        {/* Demo Hint */}
        {isLogin && (
            <div 
                className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 px-4 py-3 rounded mb-4 text-xs cursor-pointer hover:bg-yellow-500/20 transition"
                onClick={() => { setEmail('admin@admin.com'); setPassword('12345678'); }}
                title="Click to fill Admin credentials"
            >
                <p className="font-bold mb-1">🔧 Database Mode Active</p>
                <p>Default Accounts (Click to fill Admin):</p>
                <ul className="list-disc list-inside mt-1 opacity-80">
                    <li>User: <b>user@demo.com</b></li>
                    <li>Admin: <b>admin@admin.com</b></li>
                </ul>
            </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4 text-sm text-center animate-pulse">
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
                  placeholder="John Doe"
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
                  placeholder="Bangladesh"
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
              placeholder="name@example.com"
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
            {!isLogin && <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
              </span>
            ) : (
              <>
                 {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                 {isLogin ? 'Login' : 'Sign Up'}
              </>
            )}
          </button>
          
          {isLoading && (
              <button 
                type="button" 
                onClick={() => { setIsLoading(false); setError('Operation Cancelled'); }}
                className="w-full text-center text-gray-500 text-xs hover:text-white mt-2"
              >
                  Cancel
              </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
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
