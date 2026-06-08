# Proctoring System

A robust, production-grade automated proctoring system designed to monitor student behavior during online examinations. The system leverages real-time browser APIs to detect violations such as tab switching, noise interference, and camera tampering, with a Java-based backend for secure data persistence.

---

## 🚀 Features

* **Real-time Monitoring:** Continuous webcam and microphone liveness checks.
* **Violation Detection:** Automated detection of:
    * **Tab Switching:** Logs when the exam window loses focus via the Page Visibility API.
    * **Fullscreen Exit:** Forces and monitors fullscreen mode to prevent external navigation.
    * **Audio Spikes:** Real-time ambient noise analysis using Web Audio API.
* **Intelligent Suspension System:**
    * **3 Violations:** 5-minute automated cooldown.
    * **6 Violations:** 15-minute automated cooldown.
    * **9 Violations:** Permanent exam termination.
* **Teacher Dashboard:** Integrated view of student answers and violation history via SQL Views.
* **Database Persistence:** SQLite-backed storage for users, exams, and secure violation logs.

---

## 🛠️ Tech Stack

### **Frontend**
* **Languages:** HTML5, CSS3, Vanilla JavaScript (ES6+).
* **Web APIs:** MediaDevices (`getUserMedia`), Web Audio (`AudioContext`), Fullscreen API, Page Visibility API.

### **Backend**
* **Language:** Java 17+.
* **Framework:** Spring Boot (Web/REST).
* **Build Tool:** Maven.
* **Database Access:** JDBC with SQLite Driver.

### **Database**
* **Engine:** SQLite (`proctoring.db`).
* **Schema:** Relational design with optimized denormalization in the `ANSWERS` table for high-speed teacher lookups.

---

## 📂 Project Structure

```text
ProctoringSystem/
├── backend/                # Java Spring Boot Application
│   ├── src/main/java/      # Controllers, DAOs, and Utils
│   └── pom.xml             # Dependencies (Spring Web, SQLite JDBC)
├── frontend/               # Client-side interface
│   ├── admin/              # Exam creation and management
│   ├── teacher/            # Grading and monitoring dashboards
│   ├── student/            # Secured exam portal
│   └── shared/js/          # Core proctoring engine (proctor.js)
├── database/               # Data Layer
│   ├── schema.sql          # SQL DDL for table/view definitions
│   └── proctoring.db       # Persistent SQLite database file
└── README.md
```

## 🛠️ Prerequisites

Before starting, ensure you have the following installed:
* **Java JDK 17+** (Check via `java -version`)
* **Maven** (Check via `mvn -version`)
* **VS Code** with the **Live Server** extension.
* **SQLite** (Ensuring `proctoring.db` exists in the `database/` folder).

---

## ☕ 1. Launching the Backend (Java Spring Boot)

The backend handles API requests, database interactions, and business logic.

### **Step-by-Step**
1.  Open your terminal or command prompt.
2.  Navigate to the `backend` directory:
    ```bash
    cd ProctoringSystem/backend
    ```
3.  Compile and run the Spring Boot application:
    ```bash
    mvn spring-boot:run
    ```
4.  **Verification:**
    Open your browser and navigate to `http://localhost:8080/api/exams/1/questions`. 
    If you see a JSON response (or an empty `{}`), the server is running correctly.

> **Note:** Ensure your terminal stays open. Closing it will stop the backend server.

---

## 🌐 2. Launching the Frontend (HTML/JS)

Since the frontend is built with "Vanilla" JavaScript, it requires a local web server to handle file paths and API requests properly.

### **Step-by-Step**
1.  Open the **ProctoringSystem** folder in VS Code.
2.  Navigate to `frontend/student/student_login.html`.
3.  Right-click anywhere in the code and select **"Open with Live Server"**.
    * This will launch your browser at a URL like `http://127.0.0.1:5500`.
4.  **Critical Configuration:**
    Before testing violations, ensure `frontend/shared/js/proctor.js` is pointing to the backend:
    ```javascript
    const PROCTOR_CONFIG = {
        // Ensure this matches your Spring Boot port
        VIOLATION_ENDPOINT: 'http://localhost:8080/api/exams/violation',
    };
    ```
