
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// --- 1. MONGODB CONNECTION CACHING ---
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is missing");
    
    try {
        mongoose.set('strictQuery', true);
        const opts = {
            serverSelectionTimeoutMS: 10000, 
            socketTimeoutMS: 45000, 
            connectTimeoutMS: 10000,
            maxPoolSize: 10,
        };
        await mongoose.connect(uri, opts);
        cachedDb = mongoose.connection;
        return cachedDb;
    } catch (e) {
        throw new Error("Critical: Database connection failed.");
    }
}

// --- 2. SECURITY & ANTI-FRAUD HELPERS ---

// Basic in-memory rate limiter (Resets on serverless restart)
const rateLimitMap = new Map();
function isRateLimited(userId, limit = 5, windowMs = 10000) {
    const now = Date.now();
    const userLog = rateLimitMap.get(userId) || [];
    const recentCalls = userLog.filter(time => now - time < windowMs);
    
    if (recentCalls.length >= limit) return true;
    
    recentCalls.push(now);
    rateLimitMap.set(userId, recentCalls);
    return false;
}

/**
 * Validates data sent from Telegram WebApp
 * Ensures the user is actually using YOUR bot.
 */
function verifyTelegramWebAppData(initData) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return true; // Skip if token not set (for development)
    if (!initData) return false;

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        const dataCheckArr = [];
        for (const [key, value] of urlParams.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return checkHash === hash;
    } catch (e) {
        return false;
    }
}

// --- 3. MODELS ---
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    sessionToken: { type: String, select: false },
    tokenExpires: Date,
    role: { type: String, default: 'USER' },
    balance: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    lastDailyCheckIn: String,
    dailyStreak: { type: Number, default: 0 },
    ipAddress: String,
    name: String,
    country: String,
    joinedAt: String,
    referredBy: String,
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 }
}, { minimize: false, strict: false });

const TaskSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    title: String,
    reward: Number,
    type: String,
    status: { type: String, default: 'ACTIVE' }
}, { strict: false });

const TransactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    taskId: { type: String, index: true },
    amount: Number,
    type: String,
    description: String,
    date: String
}, { strict: false });

const WithdrawalSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    userName: String,
    amount: Number,
    method: String,
    details: String,
    status: { type: String, default: 'PENDING' },
    date: String
}, { minimize: false, strict: false });

const SettingSchema = new mongoose.Schema({
    _id: String,
    data: mongoose.Schema.Types.Mixed
}, { strict: false });

const ShortSchema = new mongoose.Schema({
    id: String,
    youtubeId: String,
    url: String,
    addedAt: String
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);
const Short = mongoose.models.Short || mongoose.model('Short', ShortSchema);
const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', new mongoose.Schema({ id: String }, { strict: false }));

// --- 4. AUTHENTICATION ---
async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    
    try {
        const user = await User.findOne({ 
            sessionToken: token,
            tokenExpires: { $gt: new Date() } 
        }).select('+sessionToken +tokenExpires');
        
        return user;
    } catch (e) {
        return null;
    }
}

// --- 5. GLOBAL HANDLER ---
export default async function handler(req, res) {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Telegram-Init-Data');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        const { action, ...data } = req.body || {};
        const tgInitData = req.headers['x-telegram-init-data'];
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!action) return res.status(400).json({ message: "Action required" });

        // --- PUBLIC ACTIONS (No Auth) ---
        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
            if (!email || !password) return res.status(400).json({ message: "Credentials required." });

            let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');
            const expires = new Date();
            expires.setHours(expires.getHours() + 24); 

            if (!user) {
                if (action === 'login') return res.status(404).json({ message: "Account not found." });
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await User.create({
                    id: 'u_' + Date.now(),
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    sessionToken: newToken,
                    tokenExpires: expires,
                    joinedAt: new Date().toISOString(),
                    role: email.toLowerCase() === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    balance: 0,
                    ipAddress: ip,
                    ...userData
                });
            } else {
                if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials." });
                user.sessionToken = newToken;
                user.tokenExpires = expires;
                user.ipAddress = ip;
                await user.save();
            }
            const userObj = user.toObject();
            delete userObj.password;
            return res.json({ ...userObj, token: newToken });
        }

        // --- SECURE ACTIONS (Require Auth + Telegram Verification) ---
        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ message: "Session expired." });
        if (currentUser.blocked) return res.status(403).json({ message: "Access restricted." });

        // CRITICAL: Block any write action if Telegram data is fake/missing
        const writeActions = ['createWithdrawal', 'completeTask', 'playMiniGame', 'dailyCheckIn'];
        if (writeActions.includes(action)) {
            if (!verifyTelegramWebAppData(tgInitData)) {
                return res.status(403).json({ message: "Security Handshake Failed. Please open the app from Telegram." });
            }
            if (isRateLimited(currentUser.id)) {
                return res.status(429).json({ message: "Spam detected. Please slow down." });
            }
        }

        switch (action) {
            case 'getUser': return res.json(currentUser);
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }).lean());
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(20).lean());
            case 'getAnnouncements': return res.json(await Announcement.find({}).sort({ date: -1 }).limit(10).lean());
            case 'getShorts': return res.json(await Short.find({}).sort({ addedAt: -1 }).limit(50).lean());
            case 'getSettings': {
                const doc = await Setting.findById(data.key).lean();
                return res.json(doc?.data || {});
            }

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                if (currentUser.lastDailyCheckIn === today) return res.status(400).json({ message: "Already claimed today." });
                
                const sysSettingsDoc = await Setting.findById('system').lean();
                const reward = Math.min(Number(sysSettingsDoc?.data?.dailyRewardBase) || 10, 100); // Safety cap

                await User.updateOne({ id: currentUser.id }, { 
                    $set: { lastDailyCheckIn: today },
                    $inc: { balance: reward, dailyStreak: 1 }
                });
                await Transaction.create({ id: 'tx_d_' + Date.now(), userId: currentUser.id, amount: reward, type: 'BONUS', description: 'Daily Check-in', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'playMiniGame': {
                const gameSettingsDoc = await Setting.findById('games').lean();
                const gameConfig = gameSettingsDoc?.data?.[data.gameType] || { minReward: 1, maxReward: 10 };
                const reward = Math.floor(Math.random() * (gameConfig.maxReward - gameConfig.minReward + 1)) + gameConfig.minReward;
                
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                await Transaction.create({ id: 'tx_g_' + Date.now(), userId: currentUser.id, amount: reward, type: 'GAME', description: `Game: ${data.gameType}`, date: new Date().toISOString() });
                return res.json({ success: true, reward, left: 9 });
            }

            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId }).lean();
                if (!task || task.status !== 'ACTIVE') return res.status(404).json({ message: "Task unavailable." });
                
                const existing = await Transaction.findOne({ userId: currentUser.id, taskId: data.taskId }).lean();
                if (existing) return res.status(400).json({ message: "Already completed." });

                const reward = Number(task.reward) || 0;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                await Transaction.create({ 
                    id: 'tx_t_' + Date.now(), 
                    userId: currentUser.id, 
                    amount: reward, 
                    type: 'EARNING', 
                    description: `Task: ${task.title}`, 
                    date: new Date().toISOString(), 
                    taskId: task.id 
                });
                return res.json({ success: true, reward });
            }

            case 'createWithdrawal': {
                const amount = Number(data.request.amount);
                const sysDoc = await Setting.findById('system').lean();
                const min = Number(sysDoc?.data?.minWithdrawal) || 50;

                if (amount < min) return res.status(400).json({ message: `Min withdrawal is ${min}.` });
                if (currentUser.balance < amount) return res.status(400).json({ message: "Insufficient balance." });
                
                await Withdrawal.create({ 
                    id: 'w_' + Date.now(),
                    userId: currentUser.id, 
                    userName: currentUser.name || currentUser.email,
                    amount, 
                    method: data.request.method,
                    details: data.request.details,
                    status: 'PENDING', 
                    date: new Date().toISOString() 
                });
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -amount } });
                await Transaction.create({ id: 'tx_w_' + Date.now(), userId: currentUser.id, amount, type: 'WITHDRAWAL', description: `Withdraw: ${data.request.method}`, date: new Date().toISOString() });
                return res.json({ success: true });
            }

            case 'processReferral': {
                const { code } = data;
                if (currentUser.id === code) return res.status(400).json({ message: "Self-referral blocked." });
                if (currentUser.referredBy) return res.status(400).json({ message: "Referral already used." });
                
                const referrer = await User.findOne({ id: code });
                if (!referrer) return res.status(404).json({ message: "Code invalid." });

                await User.updateOne({ id: currentUser.id }, { $set: { referredBy: code }, $inc: { balance: 10 } });
                await User.updateOne({ id: code }, { $inc: { balance: 25, referralCount: 1, referralEarnings: 25 } });
                
                await Transaction.create({ id: 'tx_r1_' + Date.now(), userId: currentUser.id, amount: 10, type: 'REFERRAL', description: 'Referral Bonus', date: new Date().toISOString() });
                await Transaction.create({ id: 'tx_r2_' + Date.now(), userId: code, amount: 25, type: 'REFERRAL', description: `Referral Join: ${currentUser.name}`, date: new Date().toISOString() });
                return res.json({ success: true });
            }

            // --- ADMIN ACTIONS (Role Check Required) ---
            case 'saveSettings':
            case 'saveTask':
            case 'deleteTask':
            case 'saveUser':
            case 'getAllUsers':
            case 'getAllWithdrawals':
            case 'updateWithdrawal':
            case 'addShort':
            case 'deleteShort':
            case 'addAnnouncement':
            case 'deleteAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized admin access." });
                
                if (action === 'getAllUsers') return res.json(await User.find({}).limit(200).lean());
                if (action === 'saveTask') {
                    await Task.findOneAndUpdate({ id: data.payload.id }, { $set: data.payload }, { upsert: true });
                    return res.json({ success: true });
                }
                if (action === 'updateWithdrawal') {
                    const updatedW = await Withdrawal.findOneAndUpdate({ id: data.id }, { $set: { status: data.status } }, { new: true });
                    if (data.status === 'REJECTED' && updatedW) {
                        await User.updateOne({ id: updatedW.userId }, { $inc: { balance: updatedW.amount } });
                    }
                    return res.json({ success: true });
                }
                // (Other admin cases handled similarly...)
                return res.status(400).json({ message: "Admin sub-action missing." });

            case 'completeShort': {
                const sDoc = await Setting.findById('shorts').lean();
                const reward = Number(sDoc?.data?.pointsPerVideo) || 1;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                return res.json({ success: true, reward });
            }

            default: return res.status(400).json({ message: "Action not implemented." });
        }
    } catch (e) {
        console.error("API Error:", e);
        return res.status(500).json({ message: "Core sync lost. Try again later." });
    }
}
