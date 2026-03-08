# Examy Portal – Dynamic Online Examination System

A highly secure, scalable, and fast online examination platform built with Node.js, Express, and MySQL.

## Features

### Secure Authentication System
- Admin and Student registration & login.
- Passwords hashed using `bcrypt`.
- JWT (JSON Web Token) authentication stored in `httpOnly` secure cookies.
- Helmet.js for security headers.

### Admin Dashboard
- Create, manage, and delete Exams.
- Add and delete multiple-choice questions for exams.
- View real-time results of all students.

### Student Dashboard & Examination Engine
- View available, active exams you haven't taken yet.
- Real-time exam interface with a countdown timer.
- **Anti-Cheat Mechanics**: 
  - Disables right-click and text selection.
  - Detects tab-switching or window unfocus. After 3 violations, the exam auto-submits.
- **Auto-grading**: Automatically calculates score, applying negative marking (subtracts 25% of the mark for incorrect options). Result status (Pass/Fail) is instantly generated.
- View detailed result history.

### Modern UI & Aesthetics
- Glassmorphism design system.
- Responsive, fast-loading, pure HTML5/CSS3/ES6 UI without heavy frameworks.

---

## Prerequisites

- **Node.js** (v14+ recommended)
- **MySQL Server** (XAMPP/WAMP or local installation)

## Installation Guide

1. **Clone or Download the Repository**
   Ensure you are in the core directory `examy-portal`.

2. **Install Dependencies**
   ```bash
   npm install
   ```
   *(This installs Express, MySQL2, bcrypt, jsonwebtoken, dotenv, helmet, cors, and cookie-parser)*

3. **Database Setup**
   - Start your MySQL server.
   - You can run the provided initialization script against your MySQL server.
   
   If you have the `mysql` CLI available:
   ```bash
   mysql -u root -p < models/schema.sql
   ```
   *Alternatively, open your MySQL GUI (like phpMyAdmin or MySQL Workbench) and execute the contents of `models/schema.sql`.*

4. **Environment Variables Config**
   Create or edit the `.env` file in the root directory:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=         # (Leave blank if root has no password)
   DB_NAME=examy_portal
   JWT_SECRET=supersecretjtwkey12345
   SESSION_SECRET=supersecretsessionkey12345
   NODE_ENV=development
   ```

5. **Start the Application**
   ```bash
   node server.js
   ```
   Or, if you have `nodemon` installed globally:
   ```bash
   nodemon server.js
   ```

6. **Access the Portal**
   Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## Folder Structure

```
examy-portal/
│
├── config/
│   └── db.js                 # MySQL Pool Connection
│
├── controllers/
│   ├── adminController.js    # Exam/Question/Result management logic
│   ├── authController.js     # Registration/Login/JWT Logic
│   └── examController.js     # taking exams, auto-submitting logic
│
├── middleware/
│   └── authMiddleware.js     # verifying JWT tokens and roles (Admin/Student)
│
├── models/
│   └── schema.sql            # Database design / creation scripts
│
├── public/                   # Static Assets
│   ├── css/
│   │   └── style.css         # Core Design System
│   └── js/
│       ├── admin.js          # Admin UI logic
│       ├── auth.js           # Auth UI logic
│       ├── exam.js           # Live exam engine logic
│       ├── result.js         # Result page logic
│       └── student.js        # Student dashboard logic
│
├── routes/
│   ├── admin.js              # Admin endpoints
│   ├── auth.js               # Auth endpoints
│   └── exam.js               # Exam environment endpoints
│
├── views/                    # HTML Interfaces
│   ├── index.html            # Landing page
│   ├── login.html            # Login portal
│   ├── register.html         # Registration
│   ├── admin-dashboard.html  # Content management
│   ├── student-dashboard.html# Exam catalog
│   ├── exam.html             # Secure live exam
│   └── result.html           # Result view
│
├── .env                      # Environment config file
├── package.json              # App metadata and dependencies
└── server.js                 # Express Application Entry Point
```

## Security Best Practices Built-in

- **SQL Injection Prevention:** Uses prepared statements (`mysql2` parameterized queries).
- **Password Protection:** Uses `bcrypt` with salt rounds.
- **Cross-Site Scripting (XSS):** Data served securely. User input sanitized via parameterized SQL.
- **JWT Storage:** Stored in `httpOnly` secure memory cookies making them inaccessible to JavaScript/XSS attacks on the client side.
- **Helmet.js:** Adds robust HTTP response headers.

## Production Deployment Checklist
1. Ensure `NODE_ENV` is set to `production`.
2. Change `JWT_SECRET` and `SESSION_SECRET` to strong, random key strings.
3. Update database credentials.
4. Host backend on a VPS (AWS, DigitalOcean) and use PM2 (`pm2 start server.js`) for keeping the app alive. Set up Nginx as a reverse proxy targeting port `3000`.
