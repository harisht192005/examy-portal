document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth('student');
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const resultId = params.get('id');
    if (!resultId) {
        window.location.href = '/student-dashboard.html';
        return;
    }

    loadResult(resultId);
});

async function loadResult(resultId) {
    try {
        const res = await fetch(`/api/exam/results/${resultId}`);
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Failed to load result');
            window.location.href = '/student-dashboard.html';
            return;
        }

        document.getElementById('loading').style.display = 'none';

        // Populate Result
        document.getElementById('r_title').textContent = data.title;
        document.getElementById('r_percentage').textContent = `${data.percentage}%`;
        document.getElementById('r_score').textContent = data.score;
        document.getElementById('r_total_q').textContent = data.total_questions;
        document.getElementById('r_correct').textContent = data.correct_answers;
        document.getElementById('r_incorrect').textContent = data.incorrect_answers;

        const circle = document.getElementById('r_status_circle');
        const statusText = document.getElementById('r_status_text');

        if (data.status === 'Pass') {
            circle.style.backgroundColor = 'var(--teal-mist)';
            circle.style.borderColor = 'var(--teal-glow)';
            circle.style.color = 'var(--teal-text)';

            statusText.textContent = 'Congratulations! You Passed.';
            statusText.style.color = 'var(--teal-text)';
        } else {
            circle.style.backgroundColor = 'var(--rose-mist)';
            circle.style.borderColor = 'var(--rose-glow)';
            circle.style.color = 'var(--rose-text)';

            statusText.textContent = 'Unfortunately, you failed.';
            statusText.style.color = 'var(--rose-text)';
        }

        document.getElementById('resultContainer').style.display = 'block';

    } catch (err) {
        console.error('Error loading result', err);
        alert('Server error.');
        window.location.href = '/student-dashboard.html';
    }
}
