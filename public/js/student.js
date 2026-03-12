let globalActivityData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is student
    const user = await checkAuth('student');
    if (!user) return;

    // Set user info
    const headerName = document.getElementById('studentNameHeader');
    if (headerName) headerName.textContent = user.name || 'Student';

    const fullName = document.getElementById('fullName');
    if (fullName) fullName.textContent = (user.name || 'Student Name');

    const email = document.getElementById('studentEmail');
    if (email) email.textContent = user.email || 'student@veltech.edu.in';

    // Set avatars
    const avatarName = user.name || 'Student';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=3F51B5&color=fff&bold=true&size=128`;

    const hAvatar = document.getElementById('headerAvatar');
    if (hAvatar) {
        hAvatar.src = avatarUrl;
        hAvatar.onerror = () => { hAvatar.src = 'https://ui-avatars.com/api/?name=S&background=3F51B5&color=fff'; };
    }
    const pAvatar = document.getElementById('profileAvatar');
    if (pAvatar) {
        pAvatar.src = avatarUrl;
        pAvatar.onerror = () => { pAvatar.src = 'https://ui-avatars.com/api/?name=S&background=3F51B5&color=fff'; };
        pAvatar.alt = '';
    }

    // Initialize year dropdown to current year
    const yearSelect = document.getElementById('activityYearSelect');
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        yearSelect.value = currentYear.toString();
    }

    // Load available exams
    loadAvailableExams();

    // Load Activity Metrics
    loadActivityMetrics();
});

async function loadActivityMetrics() {
    try {
        const res = await fetch('/api/student/metrics');
        if (!res.ok) return;

        const metrics = await res.json();
        if (metrics.activity) {
            globalActivityData = metrics.activity;
            const yearSelect = document.getElementById('activityYearSelect');
            renderActivityHeatmap(globalActivityData, parseInt(yearSelect.value));
        }
    } catch (err) {
        console.error('Error loading activity metrics:', err);
    }
}

function changeActivityYear(year) {
    if (globalActivityData.length > 0) {
        renderActivityHeatmap(globalActivityData, parseInt(year));
    }
}

async function loadAvailableExams() {
    try {
        const res = await fetch('/api/exam/available');
        const exams = await res.json();
        const container = document.getElementById('availableExamsContainer');
        if (!container) return;
        container.innerHTML = '';

        if (!exams || exams.length === 0) {
            container.innerHTML = '<div class="card-v2" style="grid-column: span 12; text-align: center; padding: 3rem;"><p style="color: var(--dash-muted); margin: 0; font-size: 1.1rem;">No exams currently available at this time.</p></div>';
            return;
        }

        exams.forEach(exam => {
            const div = document.createElement('div');
            div.className = 'exam-card-v2';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                    <h4 style="margin: 0; font-size: 1.25rem; color: #3F51B5;">${exam.title}</h4>
                </div>
                <div style="display: flex; gap: 2rem; margin-bottom: 2rem; font-size: 0.9rem; color: var(--dash-muted);">
                    <span><strong>Duration:</strong> ${exam.duration}m</span>
                    <span><strong>Marks:</strong> ${exam.total_marks}</span>
                </div>
                <button class="btn btn-primary btn-block" style="border-radius: 12px; padding: 0.8rem; background:#3F51B5; border:none; color:white; font-weight:600; cursor:pointer; width:100%;" onclick="openInstructions(${exam.id}, '${exam.title}', ${exam.duration})">Take Exam Now</button>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Error loading exams:', err);
    }
}

function renderActivityHeatmap(activityData = [], year = 2026) {
    const grid = document.getElementById('activityHeatmap');
    const monthLabels = document.getElementById('monthLabels');
    if (!grid || !monthLabels) return;

    grid.innerHTML = '';
    monthLabels.innerHTML = '';

    const activityMap = {};
    let totalYearlyCount = 0;
    activityData.forEach(a => {
        const d = new Date(a.date);
        if (d.getFullYear() === year) {
            const dateStr = d.toISOString().split('T')[0];
            activityMap[dateStr] = (activityMap[dateStr] || 0) + a.count;
            totalYearlyCount += a.count;
        }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(53, 1fr)';
    grid.style.gridTemplateRows = 'repeat(7, 1fr)';
    grid.style.gridAutoFlow = 'column';

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const startDay = startDate.getDay();

    // Month labels row needs to be aligned with the columns
    monthLabels.style.display = 'grid';
    monthLabels.style.gridTemplateColumns = 'repeat(53, 1fr)';

    // Fill empty start cells
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cell-v2';
        empty.style.backgroundColor = 'transparent';
        grid.appendChild(empty);
    }

    let currentDate = new Date(startDate);
    let columnCounter = 0;
    let dayInWeekCounter = startDay;
    let lastMonth = -1;

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const month = currentDate.getMonth();

        // Month labeling: place name at the start of the week it appears in
        if (month !== lastMonth) {
            const currentColumn = Math.floor((grid.children.length) / 7);
            // Only add if not already filled or if this is the very first week of the month
            const label = document.createElement('div');
            label.textContent = monthNames[month];
            label.style.gridColumnStart = currentColumn + 1;
            monthLabels.appendChild(label);
            lastMonth = month;
        }

        const cell = document.createElement('div');
        cell.className = 'cell-v2';
        cell.title = `${dateStr}: ${activityMap[dateStr] || 0} submissions`;

        const count = activityMap[dateStr] || 0;
        if (count > 0) {
            if (count >= 10) cell.classList.add('l4');
            else if (count >= 5) cell.classList.add('l3');
            else if (count >= 2) cell.classList.add('l2');
            else cell.classList.add('l1');
        }

        grid.appendChild(cell);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const contribEl = document.getElementById('totalContrib');
    if (contribEl) contribEl.textContent = `${totalYearlyCount} Submissions in ${year}`;
}

function openInstructions(id, title, duration) {
    document.getElementById('startExamId').value = id;
    const info = document.getElementById('examTitleInfo');
    if (info) info.textContent = `${title} - ${duration} Minutes`;
    const modal = document.getElementById('instructionsModal');
    if (modal) modal.style.display = 'flex';
}

function closeInstructions() {
    const modal = document.getElementById('instructionsModal');
    if (modal) modal.style.display = 'none';
}

function proceedToExam() {
    const id = document.getElementById('startExamId').value;
    window.location.href = `/exam.html?id=${id}`;
}
