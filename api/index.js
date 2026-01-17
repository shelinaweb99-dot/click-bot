
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// --- 1. MONGODB CONNECTION CACHING ---
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("System Environment Error: MONGODB_URI is not defined.");

    try {
        mongoose.set('strictQuery', false);
        // Optimized settings for serverless functions
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 10000,
            maxPoolSize: 5
        };
        
        const conn = await mongoose.connect(uri, opts);
        cachedDb = conn.connection;
        return cachedDb;
    } catch (e) {
        console.error("Database connection failed:", e);
        throw new Error("Database Node Unreachable. Please try again in 5 seconds.");
    }
}

// MODELS
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Task = mongoose.models.Task || mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
const Setting = mongoose.models.Setting || mongoose.model('Setting', new mongoose.Schema({}, { strict: false }));
const Withdrawal = mongoose.models.Withdrawal || mongoose.model('Withdrawal', new mongoose.Schema({}, { strict: false }));

async function authenticateUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return await User.findOne({ sessionToken: token, tokenExpires: { $gt: new Date() } }).lean();
}

export default async function handler(req, res) {
    // Force JSON responses even for errors
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Telegram-Init-Data');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        await connectToDatabase();
        const { action, ...data } = req.body || {};
        
        if (!action) return res.status(400).json({ message: "No action provided" });

        if (action === 'login' || action === 'register') {
            const email = data.email?.toLowerCase().trim();
            if (!email || !data.password) return res.status(400).json({ message: "Credentials missing." });

            let user = await User.findOne({ email }).select('+password');
            const newToken = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            if (!user) {
                if (action === 'login') return res.status(404).json({ message: "Node record not found. Check email or register." });
                const hashedPassword = await bcrypt.hash(data.password, 10);
                user = await User.create({
                    id: 'u_' + Date.now(), 
                    email, 
                    password: hashedPassword,
                    sessionToken: newToken, 
                    tokenExpires: expires,
                    joinedAt: new Date().toISOString(),
                    role: email === 'admin@admin.com' ? 'ADMIN' : 'USER',
                    balance: 0, 
                    name: data.name || 'User', 
                    country: data.country || 'Global'
                });
            } else {
                if (action === 'register') return res.status(400).json({ message: "Email identifier already exists." });
                if (!(await bcrypt.compare(data.password, user.password))) return res.status(401).json({ message: "Authentication failed: Incorrect secret key." });
                user.sessionToken = newToken; 
                user.tokenExpires = expires;
                await user.save();
            }
            return res.json({ id: user.id, email: user.email, role: user.role, name: user.name, token: newToken });
        }

        const currentUser = await authenticateUser(req);
        if (!currentUser) return res.status(401).json({ message: "Identity sync expired. Re-authenticate required." });

        // Action Router
        switch (action) {
            case 'getUser': return res.json(currentUser);
            case 'getTasks': return res.json(await Task.find({ status: 'ACTIVE' }).lean());
            case 'getTransactions': return res.json(await Transaction.find({ userId: currentUser.id }).sort({ date: -1 }).limit(30).lean());
            case 'getSettings': return res.json((await Setting.findById(data.key).lean())?.data || {});
            case 'saveSettings': 
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Setting.findOneAndUpdate({ _id: data.key }, { data: data.payload }, { upsert: true });
                return res.json({ success: true });
            case 'completeTask': {
                const task = await Task.findOne({ id: data.taskId }).lean();
                if (!task) return res.status(404).json({ message: "Mission no longer available." });
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: task.reward } });
                await Transaction.create({ id: 'tx_' + Date.now(), userId: currentUser.id, taskId: task.id, amount: task.reward, type: 'EARNING', description: task.title, date: new Date().toISOString() });
                await Task.updateOne({ id: task.id }, { $inc: { completedCount: 1 } });
                return res.json({ success: true, reward: task.reward });
            }
            case 'createWithdrawal': {
                if (currentUser.balance < data.request.amount) return res.status(400).json({ message: "Insufficient vault balance." });
                await User.updateOne({ id: currentUser.id }, { $inc: { balance: -data.request.amount } });
                await Withdrawal.create({ ...data.request, userId: currentUser.id, status: 'PENDING', date: new Date().toISOString() });
                return res.json({ success: true });
            }
            case 'getWithdrawals': return res.json(await Withdrawal.find({ userId: currentUser.id }).sort({ date: -1 }).lean());
            case 'getAllUsers': 
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                return res.json(await User.find({}).limit(500).lean());
            case 'adminGetWithdrawals':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                return res.json(await Withdrawal.find({}).sort({ date: -1 }).lean());
            case 'updateWithdrawal':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Withdrawal.updateOne({ id: data.id }, { status: data.status });
                return res.json({ success: true });
            case 'processReferral': {
                const referrer = await User.findOne({ id: data.code });
                if (!referrer || referrer.id === currentUser.id) return res.status(400).json({ message: "Invalid node identifier code." });
                await User.updateOne({ id: currentUser.id }, { $set: { referredBy: data.code }, $inc: { balance: 10 } });
                await User.updateOne({ id: referrer.id }, { $inc: { balance: 25, referralCount: 1 } });
                return res.json({ success: true, message: "Yield protocol applied!" });
            }
            case 'saveTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Task.findOneAndUpdate({ id: data.payload.id }, data.payload, { upsert: true });
                return res.json({ success: true });
            case 'deleteTask':
                if (currentUser.role !== 'ADMIN') return res.status(403).end();
                await Task.deleteOne({ id: data.id });
                return res.json({ success: true });
            default: return res.status(400).json({ message: "Unknown system protocol action" });
        }
    } catch (e) {
        console.error("Handler Error:", e);
        return res.status(500).json({ message: e.message || "Internal System Error" });
    }
}
