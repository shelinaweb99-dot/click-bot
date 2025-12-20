
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// --- 1. MONGODB CONNECTION CACHING ---
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is missing from environment variables");
    
    try {
        mongoose.set('strictQuery', true);
        const opts = {
            serverSelectionTimeoutMS: 15000, 
            socketTimeoutMS: 45000, 
            connectTimeoutMS: 15000,
            maxPoolSize: 10,
        };
        await mongoose.connect(uri, opts);
        cachedDb = mongoose.connection;
        console.log("New DB connection established");
        return cachedDb;
    } catch (e) {
        console.error("DB Connection Error:", e);
        throw new Error("Critical: Database connection failed.");
    }
}

// --- 2. MODELS ---
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    sessionToken: { type: String, select: false },
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

// --- 3. AUTHENTICATION ---
async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        return await User.findOne({ sessionToken: token }).select('+sessionToken').lean();
    } catch (e) {
        return null;
    }
}

// --- 4. GLOBAL HANDLER ---
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

        if (!action) return res.status(400).json({ message: "Action required" });

        // --- PUBLIC ACTIONS ---
        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
            if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

            let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');

            if (!user) {
                if (action === 'login') return res.status(404).json({ message: "Account not found." });
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await User.create({
                    id: 'u_' + Date.now(),
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    sessionToken: newToken,
                    joinedAt: new Date().toISOString(),
                    role: email.toLowerCase() === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    balance: 0,
                    ...userData
                });
            } else {
                if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials." });
                user.sessionToken = newToken;
                await user.save();
            }
            const userObj = user.toObject();
            delete userObj.password;
            return res.json({ ...userObj, token: newToken });
        }

        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ message: "Session expired." });
        if (currentUser.blocked) return res.status(403).json({ message: "Access restricted." });

        switch (action) {
            // --- USER READ ACTIONS ---
            case 'getUser': return res.json(await User.findOne({ id: currentUser.id }).lean());
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }).lean());
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(20).lean());
            case 'getAnnouncements': return res.json(await Announcement.find({}).sort({ date: -1 }).limit(10).lean());
            case 'getShorts': return res.json(await Short.find({}).sort({ addedAt: -1 }).limit(50).lean());
            case 'getSettings': {
                const doc = await Setting.findById(data.key).lean();
                return res.json(doc?.data || {});
            }

            // --- USER WRITE ACTIONS ---
            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                const user = await User.findOne({ id: currentUser.id });
                if (user.lastDailyCheckIn === today) return res.status(400).json({ message: "Already claimed today." });
                
                const sysSettingsDoc = await Setting.findById('system').lean();
                const reward = Number(sysSettingsDoc?.data?.dailyRewardBase) || 10;

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
                await Transaction.create({ 
                    id: 'tx_g_' + Date.now(), 
                    userId: currentUser.id, 
                    amount: reward, 
                    type: 'GAME', 
                    description: `Game: ${data.gameType}`, 
                    date: new Date().toISOString() 
                });
                return res.json({ success: true, reward, left: 9 });
            }

            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId }).lean();
                if (!task) return res.status(404).json({ message: "Task removed." });
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
                const user = await User.findOne({ id: currentUser.id });
                if (user.balance < amount) return res.status(400).json({ message: "Insufficient balance." });
                
                await Withdrawal.create({ ...data.request, amount, status: 'PENDING', userId: currentUser.id, userName: user.name || user.email });
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -amount } });
                await Transaction.create({ id: 'tx_w_' + Date.now(), userId: currentUser.id, amount, type: 'WITHDRAWAL', description: `Withdraw: ${data.request.method}`, date: new Date().toISOString() });
                return res.json({ success: true });
            }

            case 'processReferral': {
                const { code } = data;
                if (currentUser.id === code) return res.status(400).json({ message: "Self-referral blocked." });
                const user = await User.findOne({ id: currentUser.id });
                if (user.referredBy) return res.status(400).json({ message: "Referral already used." });
                const referrer = await User.findOne({ id: code });
                if (!referrer) return res.status(404).json({ message: "Code not found." });

                await User.updateOne({ id: currentUser.id }, { $set: { referredBy: code }, $inc: { balance: 10 } });
                await User.updateOne({ id: code }, { $inc: { balance: 25, referralCount: 1, referralEarnings: 25 } });
                
                await Transaction.create({ id: 'tx_r_1_' + Date.now(), userId: currentUser.id, amount: 10, type: 'REFERRAL', description: 'Referral Join Bonus', date: new Date().toISOString() });
                await Transaction.create({ id: 'tx_r_2_' + Date.now(), userId: code, amount: 25, type: 'REFERRAL', description: `Bonus for inviting ${user.name}`, date: new Date().toISOString() });
                return res.json({ success: true, message: "Referral applied!" });
            }

            // --- ADMIN ACTIONS ---
            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await Setting.findOneAndUpdate({ _id: data.key }, { $set: { data: data.payload } }, { upsert: true });
                return res.json({ success: true });

            case 'saveTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await Task.findOneAndUpdate({ id: data.payload.id }, { $set: data.payload }, { upsert: true });
                return res.json({ success: true });

            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'saveUser':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await User.findOneAndUpdate({ id: data.user.id }, { $set: data.user });
                return res.json({ success: true });

            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                return res.json(await User.find({}).limit(100).lean());

            case 'getAllWithdrawals':
                if (currentUser.role === 'ADMIN') return res.json(await Withdrawal.find({}).sort({ date: -1 }).limit(50).lean());
                return res.json(await Withdrawal.find({ userId: currentUser.id }).sort({ date: -1 }).lean());

            case 'updateWithdrawal':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                const updatedW = await Withdrawal.findOneAndUpdate({ id: data.id }, { $set: { status: data.status } }, { new: true });
                if (data.status === 'REJECTED' && updatedW) {
                    await User.updateOne({ id: updatedW.userId }, { $inc: { balance: updatedW.amount } });
                }
                return res.json({ success: true });

            case 'addShort': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                let vid = data.url.split('v=')[1]?.split('&')[0] || data.url.split('youtu.be/')[1]?.split('?')[0] || data.url.split('/shorts/')[1]?.split('?')[0];
                if (!vid) return res.status(400).json({ message: "Invalid YT link" });
                await Short.create({ id: 's_' + Date.now(), youtubeId: vid, url: data.url, addedAt: new Date().toISOString() });
                return res.json({ success: true });
            }

            case 'deleteShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await Short.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'addAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await Announcement.create(data.payload);
                return res.json({ success: true });

            case 'deleteAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await Announcement.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'completeShort': {
                const sDoc = await Setting.findById('shorts').lean();
                const reward = Number(sDoc?.data?.pointsPerVideo) || 1;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                await Transaction.create({ id: 'tx_s_' + Date.now(), userId: currentUser.id, amount: reward, type: 'SHORTS', description: 'Watched Short', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'completeAd': {
                const sDoc = await Setting.findById('shorts').lean();
                const reward = Number(sDoc?.data?.pointsPerAd) || 5;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                return res.json({ success: true, reward });
            }

            case 'initiateAdWatch': return res.json({ success: true });

            default: return res.status(400).json({ message: "Unknown action: " + action });
        }
    } catch (e) {
        console.error("API CRASH:", e);
        return res.status(500).json({ message: "Internal server failure" });
    }
}
