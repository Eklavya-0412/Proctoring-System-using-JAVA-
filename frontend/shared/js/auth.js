// frontend/shared/js/auth.js

const API_BASE_URL="http://localhost:8080/api";

// 1. Universal Login Logic
async function handleLogin(event, role) {
    event.preventDefault();
    
    let username=document.getElementById('username').value.trim();
    let password=document.getElementById('password').value.trim();
    
    if(!username || !password) {
        alert("Please enter both username and password.");
        return;
    }

    try {
        // Fetch call mapping to your AuthDAO methods in Java
        let response=await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role:role, username:username, password:password })
        });

        if(!response.ok) {
            throw new Error('Invalid credentials');
        }

        let data=await response.json();
        
        // Save user session info (Using sessionStorage so it clears when the tab closes)
        sessionStorage.setItem('userId', data.userId);
        sessionStorage.setItem('role', role);

        // Redirect based on the role that just logged in
        if(role==="admin") {
            window.location.href="admin_dashboard.html";
        } else if(role==="teacher") {
            window.location.href="teacher_dashboard.html";
        } else if(role==="student") {
            window.location.href="exam_portal.html";
        }

    } catch(error) {
        console.error('Login error:', error);
        alert('Login failed. Please check your username and password.');
    }
}

// 2. Universal Logout Logic
function handleLogout() {
    sessionStorage.clear();
    
    // Route the user back to the correct login page based on where they clicked logout
    let currentPath=window.location.pathname;
    
    if(currentPath.includes("admin")) {
        window.location.href="admin_login.html";
    } else if(currentPath.includes("teacher")) {
        window.location.href="teacher_login.html";
    } else {
        window.location.href="student_login.html";
    }
}

// 3. Attach Event Listeners on Page Load
document.addEventListener('DOMContentLoaded', () => {
    
    // Attach admin login listener if the form exists on the current page
    let adminLoginForm=document.getElementById('admin-login-form');
    if(adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => handleLogin(e, "admin"));
    }

    // Attach teacher login listener
    let teacherLoginForm=document.getElementById('teacher-login-form');
    if(teacherLoginForm) {
        teacherLoginForm.addEventListener('submit', (e) => handleLogin(e, "teacher"));
    }

    // Attach student login listener
    let studentLoginForm=document.getElementById('student-login-form');
    if(studentLoginForm) {
        studentLoginForm.addEventListener('submit', (e) => handleLogin(e, "student"));
    }

    // Attach universal logout listener
    let logoutBtn=document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});