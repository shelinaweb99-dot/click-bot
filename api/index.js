
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
            serverSelectionTimeoutMS: 15000, // Faster timeout
            socketTimeoutMS: 30000, 
            connectTimeoutMS: 15000,
            maxPoolSize: 10, // Maintain a pool of connections
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
        // Use lean() for performance
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
                return res.json(await User.findOne({ id: currentUser.id }).lean());
                
            case 'getTasks': 
                return res.json(await Task.find({ status: 'ACTIVE' }).lean());

            case 'getTransactions': 
                return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(15).lean());

            case 'getAnnouncements': 
                return res.json(await Announcement.find({}).sort({ date: -1 }).limit(10).lean());

            case 'getShorts': 
                return res.json(await Short.find({}).limit(50).lean());
            
            case 'getSettings': {
                const doc = await Setting.findById(data.key).lean();
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
                const task = await Task.findOne({ id: data.taskId }).lean();
                if (!task) return res.status(404).json({ message: "Task no longer exists." });
                
                const existing = await Transaction.findOne({ userId: currentUser.id, taskId: data.taskId }).lean();
                if (existing) return res.status(400).json({ message: "Task already completed." });

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
                const user = await User.findOne({ id: currentUser.id }).select('balance');
                if (!user || user.balance < amount) return res.status(400).json({ message: "Insufficient balance." });
                
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

            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access required." });
                return res.json(await User.find({}).limit(100).lean());

            case 'getAllWithdrawals':
                if (currentUser.role === 'ADMIN') {
                    return res.json(await Withdrawal.find({}).sort({ date: -1 }).limit(50).lean());
                } else {
                    return res.json(await Withdrawal.find({ userId: currentUser.id }).sort({ date: -1 }).lean());
                }

            case 'dailyCheckIn': {
                const today = new Date().toISOString().split('T')[0];
                const user = await User.findOne({ id: currentUser.id }).select('lastDailyCheckIn');
                if (user?.lastDailyCheckIn === today) return res.status(400).json({ message: "Already claimed today." });
                
                const sysSettingsDoc = await Setting.findById('system').lean();
                const reward = Number(sysSettingsDoc?.data?.dailyRewardBase) || 10;

                await User.updateOne({ id: currentUser.id }, { 
                    $set: { lastDailyCheckIn: today },
                    $inc: { balance: reward, dailyStreak: 1 }
                });
                await Transaction.create({ id: 'tx_d_' + Date.now(), userId: currentUser.id, amount: reward, type: 'BONUS', description: 'Daily Check-in', date: new Date().toISOString() });
                return res.json({ success: true, reward });
            }

            default: return res.status(400).json({ message: "Unknown action." });
        }
    } catch (e) {
        console.error("Critical API Error:", e);
        return res.status(500).json({ success: false, message: "System core failed." });
    }
}
