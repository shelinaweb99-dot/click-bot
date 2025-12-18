
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

    // Fail fast (3 seconds) if DB is not reachable
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 15000
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
}, { minimize: false, strict: false }); // STRICT: FALSE prevents schema validation hangs on old data

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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    return await User.findOne({ sessionToken: token });
}

// --- 4. API HANDLER ---

export default async function handler(req, res) {
    // CORS FIX: Handle dynamic origin for credentials
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        
        const { action, ...data } = req.body || {};
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // --- A. PUBLIC ACTIONS (Login/Register) ---
        if (action === 'login' || action === 'register') {
            const { email, password, ...userData } = data;
            
            // Explicitly select password field for verification
            let user = await User.findOne({ email }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');

            if (!user) {
                // REGISTER
                if (!password || password.length < 6) {
                    return res.status(400).json({ success: false, message: "Password too short" });
                }
                const hashedPassword = await bcrypt.hash(password, 10);
                
                const newId = 'user_' + Date.now();
                user = await User.create({
                    id: newId,
                    email,
                    password: hashedPassword,
                    ...userData,
                    sessionToken: newToken,
                    joinedAt: new Date().toISOString(),
                    role: email === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    ipAddress
                });
            } else {
                // LOGIN
                if (!password) return res.status(400).json({ success: false, message: "Password required" });
                
                let passwordValid = false;
                let needRehash = false;

                try {
                    // 1. Check Legacy (Missing or Plain Text)
                    if (!user.password) {
                        // Account exists but has no password field - Allow login to fix it
                        passwordValid = true; 
                        needRehash = true;
                    } 
                    else if (!user.password.startsWith('$2')) {
                        // Plain text check
                        if (user.password === password) {
                            passwordValid = true;
                            needRehash = true;
                        }
                    } 
                    // 2. Standard Bcrypt
                    else {
                        passwordValid = await bcrypt.compare(password, user.password);
                    }
                } catch (err) {
                    console.error("Password verify error:", err);
                    return res.status(500).json({ success: false, message: "Login verification failed" });
                }

                if (!passwordValid) {
                    return res.status(401).json({ success: false, message: "Invalid credentials" });
                }

                // Apply Updates
                if (needRehash) {
                    user.password = await bcrypt.hash(password, 10);
                }
                user.sessionToken = newToken;
                user.ipAddress = ipAddress;
                await user.save();
            }

            if (user.blocked) return res.status(403).json({ success: false, message: 'Account Blocked' });

            const userObj = user.toObject();
            delete userObj.password;
            delete userObj.sessionToken; 
            
            return res.status(200).json({ ...userObj, token: newToken });
        }

        // --- B. SECURE ACTIONS ---
        const currentUser = await authenticateUser(req);
        
        if (!currentUser) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        
        const userId = currentUser.id;

        switch (action) {
            case 'getUser':
                return res.json(currentUser);

            case 'completeTask': {
                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    const task = await Task.findOne({ id: data.taskId }).session(session);
                    if (!task) throw new Error("Task not found");

                    const existingTx = await Transaction.findOne({
                        userId, 
                        taskId: data.taskId, 
                        type: 'EARNING',
                        date: { $gte: new Date(Date.now() - 86400000).toISOString() }
                    }).session(session);

                    if (existingTx) throw new Error("Already completed today");

                    await User.findOneAndUpdate({ id: userId }, { $inc: { balance: task.reward } }, { session });
                    await Task.findOneAndUpdate({ id: task.id }, { $inc: { completedCount: 1 } }, { session });

                    await Transaction.create([{
                        id: 'tx_' + Date.now(),
                        userId,
                        amount: task.reward,
                        type: 'EARNING',
                        description: `Completed: ${task.title}`,
                        date: new Date().toISOString(),
                        taskId: task.id
                    }], { session });

                    await session.commitTransaction();
                    return res.json({ success: true });
                } catch (e) {
                    await session.abortTransaction();
                    throw e;
                } finally {
                    session.endSession();
                }
            }

            case 'dailyCheckIn': {
                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    const user = await User.findOne({ id: userId }).session(session);
                    const today = new Date().toISOString().split('T')[0];
                    const last = user.lastDailyCheckIn ? user.lastDailyCheckIn.split('T')[0] : null;

                    if (last === today) throw new Error("Already checked in");

                    let sys = await Setting.findById('system').session(session);
                    if (!sys) sys = { data: { dailyRewardBase: 10, dailyRewardStreakBonus: 2 } };
                    
                    const base = sys.data.dailyRewardBase || 10;
                    const bonus = sys.data.dailyRewardStreakBonus || 2;
                    
                    let streak = user.dailyStreak || 0;
                    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                    if (last === yesterday) streak++; else streak = 1;

                    const amount = base + (Math.min(streak, 7) * bonus);

                    user.balance += amount;
                    user.lastDailyCheckIn = new Date().toISOString();
                    user.dailyStreak = streak;
                    await user.save({ session });

                    await Transaction.create([{
                        id: 'tx_' + Date.now(),
                        userId,
                        amount,
                        type: 'BONUS',
                        description: `Daily Check-in (Day ${streak})`,
                        date: new Date().toISOString()
                    }], { session });

                    await session.commitTransaction();
                    return res.json({ success: true, reward: amount });
                } catch (e) {
                    await session.abortTransaction();
                    throw e;
                } finally {
                    session.endSession();
                }
            }
            
            case 'getTasks':
                return res.json(await Task.find({}));

            case 'getTransactions':
                return res.json(await Transaction.find({ userId }).sort({ date: -1 }).limit(50));

            case 'createWithdrawal': {
                if (currentUser.balance < data.request.amount) throw new Error("Insufficient Funds");
                await Withdrawal.create(data.request);
                await User.findOneAndUpdate({ id: userId }, { $inc: { balance: -data.request.amount } });
                return res.json({ success: true });
            }

            // --- ADMIN ONLY ---
            case 'getAllUsers': 
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin only" });
                return res.json(await User.find({}).limit(100));

            case 'getAllWithdrawals': 
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin only" });
                return res.json(await Withdrawal.find({}).sort({date: -1}).limit(100));
            
            case 'getSettings': 
                const s = await Setting.findById(data.key);
                return res.json(s ? s.data : {});

            case 'saveSettings': {
                if (currentUser.role !== 'ADMIN') return res.status(403).json({ message: "Admin only" });
                await Setting.findOneAndUpdate(
                    { _id: data.key },
                    { _id: data.key, data: data.payload },
                    { upsert: true, new: true }
                );
                return res.json({ success: true });
            }

            default:
                return res.status(400).json({ message: "Unknown Action" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: e.message || 'Server Error' });
    }
}
