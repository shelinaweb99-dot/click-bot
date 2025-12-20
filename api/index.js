
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
            serverSelectionTimeoutMS: 20000,
            socketTimeoutMS: 60000, 
            connectTimeoutMS: 20000,
        };
        await mongoose.connect(uri, opts);
        cachedDb = mongoose.connection;
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
    joinedAt: String
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);
const Short = mongoose.models.Short || mongoose.model('Short', new mongoose.Schema({ id: String }, { strict: false }));
const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', new mongoose.Schema({ id: String }, { strict: false }));

// --- 3. AUTHENTICATION ---
async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        return await User.findOne({ sessionToken: token }).select('+sessionToken');
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
        if (!currentUser) return res.status(401).json({ message: "Session expired. Please login again." });
        if (currentUser.blocked) return res.status(403).json({ message: "Access restricted by administrator." });

        switch (action) {
            case 'getUser': 
                const freshUser = await User.findOne({ id: currentUser.id });
                return res.json(freshUser);
                
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }));
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(50));
            case 'getAnnouncements': return res.json(await Announcement.find({}).sort({ date: -1 }));
            case 'getShorts': return res.json(await Short.find({}));
            
            case 'getSettings': {
                const doc = await Setting.findById(data.key);
                return res.json(doc?.data || {});
            }

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                await Setting.findOneAndUpdate(
                    { _id: data.key }, 
                    { $set: { data: data.payload } }, 
                    { upsert: true, new: true }
                );
                return res.json({ success: true });

            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId });
                if (!task) return res.status(404).json({ message: "Task was removed by admin." });
                
                const existing = await Transaction.findOne({ userId: currentUser.id, taskId: data.taskId });
                if (existing) return res.status(400).json({ message: "Reward already claimed." });

                const reward = Number(task.reward) || 0;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                await Transaction.create({ 
                    id: 'tx_' + Date.now(), 
                    userId: currentUser.id, 
                    amount: reward, 
                    type: 'EARNING', 
                    description: `Mission: ${task.title}`, 
                    date: new Date().toISOString(), 
                    taskId: task.id 
                });
                return res.json({ success: true, reward });
            }

            case 'createWithdrawal': {
                const amount = Number(data.request.amount);
                if (currentUser.balance < amount) return res.status(400).json({ message: "Insufficient balance." });
                
                // Explicitly set initial status and ensure numeric amount
                const withdrawalPayload = {
                    ...data.request,
                    amount,
                    status: 'PENDING',
                    userId: currentUser.id,
                    userName: currentUser.name || currentUser.email
                };

                await Withdrawal.create(withdrawalPayload);
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -amount } });
                await Transaction.create({ 
                    id: 'tx_w_' + Date.now(), 
                    userId: currentUser.id, 
                    amount, 
                    type: 'WITHDRAWAL', 
                    description: `Cashout: ${data.request.method}`, 
                    date: new Date().toISOString() 
                });
                return res.json({ success: true });
            }

            case 'saveTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                await Task.findOneAndUpdate({ id: data.payload.id }, { $set: data.payload }, { upsert: true, new: true });
                return res.json({ success: true });

            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                return res.json(await User.find({}).limit(200));

            case 'getAllWithdrawals':
                // Logic Fix: Admins see all, Users see their own history.
                if (currentUser.role === 'ADMIN') {
                    return res.json(await Withdrawal.find({}).sort({ date: -1 }));
                } else {
                    return res.json(await Withdrawal.find({ userId: currentUser.id }).sort({ date: -1 }));
                }

            case 'updateWithdrawal':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                const updated = await Withdrawal.findOneAndUpdate(
                    { id: data.id }, 
                    { $set: { status: data.status } },
                    { new: true }
                );
                
                // Refund points if rejected
                if (data.status === 'REJECTED' && updated) {
                    await User.updateOne({ id: updated.userId }, { $inc: { balance: updated.amount } });
                    await Transaction.create({ 
                        id: 'tx_r_' + Date.now(), 
                        userId: updated.userId, 
                        amount: updated.amount, 
                        type: 'BONUS', 
                        description: `Refund: Withdrawal Rejected`, 
                        date: new Date().toISOString() 
                    });
                }
                return res.json({ success: true });

            case 'saveUser':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                await User.findOneAndUpdate({ id: data.user.id }, { $set: data.user }, { new: true });
                return res.json({ success: true });

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                if (currentUser.lastDailyCheckIn === today) return res.status(400).json({ message: "Already checked in today." });
                
                const sysSettingsDoc = await Setting.findById('system');
                const sysSettings = sysSettingsDoc?.data || { dailyRewardBase: 10 };
                const reward = Number(sysSettings.dailyRewardBase) || 10;

                await User.updateOne({ id: currentUser.id }, { 
                    $set: { lastDailyCheckIn: today },
                    $inc: { balance: reward, dailyStreak: 1 }
                });
                await Transaction.create({ id: 'tx_d_' + Date.now(), userId: currentUser.id, amount: reward, type: 'BONUS', description: 'Daily Check-in Reward', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'playMiniGame': {
                const gameSettingsDoc = await Setting.findById('games');
                const gameSettings = gameSettingsDoc?.data || {};
                const gameConfig = gameSettings[data.gameType] || { minReward: 1, maxReward: 10 };
                const reward = Math.floor(Math.random() * (gameConfig.maxReward - gameConfig.minReward + 1)) + gameConfig.minReward;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                await Transaction.create({ id: 'tx_g_' + Date.now(), userId: currentUser.id, amount: reward, type: 'GAME', description: `Game Reward: ${data.gameType}`, date: new Date().toISOString() });
                return res.json({ success: true, reward, left: 10 }); 
            }

            case 'addShort': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                let vid = '';
                if (data.url.includes('v=')) vid = data.url.split('v=')[1]?.split('&')[0];
                else if (data.url.includes('youtu.be/')) vid = data.url.split('youtu.be/')[1]?.split('?')[0];
                else if (data.url.includes('/shorts/')) vid = data.url.split('/shorts/')[1]?.split('?')[0];
                if (!vid) return res.status(400).json({ message: "Invalid YouTube URL." });
                await Short.create({ id: 's_' + Date.now(), youtubeId: vid, url: data.url, addedAt: new Date().toISOString() });
                return res.json({ success: true });
            }

            case 'deleteShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                await Short.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'addAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                await Announcement.create(data.payload);
                return res.json({ success: true });

            case 'deleteAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                await Announcement.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'processReferral': {
                const { userId, code } = data;
                if (userId === code) return res.status(400).json({ message: "Cannot refer yourself." });
                const referrer = await User.findOne({ id: code });
                if (!referrer) return res.status(404).json({ message: "Invalid Referral ID." });
                const user = await User.findOne({ id: userId });
                if (user.referredBy) return res.status(400).json({ message: "Already referred." });
                await User.updateOne({ id: userId }, { $set: { referredBy: code }, $inc: { balance: 10 } });
                await User.updateOne({ id: code }, { $inc: { balance: 25, referralCount: 1, referralEarnings: 25 } });
                await Transaction.create({ id: 'tx_ref_u_' + Date.now(), userId, amount: 10, type: 'REFERRAL', description: 'Referral Join Bonus', date: new Date().toISOString() });
                await Transaction.create({ id: 'tx_ref_r_' + Date.now(), userId: code, amount: 25, type: 'REFERRAL', description: `Referral Reward for ${user.name}`, date: new Date().toISOString() });
                return res.json({ success: true, message: "Success! Bonus claimed." });
            }

            case 'completeShort': {
                const shortSettingsDoc = await Setting.findById('shorts');
                const shortSettings = shortSettingsDoc?.data || { pointsPerVideo: 1 };
                const reward = Number(shortSettings.pointsPerVideo) || 1;
                await User.updateOne({ id: currentUser.id }, { 
                    $inc: { balance: reward },
                    $set: { [`shortsData.lastWatched.${data.videoId}`]: new Date().toISOString() }
                });
                await Transaction.create({ id: 'tx_s_' + Date.now(), userId: currentUser.id, amount: reward, type: 'SHORTS', description: 'Watched Short Video', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'completeAd': {
                const shortSettingsDoc = await Setting.findById('shorts');
                const shortSettings = shortSettingsDoc?.data || { pointsPerAd: 5 };
                const reward = Number(shortSettings.pointsPerAd) || 5;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                await Transaction.create({ id: 'tx_ad_' + Date.now(), userId: currentUser.id, amount: reward, type: 'BONUS', description: 'Ad View Reward', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'initiateAdWatch': return res.json({ success: true });

            default: return res.status(400).json({ message: "Unknown action." });
        }
    } catch (e) {
        console.error("Critical API Error:", e);
        return res.status(500).json({ success: false, message: "System core failed: " + e.message });
    }
}
