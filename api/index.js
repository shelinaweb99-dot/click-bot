
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// --- 1. MONGODB CONNECTION CACHING ---
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing in Environment Variables");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000
    });
    cachedDb = mongoose.connection;
    return cachedDb;
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
    adStats: { type: Object, default: {} },
    ipAddress: String,
    lastActionTime: String
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
    status: String,
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
    status: String,
    date: String
});

const SettingSchema = new mongoose.Schema({
    _id: String,
    data: Object
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);

// --- 3. HELPER: AUTHENTICATION MIDDLEWARE ---
async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    return await User.findOne({ sessionToken: token });
}

// --- 4. API HANDLER ---

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    else res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        
        const { action, ...data } = req.body || {};
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // --- A. PUBLIC ACTIONS ---
        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
            let user = await User.findOne({ email }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');

            if (!user) {
                if (!password || password.length < 6) return res.status(400).json({ success: false, message: "Password too short" });
                const hashedPassword = await bcrypt.hash(password, 10);
                user = await User.create({
                    id: 'user_' + Date.now(),
                    email,
                    password: hashedPassword,
                    ...userData,
                    sessionToken: newToken,
                    joinedAt: new Date().toISOString(),
                    role: email === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    ipAddress
                });
            } else {
                if (!password) return res.status(400).json({ success: false, message: "Password required" });
                let passwordValid = false;
                if (!user.password || !user.password.startsWith('$2')) {
                    if (user.password === password || !user.password) {
                        passwordValid = true;
                        user.password = await bcrypt.hash(password, 10);
                    }
                } else {
                    passwordValid = await bcrypt.compare(password, user.password);
                }

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

        // --- B. SECURE ACTIONS ---
        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ success: false, message: "Unauthorized" });
        const userId = currentUser.id;

        switch (action) {
            case 'getUser':
                return res.json(currentUser);

            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId });
                if (!task) return res.status(404).json({ success: false, message: "Task not found" });

                const todayStr = new Date().toISOString().split('T')[0];
                const existingTx = await Transaction.findOne({
                    userId, 
                    taskId: data.taskId, 
                    type: 'EARNING',
                    date: { $regex: `^${todayStr}` }
                });

                if (existingTx) return res.status(400).json({ success: false, message: "Already completed today" });

                // ATOMIC UPDATES (Replaces transactions for standard MongoDB compatibility)
                await User.updateOne({ id: userId }, { $inc: { balance: task.reward } });
                await Task.updateOne({ id: task.id }, { $inc: { completedCount: 1 } });
                await Transaction.create({
                    id: 'tx_' + Date.now(),
                    userId,
                    amount: task.reward,
                    type: 'EARNING',
                    description: `Completed: ${task.title}`,
                    date: new Date().toISOString(),
                    taskId: task.id
                });

                return res.json({ success: true });
            }

            case 'dailyCheckIn': {
                const todayStr = new Date().toISOString().split('T')[0];
                const user = await User.findOne({ id: userId });
                if (user.lastDailyCheckIn && user.lastDailyCheckIn.split('T')[0] === todayStr) {
                    return res.status(400).json({ success: false, message: "Already checked in today" });
                }

                let sys = await Setting.findById('system');
                const base = sys?.data?.dailyRewardBase || 10;
                const bonus = sys?.data?.dailyRewardStreakBonus || 2;
                
                let streak = user.dailyStreak || 0;
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                if (user.lastDailyCheckIn && user.lastDailyCheckIn.split('T')[0] === yesterday) streak++; else streak = 1;

                const amount = base + (Math.min(streak, 7) * bonus);

                await User.updateOne({ id: userId }, { 
                    $inc: { balance: amount },
                    $set: { lastDailyCheckIn: new Date().toISOString(), dailyStreak: streak }
                });

                await Transaction.create({
                    id: 'tx_' + Date.now(),
                    userId,
                    amount,
                    type: 'BONUS',
                    description: `Daily Check-in (Day ${streak})`,
                    date: new Date().toISOString()
                });

                return res.json({ success: true, reward: amount });
            }
            
            case 'getTasks': return res.json(await Task.find({}));
            case 'getTransactions': return res.json(await Transaction.find({ userId }).sort({ date: -1 }).limit(50));

            case 'createWithdrawal': {
                if (currentUser.balance < data.request.amount) return res.status(400).json({ message: "Insufficient Funds" });
                await Withdrawal.create(data.request);
                await User.updateOne({ id: userId }, { $inc: { balance: -data.request.amount } });
                return res.json({ success: true });
            }

            case 'getAllUsers': 
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                return res.json(await User.find({}).limit(100));

            case 'getAllWithdrawals': 
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                return res.json(await Withdrawal.find({}).sort({date: -1}).limit(100));
            
            case 'getSettings': 
                const s = await Setting.findById(data.key);
                return res.json(s ? s.data : {});

            case 'saveSettings': {
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Setting.findOneAndUpdate({ _id: data.key }, { _id: data.key, data: data.payload }, { upsert: true });
                return res.json({ success: true });
            }

            default: return res.status(400).json({ message: "Unknown Action" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: e.message || 'Server Error' });
    }
}
