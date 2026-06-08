// frontend/student/student.js

// The base URL for your Java backend API
const API_BASE_URL = 'http://localhost:8080/api'; 

// 1. Fetch questions when the exam starts
async function loadExamQuestions(examId) {
    try {
        const response = await fetch(`${API_BASE_URL}/exams/${examId}/questions`);
        
        if (!response.ok) throw new Error('Failed to fetch questions');
        
        const questions = await response.json();

        // Only replace the hardcoded HTML if the API actually returned questions
        if (questions && Object.keys(questions).length > 0) {
            renderQuestions(questions);
        } else {
            console.warn('API returned no questions for exam', examId, '— keeping hardcoded questions.');
        }
    } catch (error) {
        // Silently fall back to hardcoded questions if the API is unavailable
        console.warn('Could not load questions from API, using hardcoded questions:', error.message);
    }
}

// 2. Dynamically insert questions into the HTML page
function renderQuestions(questions) {
    const form = document.getElementById('exam-form');
    
    // Grab the submit button before we clear the form
    const submitBtn = document.getElementById('submit-exam-btn');
    
    // Clear out the hardcoded HTML examples
    form.innerHTML = ''; 

    // Loop through the fetched questions and create text areas
    // 'questions' is a JSON object mapping { questionId: "Question Text" }
    let index = 1;
    for (const [id, text] of Object.entries(questions)) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-container';

        questionDiv.innerHTML = `
            <p><strong>${String(index).padStart(2, '0')}.</strong> ${text}</p>
            <textarea name="question_${id}" data-question-id="${id}" rows="5" placeholder="Formulate your response..." required></textarea>
        `;
        form.appendChild(questionDiv);
        index++;
    }

    // Re-add the submit button at the bottom
    form.appendChild(submitBtn);
}

// 3. Submit answers back to the backend
async function submitExam(examId, studentId) {
    const textareas = document.querySelectorAll('#exam-form textarea');
    const answers = [];

    // Gather all answers and their associated question IDs
    textareas.forEach(textarea => {
        const qId = textarea.getAttribute('data-question-id');
        if (qId) {
            answers.push({
                questionId: qId,
                answerText: textarea.value
            });
        }
    });

    if (answers.length === 0) {
        alert('No answers to submit. Make sure questions are loaded properly.');
        return;
    }

    const payload = {
        examId: examId,
        studentId: studentId, 
        answers: answers
    };

    try {
        const response = await fetch(`${API_BASE_URL}/exams/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Submission failed');
        
        // Stop proctoring AFTER answers are saved successfully
        if (typeof stopProctoring === 'function') {
            stopProctoring();
        }

        alert('Exam submitted successfully! Your answers have been saved.');
        
        // Exit full screen and redirect
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        window.location.href = "student_login.html";

    } catch (error) {
        console.error('Error submitting exam:', error);
        alert('There was a problem submitting your exam. Please try again.');
    }
}

// 4. Attach listener to the form submission
document.addEventListener('DOMContentLoaded', () => {
    const examForm = document.getElementById('exam-form');
    
    if (examForm) {
        examForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Pull IDs from sessionStorage (set during login by auth.js)
            const currentExamId = 1; 
            const currentStudentId = parseInt(sessionStorage.getItem('userId')) || 1; 
            
            submitExam(currentExamId, currentStudentId);
        });
    }
});