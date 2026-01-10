
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
            maxPoolSize: 5, // Reduced for faster handshake in serverless
            connectTimeoutMS: 10000,
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
    deviceId: String,
    name: String,
    country: String,
    joinedAt: String,
    referredBy: String,
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    telegramId: Number,
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
    channelUsername: String,
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
    date: { type: String, index: true } // Added index for performance
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

function getTelegramIdFromHeader(initData) {
    if (!initData) return null;
    try {
        const searchParams = new URLSearchParams(initData);
        const userJson = searchParams.get('user');
        if (!userJson) return null;
        const user = JSON.parse(userJson);
        return user.id;
    } catch (e) { return null; }
}

async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        const user = await User.findOne({ sessionToken: token, tokenExpires: { $gt: new Date() } });
        if (user) {
            const tgInitData = req.headers['x-telegram-init-data'];
            if (tgInitData) {
                const currentTgId = getTelegramIdFromHeader(tgInitData);
                if (currentTgId && !user.telegramId) {
                    user.telegramId = currentTgId;
                    await user.save();
                }
            }
        }
        return user;
    } catch (e) { return null; }
}

async function checkTelegramMembership(token, channel, telegramUserId) {
    if (!token || !channel || !telegramUserId) return { ok: false, error: 'Missing parameters' };
    try {
        const chatId = (channel.startsWith('@') || channel.startsWith('-')) ? channel : `@${channel}`;
        const response = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${telegramUserId}`);
        const data = await response.json();
        if (!data.ok) return { ok: false, error: data.description };
        const status = data.result.status;
        const isMember = ['member', 'administrator', 'creator'].includes(status);
        return { ok: isMember, status };
    } catch (e) { return { ok: false, error: 'API Fetch failed' }; }
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
            const uid = req.query.uid || req.body.uid || req.query.user_id || req.body.user_id || req.query.subid || req.body.subid;
            const tid = req.query.tid || req.body.tid || req.query.task_id || req.body.task_id;

            if (!uid || !tid) return res.status(400).send("0"); 

            const [user, task] = await Promise.all([User.findOne({ id: uid }), Task.findOne({ id: tid })]);
            if (!user || !task) return res.status(404).send("0");
            
            if (task.completedCount >= (task.totalLimit || Infinity)) return res.status(400).send("0");

            const existingTx = await Transaction.findOne({ userId: uid, taskId: tid });
            if (existingTx) return res.status(200).send("1");

            user.balance += task.reward;
            await user.save();
            await Transaction.create({
                id: 'tx_pb_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                userId: uid, taskId: tid, amount: task.reward,
                type: 'EARNING', description: `Verified Shortlink: ${task.title}`,
                date: new Date().toISOString()
            });
            await Task.updateOne({ id: tid }, { $inc: { completedCount: 1 } });
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
                    ...userData
                });
            } else {
                if (action === 'register') return res.status(400).json({ message: "Email already exists." });
                if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials." });
                user.sessionToken = newToken; 
                user.tokenExpires = expires;
                if (userData.telegramId) user.telegramId = userData.telegramId;
                if (userData.deviceId) user.deviceId = userData.deviceId;
                if (userData.ipAddress) user.ipAddress = userData.ipAddress;
                await user.save();
            }
            
            return res.json({ 
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                token: newToken 
            });
        }

        if (!currentUser) return res.status(401).json({ message: "Session expired." });

        switch (action) {
            case 'getUser': return res.json(currentUser);
            case 'getTasks': {
                const tasks = await Task.find({ status: 'ACTIVE' }).lean();
                if (currentUser.role === 'ADMIN') return res.json(tasks);

                const now = Date.now();
                const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
                
                // PERFORMANCE FIX: Only fetch tasks completed within cooldown window + all time for one-time missions
                // We split into two optimized queries
                const [recentEarningTx, permanentEarningTx] = await Promise.all([
                    Transaction.find({ 
                        userId: currentUser.id, 
                        type: 'EARNING',
                        date: { $gte: oneDayAgo }
                    }).select('taskId').lean(),
                    Transaction.find({ 
                        userId: currentUser.id, 
                        type: 'EARNING',
                        taskId: { $in: tasks.filter(t => t.type === 'SHORTLINK' || t.type === 'TELEGRAM_CHANNEL').map(t => t.id) }
                    }).select('taskId').lean()
                ]);

                const completedRecently = new Set(recentEarningTx.map(tx => tx.taskId));
                const completedAllTime = new Set(permanentEarningTx.map(tx => tx.taskId));

                const visibleTasks = tasks.filter(t => {
                    if (t.completedCount >= (t.totalLimit || 1000000)) return false;
                    if ((t.type === 'SHORTLINK' || t.type === 'TELEGRAM_CHANNEL') && completedAllTime.has(t.id)) return false;
                    if (completedRecently.has(t.id)) return false;
                    return true;
                });
                return res.json(visibleTasks);
            }
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(50).lean());
            case 'getProtectedFile': {
                const { taskId } = data;
                const task = await Task.findOne({ id: taskId }).lean();
                if (!task || !task.fileUrl) return res.status(404).json({ message: "File not found." });
                const completed = await Transaction.findOne({ userId: currentUser.id, taskId: task.id }).lean();
                if (!completed) return res.status(403).json({ message: "Unlock file by completing task." });
                return res.json({ success: true, url: task.fileUrl, title: task.fileTitle });
            }
            case 'getSettings': {
                const doc = await Setting.findById(data.key).lean();
                return res.json(doc?.data || {});
            }
            case 'completeTask': {
                const { taskId, verificationAnswer } = data;
                const task = await Task.findOne({ id: taskId }).lean();
                if (!task) return res.status(404).json({ message: "Task unavailable." });

                if (task.completedCount >= (task.totalLimit || 1000000)) {
                    return res.status(400).json({ message: "Limit reached." });
                }

                if (task.type === 'SHORTLINK') {
                    if (!verificationAnswer) return res.status(400).json({ message: "Verification answer required." });
                    const correctVal = (task.fileTitle || '').trim().toLowerCase();
                    const inputVal = (verificationAnswer || '').trim().toLowerCase();
                    if (correctVal !== inputVal) return res.status(400).json({ message: "Verification failed." });
                }

                if (task.type === 'TELEGRAM_CHANNEL' || task.type === 'TELEGRAM_BOT' || task.type === 'TELEGRAM') {
                    if (!currentUser.telegramId) return res.status(400).json({ message: "Connect Telegram first." });
                    const sysSettings = await Setting.findById('system').lean();
                    const botToken = sysSettings?.data?.telegramBotToken;
                    if (!botToken) return res.status(500).json({ message: "System error." }); 
                    if (task.channelUsername) {
                        const result = await checkTelegramMembership(botToken, task.channelUsername, currentUser.telegramId);
                        if (!result.ok) return res.status(400).json({ message: "Verification failed." });
                    }
                }

                const existing = await Transaction.findOne({ userId: currentUser.id, taskId: task.id, type: 'EARNING' });
                if (existing) {
                    if (task.type === 'SHORTLINK' || task.type === 'TELEGRAM_CHANNEL') return res.status(400).json({ message: "Already done." });
                    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const recent = await Transaction.findOne({ userId: currentUser.id, taskId: task.id, type: 'EARNING', date: { $gte: yesterday } });
                    if (recent) return res.status(400).json({ message: "Cooldown active." });
                }

                await User.updateOne({ id: currentUser.id }, { $inc: { balance: task.reward } });
                await Transaction.create({ id: 'tx_m_' + Date.now(), userId: currentUser.id, taskId: task.id, amount: task.reward, type: 'EARNING', description: `Mission: ${task.title}`, date: new Date().toISOString() });
                await Task.updateOne({ id: task.id }, { $inc: { completedCount: 1 } });
                return res.json({ success: true, reward: task.reward });
            }
            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Setting.findOneAndUpdate({ _id: data.key }, { data: data.payload }, { upsert: true });
                return res.json({ success: true });
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
            case 'getShorts': return res.json(await ShortVideo.find({}).sort({ addedAt: -1 }).limit(30).lean());
            case 'recordShortView': {
                const { videoId } = data;
                const shortsSettingsDoc = await Setting.findById('shorts').lean();
                const points = shortsSettingsDoc?.data?.pointsPerVideo || 5;
                const now = new Date().toISOString();
                
                await User.updateOne(
                    { id: currentUser.id }, 
                    { 
                        $inc: { balance: points },
                        $set: { [`shortsData.lastWatched.${videoId}`]: now },
                        $inc: { "shortsData.watchedTodayCount": 1 }
                    }
                );
                
                await Transaction.create({ 
                    id: 'tx_s_' + Date.now(), 
                    userId: currentUser.id, 
                    amount: points, 
                    type: 'SHORTS', 
                    description: `Shorts View`, 
                    date: now 
                });
                return res.json({ success: true });
            }
            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                if (currentUser.lastDailyCheckIn === today) return res.status(400).json({ message: "Already claimed." });
                const sysSettings = await Setting.findById('system').lean();
                const baseReward = sysSettings?.data?.dailyRewardBase || 10;
                currentUser.balance += baseReward;
                currentUser.lastDailyCheckIn = today;
                currentUser.dailyStreak = (currentUser.dailyStreak || 0) + 1;
                await currentUser.save();
                await Transaction.create({ id: 'tx_d_' + Date.now(), userId: currentUser.id, amount: baseReward, type: 'BONUS', description: 'Daily Bonus', date: new Date().toISOString() });
                return res.json({ success: true });
            }
            case 'playGame': {
                const { gameType } = data;
                const today = new Date().toISOString().split('T')[0];
                const gameSettings = await Setting.findById('games').lean();
                const config = gameSettings?.data?.[gameType] || { minReward: 1, maxReward: 10, dailyLimit: 10, isEnabled: true };
                if (!config.isEnabled) return res.status(400).json({ message: "Disabled." });
                let stats = currentUser.gameStats || { lastPlayedDate: today, spinCount: 0, scratchCount: 0, guessCount: 0, lotteryCount: 0 };
                if (stats.lastPlayedDate !== today) stats = { lastPlayedDate: today, spinCount: 0, scratchCount: 0, guessCount: 0, lotteryCount: 0 };
                const countKey = `${gameType}Count`;
                if ((stats[countKey] || 0) >= config.dailyLimit) return res.status(400).json({ message: `Limit reached.` });
                const reward = Math.floor(Math.random() * (config.maxReward - config.minReward + 1)) + config.minReward;
                stats[countKey] = (stats[countKey] || 0) + 1;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward }, $set: { gameStats: stats } });
                await Transaction.create({ id: 'tx_g_' + Date.now() + '_' + currentUser.id, userId: currentUser.id, amount: reward, type: 'GAME', description: `Game: ${gameType}`, date: new Date().toISOString() });
                return res.json({ success: true, reward, remaining: config.dailyLimit - stats[countKey] });
            }
            case 'createWithdrawal': {
                const { request } = data;
                if (currentUser.balance < request.amount) return res.status(400).json({ message: "Low balance." });
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -request.amount } });
                await Withdrawal.create({ ...request, userId: currentUser.id, userName: currentUser.name, status: 'PENDING', date: new Date().toISOString() });
                return res.json({ success: true });
            }
            case 'getWithdrawals': return res.json(await Withdrawal.find({ userId: currentUser.id }).sort({ date: -1 }).limit(20).lean());
            case 'processReferral': {
                const { code } = data;
                if (currentUser.referredBy) return res.status(400).json({ message: "Already applied." });
                if (currentUser.id === code) return res.status(400).json({ message: "Restriction." });
                
                const referrer = await User.findOne({ id: code });
                if (!referrer) return res.status(404).json({ message: "ID not found." });

                if (currentUser.deviceId && (currentUser.deviceId === referrer.deviceId)) return res.status(400).json({ message: "Fraud alert." });

                const sysSettings = await Setting.findById('system').lean();
                const bonusReferrer = sysSettings?.data?.referralBonusReferrer || 25;
                const bonusReferee = sysSettings?.data?.referralBonusReferee || 10;

                currentUser.referredBy = code;
                currentUser.balance += bonusReferee;
                referrer.balance += bonusReferrer;
                referrer.referralCount = (referrer.referralCount || 0) + 1;
                referrer.referralEarnings = (referrer.referralEarnings || 0) + bonusReferrer;
                
                await Promise.all([
                    currentUser.save(), 
                    referrer.save(),
                    Transaction.create({ id: 'tx_ref_b1_' + Date.now(), userId: currentUser.id, amount: bonusReferee, type: 'REFERRAL', description: `Referral Bonus`, date: new Date().toISOString() }),
                    Transaction.create({ id: 'tx_ref_b2_' + Date.now(), userId: referrer.id, amount: bonusReferrer, type: 'REFERRAL', description: `Invite: ${currentUser.name}`, date: new Date().toISOString() })
                ]);

                return res.json({ success: true, message: "Applied!" });
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
            default: return res.status(400).json({ message: "Unknown action." });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal error" });
    }
}
