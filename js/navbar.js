// Navbar functionality
const setupNavbar = () => {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const createPost = document.querySelector('.create-post');
  const authButtons = document.querySelector('.auth-buttons');
  const userMenu = document.querySelector('.user-menu');
  
  // Handle authentication state
  if (userId && username) {
    // User is logged in
    authButtons.style.display = 'none';
    createPost.style.display = 'block';
    userMenu.style.display = 'block';
    
    // Set username in dropdown
    const usernameSpan = userMenu.querySelector('.username');
    usernameSpan.textContent = username;
    
    // Handle logout
    document.getElementById('logout').addEventListener('click', () => {
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      window.location.href = 'login.html';
    });
  } else {
    // User is logged out
    authButtons.style.display = 'flex';
    createPost.style.display = 'none';
    userMenu.style.display = 'none';
  }
  
  // Handle filter toggle
  const filtersToggle = document.getElementById('filters-toggle');
  if (filtersToggle) {
    filtersToggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
};

// Setup navbar when DOM content is loaded
document.addEventListener('DOMContentLoaded', setupNavbar);
