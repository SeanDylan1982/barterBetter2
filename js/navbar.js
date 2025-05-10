// Navbar functionality
const setupNavbar = () => {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const viewControls = document.querySelector('.view-controls');
  const authButtons = document.querySelector('.auth-buttons');
  const userMenu = document.querySelector('.user-menu');
  
  // Handle authentication state
  if (userId && username) {
    // User is logged in
    authButtons.style.display = 'none';
    userMenu.style.display = 'flex';
    
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
    userMenu.style.display = 'none';
  }

  // Show view controls only on index and timeline pages
  const isListingPage = window.location.pathname.includes('index.html') || 
                       window.location.pathname.includes('timeline.html');
  viewControls.style.display = isListingPage ? 'flex' : 'none';
  
  // Handle view toggle
  if (isListingPage) {
    const viewButtons = document.querySelectorAll('.view-controls button');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        viewButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update view state
        document.querySelector('#posts-container').className = 
          button.dataset.view === 'grid' ? 'posts-grid' : 'posts-list';
      });
    });
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
