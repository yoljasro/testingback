import express from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Temporary database for storing user data and tests (in production, use a real database)
const users = [];
const tests = {
  1: ["Test 1", "Test 3", "Test 5", "Test 7", "Test 9"],
  2: ["Test 2", "Test 4", "Test 6", "Test 8", "Test 10"],
  3: ["Test 1", "Test 2", "Test 3", "Test 4", "Test 5", "Test 6", "Test 7"]
};

// Email transport configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Replace with your email provider
  auth: {
    user: 'saidaliyevjasur450@gmail.com', // Your email address
    pass: 'ckyt spcm yjlz ftse' // Your email password or app-specific password
  }
});

// Generate a random verification code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// API Endpoints

// User registration (Step 1)
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  const code = generateCode();

  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'Пользователь с этим email уже существует.' });
  }

  users.push({
    email,
    password,
    code,
    verified: false,
    data: null,
    tests: []
  });

  // Send verification code
  transporter.sendMail({
    from: 'saidaliyevjasur450@gmail.com',
    to: email,
    subject: 'Код подтверждения',
    text: `Ваш код подтверждения: ${code}`
  }, (err, info) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка при отправке кода.' });
    }
    res.json({ message: 'Код отправлен на вашу электронную почту.' });
  });
});

// Code verification (Step 2)
app.post('/api/verify', (req, res) => {
  const { email, code } = req.body;

  const user = users.find(user => user.email === email);
  if (!user || user.code !== code) {
    return res.status(400).json({ message: 'Неверный код.' });
  }

  user.verified = true;
  res.json({ message: 'Код подтвержден, доступ разрешен.' });
});

// Save user data (Step 3)
app.post('/api/user-data', (req, res) => {
  const { email, name, age, gender, id, companyName } = req.body;

  const user = users.find(user => user.email === email);
  if (!user || !user.verified) {
    return res.status(403).json({ message: 'Пользователь не подтвержден.' });
  }

  user.data = { name, age, gender, id, companyName };
  user.tests = tests[id] || [];
  res.json({ message: 'Данные успешно сохранены.', tests: user.tests });
});

// Submit test results
app.post('/api/submit-tests', (req, res) => {
  const { email, answers } = req.body;

  const user = users.find(user => user.email === email);
  if (!user || !user.verified || !user.data) {
    return res.status(403).json({ message: 'Пользователь не подтвержден или данные не сохранены.' });
  }

  res.json({ message: 'Тесты отправлены успешно.', user: { ...user, tests: answers } });
});

// Start server
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
