// frontend/admin/admin.js
// API_BASE_URL is defined in ../shared/js/auth.js, no need to redeclare here

// State variables to track the current exam being built
let currentExamId = null;
let currentExamTitle = "";
let questionCount = 0;
let examCreatedSuccessfully = false;
let isProcessing = false; // CRITICAL: Prevent page navigation while processing

// ============================================================================
// PAGE LOCK SYSTEM - Prevents navigation/reload during operations
// ============================================================================

// Block all page unload attempts while processing
window.addEventListener('beforeunload', (e) => {
    if (isProcessing) {
        console.log("[LOCK] beforeunload event blocked - operation in progress");
        e.preventDefault();
        e.returnValue = 'Operation in progress. Please wait...';
        return false;
    }
});

// Block form submissions that could reload page
document.addEventListener('submit', (e) => {
    // Only block create-exam-form while processing (this could trigger unwanted behavior)
    // Allow add-question-form to submit always (it's async fetch, won't reload page)
    if (isProcessing && e.target.id === 'create-exam-form') {
        console.log("[LOCK] Form submission blocked - create-exam-form");
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
}, true);

// Block logout clicks during processing
document.addEventListener('click', (e) => {
    if (isProcessing && (e.target.id === 'logout-btn' || e.target.classList.contains('logout'))) {
        console.log("[LOCK] Logout blocked - operation in progress");
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
}, true);

// SINGLE DOMContentLoaded handler - consolidates all initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log("[ADMIN DASHBOARD] DOMContentLoaded fired. Setting up event listeners...");
    
    // ===== STEP 1: Create Exam Button Handler =====
    const createExamBtn = document.getElementById('create-exam-btn');
    
    if (!createExamBtn) {
        console.error("[ADMIN] CRITICAL ERROR: 'create-exam-btn' not found in the HTML!");
    } else {
        createExamBtn.addEventListener('click', async (e) => {
            console.log("[CREATE EXAM] 1. Button clicked");
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // LOCK THE PAGE IMMEDIATELY
            isProcessing = true;
            console.log("[LOCK] PAGE LOCKED - All navigation blocked!");

            const titleInput = document.getElementById('exam-title').value.trim();
            console.log("[CREATE EXAM] 2. Title entered:", titleInput);

            if (!titleInput) {
                alert("Please enter an exam title.");
                isProcessing = false; // Unlock on validation failure
                return;
            }

            const adminId = 1;

            try {
                console.log("[CREATE EXAM] 3. Sending request...");
                
                // Verify API_BASE_URL
                if (typeof API_BASE_URL === 'undefined') {
                    throw new Error("API_BASE_URL not defined!");
                }
                
                const response = await fetch(`${API_BASE_URL}/exams/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminId: adminId, title: titleInput })
                });

                console.log("[CREATE EXAM] 4. Response status:", response.status);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log("[CREATE EXAM] 5. Data received:", data);

                currentExamId = data.examId || data.id; 
                
                if (!currentExamId) {
                    throw new Error("No examId in response!");
                }
                
                currentExamTitle = titleInput;
                examCreatedSuccessfully = true;

                console.log("[CREATE EXAM] 6. ExamId:", currentExamId);
                console.log("[CREATE EXAM] 7. Changing UI...");
                
                const createSection = document.getElementById('create-exam-section');
                const addQuestionsSection = document.getElementById('add-questions-section');
                
                if (!createSection || !addQuestionsSection) {
                    throw new Error("Missing HTML elements!");
                }
                
                createSection.style.display = 'none';
                addQuestionsSection.style.display = 'block';

                document.getElementById('current-exam-title-display').innerText = currentExamTitle;
                document.getElementById('current-exam-id-display').innerText = currentExamId;
                
                console.log("[CREATE EXAM] 8. UI CHANGED ✓");
                console.log("[LOCK] PAGE REMAINS LOCKED - Stay on add questions section");
                // isProcessing stays TRUE - page stays locked on this section

            } catch (error) {
                console.error('[CREATE EXAM] ERROR:', error.message);
                alert('Error: ' + error.message);
                
                // Reset on error
                currentExamId = null;
                currentExamTitle = "";
                examCreatedSuccessfully = false;
                isProcessing = false; // Unlock on error
            }
        });
    }

    // ===== STEP 2: Add Question Form Handler =====
    const addQuestionForm = document.getElementById('add-question-form');

    if (!addQuestionForm) {
        console.warn("[ADMIN] Add question form not found (normal if not on dashboard)");
    } else {
        addQuestionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("[ADD QUESTION] Form submitted. Current ExamId:", currentExamId);

            if (!currentExamId) {
                console.error("[ADD QUESTION] ERROR: No ExamId set!");
                alert("Error: No exam selected. Please refresh and create an exam first.");
                return;
            }

            const questionText = document.getElementById('question-text').value.trim();
            if (!questionText) {
                console.warn("[ADD QUESTION] Question text is empty, skipping");
                return;
            }

            try {
                console.log("[ADD QUESTION] Sending question to API...");
                const response = await fetch(`${API_BASE_URL}/exams/${currentExamId}/questions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionText: questionText })
                });

                if (!response.ok) {
                    throw new Error(`API returned status ${response.status}`);
                }

                console.log("[ADD QUESTION] Question added successfully ✓");
                
                // Update UI
                questionCount++;
                document.getElementById('question-count').innerText = questionCount;
                const questionsList = document.getElementById('questions-list');
                const newListItem = document.createElement('li');
                newListItem.style.marginBottom = "10px";
                newListItem.innerText = questionText;
                questionsList.appendChild(newListItem);

                // Clear for next question
                document.getElementById('question-text').value = '';
                document.getElementById('question-text').focus();
                console.log("[ADD QUESTION] UI updated. Total questions now:", questionCount);

            } catch (error) {
                console.error('[ADD QUESTION] Error:', error.message);
                alert('Error adding question: ' + error.message);
            }
        });
    }

    // ===== STEP 3: Finish Exam Button Handler =====
    const finishExamBtn = document.getElementById('finish-exam-btn');
    
    if (!finishExamBtn) {
        console.warn("[ADMIN] Finish exam button not found (normal if not on dashboard)");
    } else {
        finishExamBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log("[FINISH EXAM] Clicked. ExamId:", currentExamId);
            
            if (!currentExamId || !examCreatedSuccessfully) {
                alert("Error: No valid exam.");
                return;
            }
            
            if (questionCount === 0) {
                if (!confirm("No questions added. Finish anyway?")) {
                    return;
                }
            }

            console.log("[FINISH EXAM] Finalizing...");
            alert(`✓ Exam "${currentExamTitle}" saved with ${questionCount} questions`);

            // Reset for next exam
            currentExamId = null;
            currentExamTitle = "";
            questionCount = 0;
            examCreatedSuccessfully = false;
            isProcessing = false; // Unlock

            document.getElementById('question-count').innerText = "0";
            document.getElementById('questions-list').innerHTML = "";
            document.getElementById('exam-title').value = "";
            document.getElementById('question-text').value = "";

            document.getElementById('add-questions-section').style.display = 'none';
            document.getElementById('create-exam-section').style.display = 'block';
            
            console.log("[FINISH EXAM] Reset complete ✓");
            console.log("[LOCK] PAGE UNLOCKED");
        });
    }
    
    console.log("[ADMIN DASHBOARD] Ready ✓");
});
