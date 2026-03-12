document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is student
    const user = await checkAuth('student');
    if (!user) return;

    // Set header name
    const headerName = document.getElementById('studentNameHeader');
    if (headerName) headerName.textContent = user.name || 'Student';

    // Set avatars
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Student')}&background=3F51B5&color=fff&bold=true`;
    const hAvatar = document.getElementById('headerAvatar');
    if (hAvatar) hAvatar.src = avatarUrl;

    loadStudentResults();
});

async function loadStudentResults() {
    try {
        const res = await fetch('/api/exam/results');
        const results = await res.json();

        const tbody = document.getElementById('studentResultsTable');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!results || results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; color: #718096;">No exam results found yet.</td></tr>';
            return;
        }

        results.forEach(r => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #EDF2F7';
            const date = new Date(r.submitted_at).toLocaleDateString();
            const statusColor = r.status === 'Pass' ? '#48BB78' : '#F56565';

            tr.innerHTML = `
                <td style="padding: 1.2rem; font-weight: 500;">${r.exam_title}</td>
                <td style="padding: 1.2rem;">${r.score} / ${r.total_marks}</td>
                <td style="padding: 1.2rem;">${r.percentage}%</td>
                <td style="padding: 1.2rem; color: ${statusColor}; font-weight: 700;">${r.status}</td>
                <td style="padding: 1.2rem; color: #718096;">${date}</td>
                <td style="padding: 1.2rem;"><a href="/result.html?id=${r.id}" class="btn-v2-link" style="color: #3F51B5; text-decoration: none; font-weight: 600;">View Report</a></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading results', err);
    }
}
