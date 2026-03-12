document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth('student');
    if (!user) return;

    // Get Exam ID from URL
    const params = new URLSearchParams(window.location.search);
    const examId = params.get('id');
    if (!examId) {
        window.location.href = '/student-dashboard.html';
        return;
    }

    startSetup(examId);
});

let examData = null;
let questionsData = [];
let timerInterval;
let endTime;
let isSubmitting = false;

// Paginated State
let currentQuestionIndex = 0;
let savedAnswers = {};

// Anti-Cheat Variables
let violationCount = 0;
const MAX_VIOLATIONS = 3;

async function startSetup(examId) {
    try {
        const res = await fetch(`/api/exam/${examId}/start`);
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Failed to start exam');
            window.location.href = '/student-dashboard.html';
            return;
        }

        examData = data.exam;
        questionsData = data.questions;

        // Initialize state
        currentQuestionIndex = 0;
        savedAnswers = {};

        renderExamHeader();
        showQuestion(currentQuestionIndex);
        setupAntiCheat();
        startTimer();

        // Reveal UI
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('examHeader').style.display = 'flex';
        document.getElementById('examContainer').style.display = 'block';

        // Disable Context Menu
        document.addEventListener('contextmenu', event => event.preventDefault());

    } catch (err) {
        console.error('Error starting exam', err);
        alert('Server error loading exam.');
        window.location.href = '/student-dashboard.html';
    }
}

function renderExamHeader() {
    document.getElementById('e_title').textContent = examData.title;
    document.getElementById('e_marks').textContent = examData.total_marks;
    document.getElementById('e_qcount').textContent = questionsData.length;
}

function showQuestion(index) {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';

    if (!questionsData || questionsData.length === 0) return;

    const q = questionsData[index];
    const saved = savedAnswers[q.id];

    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 1rem; font-size: 1.125rem;">
            Question ${index + 1} of ${questionsData.length}: ${q.question_text}
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <label class="option-label">
                <input type="radio" name="q_${q.id}" value="A" class="option-input" ${saved === 'A' ? 'checked' : ''}> ${q.option_a}
            </label>
            <label class="option-label">
                <input type="radio" name="q_${q.id}" value="B" class="option-input" ${saved === 'B' ? 'checked' : ''}> ${q.option_b}
            </label>
            ${q.option_c ? `<label class="option-label"><input type="radio" name="q_${q.id}" value="C" class="option-input" ${saved === 'C' ? 'checked' : ''}> ${q.option_c}</label>` : ''}
            ${q.option_d ? `<label class="option-label"><input type="radio" name="q_${q.id}" value="D" class="option-input" ${saved === 'D' ? 'checked' : ''}> ${q.option_d}</label>` : ''}
        </div>
    `;
    container.appendChild(card);

    // Auto-save on change
    const options = document.querySelectorAll('.option-input');
    options.forEach(opt => {
        opt.addEventListener('change', () => {
            autoSaveCurrent();
            showSaveIndicator();
        });
    });

    // Update navigation control states
    document.getElementById('btnPrev').disabled = (index === 0);
    document.getElementById('btnNext').disabled = (index === questionsData.length - 1);
}

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    if (indicator) {
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 1200);
    }
}

function autoSaveCurrent() {
    if (!questionsData || questionsData.length === 0) return;
    const q = questionsData[currentQuestionIndex];
    if (!q) return;

    const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
    if (selected) {
        savedAnswers[q.id] = selected.value;
    }
}

function prevQuestion() {
    autoSaveCurrent();
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
    }
}

function nextQuestion() {
    autoSaveCurrent();
    if (currentQuestionIndex < questionsData.length - 1) {
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    }
}

function startTimer() {
    const durationMs = examData.duration * 60 * 1000;
    endTime = Date.now() + durationMs;

    updateTimerDisplay();
    timerInterval = setInterval(() => {
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const now = Date.now();
    const remain = endTime - now;

    if (remain <= 0) {
        clearInterval(timerInterval);
        document.getElementById('timeLeft').textContent = "00:00:00";
        alert("Time is up! Submitting exam automatically.");
        submitExam();
        return;
    }

    const hours = Math.floor(remain / (1000 * 60 * 60));
    const mins = Math.floor((remain % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remain % (1000 * 60)) / 1000);

    const format = n => n.toString().padStart(2, '0');
    document.getElementById('timeLeft').textContent = `${format(hours)}:${format(mins)}:${format(secs)}`;
}

function setupAntiCheat() {
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && !isSubmitting) {
            handleViolation();
        }
    });

    window.addEventListener("blur", () => {
        if (!isSubmitting) {
            handleViolation();
        }
    });
}

function handleViolation() {
    violationCount++;
    const banner = document.getElementById('warningBanner');
    banner.style.display = 'block';
    document.getElementById('violationCount').textContent = violationCount;

    alert(`Warning! You have switched tabs or lost window focus. Violation ${violationCount}/${MAX_VIOLATIONS}`);

    if (violationCount >= MAX_VIOLATIONS) {
        alert("Maximum violations reached. Submitting exam automatically.");
        submitExam();
    }
}

function confirmSubmit() {
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function proceedSubmit() {
    closeConfirmModal();
    submitExam();
}

async function submitExam() {
    if (isSubmitting) return;
    autoSaveCurrent(); // Save current question before submitting

    isSubmitting = true;
    clearInterval(timerInterval);

    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('loadingOverlay').innerHTML = '<h2 style="color: var(--teal-text);">Submitting Exam...</h2><p>Please wait.</p>';

    // Collect Answers from saved dictionary state
    const answers = [];
    questionsData.forEach(q => {
        if (savedAnswers[q.id]) {
            answers.push({ question_id: q.id, selected_option: savedAnswers[q.id] });
        }
    });

    try {
        const res = await fetch(`/api/exam/${examData.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });

        const data = await res.json();
        if (res.ok) {
            window.location.replace(`/result.html?id=${data.resultId}`);
        } else {
            alert('Failed to submit exam: ' + data.error);
            window.location.replace('/student-dashboard.html');
        }
    } catch (err) {
        console.error('Submit error:', err);
        alert('Simulation Error submitting exam.');
        window.location.replace('/student-dashboard.html');
    }
}
