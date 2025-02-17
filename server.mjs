import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';

// MongoDB ulanish sozlamalari
mongoose.connect('mongodb+srv://saidaliyevjasur450:xkSeavDSFqazblwx@paymall.t1g8n.mongodb.net', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  identifier: { type: String },
  isVerified: { type: Boolean, default: false },
  expiresAt: { type: Date },
  name: { type: String },
  age: { type: Number },
  gender: { type: String },
  company: { type: String },
  testResults: { type: Array, default: [] },
});
const User = mongoose.model('User', UserSchema);  

// Nodemailer sozlamalari
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'saidaliyevjasur450@gmail.com', // O'z emailingizni kiriting
    pass: 'ckyt spcm yjlz ftse', // O'z email parolingizni kiriting
  },
});

// Token generatsiya qilish funksiyasi
const generateToken = (length = 32) => {
  const characters = '0123456789';
  return Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
};


// Express ilovasini sozlash
const app = express();
app.use(cors());
app.use(bodyParser.json());

// AdminJS sozlamalari
AdminJS.registerAdapter(AdminJSMongoose);
const adminJs = new AdminJS({
  resources: [
    {
      resource: User,
      options: {
        properties: {
          password: { isVisible: false },
        },
      },
    },
  ],
  branding: {
    companyName: 'Test Management System',
    softwareBrothers: false,
  },
});
const adminRouter = AdminJSExpress.buildRouter(adminJs);
app.use(adminJs.options.rootPath, adminRouter);

// API endpointlar
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email va parolni kiriting.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Bu email ro‘yxatdan o‘tgan.' });
  }

  const identifier = generateToken(8);
  const expiresAt = new Date(Date.now() + 600000); // 10 daqiqa

  try {
    await User.create({ email, password, identifier, expiresAt });

    await transporter.sendMail({
      from: 'saidaliyevjasur450@gmail.com',
      to: email,
      subject: 'Tasdiqlash identifikatori',
      text: `Sizning identifikatoringiz: ${identifier}. Tasdiqlash uchun kiriting.`,
    });

    res.status(201).json({ message: 'Tasdiqlash identifikatori emailga yuborildi.' });
  } catch (error) {
    res.status(500).json({ message: 'Ro‘yxatdan o‘tishda xato.' });
  }
});

app.post('/api/verify', async (req, res) => {
  const { email, identifier } = req.body;
  const user = await User.findOne({ email });

  if (!user) {``
    return res.status(404).json({ message: 'Foydalanuvchi topilmadi.' });
  }
  if (user.identifier !== identifier) {
    return res.status(400).json({ message: 'Identifikator noto‘g‘ri.' });
  }
  if (Date.now() > user.expiresAt) {
    return res.status(400).json({ message: 'Identifikator muddati tugagan.' });
  }

  user.isVerified = true;
  await user.save();
  res.json({ message: 'Tasdiqlash muvaffaqiyatli bajarildi.' });
});

app.post('/api/submit-test', async (req, res) => {
  const { email, testResults, name, age, gender, company } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { email, isVerified: true },
      { name, age, gender, company, testResults },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ message: 'Foydalanuvchi tasdiqlanmagan.' });
    }

    res.json({ message: 'Test natijalari muvaffaqiyatli saqlandi.' });
  } catch (error) {
    res.status(500).json({ message: 'Test natijalarini saqlashda xato yuz berdi.' });
  }
});

// Serverni ishga tushirish
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});
