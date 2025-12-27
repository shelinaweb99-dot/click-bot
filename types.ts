
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum TaskType {
  YOUTUBE = 'YOUTUBE',
  WEBSITE = 'WEBSITE',
  CUSTOM = 'CUSTOM',
  TELEGRAM = 'TELEGRAM',
  SHORTLINK = 'SHORTLINK'
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
  detailsLabel: string;
  isEnabled: boolean;
}

export enum AdProvider {
  MONETAG = 'MONETAG',
  ADSTERRA = 'ADSTERRA',
  ROTATION = 'ROTATION'
}

export type RotationMode = 'SERIAL' | 'RANDOM';

export interface AdLink {
  id: string;
  url: string;
  provider: 'ADSTERRA' | 'MONETAG';
  isEnabled: boolean;
  clicks?: number;
}

export interface AdRotationConfig {
  isEnabled: boolean;
  mode: RotationMode;
  intervalMinutes: number;
  lastRotationTime: number;
  currentLinkIndex: number;
  links: AdLink[];
}

export type MonetagAdType = 'REWARDED_INTERSTITIAL' | 'REWARDED_POPUP' | 'INTERSTITIAL' | 'DIRECT';

export interface AdSettings {
  isGlobalEnabled?: boolean;
  activeProvider: AdProvider;
  monetagDirectLink: string;
  monetagAdTag?: string;
  monetagZoneId?: string;
  monetagRewardedInterstitialId?: string;
  monetagRewardedPopupId?: string;
  monetagInterstitialId?: string;
  adsterraLink: string;
  rotation?: AdRotationConfig;
  bannerAd?: {
    isEnabled: boolean;
    scriptHtml: string;
    height: number;
  };
}

export interface SystemSettings {
  telegramBotToken: string;
  supportLink?: string;
  requiredChannelId?: string;
  youtubeApiKey?: string;
  minWithdrawal?: number;
  dailyRewardBase?: number;
  dailyRewardStreakBonus?: number;
  pointsPerDollar?: number;
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

export interface ShortVideo {
  id: string;
  youtubeId: string;
  url: string;
  title?: string;
  addedAt: string;
}

export interface ShortsSettings {
  isEnabled: boolean;
  pointsPerVideo: number;
  pointsPerAd: number;
  adFrequency: number;
  minWatchTimeSec: number;
  shortsKeywords?: string;
  maxDailyVideos?: number;
}

export interface UserShortsData {
  lastWatched: Record<string, string>;
  watchedTodayCount: number;
  lastResetDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  country: string;
  password?: string;
  role: UserRole;
  balance: number;
  blocked: boolean;
  joinedAt: string;
  telegramId?: number;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralEarnings?: number;
  lastDailyCheckIn?: string;
  dailyStreak?: number;
  ipAddress?: string;
  deviceId?: string;
  gameStats?: {
    lastPlayedDate: string;
    spinCount: number;
    scratchCount: number;
    guessCount: number;
    lotteryCount: number;
  };
  shortsData?: UserShortsData;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  reward: number;
  url?: string;
  channelUsername?: string;
  instructions?: string;
  durationSeconds: number;
  totalLimit: number;
  completedCount: number;
  status: TaskStatus;
  fileUrl?: string; // New: Protected file download link
  fileTitle?: string; // New: Display name for the file
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  method: string;
  amount: number;
  details: string;
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
  taskId?: string;
}
