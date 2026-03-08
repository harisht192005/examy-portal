document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();

    // Registration Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            const errorMsg = document.getElementById('errorMsg');
            const successMsg = document.getElementById('successMsg');

            errorMsg.style.display = 'none';
            successMsg.style.display = 'none';

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }

                successMsg.textContent = 'Registration successful! You can now login.';
                successMsg.style.display = 'block';
                registerForm.reset();
                setTimeout(() => window.location.href = '/login.html', 2000);
            } catch (err) {
                errorMsg.textContent = err.message;
                errorMsg.style.display = 'block';
            }
        });
    }

    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const errorMsg = document.getElementById('errorMsg');
            errorMsg.style.display = 'none';

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                // Redirect based on role
                if (data.role === 'admin') {
                    window.location.href = '/admin-dashboard.html';
                } else {
                    window.location.href = '/student-dashboard.html';
                }
            } catch (err) {
                errorMsg.textContent = err.message;
                errorMsg.style.display = 'block';
            }
        });
    }
});

function initThemeToggle() {
    // Inject Theme Toggle
    const themeToggle = document.createElement('button');
    themeToggle.id = 'themeToggleBtn';
    themeToggle.className = 'theme-toggle';
    themeToggle.title = "Toggle Dark Mode";
    document.body.appendChild(themeToggle);

    // Check saved theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '☀️';
    } else {
        themeToggle.innerHTML = '🌙';
    }

    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    });
}

// Utility function to check auth status on protected pages
async function checkAuth(requiredRole) {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (!response.ok || !data.authenticated) {
            window.location.href = '/login.html';
            return null;
        }

        if (requiredRole && data.user.role !== requiredRole) {
            window.location.href = '/login.html';
            return null;
        }

        return data.user;
    } catch (err) {
        window.location.href = '/login.html';
        return null;
    }
}

// Global logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (err) {
        console.error('Logout failed', err);
    }
}

// Google Sign-In Callback
async function handleGoogleSignIn(response) {
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const res = await fetch('/api/auth/googlesignin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Google Sign-In failed');
        }

        // Redirect based on role (default is student for auto-registration)
        if (data.role === 'admin') {
            window.location.href = '/admin-dashboard.html';
        } else {
            window.location.href = '/student-dashboard.html';
        }
    } catch (err) {
        if (errorMsg) {
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
        } else {
            alert('Google Sign-In Error: ' + err.message);
        }
    }
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
}
