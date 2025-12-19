
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
        await mongoose.connect(uri, { 
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000 
        });
        cachedDb = mongoose.connection;
        return cachedDb;
    } catch (e) {
        console.error("DB Connection Error:", e);
        throw new Error("Database connectivity lost.");
    }
}

// --- 2. MODELS ---
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    sessionToken: { type: String, select: false },
    role: { type: String, default: 'USER' },
    balance: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    referredBy: String,
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    lastDailyCheckIn: String,
    dailyStreak: { type: Number, default: 0 },
    gameStats: { type: Object, default: {} },
    ipAddress: String
}, { minimize: false, strict: false });

const Task = mongoose.models.Task || mongoose.model('Task', new mongoose.Schema({ id: String }, { strict: false }));
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({ id: String }, { strict: false }));
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', new mongoose.Schema({ id: String }, { strict: false }));
const Setting = mongoose.models.Setting || mongoose.model('Setting', new mongoose.Schema({ _id: String, data: Object }, { strict: false }));
const Short = mongoose.models.Short || mongoose.model('Short', new mongoose.Schema({ id: String }, { strict: false }));
const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', new mongoose.Schema({ id: String }, { strict: false }));
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- 3. AUTHENTICATION ---
async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return await User.findOne({ sessionToken: token }).select('+sessionToken');
}

// --- 4. GLOBAL HANDLER ---
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        const { action, ...data } = req.body || {};

        // --- PUBLIC: LOGIN / REGISTER ---
        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
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
                    joinedAt: new Date().toISOString(),
                    role: email.toLowerCase() === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    ...userData
                });
            } else {
                if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid credentials" });
                user.sessionToken = newToken;
                await user.save();
            }
            const userObj = user.toObject();
            delete userObj.password;
            return res.json({ ...userObj, token: newToken });
        }

        // --- SECURE: AUTHENTICATED ACTIONS ---
        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ message: "Session expired" });
        if (currentUser.blocked) return res.status(403).json({ message: "Account restricted" });

        switch (action) {
            case 'getUser': return res.json(currentUser);
            case 'getTasks': return res.json(await Task.find({}));
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(50));
            case 'getAnnouncements': return res.json(await Announcement.find({}).sort({ date: -1 }));
            case 'getShorts': return res.json(await Short.find({}));
            case 'getSettings': return res.json((await Setting.findById(data.key))?.data || {});

            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId });
                if (!task) return res.status(404).json({ message: "Task missing" });
                const existing = await Transaction.findOne({ userId: currentUser.id, taskId: data.taskId });
                if (existing) return res.status(400).json({ message: "Task already completed" });

                await User.updateOne({ id: currentUser.id }, { $inc: { balance: task.reward } });
                await Transaction.create({ id: 'tx_' + Date.now(), userId: currentUser.id, amount: task.reward, type: 'EARNING', description: `Task: ${task.title}`, date: new Date().toISOString(), taskId: task.id });
                return res.json({ success: true });
            }

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                if (currentUser.lastDailyCheckIn && currentUser.lastDailyCheckIn.split('T')[0] === today) return res.status(400).json({ message: "Already claimed today" });
                const reward = 10 + (Math.min(currentUser.dailyStreak || 0, 7) * 2);
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward }, $set: { lastDailyCheckIn: new Date().toISOString(), dailyStreak: (currentUser.dailyStreak || 0) + 1 } });
                await Transaction.create({ id: 'tx_d_' + Date.now(), userId: currentUser.id, amount: reward, type: 'BONUS', description: 'Daily Reward', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            case 'playMiniGame': {
                const reward = Math.floor(Math.random() * 10) + 1;
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: reward } });
                await Transaction.create({ id: 'tx_g_' + Date.now(), userId: currentUser.id, amount: reward, type: 'GAME', description: `Game Win: ${data.gameType}`, date: new Date().toISOString() });
                return res.json({ success: true, reward, left: 5 });
            }

            case 'createWithdrawal': {
                const amount = Number(data.request.amount);
                if (currentUser.balance < amount) return res.status(400).json({ message: "Insufficient balance" });
                await Withdrawal.create(data.request);
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -amount } });
                await Transaction.create({ id: 'tx_w_' + Date.now(), userId: currentUser.id, amount, type: 'WITHDRAWAL', description: 'Withdrawal Request', date: new Date().toISOString() });
                return res.json({ success: true });
            }

            // --- ADMIN ACTIONS (CRITICAL FIX) ---
            case 'saveTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Task.findOneAndUpdate({ id: data.payload.id }, data.payload, { upsert: true });
                return res.json({ success: true });

            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Setting.findOneAndUpdate({ _id: data.key }, { _id: data.key, data: data.payload }, { upsert: true });
                return res.json({ success: true });

            case 'addShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                const vId = data.url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                await Short.create({ id: 's_' + Date.now(), youtubeId: vId, url: data.url, addedAt: new Date().toISOString() });
                return res.json({ success: true });

            case 'deleteShort':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Short.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'addAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Announcement.create(data.payload);
                return res.json({ success: true });

            case 'deleteAnnouncement':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Announcement.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                return res.json(await User.find({}).limit(100));

            case 'getAllWithdrawals':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                return res.json(await Withdrawal.find({}).sort({ date: -1 }));

            case 'updateWithdrawal':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Withdrawal.updateOne({ id: data.id }, { status: data.status });
                return res.json({ success: true });

            case 'saveUser':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await User.findOneAndUpdate({ id: data.user.id }, data.user);
                return res.json({ success: true });

            case 'processReferral': {
                const referrer = await User.findOne({ id: data.code });
                if (!referrer || referrer.id === currentUser.id) return res.status(400).json({ message: "Invalid code" });
                if (currentUser.referredBy) return res.status(400).json({ message: "Already referred" });
                await User.updateOne({ id: currentUser.id }, { referredBy: referrer.id, $inc: { balance: 10 } });
                await User.updateOne({ id: referrer.id }, { $inc: { balance: 25, referralCount: 1, referralEarnings: 25 } });
                return res.json({ success: true, message: "Bonus claimed!" });
            }

            case 'triggerHoneypot':
                currentUser.blocked = true;
                await currentUser.save();
                return res.status(403).json({ message: "Blocked" });

            default: return res.status(400).json({ message: "Unknown action" });
        }
    } catch (e) {
        console.error("API Panic:", e);
        return res.status(500).json({ success: false, message: e.message });
    }
}
