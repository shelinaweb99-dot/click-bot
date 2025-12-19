
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
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        cachedDb = mongoose.connection;
        return cachedDb;
    } catch (e) {
        throw new Error("Database connectivity lost.");
    }
}

// --- 2. SECURITY UTILS ---

/**
 * Validates data sent from Telegram WebApp
 */
function verifyTelegramWebAppData(initData) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !initData) return false;

    try {
        const encoded = decodeURIComponent(initData);
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const arr = encoded.split('&');
        const hashIndex = arr.findIndex(str => str.startsWith('hash='));
        const hash = arr.splice(hashIndex, 1)[0].split('=')[1];
        arr.sort();
        const dataCheckString = arr.join('\n');
        const _hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        return _hash === hash;
    } catch (e) {
        return false;
    }
}

// --- 3. MODELS ---
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    sessionToken: { type: String, select: false },
    role: { type: String, default: 'USER' },
    balance: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    lastActionAt: { type: Number, default: 0 }, // For Rate Limiting
    ipAddress: String
}, { minimize: false, strict: false });

const RateLimitSchema = new mongoose.Schema({
    _id: String, // userId
    lastRequest: Number
});

const SettingSchema = new mongoose.Schema({ _id: String, data: Object }, { strict: false });
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);
const Task = mongoose.models.Task || mongoose.model('Task', new mongoose.Schema({}, {strict: false}));
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({}, {strict: false}));
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', new mongoose.Schema({}, {strict: false}));

// --- 4. AUTHENTICATION ---
async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return await User.findOne({ sessionToken: token }).select('+sessionToken');
}

// --- 5. GLOBAL HANDLER ---
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Telegram-Init-Data');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        const { action, ...data } = req.body || {};
        const telegramInitData = req.headers['x-telegram-init-data'];

        // --- PUBLIC: LOGIN / REGISTER ---
        if (action === 'login' || action === 'register') {
            const { email, password } = data;
            if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

            let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');

            if (!user) {
                if (action === 'login') return res.status(404).json({ message: "User not found" });
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await User.create({
                    id: 'u_' + Date.now(),
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    sessionToken: newToken,
                    joinedAt: new Date().toISOString()
                });
            } else {
                if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials" });
                user.sessionToken = newToken;
                await user.save();
            }
            return res.json({ ...user.toObject(), token: newToken });
        }

        // --- SECURE: AUTHENTICATED ACTIONS ---
        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ message: "Session expired" });
        if (currentUser.blocked) return res.status(403).json({ message: "Account restricted" });

        // --- ANTI-BOT HONEYPOT CHECK ---
        if (action === 'triggerHoneypot') {
            currentUser.blocked = true;
            await currentUser.save();
            return res.status(403).json({ message: "Bot detected. Account blocked." });
        }

        // --- RATE LIMITING (2 seconds between rewarding actions) ---
        const sensitiveActions = ['completeTask', 'playMiniGame', 'dailyCheckIn'];
        if (sensitiveActions.includes(action)) {
            const now = Date.now();
            const limit = await RateLimit.findById(currentUser.id);
            if (limit && (now - limit.lastRequest < 2000)) {
                return res.status(429).json({ message: "Too many requests. Wait 2 seconds." });
            }
            await RateLimit.findByIdAndUpdate(currentUser.id, { lastRequest: now }, { upsert: true });
        }

        switch (action) {
            case 'getUser': return res.json(currentUser);
            
            case 'completeTask': {
                // Verify identity if running inside Telegram
                if (telegramInitData && !verifyTelegramWebAppData(telegramInitData)) {
                    return res.status(403).json({ message: "Identity verification failed" });
                }
                const task = await Task.findOne({ id: data.taskId });
                if (!task) return res.status(404).json({ message: "Task missing" });
                
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: task.reward } });
                await Transaction.create({ id: 'tx_'+Date.now(), userId: currentUser.id, amount: task.reward, type: 'EARNING', description: task.title, date: new Date().toISOString() });
                return res.json({ success: true });
            }

            case 'createWithdrawal': {
                const amount = Number(data.request.amount);
                const sys = await Setting.findById('system');
                const min = sys?.data?.minWithdrawal || 50;

                if (isNaN(amount) || amount < min) return res.status(400).json({ message: `Minimum ${min} USDT` });
                if (currentUser.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

                await Withdrawal.create(data.request);
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -amount } });
                return res.json({ success: true });
            }

            // Admin Routes
            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                return res.json(await User.find({}).limit(100));

            case 'getSettings':
                const setting = await Setting.findById(data.key);
                return res.json(setting?.data || {});

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Setting.findOneAndUpdate({ _id: data.key }, { data: data.payload }, { upsert: true });
                return res.json({ success: true });

            default: 
                // Generic fallback for other actions
                return res.status(400).json({ message: "Action unknown" });
        }
    } catch (e) {
        return res.status(500).json({ message: "Security protocol error" });
    }
}
