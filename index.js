const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance-board');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
    // process.exit(1);
  }
};
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['client', 'freelancer', 'both'], default: 'both' },
  createdAt: { type: Date, default: Date.now }
});
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});
const User = mongoose.model('User', UserSchema);
const JobSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: { type: String, enum: ['design', 'content', 'development', 'marketing'] },
  budget: { min: Number, max: Number },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now }
});
const Job = mongoose.model('Job', JobSchema);
app.get('/', (req, res) => res.json({ message: 'FreelanceHub API - Team 391', endpoints: { health: '/api/health', register: 'POST /api/auth/register', login: 'POST /api/auth/login', jobs: '/api/jobs' } }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API Running', mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' }));
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user: { id: user._id, name, email } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().populate('client', 'name email');
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)));
