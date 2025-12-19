
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
        const tgData = (window as any).Telegram?.WebApp?.initData || '';
        
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                'X-Telegram-Init-Data': tgData // CRITICAL: Identify user to backend
            },
            body: JSON.stringify({ action, ...data }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const json = await res.json();
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
export const getUserById = async (id: string) => apiCall('getUser');

export const saveUser = async (user: User) => apiCall('saveUser', { user });
export const getTasks = async (): Promise<Task[]> => apiCall('getTasks');
export const verifyAndCompleteTask = async (userId: string, taskId: string) => apiCall('completeTask', { taskId });
export const claimDailyReward = async (userId: string) => apiCall('dailyCheckIn');
export const playMiniGame = async (userId: string, gameType: string) => apiCall('playMiniGame', { gameType });
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

export const triggerHoneypot = () => apiCall('triggerHoneypot');

export const getSystemSettings = async (): Promise<SystemSettings> => getSetting('system', { minWithdrawal: 50, pointsPerDollar: 1000 });
export const saveSystemSettings = async (s: SystemSettings) => apiCall('saveSettings', { key: 'system', payload: s });
export const getAdSettings = async (): Promise<AdSettings> => getSetting('ads', {});
export const saveAdSettings = async (s: AdSettings) => apiCall('saveSettings', { key: 'ads', payload: s });
export const getGameSettings = async (): Promise<GameSettings> => getSetting('games', { spin: { isEnabled: true }});
export const saveGameSettings = async (s: GameSettings) => apiCall('saveSettings', { key: 'games', payload: s });
export const getShortsSettings = async (): Promise<ShortsSettings> => getSetting('shorts', { isEnabled: true });
export const saveShortsSettings = async (s: ShortsSettings) => apiCall('saveSettings', { key: 'shorts', payload: s });

export const getShorts = async (): Promise<ShortVideo[]> => apiCall('getShorts');
// Fix: Added missing getManualShorts export
export const getManualShorts = async (): Promise<ShortVideo[]> => apiCall('getShorts');
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
export const subscribeToChanges = (cb: () => void) => {
    window.addEventListener('db_change', cb);
    return () => window.removeEventListener('db_change', cb);
};
export const getLeaderboard = async () => {
    const users = await apiCall('getAllUsers');
    return users.sort((a: any, b: any) => b.balance - a.balance).slice(0, 10);
};
export const getUsers = async () => apiCall('getAllUsers');
export const fetchYouTubeMetadata = async (videoId: string) => null;
export const verifyTelegramMembership = async (c: string, u: number) => ({ success: true });
// Fix: Added missing processReferral export
export const processReferral = async (userId: string, code: string) => apiCall('processReferral', { userId, code });
export const getPaymentMethods = async () => getSetting('payment_methods', []);
export const savePaymentMethod = async (m: any) => {}; 
export const deletePaymentMethod = async (id: string) => {}; 
export const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};
export const initiateAdWatch = async () => ({success:true});
export const getRotatedLink = async () => null;
export const recordShortView = async (u: string, v: string) => ({success: true});
export const recordAdReward = async (u: string) => ({success: true});
