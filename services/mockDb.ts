
import { User, Task, WithdrawalRequest, UserRole, Transaction, AdSettings, SystemSettings, Announcement, GameSettings, ShortVideo, ShortsSettings } from '../types';

const API_URL = '/api';

const getAuthToken = () => localStorage.getItem('session_token'); 
const setAuthToken = (token: string) => localStorage.setItem('session_token', token);
const getUserId = () => localStorage.getItem('app_user_id');
const setUserId = (id: string) => localStorage.setItem('app_user_id', id);

const clearAuth = () => { 
    localStorage.removeItem('session_token'); 
    localStorage.removeItem('app_user_id'); 
    localStorage.removeItem('app_user_role'); 
};

const apiCall = async (action: string, data: any = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const token = getAuthToken();
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ action, ...data }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch (e) { throw new Error(`Invalid Response: ${text.substring(0, 50)}`); }
        if (!res.ok) {
            if (res.status === 401) { clearAuth(); window.location.hash = '#/login'; }
            throw new Error(json.message || `Error ${res.status}`);
        }
        return json;
    } catch (e: any) {
        clearTimeout(timeoutId);
        throw e;
    }
};

export const loginUser = async (email: string, password: string) => {
    const response = await apiCall('login', { email, password });
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    notifyChange();
    return response;
};

export const registerUser = async (email: string, password: string, userData: Partial<User>) => {
    const response = await apiCall('register', { email, password, ...userData });
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    notifyChange();
    return response;
};

export const logout = async () => { clearAuth(); notifyChange(); };
export const getCurrentUserId = () => getUserId();
export const getUserRole = () => localStorage.getItem('app_user_role') as UserRole;
export const getUserById = async (id: string) => { try { return await apiCall('getUser'); } catch { return null; } };

// --- FIX: Added missing saveUser export ---
export const saveUser = async (user: User) => {
    const res = await apiCall('saveUser', { user });
    notifyChange();
    return res;
};

// --- FIX: Added missing processReferral export ---
export const processReferral = async (userId: string, referrerId: string) => {
    const res = await apiCall('processReferral', { userId, referrerId });
    notifyChange();
    return res;
};

export const getTasks = async (): Promise<Task[]> => apiCall('getTasks');
export const verifyAndCompleteTask = async (userId: string, taskId: string) => {
    const res = await apiCall('completeTask', { taskId });
    notifyChange();
    return res;
};

export const claimDailyReward = async (userId: string) => {
    const res = await apiCall('dailyCheckIn');
    notifyChange();
    return res;
};

export const playMiniGame = async (userId: string, gameType: string) => {
    const res = await apiCall('playMiniGame', { gameType });
    notifyChange();
    return res;
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => apiCall('getTransactions');
export const createWithdrawal = async (req: WithdrawalRequest) => apiCall('createWithdrawal', { request: req });
export const getWithdrawals = async (): Promise<WithdrawalRequest[]> => apiCall('getAllWithdrawals');
export const updateWithdrawalStatus = async (id: string, status: string) => apiCall('updateWithdrawal', { id, status });

const getSetting = async (key: string, defaultVal: any) => {
    try {
        const data = await apiCall('getSettings', { key });
        return Object.keys(data).length ? data : defaultVal;
    } catch { return defaultVal; }
};

const saveSetting = async (key: string, payload: any) => apiCall('saveSettings', { key, payload });

export const getSystemSettings = async (): Promise<SystemSettings> => getSetting('system', { minWithdrawal: 50, pointsPerDollar: 1000 });
export const saveSystemSettings = async (s: SystemSettings) => saveSetting('system', s);
export const getAdSettings = async (): Promise<AdSettings> => getSetting('ads', {});
export const saveAdSettings = async (s: AdSettings) => saveSetting('ads', s);
export const getGameSettings = async (): Promise<GameSettings> => getSetting('games', { spin: { isEnabled: true }});
export const saveGameSettings = async (s: GameSettings) => saveSetting('games', s);
export const getShortsSettings = async (): Promise<ShortsSettings> => getSetting('shorts', { isEnabled: true });
export const saveShortsSettings = async (s: ShortsSettings) => saveSetting('shorts', s);

export const getShorts = async (): Promise<ShortVideo[]> => apiCall('getShorts');
export const getManualShorts = async () => apiCall('getShorts');
export const addShort = async (url: string) => apiCall('addShort', { url });
export const deleteShort = async (id: string) => apiCall('deleteShort', { id });

export const getAnnouncements = async (): Promise<Announcement[]> => apiCall('getAnnouncements');
export const addAnnouncement = async (a: any) => apiCall('addAnnouncement', { payload: a });
export const deleteAnnouncement = async (id: string) => apiCall('deleteAnnouncement', { id });

export const saveTask = async (task: Task) => apiCall('saveTask', { payload: task });
export const deleteTask = async (id: string) => apiCall('deleteTask', { id });

export const getPublicIp = async () => '127.0.0.1';
export const getFingerprint = () => 'secure_device';
export const initMockData = async () => {};

const DB_CHANGE_EVENT = 'db_change';
const notifyChange = () => window.dispatchEvent(new Event(DB_CHANGE_EVENT));
export const subscribeToChanges = (cb: () => void) => {
    window.addEventListener(DB_CHANGE_EVENT, cb);
    return () => window.removeEventListener(DB_CHANGE_EVENT, cb);
};

export const extractYouTubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
};

export const getLeaderboard = async () => {
    const users = await apiCall('getAllUsers');
    return users.sort((a: any, b: any) => b.balance - a.balance).slice(0, 10);
};

export const getUsers = async () => apiCall('getAllUsers');
export const fetchYouTubeMetadata = async (videoId: string) => null;
export const verifyTelegramMembership = async (c: string, u: number) => ({ success: true });
export const getPaymentMethods = async () => getSetting('payment_methods', []);
export const savePaymentMethod = async (m: any) => {}; 
export const deletePaymentMethod = async (id: string) => {}; 
export const recordShortView = async (userId: string, videoId: string) => ({ success: true });
export const recordAdReward = async (userId: string) => ({ success: true });
export const getRotatedLink = async () => null;
export const initiateAdWatch = async () => ({success:true});
