
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
    // Advanced Tracking
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

const WithdrawalSchema = new mongoose.Schema({ id: String }, { strict: false });
const Announcement = new mongoose.Schema({ id: String }, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const Short = mongoose.models.Short || mongoose.model('Short', ShortSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);

async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        return await User.findOne({ sessionToken: token, tokenExpires: { $gt: new Date() } });
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
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }));
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(20));
            case 'getShorts': return res.json(await Short.find({}).sort({ addedAt: -1 }));
            case 'getSettings': {
                const doc = await Setting.findById(data.key);
                return res.json(doc?.data || {});
            }

            case 'completeShort': {
                const videoId = data.videoId;
                if (!videoId) return res.status(400).json({ message: "Video ID missing" });

                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                
                // Initialize shortsData if missing
                if (!currentUser.shortsData) {
                    currentUser.shortsData = { lastWatched: new Map(), watchedTodayCount: 0, lastResetDate: todayStr };
                }

                // Check 24 hour cooldown
                const lastWatchedStr = currentUser.shortsData.lastWatched.get(videoId);
                if (lastWatchedStr) {
                    const lastWatched = new Date(lastWatchedStr);
                    const diffHours = (now.getTime() - lastWatched.getTime()) / (1000 * 60 * 60);
                    if (diffHours < 24) return res.status(400).json({ message: "Video cooldown active (24h)" });
                }

                // Reset daily counter if new day
                if (currentUser.shortsData.lastResetDate !== todayStr) {
                    currentUser.shortsData.watchedTodayCount = 0;
                    currentUser.shortsData.lastResetDate = todayStr;
                }

                const sDoc = await Setting.findById('shorts').lean();
                const reward = Number(sDoc?.data?.pointsPerVideo) || 10;

                // Update User
                currentUser.balance += reward;
                currentUser.shortsData.lastWatched.set(videoId, now.toISOString());
                currentUser.shortsData.watchedTodayCount += 1;
                
                // Use markModified for Map updates in Mongoose
                currentUser.markModified('shortsData.lastWatched');
                currentUser.markModified('shortsData');
                await currentUser.save();

                await Transaction.create({
                    id: 'tx_s_' + Date.now(),
                    userId: currentUser.id,
                    amount: reward,
                    type: 'SHORTS',
                    description: `Shorts Reward: ${videoId}`,
                    date: now.toISOString()
                });

                return res.json({ success: true, reward, watchedToday: currentUser.shortsData.watchedTodayCount });
            }

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                if (currentUser.lastDailyCheckIn === today) return res.status(400).json({ message: "Already claimed." });
                const sys = await Setting.findById('system');
                const reward = Number(sys?.data?.dailyRewardBase) || 10;
                await User.updateOne({ id: currentUser.id }, { $set: { lastDailyCheckIn: today }, $inc: { balance: reward, dailyStreak: 1 } });
                await Transaction.create({ id: 'tx_d_' + Date.now(), userId: currentUser.id, amount: reward, type: 'BONUS', description: 'Daily Check-in', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin only" });
                await Setting.findOneAndUpdate({ _id: data.key }, { data: data.payload }, { upsert: true });
                return res.json({ success: true });
            
            case 'addShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin only" });
                const vId = data.url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                await Short.create({ id: 'v_' + Date.now(), youtubeId: vId, url: data.url, addedAt: new Date().toISOString() });
                return res.json({ success: true });

            default: return res.status(400).json({ message: "Unknown action" });
        }
    } catch (e) {
        console.error("Handler Error", e);
        return res.status(500).json({ message: "Server sync lost." });
    }
}
