const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect('mongodb://localhost:27017/examportal', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

// Schemas
const User = mongoose.model('User', new mongoose.Schema({
  username: String, role: String, password: String
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
  title: String, 
  duration: Number, 
  questions: [{ q: String, options: [String], answer: String }]
}));

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).send('No token provided');
  try { 
    req.user = jwt.verify(token, 'secretkey'); 
    next(); 
  } catch { 
    res.status(401).send('Unauthorized'); 
  }
};

// Register Route
app.post('/api/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed, role: role || 'student' });
  await user.save();
  res.send('User registered');
});

// Login Route
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user || !await bcrypt.compare(req.body.password, user.password)) 
    return res.status(400).send('Invalid credentials');
  const token = jwt.sign({ id: user._id, role: user.role }, 'secretkey');
  res.json({ token, role: user.role });
});

// Get All Exams (Student & Admin)
app.get('/api/exams', auth, async (req, res) => {
  const exams = await Exam.find();
  res.json(exams);
});

// Create Exam (Admin Only)
app.post('/api/exams', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Admins only');
  const { title, duration, questions } = req.body;
  const newExam = new Exam({ title, duration, questions });
  await newExam.save();
  res.status(201).json(newExam);
});

// Submit Exam (Student)
app.post('/api/exams/:id/submit', auth, async (req, res) => {
  res.json({ message: 'Exam submitted successfully', score: req.body.score });
});

// Start Server
app.listen(5000, () => console.log('Backend running on port 5000'));
