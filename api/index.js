
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

    try {
        mongoose.set('strictQuery', false);
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10,
        };
        
        const conn = await mongoose.connect(uri, opts);
        cachedDb = conn.connection;
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
    lastActivityTime: { type: Number, default: 0 },
    dailyStreak: { type: Number, default: 0 },
    ipAddress: String,
    name: String,
    country: String,
    joinedAt: String,
    referredBy: String,
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    gameStats: {
        lastPlayedDate: String,
        spinCount: { type: Number, default: 0 },
        scratchCount: { type: Number, default: 0 },
        guessCount: { type: Number, default: 0 },
        lotteryCount: { type: Number, default: 0 }
    },
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
    durationSeconds: { type: Number, default: 30 },
    fileUrl: String,
    fileTitle: String
}, { strict: false });

const ShortVideoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    youtubeId: String,
    url: String,
    title: String,
    addedAt: String
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

const WithdrawalSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, index: true },
    userName: String,
    amount: Number,
    method: String,
    details: String,
    status: { type: String, default: 'PENDING' },
    date: String
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const ShortVideo = mongoose.models.ShortVideo || mongoose.model('ShortVideo', ShortVideoSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);

async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        return await User.findOne({ sessionToken: token, tokenExpires: { $gt: new Date() } });
    } catch (e) { return null; }
}

export default async function handler(req, res) {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Telegram-Init-Data');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        
        if (req.query.action === 'postback' || req.body.action === 'postback') {
            const uid = req.query.uid || req.body.uid || req.query.user_id || req.body.user_id;
            const tid = req.query.tid || req.body.tid || req.query.task_id || req.body.task_id;

            console.log(`[POSTBACK RECEIVED] UID: ${uid}, TID: ${tid}`);

            if (!uid || !tid) {
                return res.status(400).json({ message: "Invalid postback parameters. Missing UID or TID." });
            }

            const [user, task] = await Promise.all([
                User.findOne({ id: uid }), 
                Task.findOne({ id: tid })
            ]);

            if (!user || !task) {
                console.warn(`[POSTBACK ERROR] Target not found. User: ${!!user}, Task: ${!!task}`);
                return res.status(404).json({ message: "Verification target not found." });
            }
            
            const existingTx = await Transaction.findOne({ userId: uid, taskId: tid });
            if (existingTx) {
                return res.status(200).send("1"); // Some providers expect '1' or 'success'
            }

            user.balance += task.reward;
            await user.save();
            await Transaction.create({
                id: 'tx_p_' + Date.now() + '_' + uid,
                userId: uid, taskId: tid, amount: task.reward,
                type: 'EARNING', description: `Verified Shortlink: ${task.title}`,
                date: new Date().toISOString()
            });
            await Task.updateOne({ id: tid }, { $inc: { completedCount: 1 } });
            
            console.log(`[POSTBACK SUCCESS] Rewarded User ${uid} with ${task.reward} points.`);
            return res.status(200).send("1");
        }

        const { action, ...data } = req.body || {};
        const currentUser = await authenticateUser(req);

        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
            let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');
            const expires = new Date();
            expires.setHours(expires.getHours() + 168);

            if (!user) {
                if (action === 'login') return res.status(404).json({ message: "Not found." });
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await User.create({
                    id: 'u_' + Date.now(),
                    email: email.toLowerCase(), password: hashedPassword,
                    sessionToken: newToken, tokenExpires: expires,
                    joinedAt: new Date().toISOString(),
                    role: email.toLowerCase() === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    balance: 0, ...userData
                });
            } else {
                if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid." });
                user.sessionToken = newToken; user.tokenExpires = expires;
                await user.save();
            }
            const userObj = user.toObject(); delete userObj.password;
            return res.json({ ...userObj, token: newToken });
        }

        if (!currentUser) return res.status(401).json({ message: "Session expired." });

        switch (action) {
            case 'getUser': return res.json(currentUser);
            case 'getTasks': {
                const tasks = await Task.find({ status: 'ACTIVE' }).lean();
                if (currentUser.role === 'ADMIN') return res.json(tasks);

                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const recentTx = await Transaction.find({ 
                    userId: currentUser.id, 
                    type: 'EARNING',
                    date: { $gte: yesterday }
                }).select('taskId').lean();

                const recentTaskIds = new Set(recentTx.map(tx => tx.taskId));
                
                const visibleTasks = tasks.filter(t => {
                    if ((t.type === 'WEBSITE' || t.type === 'YOUTUBE') && recentTaskIds.has(t.id)) {
                        return false;
                    }
                    return true;
                });

                return res.json(visibleTasks);
            }
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(100).lean());
            
            case 'getProtectedFile': {
                const { taskId } = data;
                const task = await Task.findOne({ id: taskId }).lean();
                if (!task || !task.fileUrl) return res.status(404).json({ message: "File not found." });
                const completed = await Transaction.findOne({ userId: currentUser.id, taskId: task.id });
                if (!completed) return res.status(403).json({ message: "Unlock file by completing task." });
                return res.json({ success: true, url: task.fileUrl, title: task.fileTitle });
            }

            case 'getSettings': {
                const doc = await Setting.findById(data.key).lean();
                return res.json(doc?.data || {});
            }

            // --- ADMIN ACTIONS ---
            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                return res.json(await User.find({}).lean());

            case 'adminGetWithdrawals':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                return res.json(await Withdrawal.find({}).sort({ date: -1 }).lean());

            case 'updateWithdrawal': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                const { id, status } = data;
                await Withdrawal.updateOne({ id }, { status });
                return res.json({ success: true });
            }

            case 'saveUser': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                const { user } = data;
                await User.updateOne({ id: user.id }, user);
                return res.json({ success: true });
            }

            case 'addShort': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                const { url } = data;
                let ytId = '';
                if (url.includes('v=')) ytId = url.split('v=')[1].split('&')[0];
                else if (url.includes('youtu.be/')) ytId = url.split('youtu.be/')[1].split('?')[0];
                else if (url.includes('shorts/')) ytId = url.split('shorts/')[1].split('?')[0];
                
                const newVideo = { id: 'v_' + Date.now(), youtubeId: ytId, url, addedAt: new Date().toISOString() };
                await ShortVideo.create(newVideo);
                return res.json(newVideo);
            }

            case 'deleteShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Unauthorized" });
                await ShortVideo.deleteOne({ id: data.id });
                return res.json({ success: true });

            // --- USER ACTIONS ---
            case 'getShorts': return res.json(await ShortVideo.find({}).sort({ addedAt: -1 }).lean());

            case 'recordShortView': {
                const { videoId } = data;
                const shortsSettingsDoc = await Setting.findById('shorts').lean();
                const points = shortsSettingsDoc?.data?.pointsPerVideo || 5;
                
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: points } });
                await Transaction.create({
                    id: 'tx_s_' + Date.now(),
                    userId: currentUser.id, amount: points, type: 'SHORTS',
                    description: `Watched Shorts Video`, date: new Date().toISOString()
                });
                return res.json({ success: true });
            }

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                if (currentUser.lastDailyCheckIn === today) return res.status(400).json({ message: "Already claimed today." });
                
                const sysSettings = await Setting.findById('system').lean();
                const baseReward = sysSettings?.data?.dailyRewardBase || 10;
                
                currentUser.balance += baseReward;
                currentUser.lastDailyCheckIn = today;
                currentUser.dailyStreak = (currentUser.dailyStreak || 0) + 1;
                await currentUser.save();
                
                await Transaction.create({
                    id: 'tx_d_' + Date.now(),
                    userId: currentUser.id, amount: baseReward, type: 'BONUS',
                    description: 'Daily Check-in Reward', date: new Date().toISOString()
                });
                return res.json({ success: true });
            }

            case 'playGame': {
                const { gameType } = data;
                const today = new Date().toISOString().split('T')[0];
                const gameSettings = await Setting.findById('games').lean();
                const config = gameSettings?.data?.[gameType] || { minReward: 1, maxReward: 10, dailyLimit: 10, isEnabled: true };
                
                if (!config.isEnabled) return res.status(400).json({ message: "Game is disabled." });

                let stats = currentUser.gameStats || { lastPlayedDate: today, spinCount: 0, scratchCount: 0, guessCount: 0, lotteryCount: 0 };
                if (stats.lastPlayedDate !== today) {
                    stats = { lastPlayedDate: today, spinCount: 0, scratchCount: 0, guessCount: 0, lotteryCount: 0 };
                }

                const countKey = `${gameType}Count`;
                const currentCount = stats[countKey] || 0;

                if (currentCount >= config.dailyLimit) {
                    return res.status(400).json({ message: `Daily play limit (${config.dailyLimit}) reached for ${gameType}.` });
                }

                const reward = Math.floor(Math.random() * (config.maxReward - config.minReward + 1)) + config.minReward;
                
                stats[countKey] = currentCount + 1;
                
                await User.updateOne({ id: currentUser.id }, { 
                    $inc: { balance: reward },
                    $set: { gameStats: stats }
                });

                await Transaction.create({
                    id: 'tx_g_' + Date.now() + '_' + currentUser.id,
                    userId: currentUser.id, amount: reward, type: 'GAME',
                    description: `Won ${reward} in ${gameType}`, date: new Date().toISOString()
                });
                
                return res.json({ success: true, reward, remaining: config.dailyLimit - stats[countKey] });
            }

            case 'createWithdrawal': {
                const { request } = data;
                if (currentUser.balance < request.amount) return res.status(400).json({ message: "Insufficient balance." });
                
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -request.amount } });
                await Withdrawal.create({ ...request, userId: currentUser.id, userName: currentUser.name, status: 'PENDING', date: new Date().toISOString() });
                return res.json({ success: true });
            }

            case 'getWithdrawals':
                return res.json(await Withdrawal.find({ userId: currentUser.id }).sort({ date: -1 }).lean());

            case 'processReferral': {
                const { code } = data;
                if (currentUser.referredBy) return res.status(400).json({ message: "Already referred." });
                if (currentUser.id === code) return res.status(400).json({ message: "Self-referral restricted." });
                
                const referrer = await User.findOne({ id: code });
                if (!referrer) return res.status(404).json({ message: "Invalid Referral ID." });

                currentUser.referredBy = code;
                currentUser.balance += 10;
                referrer.balance += 25;
                referrer.referralCount = (referrer.referralCount || 0) + 1;
                referrer.referralEarnings = (referrer.referralEarnings || 0) + 25;
                
                await Promise.all([currentUser.save(), referrer.save()]);
                return res.json({ success: true, message: "Referral code applied!" });
            }

            case 'saveTask': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Task.findOneAndUpdate({ id: data.payload.id }, data.payload, { upsert: true });
                return res.json({ success: true });
            }

            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'completeTask': {
                const { taskId } = data;
                const task = await Task.findOne({ id: taskId }).lean();
                if (!task) return res.status(404).json({ message: "Task unavailable." });
                if (task.type === 'SHORTLINK') return res.status(400).json({ message: "Requires postback." });

                // Check 24h cooldown for website/youtube
                if (task.type === 'WEBSITE' || task.type === 'YOUTUBE') {
                    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const existing = await Transaction.findOne({
                        userId: currentUser.id,
                        taskId: task.id,
                        type: 'EARNING',
                        date: { $gte: yesterday }
                    });
                    if (existing) return res.status(400).json({ message: "Task is on cooldown. Try again in 24 hours." });
                }

                await User.updateOne({ id: currentUser.id }, { $inc: { balance: task.reward } });
                await Transaction.create({
                    id: 'tx_m_' + Date.now(), userId: currentUser.id, taskId: task.id,
                    amount: task.reward, type: 'EARNING',
                    description: `Task Completed: ${task.title}`, date: new Date().toISOString()
                });
                return res.json({ success: true, reward: task.reward });
            }

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Setting.findOneAndUpdate({ _id: data.key }, { data: data.payload }, { upsert: true });
                return res.json({ success: true });

            default: return res.status(400).json({ message: "Unknown action: " + action });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
