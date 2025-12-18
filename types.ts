
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum TaskType {
  YOUTUBE = 'YOUTUBE',
  WEBSITE = 'WEBSITE',
  CUSTOM = 'CUSTOM',
  TELEGRAM = 'TELEGRAM'
}

export enum TaskStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface WithdrawalMethod {
  id: string;
  name: string;
  detailsLabel: string; // e.g. "Wallet Address" or "Phone Number"
  isEnabled: boolean;
}

export enum AdProvider {
  MONETAG = 'MONETAG',
  ADSTERRA = 'ADSTERRA',
  TELEGRAM_ADS = 'TELEGRAM_ADS'
}

// --- NEW ROTATION TYPES ---
export type RotationMode = 'SERIAL' | 'RANDOM';

export interface AdLink {
  id: string;
  url: string;
  provider: 'ADSTERRA' | 'MONETAG';
  isEnabled: boolean;
  clicks?: number; // Optional analytics
}

export interface AdRotationConfig {
  isEnabled: boolean;
  mode: RotationMode;
  intervalMinutes: number;
  lastRotationTime: number; // Timestamp
  currentLinkIndex: number;
  links: AdLink[];
}
// --------------------------

export interface AdSettings {
  activeProvider: AdProvider;
  // Monetag Specifics
  monetagDirectLink: string; // General/SmartLink
  monetagInterstitialUrl?: string; // For In-App Interstitial
  monetagRewardedUrl?: string; // For Rewarded Video
  monetagAdTag?: string; // Stores the Script Source URL (src)
  monetagZoneId?: string; // NEW: Stores the numeric Zone ID (e.g., 10305424)
  monetagPopupUrl?: string;
  
  adsterraLink: string;
  telegramChannelLink: string;

  // New Rotation Config embedded in settings or separate
  rotation?: AdRotationConfig;
}

export interface SystemSettings {
  telegramBotToken: string; // Required for real verification
  supportLink?: string; // e.g. https://t.me/admin
  requiredChannelId?: string; // ANTI-CHEAT: User must join this to withdraw (@channel)
  youtubeApiKey?: string; // YouTube Data API Key
  
  // Financial Controls
  minWithdrawal?: number;
  dailyRewardBase?: number;
  dailyRewardStreakBonus?: number;
  pointsPerDollar?: number; // New: Exchange Rate
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  date: string;
}

export interface GameConfig {
  dailyLimit: number;
  minReward: number;
  maxReward: number;
  isEnabled: boolean;
}

export interface GameSettings {
  spin: GameConfig;
  scratch: GameConfig;
  guess: GameConfig;
  lottery: GameConfig;
}

// --- SHORTS FEATURE TYPES ---
export interface ShortVideo {
  id: string;
  youtubeId: string; // Extracted ID
  url: string;
  title?: string;
  addedAt: string;
}

export interface ShortsSettings {
  isEnabled: boolean;
  pointsPerVideo: number; // 0 if only ads pay
  pointsPerAd: number;
  adFrequency: number; // e.g., every 3 videos
  minWatchTimeSec: number; // e.g., 5 seconds
  shortsKeywords?: string; // Keywords for auto-fetching (e.g. "funny shorts")
  maxDailyVideos?: number; // Optional limit to prevent bot abuse
}

export interface UserShortsData {
  lastWatched: Record<string, string>; // videoId -> ISO Date String
  watchedTodayCount: number;
  lastResetDate: string; // YYYY-MM-DD
}
// ----------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  country: string;
  password?: string; // In real app, never store plain text
  role: UserRole;
  balance: number;
  blocked: boolean;
  joinedAt: string;
  telegramId?: number; // For Auto-Login via Telegram
  
  // New Features
  referralCode?: string; // Usually their ID
  referredBy?: string; // ID of the person who invited them
  referralCount?: number;
  referralEarnings?: number;
  
  lastDailyCheckIn?: string; // ISO Date string of last claim
  dailyStreak?: number; // Current day streak

  // ANTI-CHEAT
  ipAddress?: string;
  deviceId?: string;

  // Games Stats
  gameStats?: {
    lastPlayedDate: string; // YYYY-MM-DD
    spinCount: number;
    scratchCount: number;
    guessCount: number;
    lotteryCount: number;
  };

  // Shorts Data
  shortsData?: UserShortsData;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  reward: number;
  url?: string; // For YT or Website
  channelUsername?: string; // For Telegram (e.g. @mychannel)
  instructions?: string; // For Custom
  durationSeconds: number; // For timer
  totalLimit: number; // Max people who can do it
  completedCount: number;
  status: TaskStatus;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  method: string;
  amount: number;
  details: string; // e.g., phone number or wallet address
  status: WithdrawalStatus;
  date: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'EARNING' | 'WITHDRAWAL' | 'REFERRAL' | 'BONUS' | 'GAME' | 'SHORTS';
  description: string;
  date: string;
  taskId?: string; // Added to track which task generated this earning
}
