// frontend/teacher/teacher.js

const API_BASE_URL="http://localhost:8080/api";

// 1. Attach event listener to load answers when the button is clicked
document.getElementById('load-answers-btn').addEventListener('click', async () => {
    let examId=document.getElementById('exam-select').value;
    
    if(!examId) {
        alert("Please select an exam first.");
        return;
    }
    
    await loadExamAnswers(examId);
});

// 2. Fetch the anonymous answers from the backend
async function loadExamAnswers(examId) {
    try {
        // This maps to your ExamDAO.getAnswersForTeacher method
        let response=await fetch(`${API_BASE_URL}/teacher/answers/${examId}`);
        
        if(!response.ok) throw new Error('Failed to fetch answers');
        
        let answers=await response.json();
        renderAnswersTable(answers);
        
    } catch (error) {
        console.error('Error fetching answers:', error);
        alert('Could not load the answers. Please check your connection.');
    }
}

// 3. Populate the grading table dynamically
function renderAnswersTable(answers) {
    let tbody=document.getElementById('answers-tbody');
    let gradingSection=document.getElementById('grading-section');
    
    tbody.innerHTML=''; // Clear the loading message or previous data

    if(answers.length===0) {
        tbody.innerHTML=`<tr><td colspan="4" style="text-align: center;">No answers have been submitted for this exam yet.</td></tr>`;
        gradingSection.style.display="block";
        return;
    }

    // Loop through the answers and build the table rows
    answers.forEach(answer => {
        let tr=document.createElement('tr');
        
        // Notice we only use student_id, enforcing anonymity
        tr.innerHTML=`
            <td>${answer.student_id}</td>
            <td>${answer.question_text}</td>
            <td>${answer.answer_text}</td>
            <td>
                <input type="number" min="0" max="100" data-answer-id="${answer.answer_id}" class="score-input" style="width: 60px; padding: 5px;">
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Make the table visible
    gradingSection.style.display="block";
}

// 4. Handle saving the grades back to the database
document.getElementById('save-grades-btn').addEventListener('click', async () => {
    let scoreInputs=document.querySelectorAll('.score-input');
    let gradesToSave=[];

    scoreInputs.forEach(input => {
        let scoreValue=input.value;
        if(scoreValue!=="") { // Only grab rows where the teacher actually entered a score
            gradesToSave.push({
                answerId: input.getAttribute('data-answer-id'),
                score: parseInt(scoreValue)
            });
        }
    });

    if(gradesToSave.length===0) {
        alert("Please enter at least one score before saving.");
        return;
    }

    try {
        // Example POST request to save the grades
        let response=await fetch(`${API_BASE_URL}/teacher/grades/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gradesToSave)
        });

        if(!response.ok) throw new Error('Failed to save grades');
        
        alert("Grades saved successfully!");
        
    } catch (error) {
        console.error('Error saving grades:', error);
        alert('There was a problem saving the grades. Please try again.');
    }
});