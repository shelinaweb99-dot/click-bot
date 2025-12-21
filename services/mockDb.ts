
import { User, Task, WithdrawalRequest, UserRole, Transaction, AdSettings, SystemSettings, Announcement, GameSettings, ShortVideo, ShortsSettings, WithdrawalMethod } from '../types';

const API_URL = '/api';

// --- PERFORMANCE CACHE ---
const _cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 seconds for volatile data

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
};

const apiCall = async (action: string, data: any = {}, useCache = false) => {
    const cacheKey = `${action}_${JSON.stringify(data)}`;
    if (useCache) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 
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
        
        if (useCache) setCache(cacheKey, json);
        return json;
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') throw new Error("Connection timed out. Please check your internet or retry.");
        throw e;
    }
};

// Background pre-warmer
export const initMockData = () => {
    if (getAuthToken()) {
        getUserById(getUserId() || '');
        getTasks();
    }
};

export const loginUser = async (email: string, password: string) => {
    const response = await apiCall('login', { email, password });
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    return response;
};

export const registerUser = async (email: string, password: string, userData: Partial<User>) => {
    const response = await apiCall('register', { email, password, ...userData });
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    return response;
};

export const logout = async () => { clearAuth(); };
export const getCurrentUserId = () => getUserId();
export const getUserRole = () => localStorage.getItem('app_user_role') as UserRole;
export const getUserById = async (id: string) => apiCall('getUser', {}, true);

export const saveUser = async (user: User) => {
    const res = await apiCall('saveUser', { user });
    setCache(`getUser_{}`, user); 
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const getTasks = async (): Promise<Task[]> => apiCall('getTasks', {}, true);

export const verifyAndCompleteTask = async (userId: string, taskId: string) => {
    const res = await apiCall('completeTask', { taskId });
    delete _cache[`getTasks_{}`];
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const claimDailyReward = async (userId: string) => {
    const res = await apiCall('dailyCheckIn');
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const playMiniGame = async (userId: string, gameType: string) => {
    const res = await apiCall('playMiniGame', { gameType });
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getTransactions = async (userId: string): Promise<Transaction[]> => apiCall('getTransactions', {}, true);
export const createWithdrawal = async (req: WithdrawalRequest) => {
    const res = await apiCall('createWithdrawal', { request: req });
    window.dispatchEvent(new Event('db_change'));
    return res;
}

// USER SPECIFIC WITHDRAWALS
export const getWithdrawals = async (): Promise<WithdrawalRequest[]> => apiCall('getWithdrawals', {}, true);

// ADMIN SPECIFIC WITHDRAWALS
export const adminGetWithdrawals = async (): Promise<WithdrawalRequest[]> => apiCall('adminGetWithdrawals', {}, true);

export const updateWithdrawalStatus = async (id: string, status: string) => {
    const res = await apiCall('updateWithdrawal', { id, status });
    window.dispatchEvent(new Event('db_change'));
    return res;
}

const getSetting = async (key: string, defaultVal: any) => {
    try {
        const data = await apiCall('getSettings', { key }, true);
        return (data && typeof data === 'object') ? data : defaultVal;
    } catch { return defaultVal; }
};

export const triggerHoneypot = () => apiCall('triggerHoneypot');

export const getSystemSettings = async (): Promise<SystemSettings> => getSetting('system', { minWithdrawal: 50, pointsPerDollar: 1000 });
export const saveSystemSettings = async (s: SystemSettings) => {
    const res = await apiCall('saveSettings', { key: 'system', payload: s });
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getAdSettings = async (): Promise<AdSettings> => getSetting('ads', {});
export const saveAdSettings = async (s: AdSettings) => apiCall('saveSettings', { key: 'ads', payload: s });
export const getGameSettings = async (): Promise<GameSettings> => getSetting('games', { spin: { isEnabled: true }});
export const saveGameSettings = async (s: GameSettings) => apiCall('saveSettings', { key: 'games', payload: s });
export const getShortsSettings = async (): Promise<ShortsSettings> => getSetting('shorts', { isEnabled: true });
export const saveShortsSettings = async (s: ShortsSettings) => apiCall('saveSettings', { key: 'shorts', payload: s });

export const getShorts = async (): Promise<ShortVideo[]> => apiCall('getShorts', {}, true);
export const addShort = async (url: string) => {
    const res = await apiCall('addShort', { url });
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const deleteShort = async (id: string) => {
    const res = await apiCall('deleteShort', { id });
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const getAnnouncements = async (): Promise<Announcement[]> => apiCall('getAnnouncements', {}, true);
export const addAnnouncement = async (a: any) => {
    const res = await apiCall('addAnnouncement', { payload: a });
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const deleteAnnouncement = async (id: string) => {
    const res = await apiCall('deleteAnnouncement', { id });
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const saveTask = async (task: Task) => {
    const res = await apiCall('saveTask', { payload: task });
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const deleteTask = async (id: string) => {
    const res = await apiCall('deleteTask', { id });
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const subscribeToChanges = (cb: () => void) => {
    window.addEventListener('db_change', cb);
    return () => window.removeEventListener('db_change', cb);
};

export const getLeaderboard = async () => {
    const users = await apiCall('getAllUsers', {}, true);
    return Array.isArray(users) ? users.sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0)).slice(0, 10) : [];
};

export const getUsers = async () => apiCall('getAllUsers', {}, true);
export const processReferral = async (userId: string, code: string) => {
    const res = await apiCall('processReferral', { userId, code });
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getPaymentMethods = async (): Promise<WithdrawalMethod[]> => {
    const data = await apiCall('getSettings', { key: 'payment_methods' }, true);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.methods && Array.isArray(data.methods)) return data.methods;
    return [];
};

export const updateAllPaymentMethods = async (methods: WithdrawalMethod[]) => {
    const res = await apiCall('saveSettings', { key: 'payment_methods', payload: { methods } });
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const savePaymentMethod = async (method: WithdrawalMethod) => {
    const current = await getPaymentMethods();
    const exists = current.findIndex(m => m.id === method.id);
    let updated;
    if (exists > -1) {
        updated = [...current];
        updated[exists] = method;
    } else {
        updated = [...current, method];
    }
    return updateAllPaymentMethods(updated);
};

export const deletePaymentMethod = async (id: string) => {
    const current = await getPaymentMethods();
    const updated = current.filter(m => m.id !== id);
    return updateAllPaymentMethods(updated);
};

export const recordShortView = async (u: string, v: string) => {
    const res = await apiCall('completeShort', { videoId: v });
    window.dispatchEvent(new Event('db_change'));
    return res;
}
export const recordAdReward = async (u: string) => {
    const res = await apiCall('completeAd');
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

export const initiateAdWatch = async () => apiCall('initiateAdWatch');

export const getPublicIp = async () => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch {
        return '127.0.0.1';
    }
};

export const getFingerprint = () => {
    return btoa(navigator.userAgent + screen.width).substring(0, 16);
};
