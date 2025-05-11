// Handle post creation form submission
document.addEventListener('DOMContentLoaded', () => {
  const createPostForm = document.getElementById('create-post-form');
  const messageDiv = document.getElementById('message');

  if (createPostForm) {
    createPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userId = localStorage.getItem('userId');
      if (!userId) {
        window.location.href = 'login.html';
        return;
      }      try {
        const formData = new FormData(createPostForm);
        
        // Add user info
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        if (!userId || !username) {
          throw new Error('User not logged in');
        }
        formData.append('userId', userId);
        formData.append('username', username);

        // Get files from file input
        const fileInput = document.getElementById('images');
        if (fileInput && fileInput.files.length > 0) {
          for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('images', fileInput.files[i]);
          }
        }

        const response = await fetch('/api/posts', {
          method: 'POST',
          body: formData // FormData automatically sets the correct Content-Type
        });

        const data = await response.json();

        if (response.ok) {
          // Show success message
          messageDiv.className = 'alert alert-success';
          messageDiv.textContent = 'Post created successfully! Redirecting...';
          messageDiv.style.display = 'block';

          // Redirect to timeline after 2 seconds
          setTimeout(() => {
            window.location.href = 'timeline.html';
          }, 2000);
        } else {
          throw new Error(data.error || 'Error creating post');
        }
      } catch (error) {
        messageDiv.className = 'alert alert-danger';
        messageDiv.textContent = error.message;
        messageDiv.style.display = 'block';
      }
    });
  }
});
