
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
    status: { type: String, default: 'PENDING' },
    date: String
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);
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
        
        // --- PUBLIC POSTBACK ENDPOINT (GET/POST) ---
        // Expected URL: /api?action=postback&uid=USER_ID&tid=TASK_ID
        if (req.query.action === 'postback') {
            const uid = req.query.uid || req.body.uid;
            const tid = req.query.tid || req.body.tid;

            if (!uid || !tid) return res.status(400).json({ message: "Invalid postback parameters." });

            const [user, task] = await Promise.all([
                User.findOne({ id: uid }),
                Task.findOne({ id: tid })
            ]);

            if (!user || !task) return res.status(404).json({ message: "Verification target not found." });

            // Check if already completed
            const existingTx = await Transaction.findOne({ userId: uid, taskId: tid });
            if (existingTx) return res.json({ success: true, message: "Already credited." });

            // Credit User
            user.balance += task.reward;
            await user.save();

            // Record Completion
            await Transaction.create({
                id: 'tx_p_' + Date.now() + '_' + uid,
                userId: uid,
                taskId: tid,
                amount: task.reward,
                type: 'EARNING',
                description: `Verified Shortlink: ${task.title}`,
                date: new Date().toISOString()
            });

            // Update Task count
            await Task.updateOne({ id: tid }, { $inc: { completedCount: 1 } });

            console.log(`[Postback] Credited ${uid} for task ${tid}`);
            return res.json({ success: true, message: "Points awarded." });
        }

        const { action, ...data } = req.body || {};
        const currentUser = await authenticateUser(req);

        // Standard Login/Register (No auth required)
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
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }).lean());
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(20).lean());
            
            case 'getProtectedFile': {
                const { taskId } = data;
                const task = await Task.findOne({ id: taskId }).lean();
                if (!task || !task.fileUrl) return res.status(404).json({ message: "File not found." });

                // VERIFY COMPLETION
                const completed = await Transaction.findOne({ userId: currentUser.id, taskId: task.id });
                if (!completed) return res.status(403).json({ message: "Complete the task first to unlock this file." });

                // Return file details
                return res.json({ success: true, url: task.fileUrl, title: task.fileTitle });
            }

            case 'getSettings': {
                const doc = await Setting.findById(data.key).lean();
                return res.json(doc?.data || {});
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
                
                // Block manual completion for Shortlink tasks
                if (task.type === 'SHORTLINK') return res.status(400).json({ message: "Shortlink tasks require automatic verification." });

                await User.updateOne({ id: currentUser.id }, { $inc: { balance: task.reward } });
                await Transaction.create({
                    id: 'tx_m_' + Date.now(),
                    userId: currentUser.id,
                    taskId: task.id,
                    amount: task.reward,
                    type: 'EARNING',
                    description: `Task Completed: ${task.title}`,
                    date: new Date().toISOString()
                });
                return res.json({ success: true, reward: task.reward });
            }

            case 'saveSettings':
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Forbidden" });
                await Setting.findOneAndUpdate({ _id: data.key }, { data: data.payload }, { upsert: true });
                return res.json({ success: true });

            default: return res.status(400).json({ message: "Unknown action" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
