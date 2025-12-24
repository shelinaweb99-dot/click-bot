
import { User, Task, WithdrawalRequest, UserRole, Transaction, AdSettings, SystemSettings, Announcement, GameSettings, ShortVideo, ShortsSettings, WithdrawalMethod } from '../types';

const API_URL = '/api';

// --- GLOBAL STATE CACHE ---
// Persists for the duration of the session to avoid redundant fetches
const _cache: Record<string, { data: any, timestamp: number }> = {};
const _pendingRequests: Record<string, Promise<any>> = {};
const CACHE_TTL = 60000; // 60 seconds TTL for standard data

const getCached = (key: string) => {
    const item = _cache[key];
    if (item && (Date.now() - item.timestamp < CACHE_TTL)) return item.data;
    return null;
};

const setCache = (key: string, data: any) => {
    _cache[key] = { data, timestamp: Date.now() };
};

const getAuthToken = () => localStorage.getItem('session_token'); 
const setAuthToken = (token: string) => localStorage.setItem('session_token', token);
const getUserId = () => localStorage.getItem('app_user_id');
const setUserId = (id: string) => localStorage.setItem('app_user_id', id);

const clearAuth = () => { 
    localStorage.removeItem('session_token'); 
    localStorage.removeItem('app_user_id'); 
    localStorage.removeItem('app_user_role');
    // Clear cache on logout
    Object.keys(_cache).forEach(k => delete _cache[k]);
};

const apiCall = async (action: string, data: any = {}, forceRefresh = false) => {
    const cacheKey = `${action}_${JSON.stringify(data)}`;
    
    // 1. Check Cache first if not forcing refresh
    if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
    }

    // 2. Deduplicate concurrent identical requests
    if (_pendingRequests[cacheKey]) {
        return _pendingRequests[cacheKey];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const requestPromise = (async () => {
        try {
            const token = getAuthToken();
            const tgData = (window as any).Telegram?.WebApp?.initData || '';
            
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                    'X-Telegram-Init-Data': tgData 
                },
                body: JSON.stringify({ action, ...data }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const json = await res.json();
            if (!res.ok) {
                if (res.status === 401) { 
                    clearAuth(); 
                    if (!window.location.hash.includes('login')) window.location.hash = '#/login'; 
                }
                throw new Error(json.message || `Server Error ${res.status}`);
            }
            
            setCache(cacheKey, json);
            return json;
        } catch (e: any) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') throw new Error("Connection timeout.");
            throw e;
        } finally {
            delete _pendingRequests[cacheKey];
        }
    })();

    _pendingRequests[cacheKey] = requestPromise;
    return requestPromise;
};

export const initMockData = () => {
    // Warm up common data
    const token = getAuthToken();
    if (token) {
        getUserById(getUserId() || '');
        getTasks();
    }
};

export const loginUser = async (email: string, password: string) => {
    const response = await apiCall('login', { email, password }, true);
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    return response;
};

export const registerUser = async (email: string, password: string, userData: Partial<User>) => {
    const response = await apiCall('register', { email, password, ...userData }, true);
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    return response;
};

export const logout = async () => { clearAuth(); };
export const getCurrentUserId = () => getUserId();
export const getUserRole = () => localStorage.getItem('app_user_role') as UserRole;
export const getUserById = async (id: string, force = false) => apiCall('getUser', {}, force);

export const saveUser = async (user: User) => {
    const res = await apiCall('saveUser', { user }, true);
    setCache(`getUser_{}`, user); 
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const getTasks = async (force = false): Promise<Task[]> => apiCall('getTasks', {}, force);

export const verifyAndCompleteTask = async (userId: string, taskId: string) => {
    const res = await apiCall('completeTask', { taskId }, true);
    // Invalidate caches
    delete _cache[`getTasks_{}`];
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const claimDailyReward = async (userId: string) => {
    const res = await apiCall('dailyCheckIn', {}, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const playMiniGame = async (userId: string, gameType: string) => {
    const res = await apiCall('playMiniGame', { gameType }, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getTransactions = async (userId: string, force = false): Promise<Transaction[]> => apiCall('getTransactions', {}, force);

export const createWithdrawal = async (req: WithdrawalRequest) => {
    const res = await apiCall('createWithdrawal', { request: req }, true);
    delete _cache[`getUser_{}`];
    delete _cache[`getWithdrawals_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getWithdrawals = async (force = false): Promise<WithdrawalRequest[]> => apiCall('getWithdrawals', {}, force);
export const adminGetWithdrawals = async (): Promise<WithdrawalRequest[]> => apiCall('adminGetWithdrawals', {}, true);

export const updateWithdrawalStatus = async (id: string, status: string) => {
    const res = await apiCall('updateWithdrawal', { id, status }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const triggerHoneypot = () => apiCall('triggerHoneypot', {}, true);

export const getSystemSettings = async (): Promise<SystemSettings> => apiCall('getSettings', { key: 'system' });
export const saveSystemSettings = async (s: SystemSettings) => {
    const res = await apiCall('saveSettings', { key: 'system', payload: s }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getAdSettings = async (): Promise<AdSettings> => apiCall('getSettings', { key: 'ads' });
export const saveAdSettings = async (s: AdSettings) => apiCall('saveSettings', { key: 'ads', payload: s }, true);
export const getGameSettings = async (): Promise<GameSettings> => apiCall('getSettings', { key: 'games' });
export const saveGameSettings = async (s: GameSettings) => apiCall('saveSettings', { key: 'games', payload: s }, true);
export const getShortsSettings = async (): Promise<ShortsSettings> => apiCall('getSettings', { key: 'shorts' });
export const saveShortsSettings = async (s: ShortsSettings) => apiCall('saveSettings', { key: 'shorts', payload: s }, true);

export const getShorts = async (force = false): Promise<ShortVideo[]> => apiCall('getShorts', {}, force);
export const addShort = async (url: string) => {
    const res = await apiCall('addShort', { url }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const deleteShort = async (id: string) => {
    const res = await apiCall('deleteShort', { id }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getAnnouncements = async (): Promise<Announcement[]> => apiCall('getAnnouncements', {});
export const addAnnouncement = async (a: any) => {
    const res = await apiCall('addAnnouncement', { payload: a }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const deleteAnnouncement = async (id: string) => {
    const res = await apiCall('deleteAnnouncement', { id }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const saveTask = async (task: Task) => {
    const res = await apiCall('saveTask', { payload: task }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const deleteTask = async (id: string) => {
    const res = await apiCall('deleteTask', { id }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const subscribeToChanges = (cb: () => void) => {
    window.addEventListener('db_change', cb);
    return () => window.removeEventListener('db_change', cb);
};

export const getLeaderboard = async () => {
    const users = await apiCall('getAllUsers', {}, false);
    return Array.isArray(users) ? users.sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0)).slice(0, 10) : [];
};

export const getUsers = async () => apiCall('getAllUsers', {}, false);

export const processReferral = async (userId: string, code: string) => {
    const res = await apiCall('processReferral', { userId, code }, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getPaymentMethods = async (): Promise<WithdrawalMethod[]> => {
    const data = await apiCall('getSettings', { key: 'payment_methods' });
    if (!data) return [];
    return Array.isArray(data) ? data : (data.methods || []);
};

export const updateAllPaymentMethods = async (methods: WithdrawalMethod[]) => {
    const res = await apiCall('saveSettings', { key: 'payment_methods', payload: { methods } }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

// Fix: Added missing savePaymentMethod function for AdminSettings.tsx
export const savePaymentMethod = async (method: WithdrawalMethod) => {
    const methods = await getPaymentMethods();
    const existingIndex = methods.findIndex(m => m.id === method.id);
    let updatedMethods;
    if (existingIndex >= 0) {
        updatedMethods = [...methods];
        updatedMethods[existingIndex] = method;
    } else {
        updatedMethods = [...methods, method];
    }
    return updateAllPaymentMethods(updatedMethods);
};

// Fix: Added missing deletePaymentMethod function for AdminSettings.tsx
export const deletePaymentMethod = async (id: string) => {
    const methods = await getPaymentMethods();
    const updatedMethods = methods.filter(m => m.id !== id);
    return updateAllPaymentMethods(updatedMethods);
};

export const recordShortView = async (u: string, v: string) => {
    const res = await apiCall('completeShort', { videoId: v }, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const recordAdReward = async (u: string) => {
    const res = await apiCall('completeAd', {}, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getRotatedLink = async (): Promise<string | null> => {
    const settings = await getAdSettings();
    if (settings?.rotation?.isEnabled && settings.rotation.links.length > 0) {
        const activeLinks = settings.rotation.links.filter(l => l.isEnabled);
        if (activeLinks.length === 0) return null;
        const index = settings.rotation.currentLinkIndex % activeLinks.length;
        return activeLinks[index].url;
    }
    return settings?.monetagDirectLink || settings?.adsterraLink || null;
};

export const initiateAdWatch = async () => apiCall('initiateAdWatch', {}, true);

export const getPublicIp = async () => {
    const cached = getCached('public_ip');
    if (cached) return cached;
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        setCache('public_ip', data.ip);
        return data.ip;
    } catch {
        return '127.0.0.1';
    }
};

export const getFingerprint = () => {
    return btoa(navigator.userAgent + screen.width).substring(0, 16);
};
