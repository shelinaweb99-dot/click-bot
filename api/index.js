
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
            socketTimeoutMS: 45000,
            connectTimeoutMS: 20000,
        };
        await mongoose.connect(uri, opts);
        cachedDb = mongoose.connection;
        console.log("DB Connected");
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
    ipAddress: String
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

const SettingSchema = new mongoose.Schema({
    _id: String,
    data: Object
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', new mongoose.Schema({ id: String }, { strict: false }));
const Short = mongoose.models.Short || mongoose.model('Short', new mongoose.Schema({ id: String }, { strict: false }));
const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', new mongoose.Schema({ id: String }, { strict: false }));

// --- 3. AUTHENTICATION ---
async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return await User.findOne({ sessionToken: token }).select('+sessionToken');
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
            case 'getUser': return res.json(currentUser);
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }));
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(50));
            case 'getAnnouncements': return res.json(await Announcement.find({}).sort({ date: -1 }));
            case 'getShorts': return res.json(await Short.find({}));
            
            case 'getSettings': {
                const doc = await Setting.findById(data.key);
                return res.json(doc?.data || {});
            }

            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId });
                if (!task) return res.status(404).json({ message: "Task was removed by admin." });
                
                const existing = await Transaction.findOne({ userId: currentUser.id, taskId: data.taskId });
                if (existing) return res.status(400).json({ message: "Task already completed today." });

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
                if (currentUser.balance < amount) return res.status(400).json({ message: "Insufficient balance for this withdrawal." });
                await Withdrawal.create(data.request);
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -amount } });
                await Transaction.create({ id: 'tx_w_' + Date.now(), userId: currentUser.id, amount, type: 'WITHDRAWAL', description: 'Redemption Request', date: new Date().toISOString() });
                return res.json({ success: true });
            }

            case 'saveTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access denied." });
                await Task.findOneAndUpdate({ id: data.payload.id }, { $set: data.payload }, { upsert: true, new: true });
                return res.json({ success: true });

            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access denied." });
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access denied." });
                await Setting.findOneAndUpdate({ _id: data.key }, { $set: { data: data.payload } }, { upsert: true, new: true });
                return res.json({ success: true });

            case 'getAllUsers':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access denied." });
                return res.json(await User.find({}).limit(100));

            case 'getAllWithdrawals':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access denied." });
                return res.json(await Withdrawal.find({}).sort({ date: -1 }));

            case 'updateWithdrawal':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access denied." });
                await Withdrawal.updateOne({ id: data.id }, { $set: { status: data.status } });
                return res.json({ success: true });

            case 'saveUser':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin access denied." });
                await User.findOneAndUpdate({ id: data.user.id }, { $set: data.user }, { new: true });
                return res.json({ success: true });

            default: return res.status(400).json({ message: "Invalid action requested." });
        }
    } catch (e) {
        console.error("API Error:", e);
        return res.status(500).json({ success: false, message: e.message || "An internal error occurred." });
    }
}
