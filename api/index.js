
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// --- 1. MONGODB CONNECTION CACHING ---
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }
    
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is missing");
    }

    try {
        mongoose.set('strictQuery', true);
        const opts = {
            serverSelectionTimeoutMS: 15000, // 15s timeout
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
        };
        
        await mongoose.connect(uri, opts);
        cachedDb = mongoose.connection;
        console.log("New DB connection established");
        return cachedDb;
    } catch (e) {
        console.error("DB Connection Error:", e);
        throw e;
    }
}

// --- 2. SCHEMAS ---
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    sessionToken: { type: String, select: false },
    role: { type: String, default: 'USER' },
    balance: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    telegramId: Number,
    country: String,
    joinedAt: String,
    referralCode: String,
    referredBy: String,
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    lastDailyCheckIn: String,
    dailyStreak: { type: Number, default: 0 },
    gameStats: { type: Object, default: {} },
    shortsData: { type: Object, default: {} },
    ipAddress: String
}, { minimize: false, strict: false });

const TaskSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    type: String,
    reward: Number,
    url: String,
    channelUsername: String,
    durationSeconds: Number,
    totalLimit: Number,
    completedCount: { type: Number, default: 0 },
    status: { type: String, default: 'ACTIVE' },
    instructions: String
});

const TransactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    amount: Number,
    type: String,
    description: String,
    date: String,
    taskId: String
});

const WithdrawalSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    userName: String,
    method: String,
    amount: Number,
    details: String,
    status: { type: String, default: 'PENDING' },
    date: String
});

const SettingSchema = new mongoose.Schema({
    _id: String,
    data: Object
}, { strict: false });

const ShortSchema = new mongoose.Schema({
    id: String,
    youtubeId: String,
    url: String,
    title: String,
    addedAt: String
});

const AnnouncementSchema = new mongoose.Schema({
    id: String,
    title: String,
    message: String,
    type: String,
    date: String
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const Short = mongoose.models.Short || mongoose.model('Short', ShortSchema);
const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);

// --- 3. HELPER: AUTHENTICATION ---
async function authenticateUser(req) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        const token = authHeader.split(' ')[1];
        if (!token) return null;
        return await User.findOne({ sessionToken: token });
    } catch (e) {
        console.error("Auth helper error:", e);
        return null;
    }
}

// --- 4. API HANDLER ---
export default async function handler(req, res) {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        const { action, ...data } = req.body || {};
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // --- PUBLIC ACTIONS ---
        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
            if (!email) return res.status(400).json({ success: false, message: "Email required" });

            let user = await User.findOne({ email }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');

            if (!user) {
                if (action === 'login') return res.status(404).json({ success: false, message: "Account not found." });
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await User.create({
                    id: 'user_' + Date.now(),
                    email,
                    password: hashedPassword,
                    ...userData,
                    sessionToken: newToken,
                    joinedAt: new Date().toISOString(),
                    role: email.toLowerCase() === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    ipAddress
                });
            } else {
                let passwordValid = await bcrypt.compare(password, user.password);
                if (!passwordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });
                user.sessionToken = newToken;
                user.ipAddress = ipAddress;
                await user.save();
            }
            if (user.blocked) return res.status(403).json({ success: false, message: 'Account Blocked' });
            const userObj = user.toObject();
            delete userObj.password;
            return res.status(200).json({ ...userObj, token: newToken });
        }

        // --- SECURE ACTIONS ---
        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ success: false, message: "Session expired. Please login again." });
        const userId = currentUser.id;

        switch (action) {
            case 'getUser': return res.json(currentUser);
            case 'getTasks': return res.json(await Task.find({}));
            case 'getTransactions': return res.json(await Transaction.find({ userId }).sort({ date: -1 }).limit(50));
            
            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId });
                if (!task) return res.status(404).json({ message: "Task not found" });
                const today = new Date().toISOString().split('T')[0];
                const existing = await Transaction.findOne({ userId, taskId: data.taskId, date: { $regex: `^${today}` } });
                if (existing) return res.status(400).json({ message: "Task already done today" });

                await User.updateOne({ id: userId }, { $inc: { balance: task.reward } });
                await Task.updateOne({ id: task.id }, { $inc: { completedCount: 1 } });
                await Transaction.create({ id: 'tx_' + Date.now(), userId, amount: task.reward, type: 'EARNING', description: `Task: ${task.title}`, date: new Date().toISOString(), taskId: task.id });
                return res.json({ success: true });
            }

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                if (currentUser.lastDailyCheckIn && currentUser.lastDailyCheckIn.split('T')[0] === today) return res.status(400).json({ message: "Already claimed" });
                
                const sys = await Setting.findById('system');
                const baseReward = sys?.data?.dailyRewardBase || 10;
                const streakBonus = sys?.data?.dailyRewardStreakBonus || 2;
                const amount = baseReward + (Math.min(currentUser.dailyStreak || 0, 7) * streakBonus);
                
                await User.updateOne({ id: userId }, { $inc: { balance: amount }, $set: { lastDailyCheckIn: new Date().toISOString(), dailyStreak: (currentUser.dailyStreak || 0) + 1 } });
                await Transaction.create({ id: 'tx_' + Date.now(), userId, amount, type: 'BONUS', description: 'Daily Check-in', date: new Date().toISOString() });
                return res.json({ success: true, reward: amount });
            }

            case 'playMiniGame': {
                const gameType = data.gameType;
                const today = new Date().toISOString().split('T')[0];
                const gamesSetting = await Setting.findById('games');
                const config = gamesSetting?.data?.[gameType] || { isEnabled: true, dailyLimit: 10, minReward: 1, maxReward: 10 };
                
                if (!config.isEnabled) return res.status(400).json({ message: "Game currently disabled" });

                let stats = currentUser.gameStats || {};
                if (stats.lastPlayedDate !== today) stats = { lastPlayedDate: today, spinCount: 0, scratchCount: 0, guessCount: 0, lotteryCount: 0 };
                
                const countKey = `${gameType}Count`;
                if (stats[countKey] >= config.dailyLimit) return res.status(400).json({ success: false, message: "Daily limit reached", left: 0 });

                const reward = Math.floor(Math.random() * (config.maxReward - config.minReward + 1)) + config.minReward;
                stats[countKey]++;

                await User.updateOne({ id: userId }, { $inc: { balance: reward }, $set: { gameStats: stats } });
                await Transaction.create({ id: 'tx_g_' + Date.now(), userId, amount: reward, type: 'GAME', description: `Won in ${gameType}`, date: new Date().toISOString() });

                return res.json({ success: true, reward, message: `Won ${reward} points!`, left: config.dailyLimit - stats[countKey] });
            }

            case 'saveUser':
                if (currentUser.role !== 'ADMIN' && currentUser.id !== data.user.id) return res.status(403).json({ message: "Forbidden" });
                await User.findOneAndUpdate({ id: data.user.id }, data.user);
                return res.json({ success: true });

            case 'processReferral': {
                const { userId, referrerId } = data;
                if (userId === referrerId) return res.status(400).json({ message: "Cannot refer self" });
                const user = await User.findOne({ id: userId });
                if (!user || user.referredBy) return res.status(400).json({ message: "Referral denied" });
                
                const referrer = await User.findOne({ id: referrerId });
                if (!referrer) return res.status(404).json({ message: "Referrer not found" });

                await User.updateOne({ id: userId }, { $set: { referredBy: referrerId }, $inc: { balance: 10 } });
                await User.updateOne({ id: referrerId }, { $inc: { balance: 25, referralCount: 1, referralEarnings: 25 } });
                
                await Transaction.create({ id: 'tx_ref_' + Date.now() + '_u', userId, amount: 10, type: 'REFERRAL', description: 'Referral Bonus', date: new Date().toISOString() });
                await Transaction.create({ id: 'tx_ref_' + Date.now() + '_r', userId: referrerId, amount: 25, type: 'REFERRAL', description: `Referral: ${user.name}`, date: new Date().toISOString() });

                return res.json({ success: true, message: "Success!" });
            }

            case 'getAllUsers': 
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                return res.json(await User.find({}).limit(200));
            case 'getAllWithdrawals': 
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                return res.json(await Withdrawal.find({}).sort({date:-1}));
            case 'createWithdrawal':
                if (currentUser.balance < data.request.amount) return res.status(400).json({ message: "Insufficient balance" });
                await Withdrawal.create(data.request);
                await User.updateOne({ id: userId }, { $inc: { balance: -data.request.amount } });
                await Transaction.create({ id: 'tx_w_' + Date.now(), userId, amount: data.request.amount, type: 'WITHDRAWAL', description: `Withdrawal Request`, date: new Date().toISOString() });
                return res.json({ success: true });
            case 'updateWithdrawal':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                await Withdrawal.updateOne({ id: data.id }, { status: data.status });
                return res.json({ success: true });
            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });
            case 'saveTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                await Task.findOneAndUpdate({ id: data.payload.id }, data.payload, { upsert: true });
                return res.json({ success: true });
            case 'getSettings': {
                const setting = await Setting.findById(data.key);
                return res.json(setting?.data || {});
            }
            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                await Setting.findOneAndUpdate({ _id: data.key }, { _id: data.key, data: data.payload }, { upsert: true });
                return res.json({ success: true });

            case 'getShorts': return res.json(await Short.find({}));
            case 'addShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                const vId = data.url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                if (!vId) return res.status(400).json({ message: "Invalid YouTube URL" });
                await Short.create({ id: 'v_' + Date.now(), youtubeId: vId, url: data.url, addedAt: new Date().toISOString() });
                return res.json({ success: true });
            case 'deleteShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                await Short.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'getAnnouncements': return res.json(await Announcement.find({}).sort({date:-1}));
            case 'addAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                await Announcement.create(data.payload);
                return res.json({ success: true });
            case 'deleteAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required" });
                await Announcement.deleteOne({ id: data.id });
                return res.json({ success: true });

            default: return res.status(400).json({ message: "Action not implemented" });
        }
    } catch (e) {
        console.error("Critical API Error:", e);
        return res.status(500).json({ success: false, message: e.message || "Internal server error" });
    }
}
