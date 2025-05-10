// Check if user is logged in
const userId = localStorage.getItem('userId');
const username = localStorage.getItem('username');

if (!userId || !username) {
  window.location.href = 'login.html';
}

// Global state
const state = {
  view: 'grid',
  map: null,
  markers: [],
  filters: {
    category: 'all',
    location: 'all',
    minPrice: '',
    maxPrice: '',
    condition: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  },
  currentPostId: null
};

// Global variables
let currentView = 'grid';
let map = null;
let markers = [];
let geocoder = null;

// DOM Elements
const elements = {
  postsContainer: document.getElementById('posts-container'),
  postsCount: document.getElementById('posts-count'),
  mapContainer: document.getElementById('map-container'),
  mapToggle: document.getElementById('toggle-map'),
  viewToggle: document.querySelector('.btn-group'),
  categoryButtons: document.querySelectorAll('.category-btn'),
  filterForm: {
    locationFilter: document.getElementById('province-filter'),
    minPrice: document.getElementById('min-price'),
    maxPrice: document.getElementById('max-price'),
    conditionFilter: document.getElementById('condition-filter'),
    sortOptions: document.getElementById('sort-options'),    applyButton: document.getElementById('apply-filters'),
    clearButton: document.getElementById('clear-filters')
  }
};

// Initialize map
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 0, lng: 0 },
    zoom: 2
  });
  geocoder = new google.maps.Geocoder();
}

// Format post data
function formatPostData(post) {
  const safePost = {
    title: post.title || 'Untitled Post',
    description: post.description || 'No description provided',
    category: post.category || 'Uncategorized',
    region: post.region || 'Location not specified',
    username: post.username || 'Anonymous',
    createdAt: post.createdAt || new Date(),
    imageUrls: Array.isArray(post.imageUrls) ? post.imageUrls : [],
    likes: Array.isArray(post.likes) ? post.likes : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
    _id: post._id || '',
    price: typeof post.price === 'number' ? post.price : null,
    condition: post.condition || ''
  };

  return `
    <div class="post-card" data-post-id="${safePost._id}">
      <div class="post-images">
        ${safePost.imageUrls.length > 0 
          ? `<img src="${safePost.imageUrls[0]}" alt="${safePost.title}" class="post-image" onclick="showImageModal('${safePost.imageUrls[0]}')">`
          : `<img src="./img/logo2.png" alt="Default" class="post-image">`
        }
        ${safePost.imageUrls.length > 1 
          ? `<div class="image-count">+${safePost.imageUrls.length - 1}</div>`
          : ''
        }
      </div>
      <div class="post-content">
        <h4>${safePost.title}</h4>
        ${safePost.price !== null ? `<div class="price-tag">R ${safePost.price.toLocaleString()}</div>` : ''}
        <div class="location-tag">
          <i class="fa fa-map-marker"></i>
          <span>${safePost.region}</span>
        </div>
        <p class="post-description">${safePost.description}</p>
        <div class="post-meta">
          <span class="badge bg-${getCategoryColor(safePost.category)}">${safePost.category}</span>
          ${safePost.condition ? `<span class="badge bg-secondary">${safePost.condition}</span>` : ''}
        </div>
        <div class="post-footer">
          <div class="post-info">
            <small>Posted by ${safePost.username}</small>
            <br>
            <small>${formatDate(safePost.createdAt)}</small>
          </div>
          <div class="post-actions">
            <button class="btn btn-sm like-btn ${safePost.likes.includes(userId) ? 'active' : ''}" 
                    onclick="likePost('${safePost._id}')" title="Like">
              <i class="fa fa-heart${safePost.likes.includes(userId) ? '' : '-o'}"></i>
              <span>${safePost.likes.length}</span>
            </button>
            <button class="btn btn-sm" onclick="showComments('${safePost._id}')" title="Comments">
              <i class="fa fa-comment-o"></i>
              <span>${safePost.comments.length}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Fetch and display posts
async function fetchPosts() {
  try {
    elements.postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
    
    const response = await fetch('/api/posts');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const posts = await response.json();
    if (!Array.isArray(posts)) {
      throw new Error('Invalid response format');
    }

    if (posts.length === 0) {
      elements.postsContainer.innerHTML = `
        <div class="no-posts">
          <i class="fa fa-inbox fa-3x"></i>
          <p>No posts found. Be the first to create a post!</p>
          <a href="./createpost.html" class="btn btn-primary">Create Post</a>
        </div>
      `;
      elements.postsCount.textContent = '0';
      return;
    }

    // Sort posts by creation date (newest first)
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Update display
    elements.postsContainer.innerHTML = posts.map(post => formatPostData(post)).join('');
    elements.postsCount.textContent = posts.length;
    
    // Update map if in map view
    if (state.view === 'map') {
      updateMapMarkers(posts);
    }

  } catch (error) {
    console.error('Error fetching posts:', error);
    elements.postsContainer.innerHTML = `
      <div class="error-message">
        <i class="fa fa-exclamation-triangle"></i>
        <p>Sorry, there was an error loading posts. Please try again later.</p>
        <button onclick="fetchPosts()" class="btn btn-primary">Retry</button>
      </div>
    `;
  }
}

// Update posts display with either grid or list view
function updatePostsDisplay(posts) {
  const postsContainer = document.getElementById('posts-container');
  postsContainer.innerHTML = '';
  document.getElementById('posts-count').textContent = posts.length;
  
  // Clear existing markers from the map
  if (markers && markers.length) {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
  }

  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    
    // Build the HTML content
    const imageHTML = post.imageUrls && post.imageUrls.length > 0 
      ? '<div class="post-images"><img src="' + post.imageUrls[0] + '" alt="' + post.title + '" class="post-image" onclick="showImageModal(\'' + post.imageUrls[0] + '\')"></div>'
      : '';
    
    const subtitleHTML = post.subtitle 
      ? '<div class="price-tag">' + post.subtitle + '</div>'
      : '';
    
    // Set the inner HTML
    postElement.innerHTML = 
      imageHTML +
      '<div class="post-content">' +
        '<h4>' + post.title + '</h4>' +
        subtitleHTML +
        '<div class="location-tag">' +
          '<i class="fa fa-map-marker"></i>' +
          '<span>' + post.region + '</span>' +
        '</div>' +
        '<p>' + post.description + '</p>' +
        '<div class="post-category">' +
          '<span class="badge bg-secondary">' + post.category + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="post-footer">' +
        '<div class="post-info">' +
          '<small>Posted by ' + post.username + '</small>' +
          '<br>' +
          '<small>' + new Date(post.createdAt).toLocaleDateString() + '</small>' +
        '</div>' +
        '<button class="btn btn-outline-primary btn-sm" onclick="showComments(\'' + post._id + '\')">' +
          '<i class="fa fa-comment"></i> ' + (post.comments ? post.comments.length : 0) +
        '</button>' +
      '</div>';

    postsContainer.appendChild(postElement);
    
    // Add marker if location is available
    if (post.region && map && geocoder) {
      geocoder.geocode({ address: post.region }, function(results, status) {
        if (status === 'OK') {
          const marker = new google.maps.Marker({
            position: results[0].geometry.location,
            map: map,
            title: post.title
          });
          markers.push(marker);
        }
      });
    }
  });
}

// Helper functions
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

function getCategoryColor(category) {
  const colors = {
    'clothing': 'info',
    'electronics': 'warning',
    'furniture': 'success',
    'books': 'primary',
    'services': 'danger'
  };
  return colors[category.toLowerCase()] || 'secondary';
}

function getLocationCoordinates(location) {
  const coordinates = {
    'Gauteng': { lat: -26.2041, lng: 28.0473 },
    'Western Cape': { lat: -33.9249, lng: 18.4241 },
    'Eastern Cape': { lat: -33.0292, lng: 27.8546 },
    'Free State': { lat: -29.0852, lng: 26.1596 },
    'KwaZulu-Natal': { lat: -29.8587, lng: 31.0218 },
    'Limpopo': { lat: -23.9000, lng: 29.4700 },
    'Mpumalanga': { lat: -25.5653, lng: 30.5279 },
    'Northern Cape': { lat: -28.7419, lng: 24.7719 },
    'North West': { lat: -25.8653, lng: 25.6436 }
  };
  return coordinates[location];
}

function sortPosts(posts) {
  const { sortBy, sortOrder } = state.filters;
  return [...posts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(b.createdAt) - new Date(a.createdAt);
        break;
      case 'price':
        comparison = (a.price || 0) - (b.price || 0);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return sortOrder === 'desc' ? comparison : -comparison;
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // View toggle
  elements.viewToggle.addEventListener('click', (e) => {
    if (e.target.matches('[data-view]')) {
      const view = e.target.dataset.view;
      state.view = view;
      
      // Update buttons
      elements.viewToggle.querySelectorAll('button').forEach(btn => 
        btn.classList.toggle('active', btn.dataset.view === view));
      
      // Update container class
      elements.postsContainer.className = `posts-${view}`;
    }
  });

  // Map toggle
  elements.mapToggle.addEventListener('click', () => {
    elements.mapContainer.classList.toggle('d-none');
    if (!elements.mapContainer.classList.contains('d-none')) {
      google.maps.event.trigger(state.map, 'resize');
    }
  });

  // Category filters
  elements.categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      elements.categoryButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update filter state
      state.filters.category = button.dataset.category;
      
      // Apply filters
      applyFilters();
    });
  });

  // Apply filters
  elements.filterForm.applyButton.addEventListener('click', () => {
    state.filters = {
      ...state.filters,
      location: elements.filterForm.locationFilter.value,
      minPrice: elements.filterForm.minPrice.value,
      maxPrice: elements.filterForm.maxPrice.value,
      condition: elements.filterForm.conditionFilter.value,
      sortBy: elements.filterForm.sortOptions.value.split('-')[0],
      sortOrder: elements.filterForm.sortOptions.value.split('-')[1]
    };
    applyFilters();
  });

  // Clear filters
  elements.filterForm.clearButton.addEventListener('click', () => {
    // Reset form elements
    elements.filterForm.locationFilter.value = 'all';
    elements.filterForm.minPrice.value = '';
    elements.filterForm.maxPrice.value = '';
    elements.filterForm.conditionFilter.value = 'all';
    elements.filterForm.sortOptions.value = 'date-desc';
    
    // Reset category buttons
    elements.categoryButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-category="all"]').classList.add('active');
    
    // Reset filter state
    state.filters = {
      category: 'all',
      location: 'all',
      minPrice: '',
      maxPrice: '',
      condition: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    };
    
    // Fetch all posts
    fetchPosts();
  });
  // Initialize page
  // Initialize event handlers
  function initEventHandlers() {
    // View toggle
    document.querySelectorAll('.view-toggle button').forEach(button => {
      button.addEventListener('click', function() {
        const view = this.dataset.view;
        document.querySelectorAll('.view-toggle button').forEach(btn => 
          btn.classList.remove('active'));
        this.classList.add('active');
        
        const container = document.getElementById('posts-container');
        container.className = view === 'grid' ? 'posts-grid' : 'posts-list';
        state.view = view;
      });
    });

    // Map toggle
    elements.mapToggle.addEventListener('click', () => {
      elements.mapContainer.classList.toggle('d-none');
      if (!elements.mapContainer.classList.contains('d-none')) {
        google.maps.event.trigger(state.map, 'resize');
      }
    });

    // Category filters
    elements.categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active state
        elements.categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update filter state
        state.filters.category = button.dataset.category;
        
        // Apply filters
        applyFilters();
      });
    });

    // Comment form submission
    document.getElementById('comment-form')?.addEventListener('submit', async function(e) {
      e.preventDefault();
      const content = document.getElementById('comment-content').value;
      
      try {
        const response = await fetch(`/api/posts/${state.currentPostId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, username, content })
        });
        
        if (response.ok) {
          document.getElementById('comment-content').value = '';
          await showComments(state.currentPostId);
          fetchPosts();
        }
      } catch (error) {
        console.error('Error posting comment:', error);
      }
    });

    // Apply filters button
    elements.filterForm.applyButton.addEventListener('click', applyFilters);

    // Clear filters button
    elements.filterForm.clearButton.addEventListener('click', () => {
      // Reset form elements
      elements.filterForm.locationFilter.value = 'all';
      elements.filterForm.minPrice.value = '';
      elements.filterForm.maxPrice.value = '';
      elements.filterForm.conditionFilter.value = 'all';
      elements.filterForm.sortOptions.value = 'date-desc';
      
      // Reset category buttons
      elements.categoryButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelector('[data-category="all"]').classList.add('active');
      
      // Reset filter state
      state.filters = {
        category: 'all',
        location: 'all',
        minPrice: '',
        maxPrice: '',
        condition: 'all',
        sortBy: 'date',
        sortOrder: 'desc'
      };
      
      // Fetch all posts
      fetchPosts();
    });
  }

  // Initialize everything
  initEventHandlers();
  fetchPosts();
  
  // Add username to header
  if (username && settingsDiv) {
    viewToggleBtn.addEventListener('click', () => {
      state.view = state.view === 'grid' ? 'list' : 'grid';
      document.body.setAttribute('data-view', state.view);
      viewToggleBtn.innerHTML = state.view === 'grid' 
        ? '<i class="fa fa-th-list"></i>'
        : '<i class="fa fa-th-large"></i>';
    });
  }
  
  // Initialize filters
  const filtersToggle = document.getElementById('filters-toggle');
  const sidebar = document.getElementById('sidebar');
  if (filtersToggle && sidebar) {
    filtersToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  
  // Close sidebar on outside click
  document.addEventListener('click', (e) => {
    if (sidebar && 
        sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !filtersToggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
});

// Show image in modal
async function showImageModal(url) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-body">
          <img src="${url}" class="img-fluid" alt="Post image">
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  $(modal).modal('show');
  
  $(modal).on('hidden.bs.modal', function () {
    modal.remove();
  });
}

// Show comments modal
async function showComments(postId) {
  state.currentPostId = postId;
  const commentsContainer = document.getElementById('comments-container');
  commentsContainer.innerHTML = '<div class="text-center">Loading comments...</div>';
  
  try {
    const response = await fetch(`/api/posts/${postId}/comments`);
    const comments = await response.json();
    
    commentsContainer.innerHTML = comments.length ? '' : '<p>No comments yet. Be the first to comment!</p>';
    
    comments.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerHTML = `
        <div class="comment-header">
          <strong>${comment.username}</strong>
          <small>${new Date(comment.createdAt).toLocaleString()}</small>
        </div>
        <div class="comment-content">${comment.content}</div>
      `;
      commentsContainer.appendChild(commentElement);
    });
    
    $('#commentsModal').modal('show');
  } catch (error) {
    console.error('Error fetching comments:', error);
    commentsContainer.innerHTML = '<div class="alert alert-danger">Error loading comments</div>';
  }
}

// Like a post
async function likePost(postId) {
  try {
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    if (response.ok) {
      fetchPosts(); // Refresh posts to show updated like count
    }
  } catch (error) {
    console.error('Error liking post:', error);
  }
}

// Apply filters
async function applyFilters() {
  try {
    const query = new URLSearchParams({
      category: state.filters.category !== 'all' ? state.filters.category : '',
      location: state.filters.location !== 'all' ? state.filters.location : '',
      minPrice: state.filters.minPrice,
      maxPrice: state.filters.maxPrice,
      condition: state.filters.condition !== 'all' ? state.filters.condition : '',
      sortBy: state.filters.sortBy,
      sortOrder: state.filters.sortOrder
    }).toString();

    const response = await fetch(`/api/posts/search?${query}`);
    if (!response.ok) throw new Error('Failed to fetch filtered posts');
    
    const posts = await response.json();
    updatePostsDisplay(posts);
  } catch (error) {
    console.error('Error applying filters:', error);
    showToast('Error filtering posts. Please try again.', 'error');
  }
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Update map markers
function updateMapMarkers(posts) {
  // Clear existing markers
  state.markers.forEach(marker => marker.setMap(null));
  state.markers = [];

  // Add new markers
  posts.forEach(post => {
    if (post.region) {
      const coords = getLocationCoordinates(post.region);
      if (coords) {
        const marker = new google.maps.Marker({
          position: coords,
          map: state.map,
          title: post.title,
          animation: google.maps.Animation.DROP
        });

        // Add click event to marker
        marker.addListener('click', () => {
          const infowindow = new google.maps.InfoWindow({
            content: `
              <div class="map-info-window">
                <h5>${post.title}</h5>
                ${post.price ? `<p class="price">R ${post.price.toLocaleString()}</p>` : ''}
                <p>${post.region}</p>
                <button onclick="showPostDetails('${post._id}')" class="btn btn-sm btn-primary">View Details</button>
              </div>
            `
          });
          infowindow.open(state.map, marker);
        });

        state.markers.push(marker);
      }
    }
  });
}

// Load Google Maps
function loadGoogleMaps() {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadGoogleMaps);
} else {
  loadGoogleMaps();
}

// Initial fetch
fetchPosts();
