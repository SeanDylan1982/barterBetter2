import config from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const errorMessageDiv = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageDiv.style.display = 'none';
        if (loadingSpinner) loadingSpinner.style.display = 'block';

        try {
            const formData = {
                username: document.getElementById('username').value.trim(),
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            };

            // Validate input
            if (!formData.username || !formData.email || !formData.password) {
                throw new Error('All fields are required');
            }

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Password validation
            if (formData.password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            const response = await fetch(`${config.apiBaseUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Store user info
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username);

            // Show success message
            errorMessageDiv.textContent = 'Registration successful! Redirecting...';
            errorMessageDiv.className = 'alert alert-success';
            errorMessageDiv.style.display = 'block';

            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = '/createprofile.html';
            }, 1500);

        } catch (error) {
            console.error('Registration error:', error);
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.className = 'alert alert-danger';
            errorMessageDiv.style.display = 'block';
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    });
});
