
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
        throw new Error("MONGODB_URI environment variable is not defined");
    }

    // If a connection is already in progress, wait for it
    if (mongoose.connection.readyState === 2) {
        return new Promise((resolve, reject) => {
            const check = () => {
                if (mongoose.connection.readyState === 1) resolve(mongoose.connection);
                else if (mongoose.connection.readyState === 0) reject(new Error("Connection failed"));
                else setTimeout(check, 100);
            };
            check();
        });
    }

    try {
        mongoose.set('strictQuery', true);
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000, // Reduced for faster failover
            socketTimeoutMS: 30000,
            connectTimeoutMS: 10000,
            maxPoolSize: 1, // Minimize connections for serverless
            minPoolSize: 0,
        };
        
        console.log("Connecting to MongoDB...");
        const conn = await mongoose.connect(uri, opts);
        cachedDb = conn.connection;
        console.log("Connected to MongoDB");
        return cachedDb;
    } catch (e) {
        console.error("MongoDB Connection Error:", e);
        throw e;
    }
}

// --- 2. MODELS ---
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
    referralEarnings: { type: Number, default: 0 },
    shortsData: {
        lastWatched: { type: Map, of: String, default: {} },
        watchedTodayCount: { type: Number, default: 0 },
        lastResetDate: String
    }
}, { minimize: false, strict: false });

const TaskSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    title: String,
    reward: Number,
    type: String,
    url: String,
    status: { type: String, default: 'ACTIVE' },
    completedCount: { type: Number, default: 0 },
    totalLimit: { type: Number, default: 100 },
    durationSeconds: { type: Number, default: 30 }
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

const WithdrawalSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    userName: String,
    method: String,
    amount: Number,
    details: String,
    status: { type: String, default: 'PENDING' },
    date: String
}, { strict: false });

const AnnouncementSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: String,
    message: String,
    type: String,
    date: String
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const Short = mongoose.models.Short || mongoose.model('Short', ShortSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);
const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);

async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        return await User.findOne({ sessionToken: token, tokenExpires: { $gt: new Date() } }).lean();
    } catch (e) { return null; }
}

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
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
            if (!email || !password) return res.status(400).json({ message: "Credentials missing." });
            
            let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');
            const expires = new Date();
            expires.setHours(expires.getHours() + 24); 

            if (!user) {
                if (action === 'login') return res.status(404).json({ message: "Account not found." });
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await User.create({
                    id: 'u_' + Date.now(),
                    email: email.toLowerCase(), password: hashedPassword,
                    sessionToken: newToken, tokenExpires: expires,
                    joinedAt: new Date().toISOString(),
                    role: email.toLowerCase() === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    balance: 0, ipAddress: ip, ...userData
                });
            } else {
                if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials." });
                user.sessionToken = newToken; user.tokenExpires = expires; user.ipAddress = ip;
                await user.save();
            }
            const userObj = user.toObject(); delete userObj.password;
            return res.json({ ...userObj, token: newToken });
        }

        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ message: "Session expired." });
        if (currentUser.blocked) return res.status(403).json({ message: "Access restricted." });

        switch (action) {
            case 'getUser': return res.json(currentUser);
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }).lean());
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(20).lean());
            case 'getShorts': return res.json(await Short.find({}).sort({ addedAt: -1 }).lean());
            case 'getSettings': {
                if (!data.key) return res.status(400).json({ message: "Settings key required." });
                const doc = await Setting.findById(data.key).lean();
                return res.json(doc?.data || {});
            }

            case 'getWithdrawals':
                return res.json(await Withdrawal.find({ userId: currentUser.id }).sort({ date: -1 }).lean());

            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                return res.json(await User.find({}).limit(500).lean());
            
            case 'adminGetWithdrawals':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                const allWithdrawals = await Withdrawal.find({}).sort({ date: -1 }).lean();
                return res.json(allWithdrawals);

            case 'updateWithdrawal': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                const { id, status } = data;
                const withdrawal = await Withdrawal.findOne({ id });
                if (!withdrawal) return res.status(404).json({ message: "Request not found" });
                
                if (status === 'REJECTED' && withdrawal.status === 'PENDING') {
                    await User.updateOne({ id: withdrawal.userId }, { $inc: { balance: withdrawal.amount } });
                    await Transaction.create({
                        id: 'tx_rf_' + Date.now(),
                        userId: withdrawal.userId,
                        amount: withdrawal.amount,
                        type: 'BONUS',
                        description: `Refund: Withdrawal #${id}`,
                        date: new Date().toISOString()
                    });
                }
                
                withdrawal.status = status;
                await withdrawal.save();
                return res.json({ success: true });
            }

            case 'saveTask': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                const taskData = data.payload;
                await Task.findOneAndUpdate({ id: taskData.id }, taskData, { upsert: true });
                return res.json({ success: true });
            }

            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'getAnnouncements':
                return res.json(await Announcement.find({}).sort({ date: -1 }).lean());

            case 'addAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Announcement.create(data.payload);
                return res.json({ success: true });

            case 'deleteAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Announcement.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'saveUser':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await User.findOneAndUpdate({ id: data.user.id }, data.user);
                return res.json({ success: true });

            case 'createWithdrawal': {
                const { request } = data;
                const user = await User.findOne({ id: currentUser.id });
                if (user.balance < request.amount) return res.status(400).json({ message: "Insufficient balance." });
                
                user.balance -= request.amount;
                await user.save();
                
                await Withdrawal.create({
                    ...request,
                    userId: user.id,
                    userName: user.name,
                    status: 'PENDING'
                });
                
                await Transaction.create({
                    id: 'tx_w_' + Date.now(),
                    userId: user.id,
                    amount: request.amount,
                    type: 'WITHDRAWAL',
                    description: `Withdrawal via ${request.method}`,
                    date: new Date().toISOString()
                });
                
                return res.json({ success: true });
            }

            case 'completeTask': {
                const { taskId } = data;
                const task = await Task.findOne({ id: taskId }).lean();
                if (!task) return res.status(404).json({ message: "Task no longer available." });

                await User.updateOne({ id: currentUser.id }, { $inc: { balance: task.reward } });

                await Transaction.create({
                    id: 'tx_t_' + Date.now(),
                    userId: currentUser.id,
                    taskId: task.id,
                    amount: task.reward,
                    type: 'EARNING',
                    description: `Task Completed: ${task.title}`,
                    date: new Date().toISOString()
                });

                return res.json({ success: true, reward: task.reward });
            }

            case 'processReferral': {
                const { userId, code } = data;
                const user = await User.findOne({ id: currentUser.id });
                if (user.referredBy) return res.status(400).json({ message: "Referral already claimed." });
                if (code === user.id) return res.status(400).json({ message: "Cannot refer oneself." });
                
                const referrer = await User.findOne({ id: code });
                if (!referrer) return res.status(404).json({ message: "Referral code invalid." });

                referrer.balance += 25;
                referrer.referralCount += 1;
                referrer.referralEarnings += 25;
                await referrer.save();

                user.balance += 10;
                user.referredBy = code;
                await user.save();

                await Transaction.create({ id: 'tx_r1_' + Date.now(), userId: referrer.id, amount: 25, type: 'REFERRAL', description: `Referral Bonus: ${user.name}`, date: new Date().toISOString() });
                await Transaction.create({ id: 'tx_r2_' + Date.now(), userId: user.id, amount: 10, type: 'BONUS', description: `Referral Join Bonus`, date: new Date().toISOString() });

                return res.json({ success: true, message: "Referral reward processed." });
            }

            case 'completeShort': {
                const videoId = data.videoId;
                if (!videoId) return res.status(400).json({ videoId });
                const user = await User.findOne({ id: currentUser.id });
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                
                if (!user.shortsData) user.shortsData = { lastWatched: new Map(), watchedTodayCount: 0, lastResetDate: todayStr };
                const lastWatchedStr = user.shortsData.lastWatched.get(videoId);
                if (lastWatchedStr) {
                    const lastWatched = new Date(lastWatchedStr);
                    const diffHours = (now.getTime() - lastWatched.getTime()) / (1000 * 60 * 60);
                    if (diffHours < 24) return res.status(400).json({ message: "Cooldown active." });
                }
                
                if (user.shortsData.lastResetDate !== todayStr) {
                    user.shortsData.watchedTodayCount = 0;
                    user.shortsData.lastResetDate = todayStr;
                }
                
                const sDoc = await Setting.findById('shorts').lean();
                const reward = Number(sDoc?.data?.pointsPerVideo) || 10;
                
                user.balance += reward;
                user.shortsData.lastWatched.set(videoId, now.toISOString());
                user.shortsData.watchedTodayCount += 1;
                user.markModified('shortsData');
                await user.save();
                
                await Transaction.create({ id: 'tx_s_' + Date.now(), userId: user.id, amount: reward, type: 'SHORTS', description: `Shorts Reward`, date: now.toISOString() });
                return res.json({ success: true, reward });
            }

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                const user = await User.findOne({ id: currentUser.id });
                if (user.lastDailyCheckIn === today) return res.status(400).json({ message: "Already claimed." });
                const sys = await Setting.findById('system').lean();
                const reward = Number(sys?.data?.dailyRewardBase) || 10;
                
                user.balance += reward;
                user.dailyStreak += 1;
                user.lastDailyCheckIn = today;
                await user.save();
                
                await Transaction.create({ id: 'tx_d_' + Date.now(), userId: user.id, amount: reward, type: 'BONUS', description: 'Daily Check-in', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'playMiniGame': {
                const { gameType } = data;
                const user = await User.findOne({ id: currentUser.id });
                const today = new Date().toISOString().split('T')[0];
                const gamesSetting = await Setting.findById('games').lean();
                const config = gamesSetting?.data?.[gameType] || { isEnabled: true, dailyLimit: 10, minReward: 1, maxReward: 10 };
                
                if (!config.isEnabled) return res.status(400).json({ message: "Game disabled." });

                let stats = user.gameStats || {};
                if (stats.lastPlayedDate !== today) stats = { lastPlayedDate: today, spinCount: 0, scratchCount: 0, guessCount: 0, lotteryCount: 0 };
                
                const countKey = `${gameType}Count`;
                if (stats[countKey] >= config.dailyLimit) return res.status(400).json({ message: "Limit reached." });

                const reward = Math.floor(Math.random() * (config.maxReward - config.minReward + 1)) + config.minReward;
                stats[countKey]++;

                user.balance += reward;
                user.gameStats = stats;
                user.markModified('gameStats');
                await user.save();
                
                await Transaction.create({ id: 'tx_g_' + Date.now(), userId: user.id, amount: reward, type: 'GAME', description: `Mini-Game Win`, date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Setting.findOneAndUpdate({ _id: data.key }, { data: data.payload }, { upsert: true });
                return res.json({ success: true });
            
            case 'addShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                const vId = data.url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                await Short.create({ id: 'v_' + Date.now(), youtubeId: vId, url: data.url, addedAt: new Date().toISOString() });
                return res.json({ success: true });

            case 'deleteShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Short.deleteOne({ id: data.id });
                return res.json({ success: true });

            default: return res.status(400).json({ message: "Invalid action" });
        }
    } catch (e) {
        console.error("Handler Error:", e);
        return res.status(500).json({ message: e.message || "Internal server error" });
    }
}
