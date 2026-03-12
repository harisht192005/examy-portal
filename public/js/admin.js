document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is admin
    const user = await checkAuth('admin');
    if (!user) return; // checkAuth handles redirect

    document.getElementById('adminName').textContent = user.name || 'System Admin';
    loadExams();
    loadResults();

    // Event Listeners
    document.getElementById('examForm').addEventListener('submit', handleCreateExam);
});

function showSection(sectionId) {
    document.getElementById('examsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';

    document.getElementById(sectionId).style.display = 'block';

    const links = document.querySelectorAll('.sidebar-menu a');
    links.forEach(link => {
        link.classList.remove('active');
        // Check if the link's onclick implicitly calls this section
        if (link.getAttribute('onclick').includes(sectionId)) {
            link.classList.add('active');
        }
    });
}

// Exam Management
async function loadExams() {
    try {
        const res = await fetch('/api/admin/exams');
        const exams = await res.json();

        const tbody = document.querySelector('#examsTable tbody');
        tbody.innerHTML = '';

        exams.forEach(exam => {
            const tr = document.createElement('tr');

            // Strictly sanitize title to prevent DOM breaking tags or HTML execution 
            const safeTitle = String(exam.title || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            // Javascript string literal encoding for the button
            const safeJSObj = String(exam.title || '').replace(/'/g, "\\'").replace(/"/g, '\\"');

            tr.innerHTML = `
                <td>${exam.id}</td>
                <td>${safeTitle}</td>
                <td>${exam.duration}</td>
                <td>${exam.total_marks}</td>
                <td>${exam.total_questions || 0}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openQuestionEditor(${exam.id}, '${safeJSObj}')">Add Q</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExam(${exam.id})">Del</button>
                    <button class="btn btn-primary btn-sm" onclick="sendNotification(${exam.id})">Send</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading exams', err);
    }
}

async function sendNotification(id) {
    if (!confirm('Send email notification to all users for this exam?')) return;

    try {
        const res = await fetch(`/api/admin/exams/${id}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Notification broadcast started');
        } else {
            alert(data.error || 'Failed to send notification');
        }
    } catch (err) {
        console.error(err);
        alert('Network error occurred');
    }
}

function openExamModal() {
    document.getElementById('examModal').style.display = 'flex';
}

function closeExamModal() {
    document.getElementById('examModal').style.display = 'none';
    document.getElementById('examForm').reset();
}

async function handleCreateExam(e) {
    e.preventDefault();
    const title = document.getElementById('examTitle').value;
    const duration = document.getElementById('examDuration').value;
    const total_marks = document.getElementById('examMarks').value;

    try {
        const res = await fetch('/api/admin/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, duration, total_marks })
        });

        if (res.ok) {
            closeExamModal();
            loadExams();
        } else {
            alert('Error creating exam');
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteExam(id) {
    if (!confirm('Are you sure you want to delete this exam? All related questions and results will be lost.')) return;

    try {
        const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadExams();
        }
    } catch (err) {
        console.error(err);
    }
}

// Question Builder Management
let currentEditingExamId = null;
let questionBlockCounter = 0;

async function openQuestionEditor(examId, title) {
    currentEditingExamId = examId;
    document.getElementById('editorExamTitle').textContent = `Drafting questions for: ${title}`;

    // Switch views immediately so the user sees something is happening
    document.getElementById('examsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('questionEditorSection').style.display = 'block';

    // Clear the container
    const container = document.getElementById('questionBlocksContainer');
    container.innerHTML = '<div style="text-align: center; color: var(--ink-muted); padding: 2rem;">Loading existing questions...</div>';

    let existingQuestionsCount = 0;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/questions/${examId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const existingQuestions = await res.json();
            existingQuestionsCount = existingQuestions.length;

            container.innerHTML = ''; // Clear loading message

            // Render existing questions securely
            existingQuestions.forEach((q, idx) => {
                container.insertAdjacentHTML('beforeend', createExistingQuestionBlockHTML(q, idx + 1));
            });

        } else {
            container.innerHTML = '<div style="text-align: center; color: var(--rose-text); padding: 2rem;">Failed to load existing questions.</div>';
        }
    } catch (err) {
        console.error("Error fetching existing questions:", err);
        container.innerHTML = '<div style="text-align: center; color: var(--rose-text); padding: 2rem;">Network error while loading.</div>';
    }

    // Now prompt the admin for the number of *new* questions they want to create
    let countStr = prompt(`You have ${existingQuestionsCount} existing questions.\n\nHow many NEW blank questions would you like to add to this exam?`, "1");
    if (countStr === null) {
        // User cancelled adding new ones, but they can still view existing ones
        document.getElementById('editorTotalCountBadge').textContent = `${existingQuestionsCount} Questions Total`;
        return;
    }

    let count = parseInt(countStr, 10);
    if (isNaN(count) || count < 0) {
        alert("Please enter a valid positive number or 0.");
        count = 0;
    }

    document.getElementById('editorTotalCountBadge').textContent = `${existingQuestionsCount + count} Questions Total`;

    questionBlockCounter = existingQuestionsCount; // Starts new IDs after existing count

    for (let i = 0; i < count; i++) {
        addQuestionBlock();
    }
}

function closeQuestionEditor() {
    currentEditingExamId = null;
    document.getElementById('questionEditorSection').style.display = 'none';
    document.getElementById('editorErrorAlert').style.display = 'none';
    showSection('examsSection'); // Returns to the exam table
}

function addQuestionBlock() {
    questionBlockCounter++;
    const blockId = questionBlockCounter;

    // Create the HTML for a single question form card
    const blockHTML = `
        <div class="question-block" id="qBlock_${blockId}" data-id="${blockId}" style="background: var(--card); border: 1px solid var(--card-border); border-radius: var(--r-md); padding: 2rem; position: relative; box-shadow: var(--sh-sm);">
            <div style="position: absolute; top: 1rem; right: 1rem;">
                <button type="button" class="btn btn-icon btn-ghost" onclick="removeQuestionBlock(${blockId})" title="Remove Question" style="color: var(--rose-text);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            
            <h4 style="margin-top: 0; margin-bottom: 1.5rem; color: var(--teal-text);">Question #${blockId}</h4>
            
            <div class="form-group">
                <label class="form-label">Question</label>
                <textarea class="form-textarea q-prompt" rows="3" placeholder="Type your question here..." required></textarea>
            </div>

            <div class="grid grid-2" style="gap: 1.5rem; margin-top: 1.5rem;">
                <div class="form-group">
                    <label class="form-label">Option A (Required)</label>
                    <input type="text" class="form-input q-optA" placeholder="First option..." required>
                </div>
                <div class="form-group">
                    <label class="form-label">Option B (Required)</label>
                    <input type="text" class="form-input q-optB" placeholder="Second option..." required>
                </div>
                <div class="form-group">
                    <label class="form-label">Option C (Optional)</label>
                    <input type="text" class="form-input q-optC" placeholder="Third option...">
                </div>
                <div class="form-group">
                    <label class="form-label">Option D (Optional)</label>
                    <input type="text" class="form-input q-optD" placeholder="Fourth option...">
                </div>
            </div>

            <div class="form-group" style="margin-top: 1.5rem; margin-bottom: 0;">
                <label class="form-label">Select the Correct Answer</label>
                <div style="display: flex; gap: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="correct_${blockId}" value="A" required> Option A
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="correct_${blockId}" value="B"> Option B
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="correct_${blockId}" value="C"> Option C
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="correct_${blockId}" value="D"> Option D
                    </label>
                </div>
            </div>
        </div>
    `;

    document.getElementById('questionBlocksContainer').insertAdjacentHTML('beforeend', blockHTML);
}

function removeQuestionBlock(id) {
    const block = document.getElementById(`qBlock_${id}`);
    if (block) {
        block.remove();
    }
}

function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createExistingQuestionBlockHTML(q, displayNum) {
    // Helper to safely render user content
    const safePrompt = escapeHTML(q.question_text);
    const safeA = escapeHTML(q.option_a);
    const safeB = escapeHTML(q.option_b);
    const safeC = escapeHTML(q.option_c);
    const safeD = escapeHTML(q.option_d);

    // Build a read-only visual representation
    return `
        <div class="question-block question-block-existing" style="border-radius: var(--r-md); padding: 2rem; position: relative; box-shadow: none;">
            <div style="position: absolute; top: 1rem; right: 1rem; color: var(--ink-muted); font-size: 0.85rem; font-weight: 600; background: var(--surface-hover); padding: 0.25rem 0.75rem; border-radius: var(--r-full);">
                Saved
            </div>
            
            <h4 style="margin-top: 0; margin-bottom: 1.5rem; color: var(--ink-muted);">Question #${displayNum}</h4>
            
            <div class="form-group">
                <label class="form-label">Question</label>
                <textarea class="form-textarea" rows="2" readonly>${safePrompt}</textarea>
            </div>

            <div class="grid grid-2" style="gap: 1.5rem; margin-top: 1.5rem;">
                <div class="form-group">
                    <label class="form-label">Option A ${q.correct_answer === 'A' ? '<span style="color:var(--teal-text);font-weight:700;">(Correct)</span>' : ''}</label>
                    <input type="text" class="form-input" value="${safeA}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Option B ${q.correct_answer === 'B' ? '<span style="color:var(--teal-text);font-weight:700;">(Correct)</span>' : ''}</label>
                    <input type="text" class="form-input" value="${safeB}" readonly>
                </div>
                ${q.option_c ? `
                <div class="form-group">
                    <label class="form-label">Option C ${q.correct_answer === 'C' ? '<span style="color:var(--teal-text);font-weight:700;">(Correct)</span>' : ''}</label>
                    <input type="text" class="form-input" value="${safeC}" readonly>
                </div>` : ''}
                ${q.option_d ? `
                <div class="form-group">
                    <label class="form-label">Option D ${q.correct_answer === 'D' ? '<span style="color:var(--teal-text);font-weight:700;">(Correct)</span>' : ''}</label>
                    <input type="text" class="form-input" value="${safeD}" readonly>
                </div>` : ''}
            </div>
        </div>
    `;
}

async function saveBulkQuestions() {
    const alertBox = document.getElementById('editorErrorAlert');
    alertBox.style.display = 'none';

    const blocks = document.querySelectorAll('.question-block:not(.question-block-existing)');
    if (blocks.length === 0) {
        alertBox.textContent = "You must add at least one NEW question before saving.";
        alertBox.style.display = 'block';
        return;
    }

    const payload = [];
    let hasError = false;

    blocks.forEach(block => {
        const id = block.dataset.id;
        const prompt = block.querySelector('.q-prompt').value.trim();
        const optA = block.querySelector('.q-optA').value.trim();
        const optB = block.querySelector('.q-optB').value.trim();
        const optC = block.querySelector('.q-optC').value.trim();
        const optD = block.querySelector('.q-optD').value.trim();
        const correctRadio = block.querySelector(`input[name="correct_${id}"]:checked`);

        if (!prompt || !optA || !optB || !correctRadio) {
            hasError = true;
            block.style.borderColor = 'var(--rose-text)'; // Highlight block with error
        } else {
            block.style.borderColor = 'var(--card-border)'; // Reset error border
            payload.push({
                question_text: prompt,
                option_a: optA,
                option_b: optB,
                option_c: optC || null,
                option_d: optD || null,
                correct_answer: correctRadio.value
            });
        }
    });

    if (hasError) {
        alertBox.textContent = "Please fill out all required fields (Prompt, Option A, Option B, and Correct Answer) for every question.";
        alertBox.style.display = 'block';
        return;
    }

    // Submit the built array to our new bulk API
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/questions/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                exam_id: currentEditingExamId,
                questions: payload
            })
        });

        if (res.ok) {
            alert(`Successfully saved ${payload.length} questions to the test bank.`);
            closeQuestionEditor();
        } else {
            const data = await res.json();
            alertBox.textContent = data.error || 'Failed to save questions. Please try again.';
            alertBox.style.display = 'block';
        }
    } catch (err) {
        console.error('Error saving bulk questions:', err);
        alertBox.textContent = 'A network error occurred. Please try again.';
        alertBox.style.display = 'block';
    }
}


// Results Management
async function loadResults() {
    try {
        const res = await fetch('/api/admin/results');
        const results = await res.json();

        const tbody = document.querySelector('#resultsTable tbody');
        tbody.innerHTML = '';

        results.forEach(r => {
            const tr = document.createElement('tr');
            const date = new Date(r.submitted_at).toLocaleDateString();
            const statusColor = r.status === 'Pass' ? 'var(--teal-text)' : 'var(--rose-text)';

            tr.innerHTML = `
                <td>${r.student_name} (${r.student_email})</td>
                <td>${r.exam_title}</td>
                <td>${r.score}</td>
                <td>${r.percentage}%</td>
                <td style="color: ${statusColor}; font-weight: 600;">${r.status}</td>
                <td>${date}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading results', err);
    }
}
