// Import необходимых библиотек
import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import crypto from "crypto";
import cors from "cors";
import AdminJS from "adminjs";
import PDFDocument from "pdfkit"
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongo from "@adminjs/mongoose";
import mongoose from "mongoose";
import MongoStore from 'connect-mongo'; 
import  session  from 'express-session';
import argon2  from "argon2"
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Chart } from "react-chartjs-2";
import "chart.js/auto";
import { ComponentLoader } from "adminjs";

const componentLoader = new ComponentLoader(); // Yangi ComponentLoader yaratamiz


// Mongoose модели
mongoose.connect("mongodb+srv://saidaliyevjasur450:xkSeavDSFqazblwx@paymall.t1g8n.mongodb.net", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Express-session sozlamalari


// Модель пользователя (xodim)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  id: { type: String, required: true },
  idName: { type: String, required: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  companyName: { type: String, required: true },
  region: { type: String, required: true },
  
  // ✅ Avvalgidek qoladigan TestQuestionTwo natijalari
  testResults: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestQuestionTwo' },
      answer: { type: String },
      score: { type: Number },
    }
  ],
  interpretation: { type: String, default: "" },
  calculatedScores: {
    tensiya: { type: Number, default: 0 },
    rezistensiya: { type: Number, default: 0 },
    charchash: { type: Number, default: 0 }
  },

  // ✅ Yangi qo‘shilayotgan TestQuestionThree natijalari
  testResultsThree: [
    { questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestQuestionThree' }, answer: String, score: Number }
  ], 
  interpretationThree: { type: String, default: "" }, // TestQuestionThree uchun interpretatsiya
  calculatedScoresThree: {
    И: { type: Number, default: 0 },
    П: { type: Number, default: 0 },
    Ф: { type: Number, default: 0 },
    М: { type: Number, default: 0 },
    Р: { type: Number, default: 0 },
    О: { type: Number, default: 0 },
    К: { type: Number, default: 0 },
    Д: { type: Number, default: 0 }
  },

  role: {
    type: String,
    required: false,
    enum: ["client", "psychologist", "creator"],
    default: "client",
  },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);





// Модель клиента (buyurtmachi)
const clientSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  idName: { type: String, required: true, unique: true },
});
const Client = mongoose.model("Client", clientSchema);

// Модель тестового вопроса
const testQuestionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  number: Number,
  phase: String, // Bosqich (tensiya, rezistensiya, charchash)
  points: [Number], // Variantlar uchun ball
});

const TestQuestion = mongoose.model("TestQuestion", testQuestionSchema);

const testQuestionTwoSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  number: { type: Number, required: true },
  phase: { type: String, required: true }, // ✅ Majburiy qilindi
  points: { type: [Number], required: true },
  category: { type: String, default: "General" },
  weight: { type: Number, default: 1 },
});

const TestQuestionTwo = mongoose.model("TestQuestionTwo", testQuestionTwoSchema);


const testQuestionThreeSchema = new mongoose.Schema({
  question: { type: String, required: true },
  number: { type: Number, required: true },
  options: { 
    type: [{ type: String, required: true }], 
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: "Options cannot be empty!",
    },
  }, 
  roles: { 
    type: [{ type: String, enum: ["И", "П", "Ф", "М", "Р", "О", "К", "Д"], required: true }],
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: "Roles cannot be empty!",
    },
  },
  points: { 
    type: [{ type: Number, required: true }], 
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: "Points cannot be empty!",
    },
  },
}, { timestamps: true });

const TestQuestionThree = mongoose.model("TestQuestionThree", testQuestionThreeSchema);




// const TestQuestion = mongoose.model("TestQuestion", testQuestionSchema);

// Настройки Express и AdminJS
const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use("/uploads", express.static("uploads")); // PDF fayllarni xizmat qilish

app.use(
  session({
    secret: 'some-secret-password',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: "mongodb+srv://saidaliyevjasur450:xkSeavDSFqazblwx@paymall.t1g8n.mongodb.net" }),
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 soat davomida sessiya saqlanadi
  })
);


// Конфигурация AdminJS
AdminJS.registerAdapter(AdminJSMongo);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/testResults'); // Directory to store PDFs
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Create unique filename
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Express endpoint to handle the file upload
app.post('/uploadTestResults', upload.single('testResults'), (req, res) => {
  const filePath = req.file.path; // Store the file path in the database
  res.send({ filePath });
});

const adminJs = new AdminJS({
  componentLoader,
  resources: [
    {
      resource: User,
      options: {
        parent: { name: "Foydalanuvchilar", icon: "User" },
        listProperties: ["email", "id", "name", "age", "gender", "companyName", "region", "role", "interpretation", "interpretationThree"],
        showProperties: ["email", "id", "name", "age", "gender", "companyName", "region", "interpretation", "interpretationThree", "testResults", "testResultsThree", "role"],
        editProperties: ["email", "password", "id", "name", "age", "gender", "idName", "companyName", "region", "testResults", "testResultsThree", "interpretation", "interpretationThree", "role"],
        properties: {
          interpretation: {
            type: "string",
            isVisible: { list: true, show: true, edit: false },
            components: {
              show: ({ record }) => {
                const scores = record?.params?.calculatedScores || {};
                const tensiya = scores.tensiya || 0;
                const rezistensiya = scores.rezistensiya || 0;
                const charchash = scores.charchash || 0;
          
                return `
                  <div style="padding: 20px; border: 1px solid #ddd; border-radius: 10px; background: #f8f9fa; text-align: center;">
                    <h3 style="color: #333;">📊 Интерпретация</h3>
          
                    <!-- 📊 Diagramma -->
                    <canvas id="interpretationChart" width="300" height="300"></canvas>
          
                    <!-- 📋 Jadval -->
                    <table style="width: 100%; margin-top: 10px; border-collapse: collapse; border: 1px solid #ddd;">
                      <thead>
                        <tr>
                          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Фаза</th>
                          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Баллы</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style="border: 1px solid #ddd; padding: 8px;">Выгорание</td>
                          <td style="border: 1px solid #ddd; padding: 8px;">${tensiya}</td>
                        </tr>
                        <tr>
                          <td style="border: 1px solid #ddd; padding: 8px;">Деперсонализация</td>
                          <td style="border: 1px solid #ddd; padding: 8px;">${rezistensiya}</td>
                        </tr>
                        <tr>
                          <td style="border: 1px solid #ddd; padding: 8px;">Снижение достижений</td>
                          <td style="border: 1px solid #ddd; padding: 8px;">${charchash}</td>
                        </tr>
                      </tbody>
                    </table>
          
                    <!-- 🟢 Natijalar bo'yicha xulosa -->
                    <p style="margin-top: 15px; font-weight: bold; color: ${tensiya > 20 || rezistensiya > 15 || charchash > 10 ? 'red' : 'green'};">
                      ${tensiya > 20 || rezistensiya > 15 || charchash > 10 
                        ? "⚠️ У вас есть риск стресса и усталости. Не забывайте отдыхать!" 
                        : "✅ У вас нет серьезных проблем!"}
                    </p>
          
                    <script>
                      setTimeout(() => {
                        const ctx = document.getElementById('interpretationChart');
                        if (!ctx) return console.error("Canvas topilmadi!");
          
                        if (window.Chart) {
                          new Chart(ctx.getContext('2d'), {
                            type: 'bar',
                            data: {
                              labels: ['Выгорание', 'Деперсонализация', 'Снижение достижений'],
                              datasets: [{
                                data: [${tensiya}, ${rezistensiya}, ${charchash}],
                                backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
                                borderColor: ['#e63946', '#457b9d', '#f4a261'],
                                borderWidth: 1
                              }]
                            },
                            options: {
                              responsive: false,
                              scales: {
                                y: { beginAtZero: true }
                              },
                              plugins: {
                                legend: { display: true, position: 'bottom' }
                              }
                            }
                          });
                        } else {
                          console.error("Chart.js yuklanmagan!");
                        }
                      }, 1000);
                    </script>
                  </div>
                `;
              }
            }
          }
          
          
          
          
,          

interpretationThree: {
  type: "string",
  isVisible: { list: true, show: true, edit: false },
  components: {
    show: ({ record }) => {
      const scores = record?.params?.calculatedScoresThree || {};
      if (!scores) return "❌ Нет результатов";

      return `
        <div style="padding: 20px; border: 1px solid #ddd; border-radius: 10px; background: #f8f9fa; text-align: center;">
          <h3 style="color: #333;">📊 Интерпретация (Белбин)</h3>

          <table style="width: 100%; margin-top: 10px; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Роль</th>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Баллы</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(scores)
                .map(([role, score]) => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${role}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${score}</td>
                  </tr>
                `)
                .join("")}
            </tbody>
          </table>

          <p style="margin-top: 15px; font-weight: bold;">
            🏆 Ваша основная роль: <b>${Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b))}</b>
          </p>
        </div>
      `;
    },
  },
},
          testResults: {
            type: "mixed",
            isVisible: { list: false, show: true, edit: false },
            components: {
              show: ({ record }) => {
                const results = record?.params?.testResults;
                if (!results || !Array.isArray(results) || results.length === 0) {
                  return "❌ Результаты теста отсутствуют";
                }

                // Test natijalarini chiroyli tablitada chiqarish
                return `
                  <div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>📊 Результаты теста</h3>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                      <thead>
                        <tr>
                          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">№</th>
                          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Вопрос</th>
                          <th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Ответ</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${results.map((r, i) => `
                          <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${i + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${r.questionText || 'Вопрос отсутствует'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${r.answer || 'Ответ отсутствует'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `;
              },
            },
          },

          testResultsThree: {
            type: "mixed",
            isVisible: { list: false, show: true, edit: false },
            components: {
              show: ({ record }) => {
                const results = record?.params?.testResultsThree;
                if (!results || !Array.isArray(results) || results.length === 0) {
                  return "❌ Результаты теста отсутствуют";
                }

                return `
                  <div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>📊 Результаты теста Белбина</h3>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                      <thead>
                        <tr>
                          <th style="border: 1px solid #ddd; padding: 8px;">№</th>
                          <th style="border: 1px solid #ddd; padding: 8px;">Вопрос</th>
                          <th style="border: 1px solid #ddd; padding: 8px;">Ответ</th>
                          <th style="border: 1px solid #ddd; padding: 8px;">Баллы</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${results.map((r, i) => `
                          <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${i + 1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${r.questionText || 'Вопрос отсутствует'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${r.answer || 'Ответ отсутствует'}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${r.score || '0'}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                `;
              },
            },
          },
        },
      },
    },

    
    {
      resource: TestQuestion,
      options: {
        parent: { name: "Tests", icon: "Book" },
        listProperties: ["number", "question", "options", "category", "phase", "weight"],
        showProperties: ["number", "question", "options", "category", "phase", "weight", "points"],
        editProperties: ["number", "question", "options", "category", "phase", "weight", "points"],
        properties: {
          question: { isVisible: { list: true, show: true, edit: true } },
          options: { isVisible: { list: true, show: true, edit: true } },
          number: { isVisible: true },
          phase: { isVisible: true },
          category: { isVisible: true },
          weight: { isVisible: true },
        },
      },
    },
    
    {
      resource: TestQuestionTwo,
      options: {
        parent: { name: "Tests", icon: "Book" },
        listProperties: ["number", "question", "options", "category", "phase", "weight"],
        showProperties: ["number", "question", "options", "category", "phase", "weight", "points"],
        editProperties: ["number", "question", "options", "category", "phase", "weight", "points"],
        properties: {
          question: { isVisible: { list: true, show: true, edit: true } },
          options: { isVisible: { list: true, show: true, edit: true } },
          number: { isVisible: true },
          phase: { isVisible: true },
          category: { isVisible: true },
          weight: { isVisible: true },
        },
      },
    },

    {
      resource: TestQuestionThree,
      options: {
        parent: { name: "Tests", icon: "Book" },
        listProperties: ["number", "question"],
        editProperties: ["number", "question", "options", "roles", "points"],
        showProperties: ["number", "question", "options", "roles", "points"],
        properties: {
          number: { type: "number", isVisible: { list: true, show: true, edit: true } },
          question: { type: "string", isVisible: { list: true, show: true, edit: true } },
          options: { 
            type: "array", 
            isVisible: { list: false, show: true, edit: true },
          },
          roles: { 
            type: "array", 
            isVisible: { list: false, show: true, edit: true },
          },
          points: { 
            type: "array", 
            isVisible: { list: false, show: true, edit: true },
          }
        },
        actions: {
          edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === "creator" || currentAdmin?.role === "psixolog" },
          delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === "creator" || currentAdmin?.role === "psixolog" },
        },
      },
    },
    

    {
      resource: Client,
      options: {
        parent: { name: "Users info", icon: "Folder" },
        listProperties: ["email", "idName"], 
        editProperties: ["email", "idName"],
        showProperties: ["email", "idName"],
        actions: {
          show: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === "creator" || currentAdmin?.role === "psixolog" || currentAdmin?.role === "client" },
          edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === "creator" || currentAdmin?.role === "psixolog" },
          delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === "creator" || currentAdmin?.role === "psixolog" },
        },
      },
    },
  ],
  branding: {
    companyName: "MyApp",
    logo: "https://example.com/logo.png",
  },
});

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  {
    authenticate: async (email, password) => {
      if (email === "1" && password === "1") {
        return { email: "admin@example.com", role: "psixolog" };
      } else if (email === "1" && password === "2") {
        return { email: "client@example.com", role: "client" };
      } else if (email === "creator" && password === "creator123") {
        return { email: "creator@example.com", role: "creator" };
      }
      return null;
    },
    cookieName: "adminjs",
    cookiePassword: "some-secret-password",
  },
  null,
  {
    resave: false,
    saveUninitialized: true,
    secret: "some-secret-password",
    store: MongoStore.create({ mongoUrl: "mongodb+srv://saidaliyevjasur450:xkSeavDSFqazblwx@paymall.t1g8n.mongodb.net" }),
  }
);

app.use("/admin", adminRouter);



// Данные пользователей (хранение в памяти для демонстрации)
const users = {};

// Настройки отправки email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "saidaliyevjasur450@gmail.com",
    pass: "ckyt spcm yjlz ftse",
  },
  secure: true,
  port: 465,
  debug: true, // Debug loglarini yoqish
});

// Эндпоинт для регистрации xodim
app.post("/api/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email и пароль обязательны." });
  }

  // Foydalanuvchi ma'lumotlarini saqlash
  users[email] = { password };
  
  res.json({ success: true, message: "Регистрация успешна." }); // Email jo‘natish yo‘q
});

// Эндпоинт для регистрации buyurtmachi
// Yangi mijozni ro‘yxatdan o‘tkazish
app.post("/api/register-client", async (req, res) => {
  const { idName, email } = req.body;

  // idName mavjudligini tekshirish
  if (!idName) {
    return res
      .status(400)
      .json({ success: false, message: "ID Name kiritilishi majburiy." });
  }

  try {
    // idNameni tekshirish
    const query = { idName };
    if (email) {
      query.email = email; // Agar email kiritilgan bo'lsa, qidiruv shartlariga qo'shish
    }
    const existingClients = await Client.find(query);

    if (existingClients.length > 0) {
      return res.json({
        success: true,
        message: "ID Name mavjud.",
        clients: existingClients, // Barcha mos keluvchi mijozlarni qaytarish
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "ID Name yoki email mos kelmadi.",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Xato yuz berdi: " + err.message });
  }
});


// Barcha client'larni olish uchun API
app.get("/api/register-client", async (req, res) => {
  const { idName, email } = req.query;

  // idName mavjudligini tekshirish
  if (!idName) {
    return res
      .status(400)
      .json({ success: false, message: "ID Name kiritilishi majburiy." });
  }

  try {
    const query = { idName };
    if (email) {
      query.email = email; // Agar email kiritilgan bo'lsa, qidiruv shartlariga qo'shish
    }

    const existingClient = await Client.findOne(query);

    if (existingClient) {
      return res.json({
        success: true,
        message: "ID Name mavjud.",
        client: existingClient,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "ID Name yoki email mos kelmadi.",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Xato yuz berdi: " + err.message });
  }
});


// idName ni tekshirish uchun API
app.post("/api/check-idname", async (req, res) => {
  const { idname } = req.body;

  if (!idname) {
    return res.status(400).json({ success: false, message: "idName обязательное поле." });
  }

  try {
    // idName ni bazadan qidirish
    const client = await Client.findOne({ idName: idname });

    if (!client) {
      return res.json({ success: false, message: "idName недействителен." });
    }

    // Agar idName topilgan bo‘lsa
    res.json({ success: true, message: "idName действителен." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Ошибка сервера: " + err.message });
  }
});


app.post("/api/verify-idName", async (req, res) => {
  const { idName } = req.body;

  if (!idName) {
    return res.status(400).json({ success: false, message: "idName is required" });
  }

  try {
    // Check if idName exists in the database
    const client = await ClientModel.findOne({ idName });
    if (!client) {
      return res.status(404).json({ success: false, message: "idName not found in the database" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error verifying idName:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});



// Эндпоинт для подтверждения ID
app.post("/api/verify-id", (req, res) => {
  const { email, inputID } = req.body;
  if (!email || !inputID) {
    return res.status(400).json({ success: false, message: "Необходимы email и ID." });
  }

  const user = users[email];
  if (user && user.id === inputID) {
    return res.json({ success: true, message: "ID подтвержден." });
  }
  res.status(400).json({ success: false, message: "Неверный ID." });
});

// Эндпоинт для завершения регистрации xodim
app.post("/api/complete-registration", (req, res) => {
  const { email, name, age, gender, companyName } = req.body;
  if (!email || !name || !age || !gender || !companyName) {
    return res.status(400).json({ success: false, message: "Все поля обязательны для заполнения." });
  }

  const user = users[email];
  if (user) {
    users[email] = { ...user, name, age, gender, companyName, testResults: [] };
    return res.json({
      success: true,
      message: "Регистрация завершена. Начало теста.",  
      testQuestions: [
        {
          question: "Я чувствую себя эмоционально опустошенным.",
          options: ["никогда", "очень редко", "иногда", "часто", "очень часто", "каждый день"],
        },
        // Добавьте дополнительные вопросы для теста
      ],
    });
  }
  res.status(400).json({ success: false, message: "Пользователь не найден." });
});

// Эндпоинт для получения и сохранения результатов теста
app.post("/api/submit-test", async (req, res) => {
  try {
    const {
      email, password, name, age, gender, companyName, region,
      selectedID, testResult, testResultThree, idName
    } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      console.log("🟢 Yangi foydalanuvchi yaratilmoqda...");
      user = new User({
        email,
        password,
        id: selectedID,
        name,
        age,
        gender,
        companyName,
        region,
        idName,
        testResults: testResult, // ✅ TestQuestionTwo natijalari
        testResultsThree: testResultThree, // ✅ TestQuestionThree natijalari qo‘shildi
        interpretation: "", 
        interpretationThree: "", // ✅ TestQuestionThree uchun interpretatsiya qo‘shildi
        calculatedScores: { tensiya: 0, rezistensiya: 0, charchash: 0 },
        calculatedScoresThree: { И: 0, П: 0, Ф: 0, М: 0, Р: 0, О: 0, К: 0, Д: 0 } // ✅ TestQuestionThree uchun ballar qo‘shildi
      });
    } else {
      console.log("🟡 Foydalanuvchi topildi, test natijalari yangilanmoqda...");
      user.name = name;
      user.age = age;
      user.gender = gender;
      user.companyName = companyName;
      user.region = region;
      user.id = selectedID;
      user.idName = idName;
      
      // ✅ Ikkala test natijalarini yangilash
      user.testResults = [...user.testResults, ...testResult]; 
      user.testResultsThree = [...user.testResultsThree, ...testResultThree];
    }

    await user.save();
    res.status(200).json({ message: "✅ User saved successfully", user });
  } catch (error) {
    console.error("🔴 Serverda xatolik:", error);
    res.status(500).json({ message: "❌ Server error", error });
  }
});





app.get("/api/get-users", async (req, res) => {
  try {
    const users = await User.find();

    if (users.length === 0) {
      return res.status(404).json({ message: "Foydalanuvchilar topilmadi" });
    }

    // `testResults` ichidagi har bir savol uchun `questionText` ni qo‘shish
    for (let user of users) {
      for (let result of user.testResults) {
        // Avval `findById` orqali topamiz
        let question = await TestQuestionTwo.findById(result.questionId);

        // Agar `findById` ishlamasa, `findOne` orqali tekshiramiz
        if (!question) {
          question = await TestQuestionTwo.findOne({ _id: result.questionId });
        }

        // `questionText` ni qo‘shish
        result.questionText = question ? question.question : "❌ Savol topilmadi";
      }
    }

    console.log("✅ Yangilangan foydalanuvchilar ro‘yxati:", JSON.stringify(users, null, 2));
    res.status(200).json({ message: "Users found", users });
  } catch (error) {
    console.error("Serverda xatolik:", error);
    res.status(500).json({ message: "Server error", error });
  }
});





// Эндпоинт для получения тестовых вопросов

app.post("/api/test-questions", async (req, res) => {
  const { number, question, options, phase, points } = req.body;
  if (
    !number ||
    !question ||
    !options ||
    !Array.isArray(options) ||
    !phase ||
    !points ||
    points.length !== options.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Введите правильный порядок, вопрос, варианты, фазу и баллы.",
    });
  }

  const newTestQuestion = new TestQuestion({ number, question, options, phase, points });
  await newTestQuestion.save();

  res.json({ success: true, message: "Тестовый вопрос успешно добавлен." });
});


app.post("/api/calculate-test-results", async (req, res) => {
  const { answers } = req.body;
  if (!answers || typeof answers !== "object") {
    return res.status(400).json({ success: false, message: "Ответы не предоставлены." });
  }

  const questions = await TestQuestion.find();
  let results = { tensiya: 0, rezistensiya: 0, charchash: 0 };

  for (const question of questions) {
    const answer = answers[question._id];
    if (answer) {
      const optionIndex = question.options.indexOf(answer);
      if (optionIndex !== -1) {
        const points = question.points[optionIndex];
        results[question.phase] += points;
      }
    }
  }

  res.json({ success: true, results });
});



// Эндпоинт для получения тестовых вопросов
app.get("/api/test-questions", async (req, res) => {
  const { selectedID } = req.query;
  const testQuestions = await TestQuestion.find({ phase: selectedID }).sort({ number: 1 });
  res.json({ success: true, testQuestions });
});

// second test
app.get("/api/test-question-two", async (req, res) => {
  try {
    const { phase } = req.query;

    let query = {};
    if (phase) {
      query.phase = phase; // ✅ Agar phase bor bo‘lsa, faqat shu bo‘yicha filtrlaydi
    }

    const testQuestions = await TestQuestionTwo.find(query)
      .sort({ number: 1 }) // ✅ Savollar tartib bo‘yicha chiqadi
      .lean(); // ✅ Natijalarni to‘g‘ridan-to‘g‘ri obyektga aylantiradi

    if (!testQuestions || testQuestions.length === 0) {
      console.warn("⚠️ Hech qanday test topilmadi!");
    }

    const totalTests = await TestQuestionTwo.countDocuments({}); // ✅ Jami testlar sonini olamiz

    console.log(`🔍 Umumiy testlar soni: ${totalTests}, So‘ralgan testlar: ${testQuestions.length}`);

    res.json({ success: true, total: totalTests, returned: testQuestions.length, testQuestions });
  } catch (error) {
    console.error("❌ Xatolik:", error);
    res.status(500).json({ success: false, message: "Ошибка сервера." });
  }
});



app.post("/api/test-questiontwo", async (req, res) => {
  const { number, question, options, phase, points } = req.body;
  if (
    !number ||
    !question ||
    !options ||
    !Array.isArray(options) ||
    !phase ||
    !points ||
    points.length !== options.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Введите правильный порядок, вопрос, варианты, фазу и баллы.",
    });
  }

  const newTestQuestion = new TestQuestionTwo({ number, question, options, phase, points });
  await newTestQuestion.save();

  res.json({ success: true, message: "Тестовый вопрос успешно добавлен." });
});


  app.post("/api/test-question-two/calculate-results", async (req, res) => {
    const { email, answers } = req.body;
    if (!email || !answers) {
      return res.status(400).json({ success: false, message: "Недостаточно данных" });
    }

    try {
      let questions = await TestQuestionTwo.find();
      if (!questions || questions.length === 0) {
        return res.status(404).json({ success: false, message: "Вопросы не найдены" });
      }

      let results = { tensiya: 0, rezistensiya: 0, charchash: 0 };

      console.log("✅ Foydalanuvchi yuborgan test javoblari:", answers);

      for (const userAnswer of answers) {
        const question = questions.find(q => String(q._id) === userAnswer.questionId);
        if (!question) {
          console.warn(`⚠️ Ошибка: вопрос с ID ${userAnswer.questionId} не найден в базе`);
          continue;
        }

        // **🔹 Agar `phase` mavjud bo‘lmasa, default "tensiya" qo‘yiladi**
        if (!question.phase) {
          console.warn(`⚠️ Ошибка: Вопрос ${question._id} не имеет фазы, устанавливаем "tensiya" по умолчанию.`);
          question.phase = "tensiya";
        }

        // **🔹 Agar `points` bo‘sh bo‘lsa, default [5, 4, 3, 2, 1] qo‘yiladi**
        if (!question.points || !Array.isArray(question.points) || question.points.length === 0) {
          console.warn(`⚠️ Ошибка: Вопрос ${question._id} не имеет баллов, устанавливаем [5, 4, 3, 2, 1].`);
          question.points = [5, 4, 3, 2, 1];
        }

        const optionIndex = question.options.indexOf(userAnswer.answer);
        console.log(`🔍 Qidirilayotgan javob: ${userAnswer.answer}, Index: ${optionIndex}`);

        if (optionIndex === -1) {
          console.warn(`⚠️ Ошибка: ответ '${userAnswer.answer}' не найден в вариантах вопросов`);
          continue;
        }

        console.log(`✅ Javob: ${userAnswer.answer}, Ball: ${question.points[optionIndex]}`);
        results[question.phase] += question.points[optionIndex] || 0;
      }

      console.log("📊 Hisoblangan natijalar:", results);

      let interpretation = "📊 **Ваши результаты:**\n";
      interpretation += ` Эмоциональное выгорание: ${results.tensiya}\n`;
      interpretation += ` Деперсонализация: ${results.rezistensiya}\n`;
      interpretation += ` Снижение личных достижений: ${results.charchash}\n`;

      if (results.tensiya > 20 || results.rezistensiya > 15 || results.charchash > 10) {
        interpretation += "\n⚠️ **У вас есть риск стресса и усталости. Не забывайте отдыхать!**";
      } else if (results.tensiya < 5 && results.rezistensiya < 5 && results.charchash < 5) {
        interpretation += "\n✅ **Вы в отличной форме!**";
      } else {
        interpretation += "\n✅ **У вас нет серьезных проблем, но следите за своим самочувствием.**";
      }

      await User.findOneAndUpdate(
        { email },
        { $set: { testResults: answers, interpretation, calculatedScores: results } },
        { new: true }
      );

      res.json({ success: true, results, interpretation });
    } catch (error) {
      console.error("Ошибка при вычислении результатов: ", error);
      res.status(500).json({ success: false, message: "Произошла ошибка" });
    }
  });







// third test

// app.get("/api/test-question-three", async (req, res) => {
//   const { phase } = req.query;

//   try {
//     const testQuestions = await TestQuestionThree.find({ phase }).sort({ number: 1 });
//     res.json({ success: true, testQuestions });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Ошибка сервера." });
//   }
// });

app.get("/api/test-question-three", async (req, res) => {
  try {
    const testQuestions = await TestQuestionThree.find().sort({ number: 1 }).lean();
    const totalTests = await TestQuestionThree.countDocuments({}); // ✅ Umumiy testlar sonini olamiz

    if (!testQuestions.length) {
      console.warn("⚠️ TestQuestionThree bo‘yicha hech qanday test topilmadi!");
      return res.json({ success: false, message: "Вопросы не найдены", total: 0, returned: 0, testQuestions: [] });
    }

    console.log(`🔍 Umumiy testlar soni: ${totalTests}, So‘ralgan testlar: ${testQuestions.length}`);

    res.json({ success: true, total: totalTests, returned: testQuestions.length, testQuestions });
  } catch (error) {
    console.error("❌ Xatolik:", error);
    res.status(500).json({ success: false, message: "Ошибка сервера." });
  }
});



app.post("/api/test-question-three", async (req, res) => {
  const { number, question, options, roles, points } = req.body;

  if (
    !number ||
    !question ||
    !options ||
    !Array.isArray(options) ||
    options.length === 0 ||
    !roles ||
    !Array.isArray(roles) ||
    roles.length !== options.length ||
    !points ||
    !Array.isArray(points) ||
    points.length !== options.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Введите корректные данные: номер, вопрос, варианты, роли и баллы.",
    });
  }

  try {
    const newTestQuestion = new TestQuestionThree({ number, question, options, roles, points });
    await newTestQuestion.save();

    res.json({ success: true, message: "Тестовый вопрос успешно добавлен." });
  } catch (error) {
    console.error("❌ Xatolik:", error);
    res.status(500).json({ success: false, message: "Ошибка сервера." });
  }
});





app.post("/api/test-question-three/calculate-results", async (req, res) => {
  const { email, answers } = req.body;
  if (!email || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ success: false, message: "Недостаточно данных" });
  }

  try {
    // **📌 Bazadan barcha test savollarini olish**
    let questions = await TestQuestionThree.find();
    if (!questions || questions.length === 0) {
      return res.status(404).json({ success: false, message: "Вопросы не найдены" });
    }

    let results = { И: 0, П: 0, Ф: 0, М: 0, Р: 0, О: 0, К: 0, Д: 0 };

    console.log("✅ Foydalanuvchi yuborgan test javoblari:", answers);

    for (const userAnswer of answers) {
      const question = questions.find(q => String(q._id) === userAnswer.questionId);
      if (!question) {
        console.warn(`⚠️ Ошибка: Вопрос с ID ${userAnswer.questionId} не найден в базе`);
        continue;
      }

      const optionIndex = question.options.indexOf(userAnswer.answer);
      if (optionIndex === -1) {
        console.warn(`⚠️ Ошибка: ответ '${userAnswer.answer}' не найден в вариантах вопроса ${question._id}`);
        continue;
      }

      // **🔹 `roles` massivi tekshiriladi**
      if (!question.roles || question.roles.length !== question.options.length) {
        console.warn(`⚠️ Ошибка: Вопрос ${question._id} имеет ${question.options.length} вариантов, но только ${question.roles.length} ролей.`);
        continue;
      }

      // **🔹 Roli mavjudligini tekshiramiz**
      const role = question.roles[optionIndex];
      if (!role || !results.hasOwnProperty(role)) {
        console.warn(`⚠️ Ошибка: роль '${role}' не существует в результатах`);
        continue;
      }

      // **🔹 Ballarni qo‘shish**
      console.log(`✅ Javob: ${userAnswer.answer}, Roli: ${role}, Ball: ${question.points[optionIndex]}`);
      results[role] += question.points[optionIndex] || 0;
    }

    console.log("📊 Hisoblangan natijalar:", results);

    // **🔹 Eng yuqori 2 ta rolni aniqlash**
    const sortedRoles = Object.entries(results)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);
    const topRoles = sortedRoles.slice(0, 2).map(([role]) => role);

    let interpretation = `📊 **Ваши результаты:**\n`;
    for (let [role, score] of sortedRoles) {
      interpretation += `${role}: ${score}\n`;
    }

    interpretation += `\n🔹 Ваша основная роль: *${topRoles[0] || "Не определено"}*`;
    if (topRoles[1]) {
      interpretation += `\n🔹 Вторая подходящая роль: *${topRoles[1]}*`;
    }

    // **🔹 Natijalarni bazaga saqlash**
    await User.findOneAndUpdate(
      { email },
      { $set: { testResultsThree: answers, interpretationThree: interpretation, calculatedScoresThree: results } },
      { new: true }
    );

    res.json({ success: true, results, interpretation });
  } catch (error) {
    console.error("Ошибка при вычислении результатов: ", error);
    res.status(500).json({ success: false, message: "Произошла ошибка" });
  }
});





// Подключение к MongoDB

// Запуск сервера
const PORT = 4000;
app.listen(PORT, () => console.log(`Сервер работает на http://localhost:${PORT}`));

