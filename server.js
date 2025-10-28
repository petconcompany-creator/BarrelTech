// ✅ Load environment variables first
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const sqlite3 = require("sqlite3").verbose();
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("."));

// ✅ Ensure data folder exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
  console.log("✅ Data folder created");
}

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFMQypjKv04U2j0V-5D9uqhMCqXRAdwe0",
  authDomain: "divine-energy-e834d.firebaseapp.com",
  projectId: "divine-energy-e834d",
  storageBucket: "divine-energy-e834d.firebasestorage.app",
  messagingSenderId: "708448154833",
  appId: "1:708448154833:web:95a77f8fd67d33149181f0",
  measurementId: "G-CB0GNQ7PCY",
};

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
  console.log("✅ Firebase Admin initialized successfully");
}

const firestoreDb = admin.firestore();

// ✅ SQLite setup
const dbPath = path.join(__dirname, "data", "enrollments.db");
let db;
let dbConnected = false;

function connectToSQLite() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("❌ SQLite connection error:", err);
        dbConnected = false;
        reject(err);
      } else {
        dbConnected = true;
        console.log("✅ SQLite connected successfully");

        db.run(
          `
          CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT NOT NULL,
            course TEXT NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
          (err) => {
            if (err) {
              console.error("❌ Table creation error:", err);
              reject(err);
            } else {
              console.log("✅ SQLite table ready");
              resolve();
            }
          }
        );
      }
    });
  });
}

// ✅ Excel setup
const EXCEL_FILE_PATH = path.join(__dirname, "data", "enrollments.xlsx");

function initializeExcelFile() {
  if (!fs.existsSync(EXCEL_FILE_PATH)) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([]);
    const headers = ["ID", "Full Name", "Email", "Course", "Registration Date"];
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");
    XLSX.writeFile(workbook, EXCEL_FILE_PATH);
    console.log("✅ Excel file initialized");
  }
}
initializeExcelFile();

function addEnrollmentToExcel(enrollmentData) {
  try {
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const worksheet = workbook.Sheets["Enrollments"];
    const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const newId = existingData.length;
    const newRow = [
      newId,
      enrollmentData.fullName,
      enrollmentData.email,
      enrollmentData.course,
      enrollmentData.date,
    ];
    existingData.push(newRow);
    const newWorksheet = XLSX.utils.aoa_to_sheet(existingData);
    workbook.Sheets["Enrollments"] = newWorksheet;
    XLSX.writeFile(workbook, EXCEL_FILE_PATH);
    return { success: true, id: newId };
  } catch (error) {
    console.error("Excel write error:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Email setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Send email to company
function sendCompanyEmail({ fullName, email, course }) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: process.env.COMPANY_EMAIL,
    subject: `New Enrollment - ${course}`,
    html: `
      <div style="font-family: Arial, sans-serif; border:1px solid #eee; padding:20px; border-radius:8px;">
        <h2 style="color:#e65c00;">📘 New Course Enrollment</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Course:</strong> ${course}</p>
        <hr />
        <p style="font-size:12px; color:#777;">Sent automatically by Barrel Tech system.</p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("❌ Email sending failed:", error);
    else console.log("✅ Email sent to company:", info.response);
  });
}

// ✅ Health check route
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    port: PORT,
    firebase: "connected",
    sqlite: dbConnected ? "connected" : "disconnected",
    excel: fs.existsSync(EXCEL_FILE_PATH) ? "ready" : "not_initialized",
  });
});

// ✅ Test email route
app.get("/api/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.COMPANY_EMAIL,
      subject: "📩 Barrel Tech Test Email",
      text: "This is a test email from Barrel Tech server.",
    });
    res.send("✅ Test email sent successfully!");
  } catch (err) {
    console.error("❌ Test email error:", err);
    res.status(500).send("❌ Email failed: " + err.message);
  }
});

// ============= Firestore route =============
app.post("/api/enroll", async (req, res) => {
  try {
    const { fullName, email, course } = req.body;
    if (!fullName || !email || !course)
      return res.status(400).json({ message: "All fields are required." });

    const enrollmentData = {
      fullName,
      email,
      course,
      date: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestoreDb.collection("enrollments").add(enrollmentData);
    sendCompanyEmail({ fullName, email, course });

    console.log(`✅ Firestore Enrollment: ${fullName} (${email}) - ${course}`);
    res.status(201).json({ message: "✅ Registered successfully and email sent!" });
  } catch (err) {
    console.error("Firestore registration error:", err);
    res.status(500).json({ message: "❌ Failed to register." });
  }
});

// ============= SQLite route =============
app.post("/api/enroll-sqlite", (req, res) => {
  const { fullName, email, course } = req.body;
  if (!fullName || !email || !course)
    return res.status(400).json({ message: "All fields are required." });

  if (!dbConnected || !db)
    return res.status(500).json({ message: "❌ SQLite not connected." });

  db.run(
    "INSERT INTO enrollments (fullName, email, course) VALUES (?, ?, ?)",
    [fullName, email, course],
    function (err) {
      if (err) {
        console.error("SQLite registration error:", err);
        res.status(500).json({ message: "❌ Failed to register in SQLite." });
      } else {
        sendCompanyEmail({ fullName, email, course });
        console.log(`✅ SQLite Enrollment: ${fullName} (${email}) - ${course}`);
        res.status(201).json({
          message: "✅ Registered successfully in SQLite and email sent!",
          id: this.lastID,
        });
      }
    }
  );
});

// ============= Excel route =============
app.post("/api/enroll-excel", (req, res) => {
  const { fullName, email, course } = req.body;
  if (!fullName || !email || !course)
    return res.status(400).json({ message: "All fields are required." });

  const enrollmentData = {
    fullName,
    email,
    course,
    date: new Date().toISOString(),
  };

  const result = addEnrollmentToExcel(enrollmentData);
  if (result.success) {
    sendCompanyEmail({ fullName, email, course });
    console.log(`✅ Excel Enrollment: ${fullName} (${email}) - ${course}`);
    res.status(201).json({
      message: "✅ Registered successfully in Excel and email sent!",
      id: result.id,
    });
  } else {
    res.status(500).json({ message: "❌ Failed to register in Excel." });
  }
});

// ✅ Start Server
async function startServer() {
  await connectToSQLite();
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );
}

startServer();
