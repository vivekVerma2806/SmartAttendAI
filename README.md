# 🎯 SmartAttendAI — Face Recognition Attendance System

A **browser-based, AI-powered Smart Attendance System** using real-time face recognition. Built with **face-api.js** (TensorFlow.js), it runs entirely in the browser — no backend server needed.

## 🌐 Live Demo

🔗 **Hosted Link:** [https://vivekVerma2806.github.io/SmartAttendAI/](https://vivekVerma2806.github.io/SmartAttendAI/)

- 📄 **Project Report:** [index.html](https://vivekVerma2806.github.io/SmartAttendAI/index.html)
- 🚀 **Live App:** [app.html]( http://localhost:3000/app.html)

---

## ✨ Features

- 📸 **5-Photo Registration** — Capture 5 face photos via webcam or upload from file manager for better accuracy
- 🎯 **Multi-Face Detection** — Detects and marks attendance for multiple students simultaneously in the same frame
- 🧠 **AI-Powered Matching** — Uses SSD MobileNet + FaceLandmark68 + FaceRecognition models via face-api.js
- 📊 **Day-wise Records** — View and filter attendance history by date and student
- 📄 **PDF Report Download** — Generate and download professional PDF attendance reports per student
- 💾 **Local Storage** — All data persists in the browser's localStorage (no server needed)
- 🌙 **Premium Dark UI** — Modern, responsive dark-themed interface with glassmorphism effects

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **HTML5 / CSS3 / JavaScript** | Core web technologies |
| **face-api.js** | Face detection & recognition (TensorFlow.js based) |
| **jsPDF + AutoTable** | PDF report generation |
| **localStorage** | Client-side data persistence |

---

## 📂 Project Structure

```
SmartAttendAI/
├── index.html      # Project report website
├── style.css       # Report page styling
├── script.js       # Report page animations
├── app.html        # Face recognition attendance app
├── app.css         # App styling
├── app.js          # Core ML logic (face detection, matching, attendance)
├── hero.png        # Hero section illustration
└── README.md       # This file
```

---

## 🚀 How It Works

### 1. Register Student
- Start the webcam **or** upload 5 face photos from your file manager
- The AI extracts face descriptors from each photo
- Enter the student's name and click Register

### 2. Take Attendance
- Start the webcam and click **Mark Attendance**
- The system detects **all faces** in the frame
- Each face is matched against stored descriptors using Euclidean distance
- If matched (confidence > 45%), attendance count is incremented by 1

### 3. View & Download Records
- Filter records by date or student name
- Click **Download PDF Report** to generate a professional day-wise attendance report

---

## 🏃 Run Locally

```bash
# Clone the repository
git clone https://github.com/vivekVerma2806/SmartAttendAI.git

# Navigate to the project
cd SmartAttendAI

# Serve using any static server
npx serve -l 3000

# Open in browser
# http://localhost:3000
```

---

## 👨‍💻 Author

**vivek kumar verma**

---

## 📜 License

This project is for educational purposes — College Project Report.

---

> Built with ❤️ using face-api.js and modern web technologies.
