
import { User, Task, WithdrawalRequest, UserRole, Transaction, AdSettings, SystemSettings, Announcement, GameSettings, ShortVideo, ShortsSettings, WithdrawalMethod } from '../types';

const API_URL = '/api';

// --- GLOBAL STATE CACHE ---
const _cache: Record<string, { data: any, timestamp: number }> = {};
const _pendingRequests: Record<string, Promise<any>> = {};
const CACHE_TTL = 60000;

const getCached = (key: string) => {
    const item = _cache[key];
    if (item && (Date.now() - item.timestamp < CACHE_TTL)) return item.data;
    return null;
};

const setCache = (key: string, data: any) => {
    _cache[key] = { data, timestamp: Date.now() };
};

const clearCache = () => {
    Object.keys(_cache).forEach(k => delete _cache[k]);
};

const getAuthToken = () => localStorage.getItem('session_token'); 
const setAuthToken = (token: string) => localStorage.setItem('session_token', token);
const getUserId = () => localStorage.getItem('app_user_id');
const setUserId = (id: string) => localStorage.setItem('app_user_id', id);

const clearAuth = () => { 
    localStorage.removeItem('session_token'); 
    localStorage.removeItem('app_user_id'); 
    localStorage.removeItem('app_user_role');
    clearCache();
};

const apiCall = async (action: string, data: any = {}, forceRefresh = false) => {
    const cacheKey = `${action}_${JSON.stringify(data)}`;
    if (!forceRefresh) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
    }
    if (_pendingRequests[cacheKey]) return _pendingRequests[cacheKey];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
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
                    // No more hash redirection here. Let the components handle it.
                }
                throw new Error(json.message || `Server Error ${res.status}`);
            }
            
            setCache(cacheKey, json);
            return json;
        } catch (e: any) {
            clearTimeout(timeoutId);
            throw e;
        } finally {
            delete _pendingRequests[cacheKey];
        }
    })();

    _pendingRequests[cacheKey] = requestPromise;
    return requestPromise;
};

export const initMockData = () => {
    const token = getAuthToken();
    if (token) {
        getUserById(getUserId() || '');
        getTasks();
    }
};

export const loginUser = async (email: string, password: string) => {
    clearCache();
    const response = await apiCall('login', { email, password }, true);
    if (response.token) {
        setAuthToken(response.token);
        setUserId(response.id);
        localStorage.setItem('app_user_role', response.role);
    }
    return response;
};

export const registerUser = async (email: string, password: string, userData: Partial<User>) => {
    clearCache();
    const response = await apiCall('register', { email, password, ...userData }, true);
    if (response.token) {
        setAuthToken(response.token);
        setUserId(response.id);
        localStorage.setItem('app_user_role', response.role);
    }
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

export const verifyAndCompleteTask = async (userId: string, taskId: string, verificationAnswer?: string) => {
    const res = await apiCall('completeTask', { taskId, verificationAnswer }, true);
    delete _cache[`getTasks_{}`];
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const getProtectedFile = async (taskId: string) => {
    return apiCall('getProtectedFile', { taskId }, true);
};

export const claimDailyReward = async (userId: string) => {
    const res = await apiCall('dailyCheckIn', {}, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const getTransactions = async (userId: string, force = false): Promise<Transaction[]> => apiCall('getTransactions', {}, force);

export const createWithdrawal = async (req: WithdrawalRequest) => {
    const res = await apiCall('createWithdrawal', { request: req }, true);
    delete _cache[`getUser_{}`];
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

export const getSystemSettings = async (): Promise<SystemSettings> => apiCall('getSettings', { key: 'system' });
export const saveSystemSettings = async (s: SystemSettings) => {
    const res = await apiCall('saveSettings', { key: 'system', payload: s }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getAdSettings = async (): Promise<AdSettings> => apiCall('getSettings', { key: 'ads' });
export const saveAdSettings = async (s: AdSettings) => {
    const res = await apiCall('saveSettings', { key: 'ads', payload: s }, true);
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

export const recordAdReward = async (u: string) => {
    const res = await apiCall('completeAd', {}, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
}

export const getPublicIp = async () => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        return "127.0.0.1";
    }
};

export const getFingerprint = () => {
    return 'dev_' + Math.random().toString(36).substr(2, 9);
};

export const triggerHoneypot = () => {
    console.warn("Security Event: Administrative Honeypot Triggered.");
    apiCall('logSecurityEvent', { type: 'HONEYPOT_ACCESS' });
};

export const savePaymentMethod = async (method: WithdrawalMethod) => {
    const methods = await getPaymentMethods();
    const index = methods.findIndex(m => m.id === method.id);
    if (index !== -1) {
        methods[index] = method;
    } else {
        methods.push(method);
    }
    return updateAllPaymentMethods(methods);
};

export const deletePaymentMethod = async (id: string) => {
    const methods = await getPaymentMethods();
    const filtered = methods.filter(m => m.id !== id);
    return updateAllPaymentMethods(filtered);
};

export const processReferral = async (userId: string, code: string) => {
    return apiCall('processReferral', { code }, true);
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
    const data = await apiCall('getSettings', { key: 'announcements' });
    return Array.isArray(data) ? data : (data?.list || []);
};

export const addAnnouncement = async (announcement: Announcement) => {
    const list = await getAnnouncements();
    list.unshift(announcement);
    const res = await apiCall('saveSettings', { key: 'announcements', payload: { list } }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const deleteAnnouncement = async (id: string) => {
    const list = await getAnnouncements();
    const filtered = list.filter(a => a.id !== id);
    const res = await apiCall('saveSettings', { key: 'announcements', payload: { list: filtered } }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const getGameSettings = async (): Promise<GameSettings> => {
    return apiCall('getSettings', { key: 'games' });
};

export const saveGameSettings = async (settings: GameSettings) => {
    const res = await apiCall('saveSettings', { key: 'games', payload: settings }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const playMiniGame = async (userId: string, gameType: string) => {
    const res = await apiCall('playGame', { gameType }, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const getShortsSettings = async (): Promise<ShortsSettings> => {
    return apiCall('getSettings', { key: 'shorts' });
};

export const saveShortsSettings = async (settings: ShortsSettings) => {
    const res = await apiCall('saveSettings', { key: 'shorts', payload: settings }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const addShort = async (url: string) => {
    const res = await apiCall('addShort', { url }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const deleteShort = async (id: string) => {
    const res = await apiCall('deleteShort', { id }, true);
    window.dispatchEvent(new Event('db_change'));
    return res;
};

export const getShorts = async (): Promise<ShortVideo[]> => {
    return apiCall('getShorts', {}, false);
};

export const recordShortView = async (userId: string, videoId: string) => {
    const res = await apiCall('recordShortView', { videoId }, true);
    delete _cache[`getUser_{}`];
    window.dispatchEvent(new Event('db_change'));
    return res;
};
