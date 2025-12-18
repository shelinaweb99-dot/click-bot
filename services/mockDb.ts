
import { User, Task, WithdrawalRequest, UserRole, Transaction, AdSettings, SystemSettings, Announcement, GameSettings, ShortVideo, ShortsSettings } from '../types';

const API_URL = '/api';

// --- AUTH TOKEN MANAGEMENT ---
const getAuthToken = () => localStorage.getItem('session_token'); 
const setAuthToken = (token: string) => localStorage.setItem('session_token', token);

const getUserId = () => localStorage.getItem('app_user_id');
const setUserId = (id: string) => localStorage.setItem('app_user_id', id);

const clearAuth = () => { 
    localStorage.removeItem('session_token'); 
    localStorage.removeItem('app_user_id'); 
    localStorage.removeItem('app_user_role'); 
};

// --- API CLIENT ---
const apiCall = async (action: string, data: any = {}) => {
    let res;
    // Timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const token = getAuthToken();
        res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // SECURITY: Send Token in Header
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ action, ...data }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            throw new Error("Request timed out. Please check your connection.");
        }
        // Network Error (e.g. offline or server down)
        console.error("Network Error:", e);
        throw new Error("Cannot connect to server. Check internet or try again.");
    }

    // Try parsing JSON, fallback to text if fails (e.g. Vercel 500 HTML page)
    let json;
    const text = await res.text();
    try {
        json = JSON.parse(text);
    } catch (e) {
        console.error("API Error Response (Non-JSON):", text);
        throw new Error(`Server Error (${res.status}): The server returned an invalid response.`);
    }

    if (!res.ok) {
        // If 401 Unauthorized, auto-logout
        if (res.status === 401) {
            clearAuth();
            if (action !== 'login' && action !== 'register') {
                window.location.href = '#/login';
            }
        }
        throw new Error(json.message || `Error ${res.status}: ${res.statusText}`);
    }
    
    return json;
};

// --- AUTH ---

export const loginUser = async (email: string, password: string): Promise<User> => {
    // Returns { ...user, token: "..." }
    const response = await apiCall('login', { email, password });
    
    // Save secure token
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    
    notifyChange();
    return response;
};

export const registerUser = async (email: string, password: string, userData: Partial<User>): Promise<User> => {
    const response = await apiCall('register', { email, password, ...userData });
    
    setAuthToken(response.token);
    setUserId(response.id);
    localStorage.setItem('app_user_role', response.role);
    
    notifyChange();
    return response;
};

export const logout = async () => {
    clearAuth();
    notifyChange();
};

export const getCurrentUserId = () => getUserId();
export const getUserRole = () => localStorage.getItem('app_user_role') as UserRole;

export const getUserById = async (id: string): Promise<User | null> => {
    try {
        // userId is implied by the Token now, but we keep arg for compatibility
        return await apiCall('getUser');
    } catch { return null; }
};

// --- FEATURES ---

export const getTasks = async (): Promise<Task[]> => {
    return await apiCall('getTasks');
};

export const verifyAndCompleteTask = async (userId: string, taskId: string) => {
    return await apiCall('completeTask', { taskId });
};

export const claimDailyReward = async (userId: string) => {
    return await apiCall('dailyCheckIn');
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
    return await apiCall('getTransactions');
};

export const createWithdrawal = async (req: WithdrawalRequest) => {
    return await apiCall('createWithdrawal', { request: req });
};

export const getWithdrawals = async (): Promise<WithdrawalRequest[]> => {
    return await apiCall('getAllWithdrawals');
};

// --- SETTINGS ---

const getSetting = async (key: string, defaultVal: any) => {
    try {
        const data = await apiCall('getSettings', { key });
        return Object.keys(data).length ? data : defaultVal;
    } catch { return defaultVal; }
};

const saveSetting = async (key: string, payload: any) => {
    return await apiCall('saveSettings', { key, payload });
};

export const getSystemSettings = async (): Promise<SystemSettings> => getSetting('system', { minWithdrawal: 50, pointsPerDollar: 1000 });
export const saveSystemSettings = async (s: SystemSettings) => saveSetting('system', s);

export const getAdSettings = async (): Promise<AdSettings> => getSetting('ads', {});
export const saveAdSettings = async (s: AdSettings) => saveSetting('ads', s);

export const getGameSettings = async (): Promise<GameSettings> => getSetting('games', { spin: { isEnabled: true }});
export const saveGameSettings = async (s: GameSettings) => saveSetting('games', s);

export const getShortsSettings = async (): Promise<ShortsSettings> => getSetting('shorts', { isEnabled: true });
export const saveShortsSettings = async (s: ShortsSettings) => saveSetting('shorts', s);

// --- PLACEHOLDERS ---
export const getPublicIp = async () => '127.0.0.1';
export const getFingerprint = () => 'secure_device';
export const initMockData = async () => {};

// --- EVENT BUS ---
const DB_CHANGE_EVENT = 'db_change';
const notifyChange = () => window.dispatchEvent(new Event(DB_CHANGE_EVENT));
export const subscribeToChanges = (cb: () => void) => {
    window.addEventListener(DB_CHANGE_EVENT, cb);
    return () => window.removeEventListener(DB_CHANGE_EVENT, cb);
};

// --- HELPERS ---
export const USE_FIREBASE = false;

export const extractYouTubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
};
export const fetchYouTubeMetadata = async (videoId: string) => null; 
export const verifyTelegramMembership = async (channelId: string, userId: number) => ({ success: true, error: undefined }); 
export const getPaymentMethods = async () => getSetting('payment_methods', []);
export const savePaymentMethod = async (m: any) => {}; 
export const deletePaymentMethod = async (id: string) => {}; 
export const getUsers = async () => apiCall('getAllUsers');
export const saveUser = async (u: User) => {}; 
export const getLeaderboard = async () => [];
export const getShorts = async () => [];
export const processReferral = async (userId: string, referralCode: string) => ({ success: true, message: 'Referral processed' });
export const recordShortView = async (userId: string, videoId: string) => ({ success: true });
export const recordAdReward = async (userId: string) => ({ success: true });
export const playMiniGame = async (userId: string, gameType: string) => ({ success: true, reward: 10, message: 'Won 10', left: 5 });
export const getManualShorts = async () => [];
export const addShort = async (url: string) => {};
export const deleteShort = async (id: string) => {};
export const addAnnouncement = async (a: any) => {};
export const deleteAnnouncement = async (id: string) => {};
export const getAnnouncements = async () => [];
export const updateWithdrawalStatus = async (id: string, status: string) => {};
export const saveTask = async (task: Task) => {};
export const deleteTask = async (id: string) => {};
export const getRotatedLink = async () => null;
export const initiateAdWatch = async () => ({success:true});
